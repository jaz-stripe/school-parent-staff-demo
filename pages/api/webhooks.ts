// pages/api/webhooks.ts
import { buffer } from 'micro';
import type { NextApiRequest, NextApiResponse } from 'next';
import { constructStripeEvent } from '../../lib/stripe';
import { getDb } from '../../lib/db';
import { setParentPaymentMethod } from '../../lib/parentStudent';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;
    
    if (!sig) {
      return res.status(400).json({ success: false, message: 'Missing Stripe signature' });
    }
    
    const event = await constructStripeEvent(buf, sig);
    const db = await getDb();
    
    // Handle different event types
    switch (event.type) {
      case 'setup_intent.succeeded':
        const setupIntent = event.data.object;
        const customerId = setupIntent.customer;
        const paymentMethodId = setupIntent.payment_method;
        
        if (customerId && paymentMethodId) {
          // Find parent with this customer ID
          const parent = await db.get('SELECT * FROM parent WHERE stripeCustomerId = ?', [customerId]);
          
          if (parent) {
            // Update parent payment method
            await setParentPaymentMethod(parent.id, paymentMethodId as string);
            console.log(`Updated payment method for parent ${parent.id} to ${paymentMethodId}`);
          }
        }
        break;
        
      case 'invoice.paid':
        const invoice = event.data.object;
        // Handle paid invoices (e.g., update payment status)
        console.log(`Invoice ${invoice.id} paid`);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        // Handle failed payments (e.g., notify admin)
        console.log(`Payment failed for invoice ${failedInvoice.id}`);
        break;
        
      case 'subscription.created':
        const subscription = event.data.object;
        // Handle new subscription
        console.log(`New subscription created: ${subscription.id}`);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ success: false, message: 'Webhook error' });
  }
}
