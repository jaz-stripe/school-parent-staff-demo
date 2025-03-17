// pages/sign-up.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import StudentSelector from '../components/StudentSelector';
import AddressForm from '../components/AddressForm';
import PaymentMethodForm from '../components/PaymentMethodForm';
import { characters, getRandomCharacter } from '../data/PeterRabbitAndFriends';
import styles from '../styles/Signup.module.css';

interface Student {
  firstName: string;
  lastName: string;
  year: number;
}

export default function Signup() {
  // Parent details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emoji, setEmoji] = useState('');
  
  // Payment details
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [setupIntentSecret, setSetupIntentSecret] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  
  // Address
  const [address, setAddress] = useState({});
  
  // Students
  const [students, setStudents] = useState<Student[]>([]);
  
  // Form state
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  // Populate with random character on load
  useEffect(() => {
    const randomCharacter = getRandomCharacter();
    setFirstName(randomCharacter.firstName);
    setLastName(randomCharacter.lastName);
    setEmoji(randomCharacter.emoji);
    
    const baseEmail = process.env.NEXT_PUBLIC_DEFAULT_EMAIL || '';
    if (baseEmail) {
      const [localPart, domain] = baseEmail.split('@');
      setEmail(`${localPart}+${randomCharacter.firstName.toLowerCase()}@${domain}`);
    }
  }, []);

  // Create setup intent when reaching payment step
  useEffect(() => {
    if (step === 3) {
      createSetupIntent();
    }
  }, [step]);

  const createSetupIntent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/create-setup-intent');
      const data = await response.json();
      
      if (data.clientSecret) {
        setSetupIntentSecret(data.clientSecret);
      } else {
        setError('Failed to initialize payment setup');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error creating setup intent:', error);
      setError('Failed to initialize payment setup');
      setLoading(false);
    }
  };

  const handleStudentChange = (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
  };

  const handleAddressChange = (updatedAddress: any) => {
    setAddress(updatedAddress);
  };

  const handlePaymentMethodSuccess = (newPaymentMethodId: string) => {
    setPaymentMethodId(newPaymentMethodId);
    // Move to final step or submit the form
    handleSubmit();
  };

  const nextStep = () => {
    setError('');
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent: {
            firstName,
            lastName,
            email,
            emoji,
            address,
            paymentMethodId,
            paymentFrequency
          },
          students
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/parent-portal');
      } else {
        setError(data.message || 'Error creating account');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setError('An error occurred while creating your account');
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2>Parent Information</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <StudentSelector
              parentLastName={lastName}
              onChange={handleStudentChange}
            />
            
            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={() => router.push('/')}
                className={styles.backButton}
              >
                Back to Login
              </button>
              <button 
                type="button" 
                onClick={nextStep}
                className={styles.nextButton}
              >
                Next: Address
              </button>
            </div>
          </>
        );
      
      case 2:
        return (
          <>
            <h2>Address Information</h2>
            <AddressForm
              onAddressChange={handleAddressChange}
            />
            
            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={prevStep}
                className={styles.backButton}
              >
                Back
              </button>
              <button 
                type="button" 
                onClick={nextStep}
                className={styles.nextButton}
              >
                Next: Payment
              </button>
            </div>
          </>
        );
      
      case 3:
        return (
          <>
            <h2>Payment Information</h2>
            
            <div className={styles.frequencySelector}>
              <label>Payment Frequency</label>
              <select
                value={paymentFrequency}
                onChange={(e) => setPaymentFrequency(e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            {loading ? (
              <p>Loading payment form...</p>
            ) : setupIntentSecret ? (
              <PaymentMethodForm
                setupIntentClientSecret={setupIntentSecret}
                onSuccess={handlePaymentMethodSuccess}
              />
            ) : (
              <p className={styles.error}>Failed to load payment form. Please try again.</p>
            )}
            
            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={prevStep}
                className={styles.backButton}
              >
                Back
              </button>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.signupBox}>
        <div className={styles.logoContainer}>
          <Image src="/school-logo.svg" alt="School Logo" width={200} height={100} />
        </div>
        
        <h1 className={styles.title}>Parent Registration</h1>
        
        <div className={styles.progressBar}>
          <div 
            className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}
          >
            1. Details
          </div>
          <div 
            className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}
          >
            2. Address
          </div>
          <div 
            className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}
          >
            3. Payment
          </div>
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
        
        <div className={styles.formContainer}>
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
