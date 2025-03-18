// pages/api/auth/logout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { removeAuthCookie } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { role } = req.body;
    
    if (role !== 'parent' && role !== 'staff') {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    
    // Remove the appropriate auth cookie
    removeAuthCookie(res, role);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Server error during logout' });
  }
}