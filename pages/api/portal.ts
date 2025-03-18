// pages/api/portal.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../lib/auth';
import { getParentById } from '../../lib/parentStudent';
import { createCustomerPortalSession } from '../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'parent');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const parent = await getParentById(user.id);
    
    if (!parent || !parent.stripeCustomerId) {
      return res.status(404).json({ success: false, message: 'Parent not found or no Stripe customer ID' });
    }
    
    // Create customer portal session
    const returnUrl = process.env.NEXT_PUBLIC_BASE_URL + '/parent-portal';
    const session = await createCustomerPortalSession(parent.stripeCustomerId, returnUrl);
    
    // Redirect to the portal
    if (req.method === 'GET') {
      res.redirect(303, session.url);
      return;
    }
    
    // Return the URL if POST
    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

