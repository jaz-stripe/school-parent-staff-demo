// pages/api/webhooks.ts
import { buffer } from 'micro';
import type { NextApiRequest, NextApiResponse } from 'next';
import { constructStripeEvent } from '../../lib/stripe';
import { getDb, getAccountByStripeId, updateAccountOnboarding } from '../../lib/db';
import { setParentPaymentMethod } from '../../lib/parentStudent';
import { populateAccountDatabase } from '../../scripts/populate_account';

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
    
    // Extract the account ID from the event (if it's a Connect account event)
    const stripeAccountId = event.account || null;
    
    // If this is a Connect account event, find our internal account ID
    let accountId = null;
    if (stripeAccountId) {
      const account = await getAccountByStripeId(stripeAccountId);
      if (account) {
        accountId = account.id;
      } else {
        console.warn(`Received webhook for unknown Stripe account: ${stripeAccountId}`);
      }
    }
    
    // Handle different event types
    switch (event.type) {
      case 'setup_intent.succeeded':
        const setupIntent = event.data.object;
        const customerId = setupIntent.customer;
        const paymentMethodId = setupIntent.payment_method;
        
        if (customerId && paymentMethodId) {
          // Find parent with this customer ID and account ID
          const parentQuery = accountId
            ? 'SELECT * FROM parent WHERE stripeCustomerId = ? AND accountId = ?'
            : 'SELECT * FROM parent WHERE stripeCustomerId = ?';
            
          const parentParams = accountId
            ? [customerId, accountId]
            : [customerId];
            
          const parent = await db.get(parentQuery, parentParams);
          
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
        console.log(`Invoice ${invoice.id} paid`, accountId ? `for account ${accountId}` : '');
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        // Handle failed payments (e.g., notify admin)
        console.log(`Payment failed for invoice ${failedInvoice.id}`, accountId ? `for account ${accountId}` : '');
        break;
        
      case 'subscription.created':
        const subscription = event.data.object;
        // Handle new subscription
        console.log(`New subscription created: ${subscription.id}`, accountId ? `for account ${accountId}` : '');
        break;
        
      // Handle Connect account-specific events
      case 'account.updated':
        if (stripeAccountId && accountId) {
          // Update account capabilities and details in our database
          const stripeAccount = event.data.object;
          const isOnboardingComplete = stripeAccount.details_submitted && stripeAccount.charges_enabled;
          
          await updateAccountOnboarding(
            accountId,
            isOnboardingComplete,
            stripeAccount.capabilities
          );
          
          console.log(`Updated Stripe Connect account details for ${stripeAccountId}`);
          
          // If onboarding just completed and database not populated yet, populate it
          const account = await getAccountByStripeId(stripeAccountId);
          if (account && isOnboardingComplete && !account.is_populated) {
            try {
              await populateAccountDatabase(accountId, stripeAccountId);
              console.log(`Populated database for account ${accountId} after onboarding completion`);
            } catch (error) {
              console.error(`Failed to populate database for account ${accountId}:`, error);
            }
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`, accountId ? `for account ${accountId}` : '');
    }
    
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ success: false, message: 'Webhook error' });
  }
}
