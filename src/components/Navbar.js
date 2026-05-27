'use client';

import React, { useState } from 'react';
import styles from '../components/Navbar.module.css';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function Navbar() {
  const { user, userData, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (loading) {
    return (
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            ELEGANT FASHION
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo}>
          ELEGANT FASHION
        </Link>
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
          <Link href="/ready-to-wear" onClick={() => setIsMenuOpen(false)}>Ready-to-Wear</Link>
          <Link href="/course" onClick={() => setIsMenuOpen(false)}>Fashion School</Link>
          <Link href="/about" onClick={() => setIsMenuOpen(false)}>About Us</Link>
          <Link href="/contact" onClick={() => setIsMenuOpen(false)}>Contact Us</Link>
          {user ? (
            <>
              <button 
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className={styles.navLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
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