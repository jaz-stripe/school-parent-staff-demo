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

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/payment-success',
      },
      redirect: 'if_required',
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || 'An error occurred with the payment');
    } else if (setupIntent.status === 'succeeded') {
      if (setupIntent.payment_method) {
        onSuccess(setupIntent.payment_method);
      } else {
        setErrorMessage('Payment method setup succeeded but no payment method was returned');
      }
    } else {
      setErrorMessage(`Unexpected setup intent status: ${setupIntent.status}`);
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
  const options = {
    clientSecret: setupIntentClientSecret,
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <div className={styles.container}>
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm setupIntentClientSecret={setupIntentClientSecret} onSuccess={onSuccess} />
      </Elements>
    </div>
  );
}
