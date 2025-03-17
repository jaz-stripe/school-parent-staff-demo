// lib/stripe.ts
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from './config.ts';

const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16'
});

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
