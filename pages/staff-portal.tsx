// pages/staff-portal.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import styles from '../styles/StaffPortal.module.css';

export default function StaffPortal() {
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeAccountData, setStripeAccountData] = useState<any>(null);
  const [isPopulatingProducts, setIsPopulatingProducts] = useState(false);
  const [populateStatus, setPopulateStatus] = useState('');
  const [isPopulated, setIsPopulated] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('StaffPortal: Fetching profile data...'); // Debug log
        
        // Fetch staff profile
        const profileRes = await fetch('/api/staff/profile');
        console.log('StaffPortal: Profile response status:', profileRes.status); // Debug log
        
        const profileData = await profileRes.json();
        console.log('StaffPortal: Profile data:', profileData); // Debug log
        
        if (!profileData.success) {
          console.log('StaffPortal: Profile fetch failed, redirecting to login'); // Debug log
          router.push('/');
          return;
        }
        
        setStaff(profileData.staff);
        
        // Check if account has products populated
        if (profileData.success && profileData.staff?.accountIsPopulated !== undefined) {
          setIsPopulated(profileData.staff.accountIsPopulated);
        }
        
        // Fetch Stripe account overview data
        const accountRes = await fetch('/api/staff/stripe-overview');
        const accountData = await accountRes.json();
        
        if (accountData.success) {
          setStripeAccountData(accountData.data);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load staff information');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'staff' })
    });
    router.push('/');
  };
  
  // Add this function to handle product population
  const handlePopulateProducts = async () => {
    setIsPopulatingProducts(true);
    setPopulateStatus('Creating products...');
    
    try {
      const response = await fetch('/api/accounts/populate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: staff.accountId
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPopulateStatus('Products created successfully!');
        setIsPopulated(true);
        
        // Refresh school data after a brief delay
        setTimeout(() => {
          setPopulateStatus('');
        }, 3000);
      } else {
        setPopulateStatus(`Error: ${data.message || 'Failed to create products'}`);
      }
    } catch (error) {
      console.error('Error creating products:', error);
      setPopulateStatus('Failed to connect to server');
    } finally {
      setIsPopulatingProducts(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!staff) {
    router.push('/');
    return null;
  }

  return (
    <div className={styles.container}>
      <TopBar
        userEmoji={staff.emoji}
        userName={`${staff.firstName} ${staff.lastName}`}
        role="staff"
        onLogout={handleLogout}
        accountName={staff.accountName || 'School'}
        accountLogo={staff.accountLogo || 'school-logo.png'}
      />
      
      <main className={styles.main}>
        <h1 className={styles.title}>Staff Dashboard</h1>
        
        <section className={styles.quickLinks}>
          <div className={styles.linkCard} onClick={() => router.push('/parents')}>
            <div className={styles.iconContainer}>👪</div>
            <h3>Manage Parents</h3>
            <p>View and update parent information</p>
          </div>
          
          <div className={styles.linkCard} onClick={() => router.push('/students')}>
            <div className={styles.iconContainer}>👩‍🎓</div>
            <h3>Manage Students</h3>
            <p>View and update student information</p>
          </div>
        </section>
        
        {/* New school setup section */}
        {!isPopulated && (
          <section className={styles.setupSection}>
            <h2>School Setup</h2>
            <p>Your school needs to be set up with catalog items, tuition products, and prices.</p>
            
            <button
              className={styles.setupButton}
              onClick={handlePopulateProducts}
              disabled={isPopulatingProducts}
            >
              {isPopulatingProducts ? 'Creating Products...' : 'Create Stripe Products'}
            </button>
            
            {populateStatus && (
              <p className={populateStatus.includes('Error') ? styles.errorStatus : styles.successStatus}>
                {populateStatus}
              </p>
            )}
          </section>
        )}
        
        <section className={styles.overviewSection}>
          <h2>Account Overview</h2>
          
          {stripeAccountData ? (
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <h3>Total Subscriptions</h3>
                <p className={styles.overviewValue}>{stripeAccountData.subscriptionsCount || 0}</p>
              </div>
              
              <div className={styles.overviewCard}>
                <h3>Total Customers</h3>
                <p className={styles.overviewValue}>{stripeAccountData.customersCount || 0}</p>
              </div>
              
              <div className={styles.overviewCard}>
                <h3>Outstanding Invoices</h3>
                <p className={styles.overviewValue}>{stripeAccountData.outstandingInvoicesCount || 0}</p>
              </div>
              
              <div className={styles.overviewCard}>
                <h3>Recent Payments</h3>
                <p className={styles.overviewValue}>{stripeAccountData.recentPaymentsCount || 0}</p>
              </div>
            </div>
          ) : (
            <p>Failed to load account overview data</p>
          )}
        </section>
        
        {stripeAccountData && stripeAccountData.outstandingInvoicesCount > 0 && (
          <section className={styles.invoicesSection}>
            <h2>Outstanding Invoices</h2>
            
            <div className={styles.embeddedComponent}>
              <iframe 
                src="/api/staff/embedded/outstanding-invoices" 
                title="Outstanding Invoices" 
                className={styles.embedFrame}
              />
            </div>
          </section>
        )}
        
        <section className={styles.recentTransactionsSection}>
          <h2>Recent Transactions</h2>
          
          <div className={styles.embeddedComponent}>
            <iframe 
              src="/api/staff/embedded/recent-transactions" 
              title="Recent Transactions" 
              className={styles.embedFrame}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
