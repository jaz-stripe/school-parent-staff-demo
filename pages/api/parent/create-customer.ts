// pages/api/parent/create-customer.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createCustomerWithAddress } from '../../../lib/stripe.ts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, firstName, lastName, address } = req.body;

    if (!email || !firstName || !lastName || !address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields'
      });
    }

    const customer = await createCustomerWithAddress(
      email,
      `${firstName} ${lastName}`,
      address
    );

    return res.status(200).json({
      success: true,
      customerId: customer.id
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create customer'
    });
  }
}
