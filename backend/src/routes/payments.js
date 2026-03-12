const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken } = require('./auth');
const db = require('../database');

const router = express.Router();

// Create checkout session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has a subscription
    const existingSubscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
      [req.user.userId]
    );

    if (existingSubscription) {
      return res.status(400).json({ error: 'User already has an active subscription' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Austin Marketing Assistant - Basic Plan',
            description: 'AI-powered marketing content for Austin small businesses'
          },
          unit_amount: 3900, // $39.00 in cents
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1
      }],
      metadata: {
        userId: req.user.userId.toString()
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`
    });

    res.json({ checkout_url: session.url });

  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Handle successful payment
router.post('/success', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.metadata.userId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (session.payment_status === 'paid') {
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Create or update subscription record
      await db.run(
        `INSERT OR REPLACE INTO subscriptions 
         (user_id, stripe_customer_id, stripe_subscription_id, plan, status, 
          current_period_start, current_period_end, updated_at)
         VALUES (?, ?, ?, 'basic', 'active', ?, ?, CURRENT_TIMESTAMP)`,
        [
          req.user.userId,
          subscription.customer,
          subscription.id,
          new Date(subscription.current_period_start * 1000).toISOString(),
          new Date(subscription.current_period_end * 1000).toISOString()
        ]
      );

      res.json({ 
        message: 'Subscription activated successfully!',
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000)
        }
      });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }

  } catch (error) {
    console.error('Payment success error:', error);
    res.status(500).json({ error: 'Failed to process successful payment' });
  }
});

// Get subscription status
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.userId]
    );

    if (!subscription) {
      return res.json({ 
        subscription: null,
        has_active_subscription: false
      });
    }

    // Check if subscription is still active
    const currentDate = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const isActive = subscription.status === 'active' && currentDate < periodEnd;

    res.json({
      subscription: {
        ...subscription,
        is_active: isActive
      },
      has_active_subscription: isActive
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
      [req.user.userId]
    );

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel in Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Update database
    await db.run(
      'UPDATE subscriptions SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subscription.id]
    );

    res.json({ message: 'Subscription will be cancelled at the end of the current period' });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Stripe webhook handler
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

  // Handle the event
  switch (event.type) {
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Payment succeeded for subscription:', invoice.subscription);
      break;
      
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      console.log('Payment failed for subscription:', failedInvoice.subscription);
      // TODO: Handle failed payment (email user, suspend access, etc.)
      break;
      
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      await db.run(
        'UPDATE subscriptions SET status = "cancelled" WHERE stripe_subscription_id = ?',
        [deletedSub.id]
      );
      console.log('Subscription cancelled:', deletedSub.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;