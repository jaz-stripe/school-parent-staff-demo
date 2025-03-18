// pages/api/parent/update-purchases.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth.ts';
import { addProductToParent } from '../../../lib/stripe.ts';
import { getDb } from '../../../lib/db.ts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'parent');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { items } = req.body;
    
    if (!items || Object.keys(items).length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }
    
    const results = [];
    
    // Process each item
    for (const key of Object.keys(items)) {
      const quantity = items[key];
      if (quantity <= 0) continue;
      
      // Parse the key to determine item type and IDs
      let productId, studentId;
      
      if (key.startsWith('student_')) {
        const [_, studentIdStr, productIdStr] = key.split('_');
        studentId = parseInt(studentIdStr, 10);
        productId = parseInt(productIdStr, 10);
      } else if (key.startsWith('parent_')) {
        const [_, productIdStr] = key.split('_');
        productId = parseInt(productIdStr, 10);
      }
      
      if (!productId) continue;
      
      // Add the product to the parent
      for (let i = 0; i < quantity; i++) {
        const result = await addProductToParent(user.id, productId, studentId || null);
        results.push(result);
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Purchases updated successfully',
      results
    });
  } catch (error) {
    console.error('Error updating parent purchases:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
