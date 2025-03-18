// pages/api/staff/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth.ts';
import { getStaffById } from '../../../lib/parentStudent.ts';

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
    
    // The issue: user.role doesn't exist when user comes from database
    // Solution: Check if this is a staff member by how we retrieved them
    
    // If getCurrentUser returned a user, and we're in the staff API route,
    // then this must be a staff member (since getCurrentUser checks the token role)
    const staff = user;
    
    return res.status(200).json({ 
      success: true, 
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        emoji: staff.emoji,
        role: 'staff' // Add role explicitly
      }
    });
  } catch (error) {
    console.error('Error fetching staff profile:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
