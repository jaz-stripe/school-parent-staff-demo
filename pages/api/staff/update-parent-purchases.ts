// pages/api/staff/update-parent-purchases.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth.ts';
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
    
    const { parentIds, items } = req.body;
    
    if (!parentIds || !Array.isArray(parentIds) || parentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No parents selected' });
    }
    
    if (!items || Object.keys(items).length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }
    
    const results = [];
    
    // Process each parent
    for (const parentId of parentIds) {
      // Process each item for this parent
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
        
        // Add the product to the parent
        for (let i = 0; i < quantity; i++) {
          const result = await addProductToParent(parentId, productId, null);
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
    console.error('Error updating parent purchases:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
