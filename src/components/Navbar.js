'use client';

import React, { useState } from 'react';
import styles from '../components/Navbar.module.css';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function Navbar() {
  const { user, userData, isAdmin } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Simplified & Fast Logout
  const handleLogout = async () => {
    setIsMenuOpen(false);        // Close menu immediately

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
    } else {
      router.push('/');          // Redirect to home
      // Optional: router.refresh(); // if you want to refresh current page instead
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <div className={styles.logoSection}>
          <Link href="/" className={styles.logo}>
            ELEGANT FASHION
          </Link>
          {user && (
            <span className={`${styles.userGreeting} ${styles.userGreetingMobile}`}>
              Hi, {userData?.username || 'User'}
            </span>
          )}
        </div>

        <button
          className={styles.hamburger}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className={isMenuOpen ? styles.open : ''}></span>
          <span className={isMenuOpen ? styles.open : ''}></span>
          <span className={isMenuOpen ? styles.open : ''}></span>
        </button>

        <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ''}`}>
          <Link href="/ready-to-wear" onClick={() => setIsMenuOpen(false)}>
            READY-TO-WEAR
          </Link>
          <Link href="/course" onClick={() => setIsMenuOpen(false)}>
            FASHION SCHOOL
          </Link>
          <Link href="/about" onClick={() => setIsMenuOpen(false)}>
            ABOUT US
          </Link>
          <Link href="/contact" onClick={() => setIsMenuOpen(false)}>
            CONTACT US
          </Link>

          {user ? (
            <>
              <span className={`${styles.userGreeting} ${styles.userGreetingDesktop}`}>
                Hi, {userData?.username || ''}
              </span>

              <button
                onClick={handleLogout}
                className={styles.navLogout}
              >
                Log Out
              </button>

              {isAdmin && (
                <Link
                  className={styles.adminLink}
                  href="/admin"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                className={styles.authLink}
                href="/sign-in"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                className={`${styles.authLink} ${styles.authLinkPrimary}`}
                href="/sign-up"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;