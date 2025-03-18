// pages/api/parent/create-subscription.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSubscriptionForStudents } from '../../../lib/stripe.ts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { 
      customerId, 
      paymentMethodId, 
      students, 
      frequency 
    } = req.body;

    if (!customerId || !paymentMethodId || !students || !frequency) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields'
      });
    }

    const subscription = await createSubscriptionForStudents(
      customerId,
      paymentMethodId,
      students,
      frequency
    );

    return res.status(200).json({
      success: true,
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create subscription'
    });
  }
}
