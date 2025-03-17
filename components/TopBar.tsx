// This TopBar is always at the top of the page, and changes depending on the context or role
// There are two roles: parent, staff
// The top bar will have links to all the required pages , including a back icon in the far left, next to the logo.
// On the right of the TopBar is the icon (emoji) for the parent or the staff, where clicking on this gives a drop down with the option to log out. When clicked the user is logged out and redirected to index.html.
// The parent role displays only one page for now, so the top bar only has logo

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../styles/TopBar.module.css';
import { useSimplified } from './SimplifiedContext';

interface TopBarProps {
  userEmoji: string;
  onLogout: () => void;
}

export default function TopBar({ userEmoji, onLogout }: TopBarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const logoMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isSimplified, toggleSimplified } = useSimplified();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (logoMenuRef.current && !logoMenuRef.current.contains(event.target as Node)) {
        setIsLogoMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const toggleLogoMenu = () => {
    setIsLogoMenuOpen(!isLogoMenuOpen);
  };

  const handleAccountClick = () => {
    setIsUserMenuOpen(false);
    router.push('/account');
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.logoContainer} ref={logoMenuRef}>
          <button onClick={toggleLogoMenu} className={styles.logoButton}>
            <Image src="/tvnz-plus-logo.svg" alt="TVNZ+ Logo" width={100} height={50} />
          </button>
          {isLogoMenuOpen && (
            <div className={styles.dropdown}>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={isSimplified}
                  onChange={toggleSimplified}
                />
                <span className={styles.toggleSlider}></span>
                Simplified
              </label>
            </div>
          )}
        </div>
        <nav className={styles.navigation}>
          <a href="#" className={styles.navItem}>Home</a>
          <a href="#" className={`${styles.navItem} ${styles.active}`}>Sports</a>
          <a href="#" className={styles.navItem}>News</a>
          <a href="#" className={styles.navItem}>Categories</a>
          <a href="#" className={`${styles.navItem} ${styles.premium}`}>Premium</a>
        </nav>
      </div>
      <div className={styles.rightSection}>
        <div className={styles.userMenu} ref={userMenuRef}>
          <button onClick={toggleUserMenu} className={styles.avatarButton}>
            {userEmoji}
          </button>
          {isUserMenuOpen && (
            <div className={styles.dropdown}>
              <button onClick={() => console.log('Manage Profile')}>Manage Profile</button>
              <button onClick={handleAccountClick}>Account</button>
              <button onClick={() => console.log('Help')}>Help</button>
              <button onClick={onLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
