// pages/api/staff/update-parent-items/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../../lib/auth';
import { getParentById } from '../../../../lib/parentStudent';
import { getProductById } from '../../../../lib/products';
import { createInvoiceItem, createInvoice } from '../../../../lib/stripe';
import { addParentPurchase } from '../../../../lib/products';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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
    const parent = await getParentById(parentId);
    
    if (!parent || !parent.stripeCustomerId) {
      return res.status(404).json({ success: false, message: 'Parent not found' });
    }
    
    const { items } = req.body;
    
    if (!items || Object.keys(items).length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }
    
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
      
      // Get product details
      const product = await getProductById(productId);
      
      if (!product) continue;
      
      // Create invoice item in Stripe
      let description;
      if (studentId) {
        const student = await getStudent(studentId);
        if (student) {
          description = `${product.name} for ${student.firstName} ${student.lastName} (${quantity} units)`;
        } else {
          description = `${product.name} (${quantity} units)`;
        }
      } else {
        description = `${product.name} (${quantity} units)`;
      }
      
      const invoiceItem = await createInvoiceItem(
        parent.stripeCustomerId,
        product.stripePriceID,
        description
      );
      
      // Create invoice
      const invoice = await createInvoice(parent.stripeCustomerId);
      
      // Add to local database
      await addParentPurchase(
        parent.id,
        product.id,
        studentId || null,
        invoice.id,
        description
      );
    }
    
    return res.status(200).json({ success: true, message: 'Items added successfully' });
  } catch (error) {
    console.error('Error updating parent items:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

