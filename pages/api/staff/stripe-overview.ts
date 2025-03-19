// pages/api/staff/stripe-overview.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth';
import { getAccountOverview } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'staff');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [customers, subscriptions, invoices, paymentIntents] = await getAccountOverview(100);
    
    const recentPayments = paymentIntents.data
      .filter(pi => pi.status === 'succeeded')
      .slice(0, 10);
    
    return res.status(200).json({
      success: true,
      data: {
        customersCount: customers.data.length,
        subscriptionsCount: subscriptions.data.length,
        outstandingInvoicesCount: invoices.data.length,
        recentPaymentsCount: recentPayments.length
      }
    });
  } catch (error) {
    console.error('Error fetching Stripe overview:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
