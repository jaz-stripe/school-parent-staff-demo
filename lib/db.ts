// lib/db.ts
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { staffMembers } from '../data/PeterRabbitAndFriends.ts';

let db: any = null;

export async function getDb() {
  if (!db) {
    db = await open({
      filename: './mydb.sqlite',
      driver: sqlite3.Database
    });
    console.log('Database connection established');
    await initialiseDb(db);
  }
  return db;
}

async function initialiseDb(db: any) {
  await db.exec(`
    -- Create account table for Stripe Connect accounts
    CREATE TABLE IF NOT EXISTS account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      logo TEXT NOT NULL,
      country TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      onboarding_complete BOOLEAN DEFAULT 0,
      capabilities TEXT,
      is_populated BOOLEAN DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS parent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT,
      password TEXT,
      emoji TEXT,
      stripeCustomerId TEXT,
      hasPaymentMethod BOOLEAN DEFAULT 0,
      defaultPaymentMethodID TEXT,
      addressLine1 TEXT,
      addressLine2 TEXT,
      subsurb TEXT,
      city TEXT,
      postCode TEXT,
      country TEXT,
      isOnboarded BOOLEAN DEFAULT 0,
      accountId INTEGER,
      FOREIGN KEY(accountId) REFERENCES account(id)
    );
    
    CREATE TABLE IF NOT EXISTS student (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      year INTEGER,
      parentID INTEGER,
      isOnboarded BOOLEAN DEFAULT 0,
      accountId INTEGER,
      FOREIGN KEY(parentID) REFERENCES parent(id),
      FOREIGN KEY(accountId) REFERENCES account(id)
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT,
      password TEXT,
      emoji TEXT,
      accountId INTEGER,
      FOREIGN KEY(accountId) REFERENCES account(id)
    );

    CREATE TABLE IF NOT EXISTS subscription (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year INTEGER DEFAULT 0,
      stripeProductId TEXT NOT NULL,
      accountId INTEGER,
      FOREIGN KEY(accountId) REFERENCES account(id)
    );

    CREATE TABLE IF NOT EXISTS subscription_price (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subId INTEGER NOT NULL,
      period TEXT NOT NULL,
      stripePriceID TEXT NOT NULL,
      accountId INTEGER,
      FOREIGN KEY(subId) REFERENCES subscription(id),
      FOREIGN KEY(accountId) REFERENCES account(id)
    );

    CREATE TABLE IF NOT EXISTS product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      stripeProductId TEXT NOT NULL,
      stripePriceID TEXT NOT NULL,
      amount INTEGER NOT NULL,
      accountId INTEGER,
      FOREIGN KEY(accountId) REFERENCES account(id)
    );

    CREATE TABLE IF NOT EXISTS parent_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parentId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      priceId INTEGER NOT NULL,
      studentId INTEGER,
      stripeSubscriptionId TEXT,
      description TEXT,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      accountId INTEGER,
      FOREIGN KEY(parentId) REFERENCES parent(id),
      FOREIGN KEY(studentId) REFERENCES student(id),
      FOREIGN KEY(productId) REFERENCES subscription(id),
      FOREIGN KEY(priceId) REFERENCES subscription_price(id),
      FOREIGN KEY(accountId) REFERENCES account(id)
    );

    CREATE TABLE IF NOT EXISTS parent_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parentId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      studentId INTEGER,
      stripeInvoiceId TEXT,
      description TEXT,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      accountId INTEGER,
      FOREIGN KEY(parentId) REFERENCES parent(id),
      FOREIGN KEY(productId) REFERENCES product(id),
      FOREIGN KEY(studentId) REFERENCES student(id),
      FOREIGN KEY(accountId) REFERENCES account(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      accountId INTEGER,
      FOREIGN KEY(accountId) REFERENCES account(id),
      PRIMARY KEY(key, accountId)
    );

    -- Check if we need to create migration for existing data
    SELECT count(*) as count FROM pragma_table_info('parent') WHERE name='accountId';
  `);

  // Check if we need to perform a migration
  const needsMigration = await db.get('SELECT count(*) as count FROM pragma_table_info("parent") WHERE name="accountId"');
  
  if (needsMigration.count === 0) {
    console.log('Database needs to be migrated to add accountId columns...');
    
    try {
      // Begin transaction
      await db.run('BEGIN TRANSACTION');
      
      // Create a default account if needed
      let defaultAccountId = 1;
      const accountExists = await db.get('SELECT 1 FROM account LIMIT 1');
      
      if (!accountExists) {
        // Choose a default account ID from env or create a new one
        const stripeAccountId = process.env.CONNECTED_ACCOUNT || 'acct_default';
        
        const result = await db.run(`
          INSERT INTO account (accountId, name, email, logo, country, onboarding_complete, is_populated)
          VALUES (?, ?, ?, ?, ?, 1, 1)
        `, [
          stripeAccountId,
          'Default School',
          process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'demo@example.com',
          'school-1.png',
          'AU'
        ]);
        
        defaultAccountId = result.lastID;
        console.log(`Created default account with ID: ${defaultAccountId}`);
      } else {
        // Get the first account ID
        const firstAccount = await db.get('SELECT id FROM account ORDER BY id LIMIT 1');
        defaultAccountId = firstAccount.id;
      }
      
      // Add accountId column to all tables that need it
      const tablesToModify = [
        'parent', 'student', 'staff', 'subscription', 
        'subscription_price', 'product', 'parent_subscriptions',
        'parent_purchases', 'settings'
      ];
      
      for (const table of tablesToModify) {
        // Add accountId column if it doesn't exist
        await db.run(`ALTER TABLE ${table} ADD COLUMN accountId INTEGER REFERENCES account(id)`);
        console.log(`Added accountId column to ${table} table`);
        
        // Set default accountId for existing records
        await db.run(`UPDATE ${table} SET accountId = ?`, [defaultAccountId]);
        console.log(`Updated existing records in ${table} with accountId: ${defaultAccountId}`);
      }
      
      // Commit transaction
      await db.run('COMMIT');
      console.log('Migration completed successfully');
      
    } catch (error) {
      // Roll back if there's an error
      await db.run('ROLLBACK');
      console.error('Error during migration:', error);
      throw error;
    }
  }

  // Check if we have a CONNECTED_ACCOUNT in env and create it if needed
  if (process.env.CONNECTED_ACCOUNT) {
    const connectedAccountExists = await db.get('SELECT 1 FROM account WHERE accountId = ?', [process.env.CONNECTED_ACCOUNT]);
    
    if (!connectedAccountExists) {
      console.log(`Creating account for provided CONNECTED_ACCOUNT: ${process.env.CONNECTED_ACCOUNT}`);
      
      try {
        // Insert the account
        const accountResult = await db.run(`
          INSERT INTO account (accountId, name, email, logo, country, onboarding_complete, is_populated)
          VALUES (?, ?, ?, ?, ?, 1, 1)
        `, [
          process.env.CONNECTED_ACCOUNT,
          'Default Connected School',
          process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'demo@example.com',
          'school-1.png',
          'AU'
        ]);
        
        const accountId = accountResult.lastID;
        console.log(`Created account for CONNECTED_ACCOUNT: ${process.env.CONNECTED_ACCOUNT} with ID ${accountId}`);
        
        // Add staff members to this account
        for (const staff of staffMembers) {
          const staffExists = await db.get(
            'SELECT 1 FROM staff WHERE email = ? AND accountId = ?',
            [staff.email, accountId]
          );
          
          if (!staffExists) {
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
            console.log(`Added staff member ${staff.firstName} ${staff.lastName} to account ${accountId}`);
          }
        }
      } catch (error) {
        console.error('Error creating account for CONNECTED_ACCOUNT:', error);
      }
    } else {
      // Account exists, check if it has staff
      const account = await db.get('SELECT id FROM account WHERE accountId = ?', [process.env.CONNECTED_ACCOUNT]);
      const staffCount = await db.get('SELECT COUNT(*) as count FROM staff WHERE accountId = ?', [account.id]);
      
      if (staffCount.count === 0) {
        console.log(`Adding staff to existing account for ${process.env.CONNECTED_ACCOUNT} (ID: ${account.id})`);
        
        // Add staff members to this account
        for (const staff of staffMembers) {
          await db.run(`
            INSERT INTO staff (firstName, lastName, email, password, emoji, accountId)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            staff.firstName,
            staff.lastName,
            staff.email,
            staff.password,
            staff.emoji,
            account.id
          ]);
          console.log(`Added staff member ${staff.firstName} ${staff.lastName} to account ${account.id}`);
        }
      }
    }
  }

  // Check all accounts for staff and add if missing
  const accounts = await db.all('SELECT id FROM account');
  for (const account of accounts) {
    const staffCount = await db.get('SELECT COUNT(*) as count FROM staff WHERE accountId = ?', [account.id]);
    
    if (staffCount.count === 0) {
      console.log(`Adding default staff to account ${account.id}`);
      
      // Add staff members to this account
      for (const staff of staffMembers) {
        await db.run(`
          INSERT INTO staff (firstName, lastName, email, password, emoji, accountId)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          staff.firstName,
          staff.lastName,
          staff.email,
          staff.password,
          staff.emoji,
          account.id
        ]);
        console.log(`Added staff member ${staff.firstName} ${staff.lastName} to account ${account.id}`);
      }
    }
  }

  console.log('Database schema initialized');
}

// Get a specific account by ID
export async function getAccountById(id: number) {
  const db = await getDb();
  return await db.get('SELECT * FROM account WHERE id = ?', [id]);
}

// Get a specific account by Stripe account ID
export async function getAccountByStripeId(stripeAccountId: string) {
  const db = await getDb();
  return await db.get('SELECT * FROM account WHERE accountId = ?', [stripeAccountId]);
}

// Get all accounts
export async function getAllAccounts() {
  const db = await getDb();
  return await db.all('SELECT * FROM account ORDER BY name');
}

// Create a new account
export async function createAccount(accountData: {
  accountId: string;
  name: string;
  email: string;
  logo: string;
  country: string;
  onboarding_complete?: boolean;
}) {
  const db = await getDb();
  
  const { lastID } = await db.run(`
    INSERT INTO account (accountId, name, email, logo, country, onboarding_complete, is_populated)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `, [
    accountData.accountId,
    accountData.name,
    accountData.email,
    accountData.logo,
    accountData.country,
    accountData.onboarding_complete ? 1 : 0
  ]);
  
  return await db.get('SELECT * FROM account WHERE id = ?', [lastID]);
}

// Update account onboarding status
export async function updateAccountOnboarding(accountId: number, isComplete: boolean, capabilities?: any) {
  const db = await getDb();
  
  await db.run(`
    UPDATE account 
    SET onboarding_complete = ?, capabilities = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    isComplete ? 1 : 0,
    capabilities ? JSON.stringify(capabilities) : null,
    accountId
  ]);
  
  return await db.get('SELECT * FROM account WHERE id = ?', [accountId]);
}

// Mark an account as populated
export async function markAccountAsPopulated(accountId: number) {
  const db = await getDb();
  
  await db.run(`
    UPDATE account 
    SET is_populated = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [accountId]);
  
  return await db.get('SELECT * FROM account WHERE id = ?', [accountId]);
}

// This ensures the database is initialized when this module is imported
getDb().catch(console.error);
