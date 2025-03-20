// scripts/populate_account.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { getDb, markAccountAsPopulated } from '../lib/db.ts';
import { createTuitionProduct, createNonTuitionProduct } from '../lib/products.ts';
import { staffMembers } from '../data/PeterRabbitAndFriends.ts';
import { getOrCreatePortalConfiguration } from '../lib/stripe.ts';

// Define paths for CSV files
const productsPath = path.resolve(process.cwd(), './data/products.csv');

// Main function to populate an account's database
export async function populateAccountDatabase(accountId: number, stripeConnectId: string) {
  try {
    console.log(`Starting database population for account ${accountId}...`);
    const db = await getDb();
    
    // Check if the account exists
    const account = await db.get('SELECT * FROM account WHERE id = ?', [accountId]);
    
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    
    // Check if the account is already populated
    if (account.is_populated) {
      console.log(`Account ${accountId} is already populated, skipping`);
      return;
    }
    
    // Populate staff for this account
    await populateStaffForAccount(accountId);
    
    // Process products from CSV for this account
    await processProductsForAccount(accountId, stripeConnectId);
    
    // Initialize the portal configuration for this account
    await getOrCreatePortalConfiguration(stripeConnectId);
    
    // Mark the account as populated
    await markAccountAsPopulated(accountId);
    
    console.log(`Database population complete for account ${accountId}!`);
  } catch (error) {
    console.error(`Error populating database for account ${accountId}:`, error);
    throw error;
  }
}

// Populate staff members for an account
async function populateStaffForAccount(accountId: number) {
  console.log(`Populating staff for account ${accountId}...`);
  const db = await getDb();
  
  for (const staff of staffMembers) {
    try {
      // Check if staff already exists for this account
      const existingStaff = await db.get(
        'SELECT 1 FROM staff WHERE email = ? AND accountId = ?',
        [staff.email, accountId]
      );
      
      if (!existingStaff) {
        await db.run(`
          INSERT INTO staff (firstName, lastName, email, password, emoji, accountId)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          staff.firstName,
          staff.lastName,
          staff.email,
          staff.password,
          staff.emoji,
          accountId
        ]);
        console.log(`Added staff: ${staff.firstName} ${staff.lastName}`);
      } else {
        console.log(`Staff ${staff.email} already exists`);
      }
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  }
}

// Process products from CSV for an account
async function processProductsForAccount(accountId: number, stripeConnectId: string) {
  console.log(`Processing products for account ${accountId}...`);
  
  return new Promise<void>((resolve, reject) => {
    const products: any[] = [];
    
    // Read products from CSV
    fs.createReadStream(productsPath)
      .pipe(csv())
      .on('data', (row) => products.push(row))
      .on('end', async () => {
        try {
          for (const product of products) {
            const name = product.title;
            const type = product.type;
            const amount = parseInt(product.amount, 10);
            const year = product.year ? parseInt(product.year, 10) : 0;
            
            // Check if product already exists for this account
            const db = await getDb();
            let existingProduct;
            
            if (type === 'tuition') {
              existingProduct = await db.get(
                'SELECT 1 FROM subscription WHERE name = ? AND year = ? AND accountId = ?',
                [name, year, accountId]
              );
            } else {
              existingProduct = await db.get(
                'SELECT 1 FROM product WHERE name = ? AND type = ? AND accountId = ?',
                [name, type, accountId]
              );
            }
            
            if (existingProduct) {
              console.log(`Product ${name} already exists for account ${accountId}, skipping`);
              continue;
            }
            
            if (type === 'tuition' && year > 0) {
              await createTuitionProduct(name, year, amount, accountId, stripeConnectId);
              console.log(`Created tuition product: ${name} for year ${year}`);
            } else if (type === 'studentItem' || type === 'parentItem') {
              await createNonTuitionProduct(name, type, amount, accountId, stripeConnectId);
              console.log(`Created ${type} product: ${name}`);
            } else {
              console.log(`Skipping invalid product: ${name}`);
            }
          }
          resolve();
        } catch (error) {
          console.error('Error processing products:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Error reading products.csv:', error);
        reject(error);
      });
  });
}
