// pages/api/staff/parent/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../../lib/auth.ts';
import { getParentById, getStudents } from '../../../../lib/parentStudent.ts';
import { getParentSubscriptions, getParentPurchases } from '../../../../lib/products.ts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Make sure to specify 'staff' role when checking auth
    const user = await getCurrentUser(req, 'staff');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ success: false, message: 'Invalid parent ID' });
    }
    
    const parentId = parseInt(id, 10);
    
    // Fetch parent details
    const parent = await getParentById(parentId);
    
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent not found' });
    }
    
    // Fetch related data
    const [students, subscriptions, purchases] = await Promise.all([
      getStudents(parentId),
      getParentSubscriptions(parentId),
      getParentPurchases(parentId)
    ]);
    
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
