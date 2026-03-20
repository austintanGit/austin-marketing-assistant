const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken } = require('./auth');
const db = require('../database');

const router = express.Router();

const PLANS = {
  basic: {
    name: 'Basic Plan',
    amount: 3900,
    description: 'AI-powered marketing content for Austin small businesses',
    lookup_key: 'austin_basic_monthly',
  },
  pro: {
    name: 'Pro Plan',
    amount: 7900,
    description: 'Advanced AI marketing — more generations, priority support',
    lookup_key: 'austin_pro_monthly',
  },
};

// Get or create a reusable Stripe Price object (used only for subscription upgrades)
async function getOrCreatePrice(planKey) {
  const plan = PLANS[planKey];
  const prices = await stripe.prices.list({ lookup_keys: [plan.lookup_key], limit: 1 });
  if (prices.data.length > 0) return prices.data[0];
  return stripe.prices.create({
    currency: 'usd',
    unit_amount: plan.amount,
    recurring: { interval: 'month' },
    product_data: { name: `Austin Marketing Assistant - ${plan.name}`, description: plan.description },
    lookup_key: plan.lookup_key,
  });
}

// Determine plan key from Stripe price amount
function planFromAmount(unitAmount) {
  return unitAmount >= PLANS.pro.amount ? 'pro' : 'basic';
}

// ─── Create checkout session ───────────────────────────────────────────────────

router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { plan = 'basic' } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existingSubscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
      [req.user.userId]
    );
    if (existingSubscription) {
      return res.status(400).json({ error: 'User already has an active subscription' });
    }

    const planConfig = PLANS[plan];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Austin Marketing Assistant - ${planConfig.name}`,
            description: planConfig.description,
          },
          unit_amount: planConfig.amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: { userId: req.user.userId.toString(), plan },
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
      const plan = planFromAmount(subscription.items.data[0]?.price?.unit_amount || 0);

      await db.run(
        `INSERT OR REPLACE INTO subscriptions
         (user_id, stripe_customer_id, stripe_subscription_id, plan, status,
          cancel_at_period_end, current_period_start, current_period_end, updated_at)
         VALUES (?, ?, ?, ?, 'active', 0, ?, ?, CURRENT_TIMESTAMP)`,
        [
          req.user.userId,
          subscription.customer,
          subscription.id,
          plan,
          new Date(subscription.current_period_start * 1000).toISOString(),
          new Date(subscription.current_period_end * 1000).toISOString(),
        ]
      );

      res.json({
        message: 'Subscription activated successfully!',
        subscription: {
          id: subscription.id,
          plan,
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
    let subscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.userId]
    );

    if (!subscription) {
      return res.json({ subscription: null, has_active_subscription: false });
    }

    // Sync with Stripe on every request so cancellations/renewals are always reflected
    // even if the webhook wasn't received (e.g. during local dev)
    if (subscription.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        const plan = planFromAmount(stripeSub.items.data[0]?.price?.unit_amount || 0);

        await db.run(
          `UPDATE subscriptions
           SET status = ?, plan = ?, cancel_at_period_end = ?,
               current_period_start = ?, current_period_end = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            stripeSub.status,
            plan,
            stripeSub.cancel_at_period_end ? 1 : 0,
            new Date(stripeSub.current_period_start * 1000).toISOString(),
            new Date(stripeSub.current_period_end * 1000).toISOString(),
            subscription.id,
          ]
        );

        // Re-fetch the updated row
        subscription = await db.get('SELECT * FROM subscriptions WHERE id = ?', [subscription.id]);
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
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
      [req.user.userId]
    );
    if (!subscription) return res.status(404).json({ error: 'No active subscription found' });
    if (subscription.cancel_at_period_end) {
      return res.status(400).json({ error: 'Subscription is already set to cancel' });
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await db.run(
      'UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subscription.id]
    );

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
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active" AND cancel_at_period_end = 1',
      [req.user.userId]
    );
    if (!subscription) return res.status(404).json({ error: 'No cancelling subscription found' });

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await db.run(
      'UPDATE subscriptions SET cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subscription.id]
    );

    res.json({ message: 'Subscription reactivated — you will continue to be billed monthly' });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// ─── Upgrade subscription (basic → pro) ───────────────────────────────────────

router.post('/upgrade-subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
      [req.user.userId]
    );
    if (!subscription) return res.status(404).json({ error: 'No active subscription found' });
    if (subscription.plan === 'pro') return res.status(400).json({ error: 'Already on the Pro plan' });

    const proPrice = await getOrCreatePrice('pro');
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
      proration_behavior: 'create_prorations',
      items: [{ id: stripeSub.items.data[0].id, price: proPrice.id }],
    });

    await db.run(
      'UPDATE subscriptions SET plan = "pro", cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subscription.id]
    );

    res.json({ message: 'Upgraded to Pro plan! Prorated charges applied.' });
  } catch (error) {
    console.error('Upgrade subscription error:', error.message, error.raw || '');
    res.status(500).json({ error: 'Failed to upgrade subscription', detail: error.message });
  }
});

// ─── Create Stripe Customer Portal session ────────────────────────────────────

router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.userId]
    );
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
          const plan = planFromAmount(sub.items.data[0]?.price?.unit_amount || 0);
          await db.run(
            `UPDATE subscriptions
             SET status = 'active', plan = ?, cancel_at_period_end = ?,
                 current_period_start = ?, current_period_end = ?, updated_at = CURRENT_TIMESTAMP
             WHERE stripe_subscription_id = ?`,
            [
              plan,
              sub.cancel_at_period_end ? 1 : 0,
              new Date(sub.current_period_start * 1000).toISOString(),
              new Date(sub.current_period_end * 1000).toISOString(),
              invoice.subscription,
            ]
          );
          console.log(`Payment succeeded — subscription renewed: ${invoice.subscription}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object;
        if (failedInvoice.subscription) {
          await db.run(
            `UPDATE subscriptions SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
             WHERE stripe_subscription_id = ?`,
            [failedInvoice.subscription]
          );
          console.log(`Payment failed — subscription past due: ${failedInvoice.subscription}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const updatedSub = event.data.object;
        const plan = planFromAmount(updatedSub.items.data[0]?.price?.unit_amount || 0);
        await db.run(
          `UPDATE subscriptions
           SET status = ?, plan = ?, cancel_at_period_end = ?,
               current_period_start = ?, current_period_end = ?, updated_at = CURRENT_TIMESTAMP
           WHERE stripe_subscription_id = ?`,
          [
            updatedSub.status,
            plan,
            updatedSub.cancel_at_period_end ? 1 : 0,
            new Date(updatedSub.current_period_start * 1000).toISOString(),
            new Date(updatedSub.current_period_end * 1000).toISOString(),
            updatedSub.id,
          ]
        );
        console.log(`Subscription updated: ${updatedSub.id} → plan=${plan}, cancel_at_period_end=${updatedSub.cancel_at_period_end}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object;
        await db.run(
          `UPDATE subscriptions SET status = 'cancelled', cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP
           WHERE stripe_subscription_id = ?`,
          [deletedSub.id]
        );
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
