// scripts/populate_database.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { getDb } from '../lib/db.ts';
import { createTuitionProduct, createNonTuitionProduct } from '../lib/products.ts';
import { characters, staffMembers } from '../data/PeterRabbitAndFriends.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths for CSV files
const productsPath = path.resolve(__dirname, '../data/products.csv');

async function populateStaff() {
  console.log('Populating staff...');
  const db = await getDb();
  
  for (const staff of staffMembers) {
    try {
      await db.run(`
        INSERT OR IGNORE INTO staff (firstName, lastName, email, password, emoji)
        VALUES (?, ?, ?, ?, ?)
      `, [
        staff.firstName,
        staff.lastName,
        staff.email,
        staff.password,
        staff.emoji
      ]);
      console.log(`Added staff: ${staff.firstName} ${staff.lastName}`);
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  }
}

async function processProductsFile() {
  console.log('Processing products...');
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
              await createTuitionProduct(name, year, amount);
              console.log(`Created tuition product: ${name} for year ${year}`);
            } else if (type === 'studentItem' || type === 'parentItem') {
              await createNonTuitionProduct(name, type, amount);
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

// scripts/populate_database.ts (continued)
async function populateDatabase() {
  try {
    console.log('Starting database population...');
    
    // Populate staff first
    await populateStaff();
    
    // Process products from CSV
    await processProductsFile();
    
    console.log('Database population complete!');
  } catch (error) {
    console.error('Error in database population:', error);
  }
}

// Execute the population function
populateDatabase().catch(console.error);

