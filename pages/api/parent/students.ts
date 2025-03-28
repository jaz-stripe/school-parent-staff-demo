// pages/api/parent/students.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth';
import { getStudents } from '../../../lib/parentStudent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'parent');
    if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const students = await getStudents(user.id);
    
    return res.status(200).json({ 
      success: true, 
      students
    });
  } catch (error) {
    console.error('Error fetching parent students:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
