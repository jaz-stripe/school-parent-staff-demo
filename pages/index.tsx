// pages/index.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isParent, setIsParent] = useState(true);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isParent ? '/api/auth/parent-login' : '/api/auth/staff-login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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

  const handleStaffLogin = () => {
    setIsParent(false);
    setEmail('mcgregor@garden.edu.au');
    setPassword('password');
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          <Image src="/school-logo.png" alt="School Logo" width={200} height={200} />
        </div>
        
        <h1 className={styles.title}>
          {isParent ? 'Parent Login' : 'Staff Login'}
        </h1>
        
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
        </form>
        
        {isParent ? (
          <>
            <button 
              onClick={handleStaffLogin}
              className={styles.switchButton}
            >
              Staff Login
            </button>
            // pages/index.tsx (continued)
            <Link href="/sign-up" className={styles.signupButton}>
              New parent? Sign up now!
            </Link>
          </>
        ) : (
          <button 
            onClick={() => setIsParent(true)}
            className={styles.switchButton}
          >
            Parent Login
          </button>
        )}
      </div>
    </div>
  );
}

