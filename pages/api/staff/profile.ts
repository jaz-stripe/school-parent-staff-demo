// pages/api/staff/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth.ts';
import { getDb } from '../../../lib/db.ts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('Staff profile API: Getting current user');
    
    
    const user = await getCurrentUser(req, 'staff');
    if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    console.log('Staff profile API: Current user:', user);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    // Get account population status
    const db = await getDb();
    const account = await db.get('SELECT is_populated FROM account WHERE id = ?', [user.accountId]);
    
    return res.status(200).json({ 
      success: true, 
      staff: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emoji: user.emoji,
        role: 'staff',
        accountId: user.accountId,
        accountName: user.accountName,
        accountLogo: user.accountLogo,
        accountIsPopulated: account?.is_populated === 1 // Add this field
      }
    });
  } catch (error) {
    console.error('Error fetching staff profile:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
