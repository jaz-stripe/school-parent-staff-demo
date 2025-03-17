// pages/api/staff/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth';
import { getStaffById } from '../../../lib/parentStudent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req);
    
    if (!user || user.role !== 'staff') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const staff = await getStaffById(user.id);
    
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    
    return res.status(200).json({ 
      success: true, 
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        emoji: staff.emoji
      }
    });
  } catch (error) {
    console.error('Error fetching staff profile:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
