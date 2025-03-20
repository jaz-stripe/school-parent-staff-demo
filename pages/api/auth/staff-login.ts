// pages/api/auth/staff-login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateStaff, generateToken, setAuthCookie } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, password, accountId } = req.body;

  if (!email || !password || !accountId) {
    return res.status(400).json({ success: false, message: 'Email, password, and account are required' });
  }

  try {
    const staff = await authenticateStaff(email, password, accountId);
    
    if (!staff) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = generateToken(staff);
    
    // Set auth cookie
    setAuthCookie(res, token, 'staff');
    
    return res.status(200).json({ 
      success: true, 
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        emoji: staff.emoji,
        role: 'staff',
        accountId: staff.accountId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
