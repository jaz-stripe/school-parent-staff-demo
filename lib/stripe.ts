// lib/stripe.ts
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from './config';
import { getDb } from './db';

const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16'
});

// Define types for better TypeScript support
interface StripeAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface Student {
  firstName: string;
  lastName: string;
  year: number;
}

export async function createStripeCustomer(email: string, name: string) {
  try {
    const customer = await stripe.customers.create({ 
      email,
      name
    });
    console.log('Stripe Operation: Create Customer', customer);
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

export async function createProduct(name: string, type: string, year: number = 0) {
  const metadata: any = { type };
  if (year > 0) metadata.year = year.toString();
  
  try {
    const product = await stripe.products.create({
      name,
      metadata
    });
    console.log(`Created product: ${product.id} (${name})`);
    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export async function createPriceForProduct(productId: string, amount: number, recurring: boolean = false, interval: 'day' | 'week' | 'month' | 'year' = 'month') {
  try {
    const priceData: Stripe.PriceCreateParams = {
      product: productId,
      unit_amount: amount,
      currency: 'aud'
    };
    
    if (recurring) {
      priceData.recurring = {
        interval: interval
      };
    }
    
    const price = await stripe.prices.create(priceData);
    console.log(`Created price: ${price.id} for product: ${productId}`);
    return price;
  } catch (error) {
    console.error('Error creating price:', error);
    throw error;
  }
}

export async function createSetupIntent(customerId: string) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return setupIntent;
  } catch (error) {
    console.error('Error creating setup intent:', error);
    throw error;
  }
}

export async function createSubscription(customerId: string, items: Stripe.SubscriptionCreateParams.Item[], defaultPaymentMethod?: string) {
  try {
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent']
    };
    
    if (defaultPaymentMethod) {
      subscriptionParams.default_payment_method = defaultPaymentMethod;
    }
    
    const subscription = await stripe.subscriptions.create(subscriptionParams);
    console.log(`Created subscription: ${subscription.id} for customer: ${customerId}`);
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

export async function addItemToSubscription(subscriptionId: string, priceId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Add the new item
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        ...subscription.items.data.map(item => ({
          id: item.id,
          price: item.price.id,
        })),
        { price: priceId }
      ]
    });
    
    console.log(`Added item with price: ${priceId} to subscription: ${subscriptionId}`);
    return updatedSubscription;
  } catch (error) {
    console.error('Error adding item to subscription:', error);
    throw error;
  }
}

export async function createInvoiceItem(customerId: string, priceId: string, description?: string) {
  try {
    const invoiceItem = await stripe.invoiceItems.create({
      customer: customerId,
      price: priceId,
      description
    });
    console.log(`Created invoice item: ${invoiceItem.id} for customer: ${customerId}`);
    return invoiceItem;
  } catch (error) {
    console.error('Error creating invoice item:', error);
    throw error;
  }
}

export async function createInvoice(customerId: string, autoAdvance: boolean = true) {
  try {
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: autoAdvance,
    });
    
    if (autoAdvance) {
      await stripe.invoices.finalizeInvoice(invoice.id);
      console.log(`Finalized invoice: ${invoice.id} for customer: ${customerId}`);
    } else {
      console.log(`Created draft invoice: ${invoice.id} for customer: ${customerId}`);
    }
    
    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

export async function createPaymentIntent(customerId: string, amount: number, currency: string = 'aud', paymentMethodId?: string) {
  try {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      customer: customerId,
    };
    
    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
      paymentIntentParams.confirm = true;
      paymentIntentParams.off_session = true;
    }
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    console.log(`Created payment intent: ${paymentIntent.id} for customer: ${customerId}`);
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

export async function retrievePaymentMethods(customerId: string, type: string = 'card') {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type
    });
    return paymentMethods;
  } catch (error) {
    console.error('Error retrieving payment methods:', error);
    throw error;
  }
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
    return session;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

export async function constructStripeEvent(buffer: Buffer, signature: string) {
  try {
    return stripe.webhooks.constructEvent(
      buffer, signature, STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error) {
    console.error('Error constructing webhook event:', error);
    throw error;
  }
}

// Define types for better TypeScript support
interface StripeAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface Student {
  firstName: string;
  lastName: string;
  year: number;
}

// Create a customer with address information
export async function createCustomerWithAddress(
  email: string,
  name: string,
  address: StripeAddress
) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      address: {
        line1: address.line1,
        line2: address.line2 || '',
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country,
      }
    });
    
    console.log(`Created Stripe customer: ${customer.id} for ${email}`);
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer with address:', error);
    throw error;
  }
}

// Create a setup intent for an existing customer
export async function createSetupIntentForCustomer(
  customerId: string,
) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session'
    });
    
    console.log(`Created setup intent: ${setupIntent.id} for customer: ${customerId}`);
    return setupIntent;
  } catch (error) {
    console.error('Error creating setup intent for customer:', error);
    throw error;
  }
}

// Attach payment method to customer and set as default
export async function attachPaymentMethodToCustomer(
  customerId: string,
  paymentMethodId: string
) {
  try {
    // First attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    
    // Then set it as the default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      }
    });
    
    console.log(`Attached payment method: ${paymentMethodId} to customer: ${customerId} and set as default`);
    return true;
  } catch (error) {
    console.error('Error attaching payment method to customer:', error);
    throw error;
  }
}

// Create subscription for the customer based on student years and frequency
export async function createSubscriptionForStudents(
  customerId: string,
  paymentMethodId: string,
  students: Student[],
  frequency: 'weekly' | 'monthly' | 'yearly'
) {
  try {
    // First, set the payment method as the default
    await attachPaymentMethodToCustomer(customerId, paymentMethodId);
    
    // Get subscription items based on student years and frequency
    const subscriptionItems = [];
    const db = await getDb();
    
    for (const student of students) {
      // Get the subscription price ID for the student's year and frequency
      const subscription = await db.get(`
        SELECT sp.id as priceId, sp.stripePriceID, s.id as subscriptionId
        FROM subscription s
        JOIN subscription_price sp ON s.id = sp.subId
        WHERE s.year = ? AND sp.period = ?
      `, [student.year, frequency]);
      
      if (subscription) {
        subscriptionItems.push({
          price: subscription.stripePriceID,
          metadata: {
            studentName: `${student.firstName} ${student.lastName}`,
            year: student.year.toString()
          }
        });
      }
    }
    
    if (subscriptionItems.length === 0) {
      throw new Error('No subscription products found for the given students');
    }
    
    // Create the subscription with the items
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: subscriptionItems,
      default_payment_method: paymentMethodId,
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent']
    });
    
    console.log(`Created subscription: ${subscription.id} for customer: ${customerId}`);
    
    // Save subscription references in database
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const item = subscription.items.data[i];
      
      if (item) {
        // Get the student from the database
        const dbStudent = await db.get('SELECT id FROM student WHERE firstName = ? AND lastName = ?', 
          [student.firstName, student.lastName]);
        
        if (dbStudent) {
          // Get parent ID from the student
          const parent = await db.get('SELECT parentID FROM student WHERE id = ?', [dbStudent.id]);
          
          // Get the subscription from the database
          const dbSubscription = await db.get(`
            SELECT s.id as subscriptionId, sp.id as priceId
            FROM subscription s
            JOIN subscription_price sp ON s.id = sp.subId
            WHERE s.year = ? AND sp.period = ?
          `, [student.year, frequency]);
          
          // Save the subscription reference
          if (parent && dbSubscription) {
            await db.run(`
              INSERT INTO parent_subscriptions (
                parentId, productId, priceId, studentId, stripeSubscriptionId, description
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
              parent.parentID,
              dbSubscription.subscriptionId,
              dbSubscription.priceId,
              dbStudent.id,
              subscription.id,
              `Tuition for ${student.firstName} ${student.lastName} (Year ${student.year})`
            ]);
          }
        }
      }
    }
    
    return subscription;
  } catch (error) {
    console.error('Error creating subscription for students:', error);
    throw error;
  }
}

// Get available payment method types for the customer's country
export async function getPaymentMethodTypes(country: string = 'AU') {
  // Default to common payment methods, but can be expanded based on country
  const paymentMethodTypes = ['card'];
  
  // Add country-specific payment methods
  if (country === 'AU') {
    paymentMethodTypes.push('au_becs_debit');
  } else if (country === 'NZ') {
    paymentMethodTypes.push('nz_bank_account');
  }
  
  return paymentMethodTypes;
}
