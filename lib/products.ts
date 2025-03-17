// lib/products.ts
import { getDb } from './db.ts';
import { createProduct, createPriceForProduct } from './stripe.ts';

// Get all products
export async function getAllProducts(type?: string) {
  const db = await getDb();
  
  if (type) {
    return await db.all('SELECT * FROM product WHERE type = ?', [type]);
  }
  
  return await db.all('SELECT * FROM product');
}

// Get all subscriptions (tuition)
export async function getAllSubscriptions(year?: number) {
  const db = await getDb();
  
  let query = `
    SELECT s.*, sp.id as priceId, sp.period, sp.stripePriceID
    FROM subscription s
    JOIN subscription_price sp ON s.id = sp.subId
  `;
  
  let params: any[] = [];
  
  if (year) {
    query += ' WHERE s.year = ?';
    params.push(year);
  }
  
  return await db.all(query, params);
}

// Get subscription by year and period
export async function getSubscriptionByYearAndPeriod(year: number, period: string) {
  const db = await getDb();
  
  return await db.get(`
    SELECT s.*, sp.id as priceId, sp.period, sp.stripePriceID
    FROM subscription s
    JOIN subscription_price sp ON s.id = sp.subId
    WHERE s.year = ? AND sp.period = ?
  `, [year, period]);
}

// Create a tuition product
export async function createTuitionProduct(name: string, year: number, amount: number) {
  const db = await getDb();
  
  // Create Stripe product
  const product = await createProduct(name, 'tuition', year);
  
  // Insert into subscription table
  const { lastID } = await db.run(`
    INSERT INTO subscription (name, year, stripeProductId)
    VALUES (?, ?, ?)
  `, [name, year, product.id]);
  
  // Create prices for different periods
  const yearlyPrice = await createPriceForProduct(product.id, amount, true, 'year');
  const monthlyPrice = await createPriceForProduct(product.id, Math.round(amount / 12), true, 'month');
  const weeklyPrice = await createPriceForProduct(product.id, Math.round(amount / 52), true, 'week');
  
  // Insert prices into subscription_price table
  await db.run(`
    INSERT INTO subscription_price (subId, period, stripePriceID)
    VALUES (?, ?, ?)
  `, [lastID, 'yearly', yearlyPrice.id]);
  
  await db.run(`
    INSERT INTO subscription_price (subId, period, stripePriceID)
    VALUES (?, ?, ?)
  `, [lastID, 'monthly', monthlyPrice.id]);
  
  await db.run(`
    INSERT INTO subscription_price (subId, period, stripePriceID)
    VALUES (?, ?, ?)
  `, [lastID, 'weekly', weeklyPrice.id]);
  
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

// Create a non-tuition product (studentItem or parentItem)
export async function createNonTuitionProduct(name: string, type: string, amount: number) {
  const db = await getDb();
  
  // Create Stripe product
  const product = await createProduct(name, type);
  
  // Create price (one-time)
  const price = await createPriceForProduct(product.id, amount);
  
  // Insert into product table
  const { lastID } = await db.run(`
    INSERT INTO product (name, type, stripeProductId, stripePriceID, amount)
    VALUES (?, ?, ?, ?, ?)
  `, [name, type, product.id, price.id, amount]);
  
  // Return the created product
  return await db.get('SELECT * FROM product WHERE id = ?', [lastID]);
}

// Get product by ID
export async function getProductById(productId: number) {
  const db = await getDb();
  return await db.get('SELECT * FROM product WHERE id = ?', [productId]);
}

// Add subscription for a parent
export async function addParentSubscription(
  parentId: number,
  productId: number,
  priceId: number,
  studentId: number | null,
  stripeSubscriptionId: string,
  description?: string
) {
  const db = await getDb();
  
  const { lastID } = await db.run(`
    INSERT INTO parent_subscriptions (
      parentId, productId, priceId, studentId, stripeSubscriptionId, description
    ) VALUES (?, ?, ?, ?, ?, ?)
  `, [parentId, productId, priceId, studentId, stripeSubscriptionId, description || null]);
  
  return await db.get('SELECT * FROM parent_subscriptions WHERE id = ?', [lastID]);
}

// Add purchase for a parent
export async function addParentPurchase(
  parentId: number,
  productId: number,
  studentId: number | null,
  stripeInvoiceId: string,
  description?: string
) {
  const db = await getDb();
  
  const { lastID } = await db.run(`
    INSERT INTO parent_purchases (
      parentId, productId, studentId, stripeInvoiceId, description
    ) VALUES (?, ?, ?, ?, ?)
  `, [parentId, productId, studentId, stripeInvoiceId, description || null]);
  
  return await db.get('SELECT * FROM parent_purchases WHERE id = ?', [lastID]);
}

// Get parent subscriptions
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

// Get parent purchases
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
