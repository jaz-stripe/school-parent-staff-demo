// pages/api/staff/parent/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../../lib/auth';
import { getParentById, getStudents } from '../../../../lib/parentStudent';
import { getParentSubscriptions, getParentPurchases } from '../../../../lib/products';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req);
    
    if (!user || user.role !== 'staff') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ success: false, message: 'Invalid parent ID' });
    }
    
    const parentId = parseInt(id, 10);
    
    const [parent, students, subscriptions, purchases] = await Promise.all([
      getParentById(parentId),
      getStudents(parentId),
      getParentSubscriptions(parentId),
      getParentPurchases(parentId)
    ]);
    
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent not found' });
    }
    
    return res.status(200).json({ 
      success: true, 
      parent,
      students,
      subscriptions,
      purchases
    });
  } catch (error) {
    console.error('Error fetching parent details:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
