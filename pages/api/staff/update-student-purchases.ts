// pages/api/staff/update-student-purchases.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth.ts';
import { getStudent } from '../../../lib/parentStudent.ts';
import { addProductToParent } from '../../../lib/stripe.ts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'staff');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { studentIds, items } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No students selected' });
    }
    
    if (!items || Object.keys(items).length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }
    
    const results = [];
    
    // Process each student
    for (const studentId of studentIds) {
      const student = await getStudent(studentId);
      
      if (!student || !student.parentID) continue;
      
      // Process each item for this student
      for (const key of Object.keys(items)) {
        const quantity = items[key];
        if (quantity <= 0) continue;
        
        // Parse the key to determine item ID
        let productId;
        
        if (key.startsWith('item_')) {
          const [_, productIdStr] = key.split('_');
          productId = parseInt(productIdStr, 10);
        }
        
        if (!productId) continue;
        
        // Add the product to the parent with the student context
        for (let i = 0; i < quantity; i++) {
          const result = await addProductToParent(student.parentID, productId, student.id);
          results.push(result);
        }
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Items added successfully',
      results
    });
  } catch (error) {
    console.error('Error updating student purchases:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
