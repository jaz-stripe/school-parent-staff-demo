// pages/api/staff/update-student-purchases.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth';
import { createParentInvoice, addItemToParentSubscription } from '../../../lib/stripe';
import { getDb } from '../../../lib/db';
import { recordParentPurchase } from '../../../lib/stripe';
import { getStudent } from '../../../lib/parentStudent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'staff');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { studentIds, items, createInvoice = false } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No students selected' });
    }
    
    if (!items || Object.keys(items).length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }
    
    const db = await getDb();
    const results = [];
    
    // Group items by parent ID for batch processing
    // This map will store items by parent ID: { parentId => [{item details}] }
    const parentItemsMap = new Map();
    
    // First collect all students and assign them to parents
    for (const studentId of studentIds) {
      const student = await getStudent(studentId);
      
      if (!student || !student.parentID) {
        console.log(`Student not found or has no parent: ${studentId}`);
        continue;
      }
      
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
        
        // Get product details
        const product = await db.get('SELECT * FROM product WHERE id = ?', [productId]);
        if (!product) {
          console.log(`Product not found: ${productId}`);
          continue;
        }
        
        // Prepare metadata with student info
        const description = `${product.name} for ${student.firstName} ${student.lastName}`;
        const metadata = {
          productId: productId.toString(),
          description: product.name,
          studentId: studentId.toString(),
          studentName: `${student.firstName} ${student.lastName}`,
          year: student.year.toString()
        };
        
        // Add to the parent's collection
        if (!parentItemsMap.has(student.parentID)) {
          parentItemsMap.set(student.parentID, []);
        }
        
        // Add the requested quantity of this item
        for (let i = 0; i < quantity; i++) {
          parentItemsMap.get(student.parentID).push({
            productId,
            stripePriceId: product.stripePriceID,
            studentId: student.id,
            quantity: 1,
            description,
            metadata
          });
        }
      }
    }
    
    // Now process each parent's items
    for (const [parentId, parentItems] of parentItemsMap.entries()) {
      if (createInvoice) {
        // Get parent's Stripe customer ID
        const parent = await db.get('SELECT stripeCustomerId FROM parent WHERE id = ?', [parentId]);
        if (!parent || !parent.stripeCustomerId) {
          console.log(`Parent not found or has no Stripe customer ID: ${parentId}`);
          continue;
        }
        
        // Create a single invoice with all items for this parent
        if (parentItems.length > 0) {
          try {
            const result = await createParentInvoice(
              parentId,
              parent.stripeCustomerId,
              parentItems,
              `School purchase for students`
            );
            
            results.push(result);
          } catch (invoiceError) {
            console.error(`Error creating invoice for parent ${parentId}:`, invoiceError);
          }
        }
      } else {
        // Non-invoice flow - add to subscriptions
        // Get parent's subscription
        const parent = await db.get('SELECT stripeCustomerId FROM parent WHERE id = ?', [parentId]);
        if (!parent || !parent.stripeCustomerId) {
          console.log(`Parent not found or has no Stripe customer ID: ${parentId}`);
          continue;
        }
        
        const subscription = await db.get('SELECT stripeSubscriptionId FROM parent_subscriptions WHERE parentId = ? LIMIT 1', [parentId]);
        if (!subscription || !subscription.stripeSubscriptionId) {
          console.log(`No subscription found for parent: ${parentId}`);
          continue;
        }
        
        // Add each item to the subscription
        for (const item of parentItems) {
          // Add the item to the subscription
          const invoiceItem = await addItemToParentSubscription(
            parent.stripeCustomerId,
            subscription.stripeSubscriptionId,
            item.stripePriceId,
            item.metadata
          );
          
          // Record the purchase
          const purchaseRecord = await recordParentPurchase(
            parentId,
            item.productId,
            item.studentId,
            invoiceItem.id,
            item.description
          );
          
          results.push({
            invoiceItem,
            purchase: purchaseRecord,
            immediateInvoice: false
          });
        }
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: createInvoice ? 
        'Items added and invoiced successfully' : 
        'Items added successfully',
      results
    });
  } catch (error) {
    console.error('Error updating student purchases:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
