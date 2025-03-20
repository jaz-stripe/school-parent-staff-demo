// lib/stripe.ts
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from './config';
import { getDb } from './db';

const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16'
});

// Wrapper function to run Stripe operations with a specific Connect account
export async function withStripeAccount<T>(fn: () => Promise<T>, accountId?: string): Promise<T> {
  if (!accountId) {
    return fn();
  }
  
  // Store original headers
  const originalHeaders = stripe.getApiField('headers') || {};
  
  try {
    // Set the Stripe-Account header
    stripe.setApiField('headers', {
      ...originalHeaders,
      'Stripe-Account': accountId
    });
    
    // Execute the function with the Connect account
    return await fn();
  } finally {
    // Reset the headers to original state
    stripe.setApiField('headers', originalHeaders);
  }
}

// Create a Stripe customer in the specified Connect account
export async function createStripeCustomer(email: string, name: string, stripeAccountId?: string) {
  return withStripeAccount(async () => {
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
  }, stripeAccountId);
}

// Create a Stripe Connect account
export async function createStripeConnectAccount(params: Stripe.AccountCreateParams) {
  try {
    const account = await stripe.accounts.create(params);
    console.log(`Created Stripe Connect account: ${account.id}`);
    return account;
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw error;
  }
}

// Create an account onboarding link
export async function createAccountOnboardingLink(
  accountId: string, 
  returnUrl: string, 
  refreshUrl: string
) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    console.log(`Created onboarding link for account: ${accountId}`);
    return accountLink;
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    throw error;
  }
}

// Retrieve a Stripe Connect account
export async function retrieveStripeAccount(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    console.log(`Retrieved Stripe account: ${accountId}`);
    return account;
  } catch (error) {
    console.error(`Error retrieving Stripe account ${accountId}:`, error);
    throw error;
  }
}

// Create a product
export async function createProduct(name: string, type: string, year: number = 0, stripeAccountId?: string) {
  return withStripeAccount(async () => {
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
  }, stripeAccountId);
}

// Create a price for a product
export async function createPriceForProduct(
  productId: string, 
  amount: number, 
  recurring: boolean = false, 
  interval: 'day' | 'week' | 'month' | 'year' = 'month',
  stripeAccountId?: string
) {
  return withStripeAccount(async () => {
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
  }, stripeAccountId);
}

// Create a setup intent
export async function createSetupIntent(customerId: string, stripeAccountId?: string) {
  return withStripeAccount(async () => {
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
  }, stripeAccountId);
}

// Create a subscription
export async function createSubscription(
  customerId: string, 
  items: Stripe.SubscriptionCreateParams.Item[], 
  defaultPaymentMethod?: string,
  stripeAccountId?: string
) {
  return withStripeAccount(async () => {
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
  }, stripeAccountId);
}

// Add item to parent subscription
export async function addItemToParentSubscription(
  customerId: string,
  subscriptionId: string,
  priceId: string,
  metadata?: { [key: string]: string },
  quantity: number = 1,
  stripeAccountId?: string
) {
  return withStripeAccount(async () => {
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
  }, stripeAccountId);
}

// Record a parent purchase in the database
export async function recordParentPurchase(
  parentId: number,
  productId: number,
  studentId: number | null,
  stripeInvoiceItemId: string,
  description?: string
) {
  try {
    const db = await getDb();
    
    // Get the parent's account ID
    const parent = await db.get('SELECT accountId FROM parent WHERE id = ?', [parentId]);
    
    if (!parent) {
      throw new Error(`Parent not found: ${parentId}`);
    }
    
    const { lastID } = await db.run(`
      INSERT INTO parent_purchases (
        parentId, productId, studentId, stripeInvoiceId, description, accountId
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [parentId, productId, studentId, stripeInvoiceItemId, description || null, parent.accountId]);
    
    return await db.get('SELECT * FROM parent_purchases WHERE id = ?', [lastID]);
  } catch (error) {
    console.error('Error recording parent purchase:', error);
    throw error;
  }
}

// Create a single invoice with multiple items
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
  description?: string,
  stripeAccountId?: string
) {
  return withStripeAccount(async () => {
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
      
      // Get the account ID for this parent
      const parent = await db.get('SELECT accountId FROM parent WHERE id = ?', [parentId]);
      
      for (const item of invoiceItems) {
        const purchaseRecord = await db.run(`
          INSERT INTO parent_purchases (
            parentId, productId, studentId, stripeInvoiceId, description, accountId
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          parentId,
          item.productId,
          item.studentId,
          paidInvoice.id,
          item.description,
          parent.accountId
        ]);
        
        purchaseRecords.push({
          id: purchaseRecord.lastID,
          productId: item.productId,
          studentId: item.studentId,
          description: item.description
        });
      }
      
      return {
        invoice: paidInvoice,
        purchases: purchaseRecords
      };
      
    } catch (error) {
      console.error(`Error creating invoice for customer ${customerId}:`, error);
      throw error;
    }
  }, stripeAccountId);
}

// Create a customer portal session
export async function createCustomerPortalSession(customerId: string, returnUrl: string, stripeAccountId?: string) {
  return withStripeAccount(async () => {
    try {
      // Get or create portal configuration
      const configurationId = await getOrCreatePortalConfiguration(stripeAccountId);
      
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
  }, stripeAccountId);
}

// Get or create portal configuration
export async function getOrCreatePortalConfiguration(stripeAccountId?: string) {
  return withStripeAccount(async () => {
    try {
      const db = await getDb();
      
      // Get account ID from Stripe account ID
      const account = stripeAccountId ? 
        await db.get('SELECT id FROM account WHERE accountId = ?', [stripeAccountId]) : null;
      
      // Query for existing portal config ID
      let settingQuery, settingParams;
      
      if (account) {
        settingQuery = 'SELECT value FROM settings WHERE key = ? AND accountId = ?';
        settingParams = ['stripe_portal_config_id', account.id];
      } else {
        settingQuery = 'SELECT value FROM settings WHERE key = ? AND accountId IS NULL';
        settingParams = ['stripe_portal_config_id'];
      }
      
      // Check if we already have a portal configuration ID
      const setting = await db.get(settingQuery, settingParams);
      
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
      
      // Save the configuration ID in the database with appropriate account ID
      if (account) {
        await db.run(
          'INSERT OR REPLACE INTO settings (key, value, description, accountId) VALUES (?, ?, ?, ?)',
          ['stripe_portal_config_id', configuration.id, 'Stripe Customer Portal Configuration ID', account.id]
        );
      } else {
        await db.run(
          'INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)',
          ['stripe_portal_config_id', configuration.id, 'Stripe Customer Portal Configuration ID']
        );
      }
      
      console.log(`Created and saved new portal configuration: ${configuration.id}`);
      return configuration.id;
    } catch (error) {
      console.error('Error managing portal configuration:', error);
      throw error;
    }
  }, stripeAccountId);
}

// Construct Stripe webhook event
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

// Create a Stripe dashboard login link for a connected account
export async function createDashboardLink(stripeAccountId: string) {
  try {
    const link = await stripe.accounts.createLoginLink(stripeAccountId);
    return link.url;
  } catch (error) {
    console.error(`Error creating dashboard link for account ${stripeAccountId}:`, error);
    throw error;
  }
}

// Create a setup intent for a customer
export async function createSetupIntentForCustomer(
  customerId: string,
  stripeAccountId?: string
) {
  return withStripeAccount(async () => {
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
  }, stripeAccountId);
}

// Create a customer with address information
export async function createCustomerWithAddress(
  email: string,
  name: string,
  address: {
    line1: string,
    line2?: string,
    city: string,
    state: string,
    postal_code: string,
    country: string,
  },
  stripeAccountId?: string
) {
  return withStripeAccount(async () => {
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
  }, stripeAccountId);
}

// Attach a payment method to a customer and set as default
export async function attachPaymentMethodToCustomer(
  customerId: string,
  paymentMethodId: string,
  stripeAccountId?: string
) {
  return withStripeAccount(async () => {
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
  }, stripeAccountId);
}

// Create subscription for students based on year and frequency
export async function createSubscriptionForStudents(
  customerId: string,
  paymentMethodId: string,
  students: Array<{
    firstName: string,
    lastName: string,
    year: number,
  }>,
  frequency: 'weekly' | 'monthly' | 'yearly',
  accountId: number,
  stripeAccountId?: string
) {
  return withStripeAccount(async () => {
    try {
      // First, set the payment method as the default
      await attachPaymentMethodToCustomer(customerId, paymentMethodId, stripeAccountId);
      
      // Get subscription items based on student years and frequency
      const priceMap = new Map();
      const db = await getDb();
      
      // Group students by year to handle multiple students in the same year
      for (const student of students) {
        // Get the subscription price ID for the student's year and frequency
        const subscription = await db.get(`
          SELECT sp.id as priceId, sp.stripePriceID, s.id as subscriptionId
          FROM subscription s
          JOIN subscription_price sp ON s.id = sp.subId
          WHERE s.year = ? AND sp.period = ? AND s.accountId = ?
        `, [student.year, frequency, accountId]);
        
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
          const dbStudent = await db.get('SELECT id FROM student WHERE firstName = ? AND lastName = ? AND accountId = ?', 
            [student.firstName, student.lastName, accountId]);
          
          if (dbStudent) {
            // Get parent ID from the student
            const parent = await db.get('SELECT parentID FROM student WHERE id = ?', [dbStudent.id]);
            
            if (parent) {
              // Save the subscription reference
              await db.run(`
                INSERT INTO parent_subscriptions (
                  parentId, productId, priceId, studentId, stripeSubscriptionId, description, accountId
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                parent.parentID,
                group.subscriptionId,
                group.databasePriceId,
                dbStudent.id,
                subscription.id,
                `Tuition for ${student.firstName} ${student.lastName} (Year ${student.year})`,
                accountId
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
  }, stripeAccountId);
}
