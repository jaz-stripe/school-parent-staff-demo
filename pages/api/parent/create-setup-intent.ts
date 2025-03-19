// pages/api/parent/create-setup-intent.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSetupIntentForCustomer } from '../../../lib/stripe.ts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { customerId, country = 'AU' } = req.body;

    if (!customerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer ID is required'
      });
    }

    const setupIntent = await createSetupIntentForCustomer(customerId);

    return res.status(200).json({
      success: true,
      clientSecret: setupIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create setup intent'
    });
  }
}
