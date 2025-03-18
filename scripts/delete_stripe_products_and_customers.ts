// scripts/delete_stripe_products_and_customers.ts
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '../lib/config.ts';
import { getDb } from '../lib/db.ts';

const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

async function archiveStripeProductsFromDb() {
  console.log('Starting to archive Stripe prices and products from database...');
  const db = await getDb();

  try {
    // Get all products from database
    const products = await db.all('SELECT stripeProductId FROM product');
    console.log(`Found ${products.length} products in database to archive`);
    
    // Archive each product
    let archivedCount = 0;
    for (const product of products) {
      if (product.stripeProductId) {
        try {
          // First, deactivate all prices for this product
          const prices = await stripe.prices.list({
            product: product.stripeProductId,
            active: true
          });
          
          for (const price of prices.data) {
            await stripe.prices.update(price.id, { active: false });
            console.log(`Deactivated price: ${price.id}`);
          }
          
          // Then archive the product
          await stripe.products.update(product.stripeProductId, { active: false });
          console.log(`Archived product: ${product.stripeProductId}`);
          archivedCount++;
        } catch (error: any) {
          console.error(`Error archiving product ${product.stripeProductId}:`, error.message);
        }
      }
    }
    
    // Get all subscriptions from database
    const subscriptions = await db.all('SELECT stripeProductId FROM subscription');
    console.log(`Found ${subscriptions.length} subscriptions in database to archive`);
    
    // Archive each subscription product
    for (const sub of subscriptions) {
      if (sub.stripeProductId) {
        try {
          // First, find and deactivate all prices for this product
          const prices = await db.all('SELECT stripePriceID FROM subscription_price WHERE subId IN (SELECT id FROM subscription WHERE stripeProductId = ?)', 
            [sub.stripeProductId]);
          
          for (const price of prices) {
            if (price.stripePriceID) {
              await stripe.prices.update(price.stripePriceID, { active: false });
              console.log(`Deactivated subscription price: ${price.stripePriceID}`);
            }
          }
          
          // Then archive the subscription product
          await stripe.products.update(sub.stripeProductId, { active: false });
          console.log(`Archived subscription product: ${sub.stripeProductId}`);
          archivedCount++;
        } catch (error: any) {
          console.error(`Error archiving subscription product ${sub.stripeProductId}:`, error.message);
        }
      }
    }
    
    console.log(`Successfully archived ${archivedCount} products`);
    return { archivedCount };
  } catch (error: any) {
    console.error('Error archiving products:', error.message);
    throw error;
  }
}

async function deleteStripeCustomersFromDb() {
  console.log('Starting to delete Stripe customers from database...');
  const db = await getDb();

  try {
    // Get all parents with Stripe customer IDs
    const parents = await db.all('SELECT id, stripeCustomerId, firstName, lastName FROM parent WHERE stripeCustomerId IS NOT NULL');
    console.log(`Found ${parents.length} customers in database to delete`);
    
    // Delete each customer
    let deletedCount = 0;
    for (const parent of parents) {
      if (parent.stripeCustomerId) {
        try {
          await stripe.customers.del(parent.stripeCustomerId);
          console.log(`Deleted customer: ${parent.stripeCustomerId} (${parent.firstName} ${parent.lastName})`);
          deletedCount++;
        } catch (error: any) {
          console.error(`Error deleting customer ${parent.stripeCustomerId}:`, error.message);
        }
      }
    }
    
    console.log(`Successfully deleted ${deletedCount} customers`);
    return { deletedCount };
  } catch (error: any) {
    console.error('Error deleting customers:', error.message);
    throw error;
  }
}

async function clearLocalDatabase() {
  console.log('Clearing local database tables...');
  
  try {
    const db = await getDb();
    
    // List of tables to clear (in order to respect foreign key constraints)
    // Delete child tables first before parent tables
    const tablesToClear = [
      'parent_purchases',
      'parent_subscriptions',
      'student',
      'parent',
      'subscription_price',
      'subscription',
      'product',
      'settings' // Also clear settings if you have this table
    ];
    
    for (const table of tablesToClear) {
      await db.run(`DELETE FROM ${table}`);
      console.log(`Cleared table: ${table}`);
    }
    
    // Reset auto-increment counters
    for (const table of tablesToClear) {
      try {
        await db.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
      } catch (e) {
        // Ignore errors here as this table might not exist
      }
    }
    
    console.log('Local database cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing local database:', error);
    throw error;
  }
}

async function cleanupAll() {
  try {
    console.log('=== Starting cleanup process ===');
    
    // First delete all customers (to prevent subscription errors)
    const customersResult = await deleteStripeCustomersFromDb();
    
    // Then archive all products and prices
    const productsResult = await archiveStripeProductsFromDb();
    
    // Finally clear the local database
    // await clearLocalDatabase();
    
    console.log('=== Cleanup complete ===');
    console.log(`Archived ${productsResult.archivedCount} products from database`);
    console.log(`Deleted ${customersResult.deletedCount} customers from database`);
    console.log('Local database has been reset');
    
  } catch (error) {
    console.error('Cleanup process failed:', error);
    process.exit(1);
  }
}

// Execute the cleanup
cleanupAll().catch(console.error);
