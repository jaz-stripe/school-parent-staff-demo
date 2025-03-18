// pages/sign-up.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  // State for the entire form
  const [formData, setFormData] = useState({
    // Parent details
    firstName: '',
    lastName: '',
    email: '',
    emoji: '',
    
    // Stripe IDs
    stripeCustomerId: '',
    setupIntentSecret: '',
    paymentMethodId: '',
    
    // Student data
    students: [] as Student[],
    
    // Payment details
    paymentFrequency: 'monthly',
    
    // Address data
    address: {}
  });

  // UI state
  const [currentSection, setCurrentSection] = useState('details'); // 'details', 'address', 'payment'
  const [showExpressCheckout, setShowExpressCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const router = useRouter();

  // Populate with random character on load
  useEffect(() => {
    const randomCharacter = getRandomCharacter();
    setFormData(prev => ({
      ...prev,
      firstName: randomCharacter.firstName,
      lastName: randomCharacter.lastName,
      emoji: randomCharacter.emoji,
      email: `${randomCharacter.firstName.toLowerCase()}@example.com`
    }));
  }, []);

  // Handle changes to parent info
  const handleParentChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle student changes
  const handleStudentChange = (students: Student[]) => {
    setFormData(prev => ({
      ...prev,
      students
    }));
  };

  // Handle address changes
  const handleAddressChange = (address: any) => {
    setFormData(prev => ({
      ...prev,
      address
    }));
  };

  // Handle payment method success
  const handlePaymentMethodSuccess = async (paymentMethodId: string) => {
    setFormData(prev => ({
      ...prev,
      paymentMethodId
    }));
    
    try {
      // Complete the registration
      const result = await completeRegistration(paymentMethodId);
      
      if (result.success) {
        // Make sure we set the authentication cookie properly
        console.log('Registration completed successfully, redirecting to parent portal...');
        
        // Small delay to ensure cookie is set
        setTimeout(() => {
          router.push('/parent-portal');
        }, 500);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Error during registration completion:', error);
      setError('Registration failed due to an unexpected error');
    }
  };

  // Progress to next section
  const moveToAddressSection = async () => {
    // Validate details section
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (formData.students.length === 0) {
      setError('Please add at least one student');
      return;
    }
    
    setError('');
    setCurrentSection('address');
  };

  // Progress from address to payment section
  const moveToPaymentSection = async () => {
    // Validate address
    const address = formData.address as any;
    if (!address.line1 || !address.city || !address.postal_code || !address.country) {
      setError('Please complete the address information');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      // Create customer in Stripe
      const customerResponse = await fetch('/api/parent/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address
        }),
      });
      
      const customerData = await customerResponse.json();
      
      if (!customerData.success) {
        throw new Error(customerData.message || 'Failed to create customer');
      }
      
      const customerId = customerData.customerId;
      
      // Create setup intent
      const setupIntentResponse = await fetch('/api/parent/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          country: (formData.address as any).country
        }),
      });
      
      const setupIntentData = await setupIntentResponse.json();
      
      if (!setupIntentData.success) {
        throw new Error(setupIntentData.message || 'Failed to create setup intent');
      }
      
      // Update form data with customer ID and setup intent
      setFormData(prev => ({
        ...prev,
        stripeCustomerId: customerId,
        setupIntentSecret: setupIntentData.clientSecret
      }));
      
      setCurrentSection('payment');
    } catch (error) {
      console.error('Error preparing payment:', error);
      setError('Failed to prepare payment: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Complete the registration process
  const completeRegistration = async (paymentMethodId: string): Promise<{success: boolean, message?: string}> => {
    setLoading(true);
    setError('');
    
    try {
      // First create the parent in our database
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            emoji: formData.emoji,
            address: formData.address,
            stripeCustomerId: formData.stripeCustomerId
          },
          students: formData.students
        }),
      });
  
      const signupData = await signupResponse.json();
  
      if (!signupData.success) {
        throw new Error(signupData.message || 'Failed to create account');
      }
      
      // Then create the subscription
      const subscriptionResponse = await fetch('/api/parent/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.stripeCustomerId,
          paymentMethodId,
          students: formData.students,
          frequency: formData.paymentFrequency
        }),
      });
  
      const subscriptionData = await subscriptionResponse.json();
  
      if (!subscriptionData.success) {
        throw new Error(subscriptionData.message || 'Failed to create subscription');
      }
      
      // Show success message before redirecting
      setSuccessMessage('Registration successful! Redirecting to parent portal...');
      return { success: true };
      
    } catch (error) {
      console.error('Error completing registration:', error);
      setLoading(false);
      return { 
        success: false, 
        message: 'Failed to complete registration: ' + (error.message || 'Unknown error') 
      };
    }
  };

  // Toggle the Express Checkout visibility - just for demo purposes
  const toggleExpressCheckout = () => {
    setShowExpressCheckout(!showExpressCheckout);
  };

  // Render the current section
  const renderSection = () => {
    switch (currentSection) {
      case 'details':
        return (
          <div className={styles.section}>
            <h2>Parent Information</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleParentChange('firstName', e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleParentChange('lastName', e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleParentChange('email', e.target.value)}
                required
              />
            </div>
            
            <StudentSelector
              parentLastName={formData.lastName}
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
                onClick={moveToAddressSection}
                className={styles.nextButton}
              >
                Next: Address
              </button>
            </div>
          </div>
        );
      
      case 'address':
        return (
          <div className={styles.section}>
            <h2>Address Information</h2>
            <AddressForm
              parentData={characters.find(c => c.lastName === formData.lastName)}
              onAddressChange={handleAddressChange}
            />
            
            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={() => setCurrentSection('details')}
                className={styles.backButton}
                disabled={loading}
              >
                Back
              </button>
              <button 
                type="button" 
                onClick={moveToPaymentSection}
                className={styles.nextButton}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Next: Payment'}
              </button>
            </div>
          </div>
        );
      
      case 'payment':
        return (
          <div className={styles.section}>
            <h2>Payment Information</h2>
            
            <div className={styles.frequencySelector}>
              <label>Payment Frequency</label>
              <select
                value={formData.paymentFrequency}
                onChange={(e) => handleParentChange('paymentFrequency', e.target.value)}
                disabled={loading}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            {/* Toggle button for Express Checkout (demo purposes only) */}
            <div className={styles.toggleContainer}>
              <button
                type="button"
                onClick={toggleExpressCheckout}
                className={styles.toggleButton}
              >
                {showExpressCheckout ? 'Hide Express Checkout' : 'Show Express Checkout'}
              </button>
            </div>
            
            {formData.setupIntentSecret ? (
              <PaymentMethodForm
                setupIntentClientSecret={formData.setupIntentSecret}
                customerId={formData.stripeCustomerId}
                showExpressCheckout={showExpressCheckout}
                onSuccess={handlePaymentMethodSuccess}
              />
            ) : (
              <p className={styles.loading}>Preparing payment form...</p>
            )}
            
            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={() => setCurrentSection('address')}
                className={styles.backButton}
                disabled={loading}
              >
                Back
              </button>
            </div>
          </div>
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
            className={`${styles.progressStep} ${currentSection === 'details' ? styles.active : styles.completed}`}
            onClick={() => !loading && setCurrentSection('details')}
          >
            1. Details
          </div>
          <div 
            className={`${styles.progressStep} ${
              currentSection === 'address' ? styles.active : 
              currentSection === 'payment' ? styles.completed : ''
            }`}
            onClick={() => !loading && currentSection !== 'details' && setCurrentSection('address')}
          >
            2. Address
          </div>
          <div 
            className={`${styles.progressStep} ${currentSection === 'payment' ? styles.active : ''}`}
          >
            3. Payment
          </div>
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
        {successMessage && <p className={styles.success}>{successMessage}</p>}
        
        <div className={styles.formContainer}>
          {renderSection()}
        </div>
        
        {/* Collapsible section that could be used for a unified view */}
        {false && (
          <div className={styles.unifiedView}>
            {/* In the future, this could be a collapsible/expandable section that shows all fields at once */}
            <h3>All Steps</h3>
          </div>
        )}
      </div>
    </div>
  );
}

