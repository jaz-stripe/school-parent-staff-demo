// We want to clearly differentiate Parent and staff logins, 
// both a parent and a staff login session need to be able to exist symaltaneously in different browser tabs
// The Sign up button needs to be large and below the parent loging button
// Loging in as staff, opens resutling page in a new tab


import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear any previous errors

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // If login is successful, redirect to the main page
        router.push('/main');
      } else {
        // If login fails, display the error message
        setError(data.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Error during login:', error);
      setError('An error occurred during login. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          <img src="/demo-logo.svg" alt="Demo Logo" className={styles.logo} />
        </div>
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
          <button type="submit" className={styles.button}>Log in</button>
        </form>
        <button 
          onClick={() => router.push('/signup')} 
          className={styles.signupButton}
        >
          New parent? Sign up now!
        </button>
      </div>
    </div>
  );
}
