// pages/api/staff/customer-portal/[customerId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../../lib/auth';
import { createCustomerPortalSession } from '../../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'staff');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { customerId } = req.query;
    
    if (!customerId || Array.isArray(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }
    
    // Create customer portal session
    const returnUrl = process.env.NEXT_PUBLIC_BASE_URL + '/staff-portal';
    const session = await createCustomerPortalSession(customerId, returnUrl);
    
    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
