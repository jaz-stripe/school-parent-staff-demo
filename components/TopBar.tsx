// components/TopBar.tsx
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/TopBar.module.css';

interface TopBarProps {
  userEmoji: string;
  userName?: string;
  role: 'parent' | 'staff';
  onLogout: () => void;
  accountName: string;
  accountLogo: string;
}

export default function TopBar({
  userEmoji,
  userName,
  role,
  onLogout,
  accountName,
  accountLogo
}: TopBarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSchoolInfoOpen, setIsSchoolInfoOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const schoolInfoRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (schoolInfoRef.current && !schoolInfoRef.current.contains(event.target as Node)) {
        setIsSchoolInfoOpen(false);
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
  
  const toggleSchoolInfo = () => {
    setIsSchoolInfoOpen(!isSchoolInfoOpen);
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {/* Show back arrow if not on home page */}
        {router.pathname !== `/${role}-portal` && (
          <Link href={`/${role}-portal`}>
            <span className={styles.backArrow}>←</span>
          </Link>
        )}
        
        {/* School logo and info */}
        <div 
          className={styles.logoContainer}
          onClick={toggleSchoolInfo}
          ref={schoolInfoRef}
        >
          <Image 
            src={`/logos/${accountLogo}`} 
            alt={accountName} 
            width={50} 
            height={50}
          />
          
          {isSchoolInfoOpen && (
            <div className={styles.schoolInfoDropdown}>
              <p className={styles.schoolName}>{accountName}</p>
            </div>
          )}
        </div>
        
        {/* Navigation links based on role */}
        {role === 'staff' && (
          <nav className={styles.navigation}>
            <Link href="/parents" className={router.pathname === '/parents' ? styles.active : ''}>
              Parents
            </Link>
            <Link href="/students" className={router.pathname === '/students' ? styles.active : ''}>
              Students
            </Link>
          </nav>
        )}
      </div>
      
      <div className={styles.rightSection}>
        <div className={styles.userMenu} ref={userMenuRef}>
          <button onClick={toggleUserMenu} className={styles.avatarButton} aria-label="User menu">
            <span className={styles.userEmoji}>{userEmoji}</span>
            {userName && <span className={styles.userName}>{userName}</span>}
          </button>
          
          {isUserMenuOpen && (
            <div className={styles.dropdown}>
              {role === 'parent' && (
                <>
                  <Link href="/account">Account</Link>
                  <Link href="/api/portal">Payments & Invoices</Link>
                </>
              )}
              <button onClick={onLogout}>Log Out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
