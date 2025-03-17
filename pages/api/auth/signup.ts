// pages/api/auth/signup.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createParent, createStudent } from '../../../lib/parentStudent';
import { getSubscriptionByYearAndPeriod } from '../../../lib/products';
import { createStripeCustomer, createSubscription } from '../../../lib/stripe';
import { generateToken, setAuthCookie } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { parent, students } = req.body;

  if (!parent || !students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Parent information and at least one student are required' 
    });
  }

  try {
    // Create parent
    const createdParent = await createParent({
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
      password: 'password', // Default password, should be changed in a real application
      emoji: parent.emoji,
      addressLine1: parent.address.line1 || '',
      addressLine2: parent.address.line2 || '',
      subsurb: parent.address.city || '',
      city: parent.address.state || '',
      postCode: parent.address.postal_code || '',
      country: parent.address.country || ''
    });
    
    // Create students and add subscriptions
    const subscriptionItems = [];
    
    for (const studentData of students) {
      if (!studentData.firstName || !studentData.lastName || !studentData.year) continue;
      
      // Create student
      const student = await createStudent({
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        year: studentData.year,
        parentId: createdParent.id
      });
      
      // Get subscription for student's year
      const subscription = await getSubscriptionByYearAndPeriod(
        studentData.year, 
        parent.paymentFrequency
      );
      
      if (subscription) {
        subscriptionItems.push({
          price: subscription.stripePriceID,
          metadata: {
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            year: student.year.toString()
          }
        });
      }
    }
    
    // Create Stripe subscription for tuition
    if (subscriptionItems.length > 0 && parent.paymentMethodId) {
      const subscription = await createSubscription(
        createdParent.stripeCustomerId,
        subscriptionItems,
        parent.paymentMethodId
      );
    }
    
    // Generate JWT token
    const token = generateToken({
      id: createdParent.id,
      email: createdParent.email,
      role: 'parent'
    });
    
    // Set auth cookie
    setAuthCookie(res, token);
    
    return res.status(200).json({ 
      success: true, 
      parent: {
        id: createdParent.id,
        firstName: createdParent.firstName,
        lastName: createdParent.lastName,
        email: createdParent.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Server error during signup' });
  }
}
