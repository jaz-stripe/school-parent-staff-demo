// components/AddressForm.tsx
import { useState } from 'react';
import styles from '../styles/AddressForm.module.css';

interface AddressFormProps {
  initialAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  parentData?: any;
  onAddressChange: (address: any) => void;
}

export default function AddressForm({ initialAddress, parentData, onAddressChange }: AddressFormProps) {
  const [address, setAddress] = useState(initialAddress || {
    line1: parentData?.addressLine1 || '',
    line2: parentData?.addressLine2 || '',
    city: parentData?.subsurb || '',
    state: parentData?.city || '', // In our data model, city field is used for state
    postal_code: parentData?.postCode || '',
    country: parentData?.country || 'Australia'
  });

  const handleChange = (field: string, value: string) => {
    const updatedAddress = { ...address, [field]: value };
    setAddress(updatedAddress);
    onAddressChange(updatedAddress);
  };

  return (
    <div className={styles.container}>
      <div className={styles.formGroup}>
        <label htmlFor="line1">Address Line 1</label>
        <input
          id="line1"
          type="text"
          value={address.line1 || ''}
          onChange={(e) => handleChange('line1', e.target.value)}
          required
          className={styles.textInput}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="line2">Address Line 2 (Optional)</label>
        <input
          id="line2"
          type="text"
          value={address.line2 || ''}
          onChange={(e) => handleChange('line2', e.target.value)}
          className={styles.textInput}
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="city">City/Suburb</label>
          <input
            id="city"
            type="text"
            value={address.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            required
            className={styles.textInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="state">State</label>
          <select
            id="state"
            value={address.state || ''}
            onChange={(e) => handleChange('state', e.target.value)}
            required
            className={styles.selectInput}
          >
            <option value="">Select State</option>
            <option value="ACT">Australian Capital Territory</option>
            <option value="NSW">New South Wales</option>
            <option value="NT">Northern Territory</option>
            <option value="QLD">Queensland</option>
            <option value="SA">South Australia</option>
            <option value="TAS">Tasmania</option>
            <option value="VIC">Victoria</option>
            <option value="WA">Western Australia</option>
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="postal_code">Post Code</label>
          <input
            id="postal_code"
            type="text"
            value={address.postal_code || ''}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            required
            className={styles.textInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="country">Country</label>
          <select
            id="country"
            value={address.country || ''}
            onChange={(e) => handleChange('country', e.target.value)}
            required
            className={styles.selectInput}
          >
            <option value="Australia">Australia</option>
            <option value="New Zealand">New Zealand</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Canada">Canada</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}
