// pages/api/create-setup-intent.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSetupIntent } from '../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Create a temporary customer for the setup intent
    // In a real application, you would use the actual customer ID or create a new one
    const setupIntent = await createSetupIntent('temporary_' + Date.now());
    
    return res.status(200).json({ 
      clientSecret: setupIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

