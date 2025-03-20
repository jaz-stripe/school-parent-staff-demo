// lib/products.ts
import { getDb } from './db';
import { createProduct, createPriceForProduct } from './stripe';

// Get products for a specific account
export async function getAccountProducts(accountId: number, type?: string) {
    const db = await getDb();
    
    if (type) {
      return await db.all('SELECT * FROM product WHERE type = ? AND accountId = ?', [type, accountId]);
    }
    
    return await db.all('SELECT * FROM product WHERE accountId = ?', [accountId]);
  }
  
  // Create a tuition product for a specific account
  export async function createTuitionProduct(name: string, year: number, amount: number, accountId: number, stripeAccountId?: string) {
    const db = await getDb();
    
    // Create Stripe product in the connected account
    const product = await createProduct(name, 'tuition', year, stripeAccountId);
    
    // Insert into subscription table
    const { lastID } = await db.run(`
      INSERT INTO subscription (name, year, stripeProductId, accountId)
      VALUES (?, ?, ?, ?)
    `, [name, year, product.id, accountId]);
    
    // Create prices for different periods
    const yearlyPrice = await createPriceForProduct(product.id, amount, true, 'year', stripeAccountId);
    const monthlyPrice = await createPriceForProduct(product.id, Math.round(amount / 12), true, 'month', stripeAccountId);
    const weeklyPrice = await createPriceForProduct(product.id, Math.round(amount / 52), true, 'week', stripeAccountId);
    
    // Insert prices into subscription_price table
    await db.run(`
      INSERT INTO subscription_price (subId, period, stripePriceID, accountId)
      VALUES (?, ?, ?, ?)
    `, [lastID, 'yearly', yearlyPrice.id, accountId]);
    
    await db.run(`
      INSERT INTO subscription_price (subId, period, stripePriceID, accountId)
      VALUES (?, ?, ?, ?)
    `, [lastID, 'monthly', monthlyPrice.id, accountId]);
    
    await db.run(`
      INSERT INTO subscription_price (subId, period, stripePriceID, accountId)
      VALUES (?, ?, ?, ?)
    `, [lastID, 'weekly', weeklyPrice.id, accountId]);
    
    // Return the full subscription with prices
    return await db.get(`
      SELECT s.*, 
             yearly.id as yearlyPriceId, yearly.stripePriceID as yearlyPriceStripeId,
             monthly.id as monthlyPriceId, monthly.stripePriceID as monthlyPriceStripeId,
             weekly.id as weeklyPriceId, weekly.stripePriceID as weeklyPriceStripeId
      FROM subscription s
      LEFT JOIN subscription_price yearly ON s.id = yearly.subId AND yearly.period = 'yearly'
      LEFT JOIN subscription_price monthly ON s.id = monthly.subId AND monthly.period = 'monthly'
      LEFT JOIN subscription_price weekly ON s.id = weekly.subId AND weekly.period = 'weekly'
      WHERE s.id = ?
    `, [lastID]);
  }
  
  // Create a non-tuition product for a specific account
  export async function createNonTuitionProduct(name: string, type: string, amount: number, accountId: number, stripeAccountId?: string) {
    const db = await getDb();
    
    // Create Stripe product in the connected account
    const product = await createProduct(name, type, 0, stripeAccountId);
    
    // Create price (one-time)
    const price = await createPriceForProduct(product.id, amount, false, 'month', stripeAccountId);
    
    // Insert into product table
    const { lastID } = await db.run(`
      INSERT INTO product (name, type, stripeProductId, stripePriceID, amount, accountId)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, type, product.id, price.id, amount, accountId]);
    
    // Return the created product
    return await db.get('SELECT * FROM product WHERE id = ?', [lastID]);
  }
  
  // Get parent subscriptions for a specific account
  export async function getParentSubscriptions(parentId: number) {
    const db = await getDb();
    
    return await db.all(`
      SELECT ps.*, 
             s.name as subscriptionName, s.year as subscriptionYear,
             sp.period as subscriptionPeriod,
             st.firstName as studentFirstName, st.lastName as studentLastName
      FROM parent_subscriptions ps
      JOIN subscription s ON ps.productId = s.id
      JOIN subscription_price sp ON ps.priceId = sp.id
      LEFT JOIN student st ON ps.studentId = st.id
      WHERE ps.parentId = ?
    `, [parentId]);
  }
  
  // Get parent purchases for a specific account
  export async function getParentPurchases(parentId: number) {
    const db = await getDb();
    
    return await db.all(`
      SELECT pp.*,
             p.name as productName, p.type as productType,
             st.firstName as studentFirstName, st.lastName as studentLastName
      FROM parent_purchases pp
      JOIN product p ON pp.productId = p.id
      LEFT JOIN student st ON pp.studentId = st.id
      WHERE pp.parentId = ?
    `, [parentId]);
  }
  