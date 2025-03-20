// lib/stripe.ts
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from './config.ts';
import { getDb } from './db.ts';

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
/**
 * Add an invoice item to a parent's subscription
 * @param customerId The Stripe customer ID
 * @param subscriptionId The Stripe subscription ID to associate the invoice item with
 * @param priceId The Stripe price ID to add
 * @param metadata Optional metadata for the item (student info, etc)
 * @param quantity Optional quantity (defaults to 1)
 * @returns The created invoice item
 */
export async function addItemToParentSubscription(
  customerId: string,
  subscriptionId: string,
  priceId: string,
  metadata?: { [key: string]: string },
  quantity: number = 1
) {
  try {
    // Create the invoice item on the customer and associate it with the subscription
    const invoiceItem = await stripe.invoiceItems.create({
      customer: customerId,
      subscription: subscriptionId,
      price: priceId,
      quantity,
      metadata,
      description: metadata?.studentName 
        ? `${metadata.description || ''} for ${metadata.studentName}` 
        : metadata?.description
    });

    console.log(`Added invoice item with price: ${priceId} for customer: ${customerId} on subscription: ${subscriptionId}`);
    return invoiceItem;
  } catch (error) {
    console.error('Error adding invoice item:', error);
    throw error;
  }
}

/**
 * Record a purchase in the database
 * @param parentId The parent ID in our database
 * @param productId The product ID in our database
 * @param studentId Optional student ID if the purchase is for a specific student
 * @param stripeInvoiceItemId The Stripe invoice item ID
 * @param description Optional description
 * @returns The created purchase record
 */
export async function recordParentPurchase(
  parentId: number,
  productId: number,
  studentId: number | null,
  stripeInvoiceItemId: string,
  description?: string
) {
  try {
    const db = await getDb();
    
    const { lastID } = await db.run(`
      INSERT INTO parent_purchases (
        parentId, productId, studentId, stripeInvoiceId, description
      ) VALUES (?, ?, ?, ?, ?)
    `, [parentId, productId, studentId, stripeInvoiceItemId, description || null]);
    
    return await db.get('SELECT * FROM parent_purchases WHERE id = ?', [lastID]);
  } catch (error) {
    console.error('Error recording parent purchase:', error);
    throw error;
  }
}

/**
 * Add an item to a parent's next invoice and record it in the database
 * @param parentId The parent ID in our database
 * @param productId The product ID in our database
 * @param studentId Optional student ID if the item is for a specific student
 * @returns The created invoice item and purchase record
 */
export async function addProductToParent(
  parentId: number,
  productId: number,
  studentId?: number | null
) {
  try {
    const db = await getDb();
    
    // Get parent's Stripe customer ID and active subscription
    const parent = await db.get('SELECT stripeCustomerId FROM parent WHERE id = ?', [parentId]);
    if (!parent || !parent.stripeCustomerId) {
      throw new Error(`Parent not found or has no Stripe customer ID: ${parentId}`);
    }
    
    // Get the subscription ID from parent_subscriptions table
    // We just need one subscription ID since all entries for this parent will have the same subscription
    const subscription = await db.get('SELECT stripeSubscriptionId FROM parent_subscriptions WHERE parentId = ? LIMIT 1', [parentId]);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error(`No subscription found for parent: ${parentId}`);
    }
    
    // Get product details
    const product = await db.get('SELECT * FROM product WHERE id = ?', [productId]);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    let description = `${product.name}`;
    let metadata: { [key: string]: string } = { 
      productId: productId.toString(),
      description: product.name
    };
    
    // If this is for a specific student, get their info and add to description/metadata
    if (studentId) {
      const student = await db.get('SELECT firstName, lastName, year FROM student WHERE id = ?', [studentId]);
      if (student) {
        description += ` for ${student.firstName} ${student.lastName}`;
        metadata.studentId = studentId.toString();
        metadata.studentName = `${student.firstName} ${student.lastName}`;
        metadata.year = student.year.toString();
      }
    }
    
    // Add the item as an invoice item associated with the subscription
    const invoiceItem = await addItemToParentSubscription(
      parent.stripeCustomerId,
      subscription.stripeSubscriptionId,
      product.stripePriceID,
      metadata
    );
    
    // Record the purchase in our database
    const purchaseRecord = await recordParentPurchase(
      parentId,
      productId,
      studentId,
      invoiceItem.id,
      description
    );
    
    return {
      invoiceItem,
      purchase: purchaseRecord
    };
  } catch (error) {
    console.error('Error adding product to parent:', error);
    throw error;
  }
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  try {
    // Get or create portal configuration ID
    const configurationId = await getOrCreatePortalConfiguration();
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      configuration: configurationId
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
      usage: 'off_session',
      automatic_payment_methods: { enabled: true }
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
    const priceMap = new Map(); // Map to track price IDs and their corresponding students
    const db = await getDb();
    
    // Group students by year to handle multiple students in the same year
    for (const student of students) {
      // Get the subscription price ID for the student's year and frequency
      const subscription = await db.get(`
        SELECT sp.id as priceId, sp.stripePriceID, s.id as subscriptionId
        FROM subscription s
        JOIN subscription_price sp ON s.id = sp.subId
        WHERE s.year = ? AND sp.period = ?
      `, [student.year, frequency]);
      
      if (subscription) {
        const priceId = subscription.stripePriceID;
        
        // If we already have this price ID, add student to the existing group
        if (priceMap.has(priceId)) {
          const group = priceMap.get(priceId);
          group.students.push(student);
          group.quantity++;
        } else {
          // Otherwise create a new entry
          priceMap.set(priceId, {
            priceId: priceId,
            subscriptionId: subscription.subscriptionId,
            databasePriceId: subscription.priceId,
            students: [student],
            quantity: 1,
            year: student.year
          });
        }
      }
    }
    
    // Now convert our map to subscription items array
    const subscriptionItems = Array.from(priceMap.values()).map(group => ({
      price: group.priceId,
      quantity: group.quantity,
      metadata: {
        studentCount: group.quantity.toString(),
        year: group.year.toString(),
        studentNames: group.students.map(s => `${s.firstName} ${s.lastName}`).join(', ')
      }
    }));
    
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
    
    // Save subscription references in database for each student
    for (const group of priceMap.values()) {
      for (const student of group.students) {
        // Get the student from the database
        const dbStudent = await db.get('SELECT id FROM student WHERE firstName = ? AND lastName = ?', 
          [student.firstName, student.lastName]);
        
        if (dbStudent) {
          // Get parent ID from the student
          const parent = await db.get('SELECT parentID FROM student WHERE id = ?', [dbStudent.id]);
          
          if (parent) {
            // Save the subscription reference
            await db.run(`
              INSERT INTO parent_subscriptions (
                parentId, productId, priceId, studentId, stripeSubscriptionId, description
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
              parent.parentID,
              group.subscriptionId,
              group.databasePriceId,
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

export async function getOrCreatePortalConfiguration() {
  try {
    const db = await getDb();
    
    // Check if we already have a portal configuration ID
    const setting = await db.get('SELECT value FROM settings WHERE key = ?', ['stripe_portal_config_id']);
    
    if (setting && setting.value) {
      console.log(`Using existing portal configuration: ${setting.value}`);
      return setting.value;
    }
    
    // Create a new portal configuration
    console.log('Creating new portal configuration...');
    
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'School Management System',
      },
      features: {
        customer_update: {
          allowed_updates: ['email', 'address', 'phone'],
          enabled: true,
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: false,
        },
        subscription_update: {
          enabled: false
        },
      },
    });
    
    // Save the configuration ID in the database
    await db.run(
      'INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)',
      ['stripe_portal_config_id', configuration.id, 'Stripe Customer Portal Configuration ID']
    );
    
    console.log(`Created and saved new portal configuration: ${configuration.id}`);
    return configuration.id;
  } catch (error) {
    console.error('Error managing portal configuration:', error);
    throw error;
  }
}

export async function getAccountOverview(limit: number) {
  return Promise.all([
      stripe.customers.list({ limit: limit }),
      stripe.subscriptions.list({ limit: limit }),
      stripe.invoices.list({ limit: limit, status: 'open' }),
      stripe.paymentIntents.list({ limit: limit })
    ])
};

export async function getOutstandingInvoices() {
  return stripe.invoices.list({
  status: 'open',
  limit: 10,
  expand: ['data.customer']
  })
};

export async function getRecentTransactions(limit: number) {
return stripe.paymentIntents.list({
    limit: limit,
    expand: ['data.customer']
  })
};

/**
 * Create a single invoice for a parent with multiple items
 * @param customerId The Stripe customer ID
 * @param items Array of product items with their quantities
 * @param description Optional invoice description
 * @returns The paid invoice and database records
 */
export async function createParentInvoice(
  parentId: number,
  customerId: string, 
  invoiceItems: Array<{
    productId: number,
    stripePriceId: string,
    studentId: number | null,
    quantity: number,
    description: string,
    metadata: Record<string, string>
  }>,
  description?: string
) {
  try {
    const db = await getDb();
    
    // 1. Create a single draft invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'charge_automatically',
      description: description || 'School items purchase',
      auto_advance: false, // Don't finalize automatically yet
    });
    
    console.log(`Created draft invoice ${invoice.id} for customer ${customerId}`);
    
    // 2. Add all items to this invoice
    for (const item of invoiceItems) {
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        price: item.stripePriceId,
        quantity: item.quantity,
        description: item.description,
        metadata: item.metadata
      });
      
      console.log(`Added item ${item.stripePriceId} to invoice ${invoice.id}`);
    }
    
    // 3. Finalize the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    console.log(`Finalized invoice ${finalizedInvoice.id} for customer ${customerId}`);
    
    // 4. Pay the invoice
    const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id);
    console.log(`Paid invoice ${paidInvoice.id} for customer ${customerId}`);
    
    // 5. Record all purchases in our database
    const purchaseRecords = [];
    
    for (const item of invoiceItems) {
      const purchaseRecord = await recordParentPurchase(
        parentId,
        item.productId,
        item.studentId,
        paidInvoice.id, // Use the same invoice ID for all items
        item.description
      );
      
      purchaseRecords.push(purchaseRecord);
    }
    
    return {
      invoice: paidInvoice,
      purchases: purchaseRecords
    };
    
  } catch (error) {
    console.error(`Error creating invoice for customer ${customerId}:`, error);
    throw error;
  }
}
