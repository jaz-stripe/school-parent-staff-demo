// pages/api/parent/update-purchases.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth';
import { createParentInvoice, addItemToParentSubscription } from '../../../lib/stripe';
import { getDb } from '../../../lib/db';
import { recordParentPurchase } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'parent');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { items, createInvoice = false } = req.body;
    
    if (!items || Object.keys(items).length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }
    
    const db = await getDb();
    const parentId = user.id;
    
    // Get parent's Stripe customer ID
    const parent = await db.get('SELECT stripeCustomerId FROM parent WHERE id = ?', [parentId]);
    if (!parent || !parent.stripeCustomerId) {
      return res.status(400).json({ success: false, message: 'Parent has no payment information' });
    }
    
    // For invoice creation, collect all items first
    if (createInvoice) {
      const invoiceItems = [];
      
      // Process each item
      for (const key of Object.keys(items)) {
        const quantity = items[key];
        if (quantity <= 0) continue;
        
        // Parse the key to determine item type and IDs
        let productId, studentId = null;
        
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
        const product = await db.get('SELECT * FROM product WHERE id = ?', [productId]);
        if (!product) continue;
        
        let description = `${product.name}`;
        let metadata: { [key: string]: string } = { 
          productId: productId.toString(),
          description: product.name
        };
        
        // If this is for a specific student, get their info 
        if (studentId) {
          const student = await db.get('SELECT firstName, lastName, year FROM student WHERE id = ?', [studentId]);
          if (student) {
            description += ` for ${student.firstName} ${student.lastName}`;
            metadata.studentId = studentId.toString();
            metadata.studentName = `${student.firstName} ${student.lastName}`;
            metadata.year = student.year.toString();
          }
        }
        
        // Add the requested quantity of this item
        for (let i = 0; i < quantity; i++) {
          invoiceItems.push({
            productId,
            stripePriceId: product.stripePriceID,
            studentId,
            quantity: 1, // Adding one at a time for simplicity
            description,
            metadata
          });
        }
      }
      
      // Create a single invoice with all collected items
      if (invoiceItems.length > 0) {
        try {
          const result = await createParentInvoice(
            parentId,
            parent.stripeCustomerId,
            invoiceItems,
            `School purchase for parent and students`
          );
          
          return res.status(200).json({ 
            success: true, 
            message: 'Items added and invoiced successfully',
            result
          });
        } catch (error) {
          console.error('Error creating invoice:', error);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to create invoice' 
          });
        }
      }
    } else {
      // Non-invoice flow - add to subscription
      const results = [];
      
      // Get the subscription ID
      const subscription = await db.get('SELECT stripeSubscriptionId FROM parent_subscriptions WHERE parentId = ? LIMIT 1', [parentId]);
      if (!subscription || !subscription.stripeSubscriptionId) {
        return res.status(400).json({ success: false, message: 'No subscription found for parent' });
      }
      
      // Process each item
      for (const key of Object.keys(items)) {
        const quantity = items[key];
        if (quantity <= 0) continue;
        
        // Parse the key to determine item type and IDs
        let productId, studentId = null;
        
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
        const product = await db.get('SELECT * FROM product WHERE id = ?', [productId]);
        if (!product) continue;
        
        let description = `${product.name}`;
        let metadata: { [key: string]: string } = { 
          productId: productId.toString(),
          description: product.name
        };
        
        // If this is for a specific student, get their info 
        if (studentId) {
          const student = await db.get('SELECT firstName, lastName, year FROM student WHERE id = ?', [studentId]);
          if (student) {
            description += ` for ${student.firstName} ${student.lastName}`;
            metadata.studentId = studentId.toString();
            metadata.studentName = `${student.firstName} ${student.lastName}`;
            metadata.year = student.year.toString();
          }
        }
        
        // Add the product to the parent's subscription
        for (let i = 0; i < quantity; i++) {
          const invoiceItem = await addItemToParentSubscription(
            parent.stripeCustomerId,
            subscription.stripeSubscriptionId,
            product.stripePriceID,
            metadata
          );
          
          // Record the purchase in our database
          const purchaseRecord = await recordParentPurchase(
            parentId,
            productId,
            studentId,
            invoiceItem.id,
            description
          );
          
          results.push({
            invoiceItem,
            purchase: purchaseRecord
          });
        }
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Items added successfully to your subscription',
        results
      });
    }
  } catch (error) {
    console.error('Error updating parent purchases:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
