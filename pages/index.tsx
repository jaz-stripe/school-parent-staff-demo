// pages/index.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { FaCog } from 'react-icons/fa';
import styles from '../styles/Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isParent, setIsParent] = useState(true);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  
  // Fetch available accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        
        if (data.success && data.accounts.length > 0) {
          setAccounts(data.accounts);
          
          // Try to restore the last selected account
          const savedAccountId = localStorage.getItem('selectedAccountId');
          if (savedAccountId) {
            const savedAccount = data.accounts.find(
              (acc: any) => acc.id.toString() === savedAccountId
            );
            if (savedAccount) {
              setCurrentAccount(savedAccount);
            } else {
              setCurrentAccount(data.accounts[0]);
              localStorage.setItem('selectedAccountId', data.accounts[0].id.toString());
            }
          } else {
            setCurrentAccount(data.accounts[0]);
            localStorage.setItem('selectedAccountId', data.accounts[0].id.toString());
          }
        } else if (data.accounts.length === 0) {
          setError('No schools available. Please add a new school.');
        }
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError('Failed to load schools');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Ensure an account is selected
    if (!currentAccount) {
      setError('Please select a school account first');
      setShowAccountSelector(true);
      return;
    }

    try {
      const endpoint = isParent ? '/api/auth/parent-login' : '/api/auth/staff-login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          accountId: currentAccount.id 
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (isParent) {
          router.push('/parent-portal');
        } else {
          // Open staff portal in a new tab
          window.open('/staff-portal', '_blank');
        }
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Error during login:', error);
      setError('An error occurred during login. Please try again.');
    }
  };

  const handleSelectAccount = (account: any) => {
    setCurrentAccount(account);
    localStorage.setItem('selectedAccountId', account.id.toString());
    setShowAccountSelector(false);
  };

  const handleAddNewSchool = () => {
    router.push('/onboarding');
  };

  const handleStaffLogin = () => {
    setIsParent(false);
    setEmail('mcgregor@garden.edu.au');
    setPassword('password');
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.settingsIcon} onClick={() => setShowAccountSelector(!showAccountSelector)}>
        <FaCog size={24} />
      </div>

      {showAccountSelector && (
        <div className={styles.accountSelectorOverlay}>
          <div className={styles.accountSelector}>
            <h2>Select School</h2>
            <div className={styles.accountList}>
              {accounts.map(account => (
                <div 
                  key={account.id} 
                  className={`${styles.accountItem} ${currentAccount?.id === account.id ? styles.selected : ''}`}
                  onClick={() => handleSelectAccount(account)}
                >
                  <div className={styles.accountLogo}>
                    <Image src={`/logos/${account.logo}`} alt={account.name} width={40} height={40} />
                  </div>
                  <div className={styles.accountName}>{account.name}</div>
                </div>
              ))}
            </div>
            <button 
              className={styles.addSchoolButton}
              onClick={handleAddNewSchool}
            >
              Add a New School
            </button>
            <button 
              className={styles.closeButton}
              onClick={() => setShowAccountSelector(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          {currentAccount ? (
            <Image 
              src={`/logos/${currentAccount.logo}`} 
              alt={currentAccount.name} 
              width={200} 
              height={200} 
              className={styles.schoolLogo}
            />
          ) : (
            <Image src="/school-logo.png" alt="School Logo" width={200} height={200} />
          )}
        </div>
        
        <h1 className={styles.title}>
          {currentAccount ? currentAccount.name : 'Select a School'}
        </h1>
        
        {!currentAccount && !loading && (
          <div className={styles.noAccountMessage}>
            <p>Please select a school to continue.</p>
            <button 
              className={styles.selectSchoolButton}
              onClick={() => setShowAccountSelector(true)}
            >
              Select School
            </button>
          </div>
        )}
        
        {currentAccount && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
            />
            
            {error && <p className={styles.error}>{error}</p>}
            
            <button type="submit" className={styles.button}>
              {isParent ? 'Parent Login' : 'Staff Login'}
            </button>
            
            {isParent ? (
              <>
                <button 
                  type="button"
                  onClick={handleStaffLogin}
                  className={styles.switchButton}
                >
                  Staff Login
                </button>
                <Link href={{
                  pathname: "/sign-up",
                  query: { accountId: currentAccount.id },
                }} className={styles.signupButton}>
                  New parent? Sign up now!
                </Link>
              </>
            ) : (
              <button 
                type="button"
                onClick={() => setIsParent(true)}
                className={styles.switchButton}
              >
                Parent Login
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
