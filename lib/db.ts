import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

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
    CREATE TABLE IF NOT EXISTS parent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
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
      isOnboarded BOOLEAN DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS student (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      parentID INTEGER,,
      isOnboarded BOOLEAN DEFAULT 0
      FOREIGN KEY(parentID) REFERENCES parent(id)
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS subscription (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      year INTEGER DEFAULT 0,
      stripeProductId TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscription_price (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subId INTEGER NOT NULL,
      period TEXT NOT NULL UNIQUE,
      stripePriceID TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      stripeProductId TEXT NOT NULL,
      stripePriceID TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parent_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parentId INTEGER NOT NULL,
      productId INTEGER,
      priceId INTEGER,
      purchaseFor INTEGER,
      description TEXT,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(parentId) REFERENCES parent(id),
      FOREIGN KEY(purchaseFor) REFERENCES student(id),
      FOREIGN KEY (productId) REFERENCES subscription(id),
      FOREIGN KEY (priceId) REFERENCES subscription_prices(id),
    );

    CREATE TABLE IF NOT EXISTS parent_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parentId INTEGER NOT NULL,
      productId INTEGER,
      purchaseFor INTEGER,
      description TEXT,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(parentId) REFERENCES parent(id),
      FOREIGN KEY (productId) REFERENCES product(id)
    );
  `);
  console.log('Database schema initialized');
}

// This ensures the database is initialized when this module is imported
getDb().catch(console.error);
