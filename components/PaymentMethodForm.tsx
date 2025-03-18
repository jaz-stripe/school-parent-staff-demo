// components/PaymentMethodForm.tsx
import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import styles from '../styles/PaymentMethodForm.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  setupIntentClientSecret: string;
  customerId: string;
  onSuccess: (paymentMethod: string) => void;
}

function CheckoutForm({ setupIntentClientSecret, onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (result.error) {
        setErrorMessage(result.error.message || 'An error occurred with the payment');
        console.error('Setup confirmation error:', result.error);
      } else if (result.setupIntent && result.setupIntent.status === 'succeeded') {
        if (result.setupIntent.payment_method) {
          onSuccess(result.setupIntent.payment_method as string);
        } else {
          setErrorMessage('Payment method setup succeeded but no payment method was returned');
        }
      } else {
        setErrorMessage(`Unexpected setup intent status: ${result.setupIntent?.status}`);
      }
    } catch (err) {
      console.error('Error in setup confirmation:', err);
      setErrorMessage('An unexpected error occurred during payment setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <PaymentElement />
      
      {errorMessage && (
        <div className={styles.error}>{errorMessage}</div>
      )}
      
      <button 
        type="submit" 
        disabled={!stripe || isLoading} 
        className={styles.submitButton}
      >
        {isLoading ? 'Processing...' : 'Save Payment Method'}
      </button>
    </form>
  );
}

export default function PaymentMethodForm({ setupIntentClientSecret, onSuccess }: PaymentFormProps) {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // We have a client secret, Stripe is loading, so we can hide the loading indicator
    setLoading(false);
  }, []);

  if (!setupIntentClientSecret) {
    return <div>Waiting for payment setup...</div>;
  }

  if (loading) {
    return <div>Loading payment form...</div>;
  }

  const options = {
    clientSecret: setupIntentClientSecret,
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <div className={styles.container}>
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm 
          setupIntentClientSecret={setupIntentClientSecret}
          onSuccess={onSuccess} 
        />
      </Elements>
    </div>
  );
}
