import express from 'express';
import crypto from 'crypto';
import { User } from '../models/User.js';

const router = express.Router();

// Paystack Webhook Endpoint
// NOTE: Paystack requires this endpoint to be accessible via HTTPS in production.
// For local testing, use a tool like ngrok to expose your localhost.
router.post('/webhook', express.json(), async (req, res) => {
  try {
    // 1. Verify the Paystack signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body.event;

    // 2. Handle successful charge
    if (event === 'charge.success') {
      const data = req.body.data;
      const metadata = data.metadata || {};
      
      const userId = metadata.userId;
      const plan = metadata.plan; // e.g., 'teacher_pro', 'school_owner'
      const billingCycle = metadata.billingCycle || 'monthly';

      if (!userId || !plan) {
        return res.status(400).json({ success: false, message: 'Missing metadata' });
      }

      // 3. Calculate subscription end date
      const monthsToAdd = billingCycle === 'termly' ? 3 : 1;
      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + monthsToAdd);

      // 4. Update the user's subscription in the database
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          subscriptionTier: plan,
          subscriptionStatus: 'active',
          billingCycle: billingCycle,
          subscriptionEndsAt: subscriptionEndsAt,
          aiCreditsUsed: 0, // Reset credits for the new period
          creditsPeriodStart: new Date(),
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      console.log(`✅ Payment successful! Upgraded user ${userId} to ${plan} (${billingCycle})`);
    }

    // Always return 200 OK to Paystack so they know you received it
    return res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

export default router;
