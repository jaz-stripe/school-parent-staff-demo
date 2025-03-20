// pages/api/staff/update-parent-purchases.ts
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
    const user = await getCurrentUser(req, 'staff');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { parentIds, items, createInvoice = false } = req.body;
    
    if (!parentIds || !Array.isArray(parentIds) || parentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No parents selected' });
    }
    
    if (!items || Object.keys(items).length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }
    
    const db = await getDb();
    const results = [];
    
    // Group all items by parent to create batch invoices
    if (createInvoice) {
      // Process each parent separately
      for (const parentId of parentIds) {
        // Get parent's Stripe customer ID
        const parent = await db.get('SELECT stripeCustomerId FROM parent WHERE id = ?', [parentId]);
        if (!parent || !parent.stripeCustomerId) {
          console.error(`Parent not found or has no Stripe customer ID: ${parentId}`);
          continue;
        }
        
        // Collect all items for this parent
        const parentItems = [];
        
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
            console.error(`Product not found: ${productId}`);
            continue;
          }
          
          // Add to the parent's item collection
          parentItems.push({
            productId: productId,
            stripePriceId: product.stripePriceID,
            studentId: null,
            quantity: quantity,
            description: product.name,
            metadata: { 
              productId: productId.toString(),
              description: product.name
            }
          });
        }
        
        // If we have items for this parent, create an invoice
        if (parentItems.length > 0) {
          try {
            const result = await createParentInvoice(
              parentId,
              parent.stripeCustomerId,
              parentItems,
              `School purchase for multiple items`
            );
            
            results.push(result);
          } catch (invoiceError) {
            console.error(`Error creating invoice for parent ${parentId}:`, invoiceError);
          }
        }
      }
    } else {
      // Non-invoice flow - add to subscriptions instead
      for (const parentId of parentIds) {
        // Get parent's Stripe customer ID and subscription
        const parent = await db.get('SELECT stripeCustomerId FROM parent WHERE id = ?', [parentId]);
        if (!parent || !parent.stripeCustomerId) {
          console.error(`Parent not found or has no Stripe customer ID: ${parentId}`);
          continue;
        }
        
        const subscription = await db.get('SELECT stripeSubscriptionId FROM parent_subscriptions WHERE parentId = ? LIMIT 1', [parentId]);
        if (!subscription || !subscription.stripeSubscriptionId) {
          console.error(`No subscription found for parent: ${parentId}`);
          continue;
        }
        
        // Process each item type
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
            console.error(`Product not found: ${productId}`);
            continue;
          }
          
          // Add each item to the subscription
          for (let i = 0; i < quantity; i++) {
            const metadata = { 
              productId: productId.toString(),
              description: product.name
            };
            
            // Add the item to the subscription
            const invoiceItem = await addItemToParentSubscription(
              parent.stripeCustomerId,
              subscription.stripeSubscriptionId,
              product.stripePriceID,
              metadata
            );
            
            // Record the purchase
            const purchaseRecord = await recordParentPurchase(
              parentId,
              productId,
              null,
              invoiceItem.id,
              product.name
            );
            
            results.push({
              invoiceItem,
              purchase: purchaseRecord,
              immediateInvoice: false
            });
          }
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
    console.error('Error updating parent purchases:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
