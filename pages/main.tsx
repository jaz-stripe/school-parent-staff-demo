// Example base page for parent and staff portal pages to show styling and inclusion of top bar.

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import { RootState } from '../store';
import { setUser, setHasPaymentMethod } from '../slices/userSlice';
import { useSimplified } from '../components/SimplifiedContext';
import styles from '../styles/Main.module.css';
import Modal from '../components/Modal';

export default function Main() {
  console.log('Main component rendering');

  console.log('Rendering main content');

  return (
    <div className={styles.container}>
      <TopBar userEmoji={user.emoji} onLogout={handleLogout} />
      <main className={styles.main}>
        ...
  );
}