// scripts/delete_stripe_products_and_customers.ts
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '../lib/config.ts';
import { getDb, getAllAccounts } from '../lib/db.ts';

const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

async function archiveStripeProductsFromDb() {
  console.log('Starting to archive Stripe prices and products from database...');
  const db = await getDb();

  try {
    // Get all products from database grouped by account
    const products = await db.all(`
      SELECT p.stripeProductId, a.accountId as stripeAccountId
      FROM product p
      JOIN account a ON p.accountId = a.id
    `);
    
    console.log(`Found ${products.length} products in database to archive`);
    
    // Group products by account
    const productsByAccount: Record<string, string[]> = {};
    
    for (const product of products) {
      if (!productsByAccount[product.stripeAccountId]) {
        productsByAccount[product.stripeAccountId] = [];
      }
      productsByAccount[product.stripeAccountId].push(product.stripeProductId);
    }
    
    // Archive products by account
    let archivedCount = 0;
    
    for (const [stripeAccountId, productIds] of Object.entries(productsByAccount)) {
      for (const productId of productIds) {
        try {
          // First, deactivate all prices for this product
          const prices = await stripe.prices.list({
            product: productId,
            active: true,
            expand: ['data.product'],
          }, {
            stripeAccount: stripeAccountId
          });
          
          for (const price of prices.data) {
            await stripe.prices.update(price.id, { active: false }, {
              stripeAccount: stripeAccountId
            });
            console.log(`Deactivated price: ${price.id} in account ${stripeAccountId}`);
          }
          
          // Then archive the product
          await stripe.products.update(productId, { active: false }, {
            stripeAccount: stripeAccountId
          });
          console.log(`Archived product: ${productId} in account ${stripeAccountId}`);
          archivedCount++;
        } catch (error: any) {
          console.error(`Error archiving product ${productId} in account ${stripeAccountId}:`, error.message);
        }
      }
    }
    
    // Get all subscriptions from database
    const subscriptions = await db.all(`
      SELECT s.stripeProductId, a.accountId as stripeAccountId
      FROM subscription s
      JOIN account a ON s.accountId = a.id
    `);
    
    console.log(`Found ${subscriptions.length} subscriptions in database to archive`);
    
    // Group subscriptions by account
    const subscriptionsByAccount: Record<string, string[]> = {};
    
    for (const subscription of subscriptions) {
      if (!subscriptionsByAccount[subscription.stripeAccountId]) {
        subscriptionsByAccount[subscription.stripeAccountId] = [];
      }
      subscriptionsByAccount[subscription.stripeAccountId].push(subscription.stripeProductId);
    }
    
    // Archive subscription products by account
    for (const [stripeAccountId, subscriptionIds] of Object.entries(subscriptionsByAccount)) {
      for (const subscriptionId of subscriptionIds) {
        try {
          // First, find and deactivate all prices for this product
          const prices = await db.all(`
            SELECT sp.stripePriceID
            FROM subscription_price sp
            JOIN subscription s ON sp.subId = s.id
            JOIN account a ON s.accountId = a.id
            WHERE s.stripeProductId = ? AND a.accountId = ?
          `, [subscriptionId, stripeAccountId]);
          
          for (const price of prices) {
            if (price.stripePriceID) {
              await stripe.prices.update(price.stripePriceID, { active: false }, {
                stripeAccount: stripeAccountId
              });
              console.log(`Deactivated subscription price: ${price.stripePriceID} in account ${stripeAccountId}`);
            }
          }
          
          // Then archive the subscription product
          await stripe.products.update(subscriptionId, { active: false }, {
            stripeAccount: stripeAccountId
          });
          console.log(`Archived subscription product: ${subscriptionId} in account ${stripeAccountId}`);
          archivedCount++;
        } catch (error: any) {
          console.error(`Error archiving subscription product ${subscriptionId} in account ${stripeAccountId}:`, error.message);
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
  // Get all parents with Stripe customer IDs grouped by account
  const parents = await db.all(`
    SELECT p.id, p.stripeCustomerId, p.firstName, p.lastName, a.accountId as stripeAccountId
    FROM parent p
    JOIN account a ON p.accountId = a.id
    WHERE p.stripeCustomerId IS NOT NULL
  `);
  
  console.log(`Found ${parents.length} customers in database to delete`);
  
  // Group customers by account
  const customersByAccount: Record<string, Array<{id: number, customerId: string, name: string}>> = {};
  
  for (const parent of parents) {
    if (!customersByAccount[parent.stripeAccountId]) {
      customersByAccount[parent.stripeAccountId] = [];
    }
    customersByAccount[parent.stripeAccountId].push({
      id: parent.id,
      customerId: parent.stripeCustomerId,
      name: `${parent.firstName} ${parent.lastName}`
    });
  }
  
  // Delete customers by account
  let deletedCount = 0;
  
  for (const [stripeAccountId, customers] of Object.entries(customersByAccount)) {
    for (const customer of customers) {
      try {
        await stripe.customers.del(customer.customerId, {
          stripeAccount: stripeAccountId
        });
        console.log(`Deleted customer: ${customer.customerId} (${customer.name}) in account ${stripeAccountId}`);
        deletedCount++;
      } catch (error: any) {
        console.error(`Error deleting customer ${customer.customerId} in account ${stripeAccountId}:`, error.message);
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

// Delete a specific Stripe Connect account
async function deleteConnectedAccount(stripeAccountId: string) {
try {
  await stripe.accounts.del(stripeAccountId);
  console.log(`Deleted Stripe Connect account: ${stripeAccountId}`);
  return true;
} catch (error: any) {
  console.error(`Error deleting Stripe Connect account ${stripeAccountId}:`, error.message);
  return false;
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
    'staff',
    'settings',
    'account'
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
  
  // When running this script with a CONNECTED_ACCOUNT, only clean that account
  if (process.env.CONNECTED_ACCOUNT) {
    console.log(`Using connected account from .env: ${process.env.CONNECTED_ACCOUNT}`);
    
    const db = await getDb();
    const account = await db.get('SELECT id FROM account WHERE accountId = ?', [process.env.CONNECTED_ACCOUNT]);
    
    if (account) {
      // First delete all customers to prevent subscription errors
      const customersResult = await deleteStripeCustomersFromDb();
      
      // Then archive all products and prices
      const productsResult = await archiveStripeProductsFromDb();
      
      console.log('=== Cleanup for specific connected account complete ===');
      console.log(`Archived ${productsResult.archivedCount} products from database`);
      console.log(`Deleted ${customersResult.deletedCount} customers from database`);
    } else {
      console.log(`No account found with the provided CONNECTED_ACCOUNT ID`);
    }
  } else {
    // If no specific account, clean everything
    // Get all accounts and delete their connected accounts if needed
    const accounts = await getAllAccounts();
    
    // First delete all customers to prevent subscription errors
    const customersResult = await deleteStripeCustomersFromDb();
    
    // Then archive all products and prices
    const productsResult = await archiveStripeProductsFromDb();
    
    // Delete connected accounts if requested
    const deleteConnected = process.argv.includes('--delete-connected-accounts');
    if (deleteConnected) {
      for (const account of accounts) {
        await deleteConnectedAccount(account.accountId);
      }
      console.log(`Attempted to delete ${accounts.length} connected accounts`);
    }
    
    // Finally clear the local database if requested
    const clearDb = process.argv.includes('--clear-database');
    if (clearDb) {
      await clearLocalDatabase();
    }
    
    console.log('=== Cleanup complete ===');
    console.log(`Archived ${productsResult.archivedCount} products from database`);
    console.log(`Deleted ${customersResult.deletedCount} customers from database`);
    if (clearDb) {
      console.log('Local database has been reset');
    }
  }
} catch (error) {
  console.error('Cleanup process failed:', error);
  process.exit(1);
}
}

// Execute the cleanup
cleanupAll().catch(console.error);
