// pages/api/staff/parents.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth';
import { getAllParents } from '../../../lib/parentStudent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'staff');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const parents = await getAllParents();
    
    return res.status(200).json({ 
      success: true, 
      parents
    });
  } catch (error) {
    console.error('Error fetching parents list:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
