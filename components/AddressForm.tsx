// components/AddressForm.tsx
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, AddressElement } from '@stripe/react-stripe-js';
import styles from '../styles/AddressForm.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface AddressFormProps {
  initialAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  onAddressChange: (address: any) => void;
}

function AddressElementForm({ onAddressChange }: { onAddressChange: (address: any) => void }) {
  return (
    <AddressElement
      options={{
        mode: 'shipping',
        fields: {
          phone: 'always',
        },
        validation: {
          phone: {
            required: 'always',
          },
        },
      }}
      onChange={(event) => {
        if (event.complete) {
          const address = event.value.address;
          const phone = event.value.phone;
          onAddressChange({ ...address, phone });
        }
      }}
    />
  );
}

export default function AddressForm({ initialAddress, onAddressChange }: AddressFormProps) {
  const [address, setAddress] = useState<any>(initialAddress || {});
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // We don't actually need a client secret for AddressElement alone, but Elements requires it
    // This is a workaround - in production, you'd want a proper solution
    setClientSecret('dummy_secret');
  }, []);

  const handleAddressChange = (newAddress: any) => {
    setAddress(newAddress);
    onAddressChange(newAddress);
  };

  if (!clientSecret) return <div>Loading address form...</div>;

  return (
    <div className={styles.container}>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <AddressElementForm onAddressChange={handleAddressChange} />
      </Elements>
    </div>
  );
}
