// pages/api/auth/parent-login.ts (continued)
import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateParent, generateToken, setAuthCookie } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const parent = await authenticateParent(email, password);
    
    if (!parent) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = generateToken(parent);
    
    // Set auth cookie
    setAuthCookie(res, token);
    
    return res.status(200).json({ 
      success: true, 
      parent: {
        id: parent.id,
        firstName: parent.firstName,
        lastName: parent.lastName,
        email: parent.email,
        emoji: parent.emoji
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
