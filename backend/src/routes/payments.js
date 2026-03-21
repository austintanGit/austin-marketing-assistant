const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken } = require('./auth');
const dynamodb = require('../services/dynamodb');

const router = express.Router();

const PLANS = {
  basic: {
    name: 'Basic Plan',
    description: 'AI-powered marketing content for Austin small businesses',
    monthly: {
      amount: 3900, // $39/month
      lookup_key: 'austin_basic_monthly',
      interval: 'month',
    },
    annual: {
      amount: 31200, // $312/year (20% discount from $468)
      lookup_key: 'austin_basic_annual',
      interval: 'year',
    },
  },
  pro: {
    name: 'Pro Plan',
    description: 'Advanced AI marketing — more generations, priority support',
    monthly: {
      amount: 7900, // $79/month
      lookup_key: 'austin_pro_monthly',
      interval: 'month',
    },
    annual: {
      amount: 63200, // $632/year (33% discount from $948)
      lookup_key: 'austin_pro_annual',
      interval: 'year',
    },
  },
};

// Get or create a reusable Stripe Price object (used only for subscription upgrades)
async function getOrCreatePrice(planKey, billingCycle = 'monthly') {
  const plan = PLANS[planKey];
  if (!plan) throw new Error(`Invalid plan: ${planKey}`);
  
  const planConfig = plan[billingCycle];
  if (!planConfig) throw new Error(`Invalid billing cycle: ${billingCycle}`);
  
  const prices = await stripe.prices.list({ lookup_keys: [planConfig.lookup_key], limit: 1 });
  if (prices.data.length > 0) return prices.data[0];
  
  return stripe.prices.create({
    currency: 'usd',
    unit_amount: planConfig.amount,
    recurring: { interval: planConfig.interval },
    product_data: { name: `Austin Marketing Assistant - ${plan.name}` },
    lookup_key: planConfig.lookup_key,
  });
}

// Determine plan key and billing cycle from Stripe price amount and interval
function planFromAmount(unitAmount, interval = 'month') {
  if (interval === 'year') {
    // Annual pricing
    if (unitAmount >= PLANS.pro.annual.amount) return { plan: 'pro', billingCycle: 'annual' };
    return { plan: 'basic', billingCycle: 'annual' };
  } else {
    // Monthly pricing
    if (unitAmount >= PLANS.pro.monthly.amount) return { plan: 'pro', billingCycle: 'monthly' };
    return { plan: 'basic', billingCycle: 'monthly' };
  }
}

// Legacy function for backward compatibility
function planKeyFromAmount(unitAmount, interval = 'month') {
  const result = planFromAmount(unitAmount, interval);
  return result.plan;
}

// ─── Create trial subscription (no payment required) ──────────────────────────

router.post('/create-trial', authenticateToken, async (req, res) => {
  try {
    const user = await dynamodb.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existingSubscription = await dynamodb.getUserSubscription(req.user.userId);
    if (existingSubscription) {
      return res.status(400).json({ error: 'User already has a subscription' });
    }

    // Create trial subscription (7 days from now)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    await dynamodb.createOrUpdateSubscription(req.user.userId, {
      plan: 'trial',
      billing_cycle: 'trial',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: trialEnd.toISOString(),
      cancel_at_period_end: true // Trial ends automatically
    });

    res.json({
      message: 'Trial subscription created successfully!',
      subscription: {
        plan: 'trial',
        status: 'active',
        trial_end: trialEnd,
      },
    });
  } catch (error) {
    console.error('Create trial error:', error.message);
    res.status(500).json({ error: 'Failed to create trial subscription' });
  }
});

// ─── Get plan pricing information ─────────────────────────────────────────────

router.get('/plans', (req, res) => {
  try {
    // Return plan information without sensitive data
    const publicPlans = {};
    Object.keys(PLANS).forEach(planKey => {
      const plan = PLANS[planKey];
      publicPlans[planKey] = {
        name: plan.name,
        description: plan.description,
        monthly: {
          price: plan.monthly.amount / 100, // Convert from cents to dollars
          interval: plan.monthly.interval
        },
        annual: {
          price: plan.annual.amount / 100, // Convert from cents to dollars
          interval: plan.annual.interval,
          savings: (plan.monthly.amount * 12 - plan.annual.amount) / 100 // Savings in dollars
        }
      };
    });
    res.json(publicPlans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plan information' });
  }
});

// ─── Create checkout session ───────────────────────────────────────────────────

router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { plan = 'basic', billingCycle = 'monthly' } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });
    if (!PLANS[plan][billingCycle]) return res.status(400).json({ error: 'Invalid billing cycle' });

    const user = await dynamodb.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existingSubscription = await dynamodb.getUserSubscription(req.user.userId);
    if (existingSubscription && existingSubscription.status === 'active') {
      return res.status(400).json({ error: 'User already has an active subscription' });
    }

    const planConfig = PLANS[plan][billingCycle];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Austin Marketing Assistant - ${PLANS[plan].name}`,
            description: `${PLANS[plan].description} (${billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing)`,
          },
          unit_amount: planConfig.amount,
          recurring: { interval: planConfig.interval },
        },
        quantity: 1,
      }],
      metadata: { 
        userId: req.user.userId.toString(), 
        plan,
        billingCycle 
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    });

    res.json({ checkout_url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error.message, error.raw || '');
    res.status(500).json({ error: 'Failed to create checkout session', detail: error.message });
  }
});

// ─── Handle successful payment (called from Success page) ─────────────────────

router.post('/success', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'Session ID required' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.metadata.userId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (session.payment_status === 'paid') {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const priceInfo = subscription.items.data[0]?.price;
      const planInfo = planFromAmount(priceInfo?.unit_amount || 0, priceInfo?.recurring?.interval);

      await dynamodb.createOrUpdateSubscription(req.user.userId, {
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        plan: planInfo.plan,
        billing_cycle: planInfo.billingCycle,
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      });

      res.json({
        message: 'Subscription activated successfully!',
        subscription: {
          id: subscription.id,
          plan: planInfo.plan,
          billing_cycle: planInfo.billingCycle,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000),
        },
      });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (error) {
    console.error('Payment success error:', error.message, error.raw || '');
    res.status(500).json({ error: 'Failed to process successful payment', detail: error.message });
  }
});

// ─── Get subscription status (always syncs with Stripe for real-time accuracy) ─

router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    let subscription = await dynamodb.getUserSubscription(req.user.userId);

    if (!subscription) {
      return res.json({ subscription: null, has_active_subscription: false });
    }

    // Sync with Stripe on every request so cancellations/renewals are always reflected
    // even if the webhook wasn't received (e.g. during local dev)
    if (subscription.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        const priceInfo = stripeSub.items.data[0]?.price;
        const planInfo = planFromAmount(priceInfo?.unit_amount || 0, priceInfo?.recurring?.interval);

        await dynamodb.updateSubscription(req.user.userId, {
          status: stripeSub.status,
          plan: planInfo.plan,
          billing_cycle: planInfo.billingCycle,
          cancel_at_period_end: stripeSub.cancel_at_period_end,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString()
        });

        // Re-fetch the updated row
        subscription = await dynamodb.getUserSubscription(req.user.userId);
      } catch (stripeErr) {
        // If Stripe is unreachable, fall back to DB data rather than failing the request
        console.error('Stripe sync error (using cached DB state):', stripeErr.message);
      }
    }

    const currentDate = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const isActive = subscription.status === 'active' && currentDate < periodEnd;

    res.json({
      subscription: {
        ...subscription,
        is_active: isActive,
        cancel_at_period_end: !!subscription.cancel_at_period_end,
      },
      has_active_subscription: isActive,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// ─── Cancel subscription (at period end) ──────────────────────────────────────

router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await dynamodb.getUserSubscription(req.user.userId);
    if (!subscription || subscription.status !== 'active') return res.status(404).json({ error: 'No active subscription found' });
    if (subscription.cancel_at_period_end) {
      return res.status(400).json({ error: 'Subscription is already set to cancel' });
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await dynamodb.updateSubscription(req.user.userId, {
      cancel_at_period_end: true
    });

    res.json({
      message: 'Subscription will be cancelled at the end of the current billing period',
      period_end: subscription.current_period_end,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ─── Reactivate a subscription that is set to cancel at period end ────────────

router.post('/reactivate-subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await dynamodb.getUserSubscription(req.user.userId);
    if (!subscription || subscription.status !== 'active' || !subscription.cancel_at_period_end) {
      return res.status(404).json({ error: 'No cancelling subscription found' });
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await dynamodb.updateSubscription(req.user.userId, {
      cancel_at_period_end: false
    });

    res.json({ message: 'Subscription reactivated — you will continue to be billed monthly' });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// ─── Upgrade subscription (basic → pro) ───────────────────────────────────────

router.post('/upgrade-subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await dynamodb.getUserSubscription(req.user.userId);
    if (!subscription || subscription.status !== 'active') return res.status(404).json({ error: 'No active subscription found' });
    if (subscription.plan === 'pro') return res.status(400).json({ error: 'Already on the Pro plan' });

    // Keep the same billing cycle when upgrading
    const billingCycle = subscription.billing_cycle || 'monthly';
    const proPrice = await getOrCreatePrice('pro', billingCycle);
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
      proration_behavior: 'create_prorations',
      items: [{ id: stripeSub.items.data[0].id, price: proPrice.id }],
    });

    await dynamodb.updateSubscription(req.user.userId, {
      plan: 'pro',
      billing_cycle: billingCycle,
      cancel_at_period_end: false
    });

    res.json({ message: 'Upgraded to Pro plan! Prorated charges applied.' });
  } catch (error) {
    console.error('Upgrade subscription error:', error.message, error.raw || '');
    res.status(500).json({ error: 'Failed to upgrade subscription', detail: error.message });
  }
});

// ─── Create Stripe Customer Portal session ────────────────────────────────────

router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    const subscription = await dynamodb.getUserSubscription(req.user.userId);
    if (!subscription?.stripe_customer_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({ portal_url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ─── Stripe webhook handler ────────────────────────────────────────────────────

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          const priceInfo = sub.items.data[0]?.price;
          const planInfo = planFromAmount(priceInfo?.unit_amount || 0, priceInfo?.recurring?.interval);
          await dynamodb.updateSubscriptionByStripeId(invoice.subscription, {
            status: 'active',
            plan: planInfo.plan,
            billing_cycle: planInfo.billingCycle,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString()
          });
          console.log(`Payment succeeded — subscription renewed: ${invoice.subscription}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object;
        if (failedInvoice.subscription) {
          await dynamodb.updateSubscriptionByStripeId(failedInvoice.subscription, {
            status: 'past_due'
          });
          console.log(`Payment failed — subscription past due: ${failedInvoice.subscription}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const updatedSub = event.data.object;
        const priceInfo = updatedSub.items.data[0]?.price;
        const planInfo = planFromAmount(priceInfo?.unit_amount || 0, priceInfo?.recurring?.interval);
        await dynamodb.updateSubscriptionByStripeId(updatedSub.id, {
          status: updatedSub.status,
          plan: planInfo.plan,
          billing_cycle: planInfo.billingCycle,
          cancel_at_period_end: updatedSub.cancel_at_period_end,
          current_period_start: new Date(updatedSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(updatedSub.current_period_end * 1000).toISOString()
        });
        console.log(`Subscription updated: ${updatedSub.id} → plan=${planInfo.plan}, billing=${planInfo.billingCycle}, cancel_at_period_end=${updatedSub.cancel_at_period_end}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object;
        await dynamodb.updateSubscriptionByStripeId(deletedSub.id, {
          status: 'cancelled',
          cancel_at_period_end: false
        });
        console.log(`Subscription cancelled: ${deletedSub.id}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
});

module.exports = router;
