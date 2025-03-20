// pages/onboarding.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../styles/Onboarding.module.css';
import { characters } from '../data/PeterRabbitAndFriends';

// Available school logos
const availableLogos = [
  'school-1.png',
  'school-2.png',
  'school-3.png',
  'school-4.png',
  'school-5.png',
  'school-6.png',
  'school-7.png',
  'school-8.png',
  'school-9.png',
  'school-10.png'
];

// Available countries for Stripe Connect
const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'NZ', name: 'New Zealand' }
];

export default function Onboarding() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    businessName: '',
    logo: availableLogos[0],
    businessEmail: '',
    personName: '',
    country: 'AU',
  });
  
const [suggestions, setSuggestions] = useState<string[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

// Generate name suggestions based on PeterRabbitAndFriends
useEffect(() => {
  const schoolNames = characters
    .slice(0, 5)
    .map(char => `${char.lastName}'s School`);
    
  setSuggestions(schoolNames);
}, []);

const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
  
  // Auto-generate email when business name changes
  if (name === 'businessName') {
    const baseEmail = process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'demo@example.com';
    const [emailUser, emailDomain] = baseEmail.split('@');
    
    // Generate email alias with business name (remove spaces and special chars)
    const businessSlug = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const generatedEmail = businessSlug ? `${emailUser}+${businessSlug}@${emailDomain}` : baseEmail;
    
    setFormData(prev => ({
      ...prev,
      businessEmail: generatedEmail
    }));
  }
};

const handleSuggestionClick = (suggestion: string) => {
  setFormData(prev => ({
    ...prev,
    businessName: suggestion
  }));
  
  // Also update email
  const baseEmail = process.env.NEXT_PUBLIC_DEFAULT_EMAIL || 'demo@example.com';
  const [emailUser, emailDomain] = baseEmail.split('@');
  const businessSlug = suggestion.toLowerCase().replace(/[^a-z0-9]/g, '');
  const generatedEmail = `${emailUser}+${businessSlug}@${emailDomain}`;
  
  setFormData(prev => ({
    ...prev,
    businessEmail: generatedEmail
  }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);
  
  try {
    const response = await fetch('/api/accounts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.businessName,
        email: formData.businessEmail,
        logo: formData.logo,
        country: formData.country,
        personName: formData.personName
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Redirect to Stripe Connect onboarding URL
      window.location.href = data.onboardingUrl;
    } else {
      setError(data.message || 'Failed to create school account');
    }
  } catch (error) {
    console.error('Error creating account:', error);
    setError('An error occurred while creating the school account');
  } finally {
    setLoading(false);
  }
};

return (
  <div className={styles.container}>
    <div className={styles.onboardingBox}>
      <h1 className={styles.title}>Create a New School</h1>
      
      {error && <p className={styles.error}>{error}</p>}
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="businessName">School Name</label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            required
            className={styles.input}
            placeholder="Enter school name"
          />
          <div className={styles.suggestions}>
            <p>Suggestions:</p>
            <div className={styles.suggestionTags}>
              {suggestions.map((suggestion, index) => (
                <span 
                  key={index} 
                  className={styles.suggestionTag}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="logo">School Logo</label>
          <div className={styles.logoSelector}>
            <select
              id="logo"
              name="logo"
              value={formData.logo}
              onChange={handleChange}
              required
              className={styles.select}
            >
              {availableLogos.map((logo) => (
                <option key={logo} value={logo}>
                  {logo.replace('.png', '').replace(/-/g, ' ')}
                </option>
              ))}
            </select>
            <div className={styles.logoPreview}>
              {formData.logo && (
                <Image
                  src={`/logos/${formData.logo}`}
                  alt="School logo preview"
                  width={80}
                  height={80}
                  className={styles.previewImage}
                />
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="businessEmail">School Email</label>
          <input
            type="email"
            id="businessEmail"
            name="businessEmail"
            value={formData.businessEmail}
            onChange={handleChange}
            required
            className={styles.input}
            placeholder="school@example.com"
          />
          <p className={styles.emailNote}>
            This email will be used for Stripe communications and account verification.
          </p>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="personName">Your Name</label>
          <input
            type="text"
            id="personName"
            name="personName"
            value={formData.personName}
            onChange={handleChange}
            required
            className={styles.input}
            placeholder="Enter your full name"
          />
          <p className={styles.note}>
            You'll be set up as staff for this school.
          </p>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="country">Country</label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            required
            className={styles.select}
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => router.push('/')}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Continue to Stripe Onboarding'}
          </button>
        </div>
      </form>
    </div>
  </div>
);
}

