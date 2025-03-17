// pages/api/parent/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth';
import { getParentById } from '../../../lib/parentStudent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req);
    
    if (!user || user.role !== 'parent') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const parent = await getParentById(user.id);
    
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent not found' });
    }
    
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
    console.error('Error fetching parent profile:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
