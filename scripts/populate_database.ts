// scripts/populate_database.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { getDb } from '../lib/db.ts';
import { createTuitionProduct, createNonTuitionProduct } from '../lib/products.ts';
import { characters, staffMembers } from '../data/PeterRabbitAndFriends.ts';
import { getOrCreatePortalConfiguration } from '../lib/stripe.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths for CSV files
const productsPath = path.resolve(__dirname, '../data/products.csv');

async function populateDatabase() {
  try {
    console.log('Starting database population...');
    const db = await getDb();
    
    // Check if we have any accounts
    const accounts = await db.all('SELECT * FROM account');
    
    if (accounts.length === 0) {
      console.log('No accounts found. Please create at least one account first.');
      console.log('You can run the application and use the "Add a New School" option.');
      return;
    }
    
    // Get account ID to populate (using first account if multiple exist)
    const accountId = accounts[0].id;
    const accountStripeId = accounts[0].accountId;
    console.log(`Populating data for account: ${accounts[0].name} (ID: ${accountId})`);
    
    // Populate staff for this account
    await populateStaff(accountId);
    
    // Process products from CSV for this account
    await processProductsFile(accountId, accountStripeId);
    
    // Also initialize the portal configuration for this account
    await getOrCreatePortalConfiguration(accountStripeId);
    
    console.log(`Database population complete for account ID ${accountId}!`);
  } catch (error) {
    console.error('Error in database population:', error);
  }
}

async function populateStaff(accountId) {
  console.log(`Populating staff for account ID ${accountId}...`);
  const db = await getDb();
  
  for (const staff of staffMembers) {
    try {
      await db.run(`
        INSERT OR IGNORE INTO staff (firstName, lastName, email, password, emoji, accountId)
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
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  }
}

async function processProductsFile(accountId, accountStripeId) {
  console.log(`Processing products for account ID ${accountId}...`);
  const db = await getDb();
  
  return new Promise<void>((resolve, reject) => {
    const products: any[] = [];
    
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
            
            if (type === 'tuition' && year > 0) {
              await createTuitionProduct(name, year, amount, accountId, accountStripeId);
              console.log(`Created tuition product: ${name} for year ${year}`);
            } else if (type === 'studentItem' || type === 'parentItem') {
              await createNonTuitionProduct(name, type, amount, accountId, accountStripeId);
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

// Execute the population function
populateDatabase().catch(console.error);
