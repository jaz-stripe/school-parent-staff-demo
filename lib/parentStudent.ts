// lib/parentStudent.ts
import { getDb } from './db';
import { createStripeCustomer, createSetupIntent } from './stripe';

// Get all parents
export async function getAllParents() {
  const db = await getDb();
  const parents = await db.all('SELECT * FROM parent');
  return parents;
}

// Get all students, optionally filtered by parent
export async function getStudents(parentId?: number) {
  const db = await getDb();
  let students;
  
  if (parentId) {
    students = await db.all(`
      SELECT s.*, p.firstName as parentFirstName, p.lastName as parentLastName 
      FROM student s
      JOIN parent p ON s.parentID = p.id
      WHERE s.parentID = ?
    `, [parentId]);
  } else {
    students = await db.all(`
      SELECT s.*, p.firstName as parentFirstName, p.lastName as parentLastName 
      FROM student s
      JOIN parent p ON s.parentID = p.id
    `);
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

// Modify the createParent function to accept a stripeCustomerId
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
    stripeCustomerId?: string; // Make this optional
  }) {
    const db = await getDb();
    
    // Only create Stripe customer if not already provided
    let customerIdToUse = parentData.stripeCustomerId;
    if (!customerIdToUse) {
      // Create Stripe customer
      const customer = await createStripeCustomer(
        parentData.email, 
        `${parentData.firstName} ${parentData.lastName}`
      );
      customerIdToUse = customer.id;
    }
    
    // Insert parent into database
    const result = await db.run(`
      INSERT INTO parent (
        firstName, lastName, email, password, emoji, stripeCustomerId,
        addressLine1, addressLine2, subsurb, city, postCode, country
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      parentData.country
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
}) {
  const db = await getDb();
  
  const result = await db.run(`
    INSERT INTO student (firstName, lastName, year, parentID)
    VALUES (?, ?, ?, ?)
  `, [
    studentData.firstName,
    studentData.lastName,
    studentData.year,
    studentData.parentId
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

// Mark parent as onboarded
export async function markParentOnboarded(parentId: number) {
  const db = await getDb();
  await db.run('UPDATE parent SET isOnboarded = 1 WHERE id = ?', [parentId]);
  return await db.get('SELECT * FROM parent WHERE id = ?', [parentId]);
}

// Create setup intent for parent
export async function createParentSetupIntent(parentId: number) {
  const db = await getDb();
  const parent = await db.get('SELECT * FROM parent WHERE id = ?', [parentId]);
  
  if (!parent || !parent.stripeCustomerId) {
    throw new Error('Parent not found or has no Stripe customer ID');
  }
  
  return await createSetupIntent(parent.stripeCustomerId);
}

// lib/parentStudent.ts (continued)
// Get parent by ID
export async function getParentById(parentId: number) {
    const db = await getDb();
    return await db.get('SELECT * FROM parent WHERE id = ?', [parentId]);
  }
  
  // Get parent by email
  export async function getParentByEmail(email: string) {
    const db = await getDb();
    return await db.get('SELECT * FROM parent WHERE email = ?', [email]);
  }
  
  // Update parent information
  export async function updateParent(parentId: number, updatedData: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    subsurb: string;
    city: string;
    postCode: string;
    country: string;
  }>) {
    const db = await getDb();
    
    const setClause = Object.keys(updatedData)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(updatedData), parentId];
    
    await db.run(`UPDATE parent SET ${setClause} WHERE id = ?`, values);
    
    return await getParentById(parentId);
  }
  
  // Get staff by email
  export async function getStaffByEmail(email: string) {
    const db = await getDb();
    return await db.get('SELECT * FROM staff WHERE email = ?', [email]);
  }
  
  // Get staff by ID
  export async function getStaffById(staffId: number) {
    const db = await getDb();
    return await db.get('SELECT * FROM staff WHERE id = ?', [staffId]);
  }
  
