// pages/staff-portal.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import styles from '../styles/StaffPortal.module.css';

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  emoji: string;
}

export default function StaffPortal() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeAccountData, setStripeAccountData] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch staff profile
        const profileRes = await fetch('/api/staff/profile');
        const profileData = await profileRes.json();
        
        if (!profileData.success) {
          router.push('/');
          return;
        }
        
        setStaff(profileData.staff);
        
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
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
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
      />
      
      <main className={styles.main}>
        <h1>Staff Dashboard</h1>
        
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
