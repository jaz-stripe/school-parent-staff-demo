// pages/api/accounts/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllAccounts } from '../../../lib/db.ts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const accounts = await getAllAccounts();
    
    return res.status(200).json({ success: true, accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
