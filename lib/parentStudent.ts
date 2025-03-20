// lib/parentStudent.ts
import { getDb } from './db';
import { createStripeCustomer, createSetupIntent } from './stripe';

// Get all parents for a specific account
export async function getAllParents(accountId: number) {
  const db = await getDb();
  const parents = await db.all('SELECT * FROM parent WHERE accountId = ?', [accountId]);
  return parents;
}

// Get all students, optionally filtered by parent and account
export async function getStudents(accountId: number, parentId?: number) {
  const db = await getDb();
  let students;
  
  if (parentId) {
    students = await db.all(`
      SELECT s.*, p.firstName as parentFirstName, p.lastName as parentLastName 
      FROM student s
      JOIN parent p ON s.parentID = p.id
      WHERE s.parentID = ? AND s.accountId = ?
    `, [parentId, accountId]);
  } else {
    students = await db.all(`
      SELECT s.*, p.firstName as parentFirstName, p.lastName as parentLastName 
      FROM student s
      JOIN parent p ON s.parentID = p.id
      WHERE s.accountId = ?
    `, [accountId]);
  }
  
  return students;
}

// Get a specific student
export async function getStudent(studentId: number) {
  const db = await getDb();
  const student = await db.get(`
    SELECT s.*, p.firstName as parentFirstName, p.lastName as parentLastName 
    FROM student s
    JOIN parent p ON s.parentID = p.id
    WHERE s.id = ?
  `, [studentId]);
  
  return student;
}

// Create a new parent with account ID
export async function createParent(parentData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  emoji: string;
  addressLine1: string;
  addressLine2?: string;
  subsurb: string;
  city: string;
  postCode: string;
  country: string;
  stripeCustomerId?: string;
  accountId: number;
}) {
  const db = await getDb();
  
  // Get the Stripe account ID for the account
  const account = await db.get('SELECT accountId FROM account WHERE id = ?', [parentData.accountId]);
  
  if (!account) {
    throw new Error(`Account not found: ${parentData.accountId}`);
  }
  
  // Only create Stripe customer if not already provided
  let customerIdToUse = parentData.stripeCustomerId;
  if (!customerIdToUse) {
    // Create Stripe customer with the account's Stripe ID
    const customer = await createStripeCustomer(
      parentData.email, 
      `${parentData.firstName} ${parentData.lastName}`,
      account.accountId
    );
    customerIdToUse = customer.id;
  }
  
  // Insert parent into database
  const result = await db.run(`
    INSERT INTO parent (
      firstName, lastName, email, password, emoji, stripeCustomerId,
      addressLine1, addressLine2, subsurb, city, postCode, country, accountId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    parentData.firstName,
    parentData.lastName,
    parentData.email,
    parentData.password,
    parentData.emoji,
    customerIdToUse,
    parentData.addressLine1,
    parentData.addressLine2 || '',
    parentData.subsurb,
    parentData.city,
    parentData.postCode,
    parentData.country,
    parentData.accountId
  ]);
  
  // Get the created parent
  const parent = await db.get('SELECT * FROM parent WHERE id = ?', [result.lastID]);
  return parent;
}

// Create a new student for a parent
export async function createStudent(studentData: {
  firstName: string;
  lastName: string;
  year: number;
  parentId: number;
  accountId: number;
}) {
  const db = await getDb();
  
  const result = await db.run(`
    INSERT INTO student (firstName, lastName, year, parentID, accountId)
    VALUES (?, ?, ?, ?, ?)
  `, [
    studentData.firstName,
    studentData.lastName,
    studentData.year,
    studentData.parentId,
    studentData.accountId
  ]);
  
  const student = await db.get('SELECT * FROM student WHERE id = ?', [result.lastID]);
  return student;
}

// Set parent payment method
export async function setParentPaymentMethod(parentId: number, paymentMethodId: string) {
  const db = await getDb();
  
  await db.run(`
    UPDATE parent 
    SET defaultPaymentMethodID = ?, hasPaymentMethod = 1
    WHERE id = ?
  `, [paymentMethodId, parentId]);
  
  return await db.get('SELECT * FROM parent WHERE id = ?', [parentId]);
}

// Get parent by ID
export async function getParentById(parentId: number) {
  const db = await getDb();
  return await db.get('SELECT * FROM parent WHERE id = ?', [parentId]);
}

// Get parent by email and account ID
export async function getParentByEmailAndAccount(email: string, accountId: number) {
  const db = await getDb();
  return await db.get('SELECT * FROM parent WHERE email = ? AND accountId = ?', [email, accountId]);
}

// Get staff by email and account ID
export async function getStaffByEmailAndAccount(email: string, accountId: number) {
  const db = await getDb();
  return await db.get('SELECT * FROM staff WHERE email = ? AND accountId = ?', [email, accountId]);
}

// Get staff by ID
export async function getStaffById(staffId: number) {
  const db = await getDb();
  return await db.get('SELECT * FROM staff WHERE id = ?', [staffId]);
}

// Create staff member
export async function createStaffMember(staffData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  emoji: string;
  accountId: number;
}) {
  const db = await getDb();
  
  const result = await db.run(`
    INSERT INTO staff (firstName, lastName, email, password, emoji, accountId)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    staffData.firstName,
    staffData.lastName,
    staffData.email,
    staffData.password,
    staffData.emoji,
    staffData.accountId
  ]);
  
  return await db.get('SELECT * FROM staff WHERE id = ?', [result.lastID]);
}
