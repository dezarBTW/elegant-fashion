'use client';

import React, { useState, useEffect } from 'react';
import styles from '../components/Navbar.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const LoginIcon = () => (
  <svg className={styles.authIcon} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
);

const UserPlusIcon = () => (
  <svg className={styles.authIcon} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const LogoutIcon = () => (
  <svg className={styles.authIcon} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const CollectionIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8h12l1 13H5L6 8Z" />
    <path d="M9 8a3 3 0 0 1 6 0" />
  </svg>
);

const SchoolIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 10 9-5 9 5-9 5-9-5Z" />
    <path d="M7 12.5V17c2.8 2 7.2 2 10 0v-4.5" />
    <path d="M21 10v6" />
  </svg>
);

const AboutIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);

const HomeIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 10 9-7 9 7" />
    <path d="M5 9v11h14V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

const AdminIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 4 6v6c0 4.5 3.2 8.2 8 9 4.8-.8 8-4.5 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const getEmailInitials = (email) => {
  const localPart = email?.split('@')[0]?.trim() || '';
  const parts = localPart.split(/[._-]+/).filter(Boolean);

  if (parts.length > 1) {
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase() || '?';
};

const ProfileMenu = ({ mobile = false, user, onNavigate }) => (
  <div className={`${styles.profileMenuWrapper} ${mobile ? styles.mobileProfileMenuWrapper : ""}`}>
    <Link href="/account" onClick={onNavigate}
      className={`${styles.profileIcon} ${mobile ? styles.mobileProfileIcon : styles.drawerProfileIcon}`}
      title={user.email || "My account"} aria-label="Open my account">
      {getEmailInitials(user.email)}
    </Link>
  </div>
);

function NavbarContent({ user, logout, isAdmin }) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const lastScrollY = React.useRef(0);
  const menuButton = React.useRef(null);
  const menuPanel = React.useRef(null);
  const closeMenu = () => setIsMenuOpen(false);
  const toggleMenu = () => setIsMenuOpen((previous) => !previous);

  useEffect(() => {
    if (!isMenuOpen) return;
    const links = () => [...menuPanel.current.querySelectorAll('a[href], button:not(:disabled)')]
      .filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => links()[0]?.focus());
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === 'Tab') {
        const controls = [menuButton.current, ...links()];
        const index = controls.indexOf(document.activeElement);
        if (index === -1 || (!event.shiftKey && index === controls.length - 1) || (event.shiftKey && index === 0)) {
          event.preventDefault();
          controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', handleKey); };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    logout();
    router.push('/');
    router.refresh();
    try { await supabase.auth.signOut({ scope: 'local' }); }
    catch (error) { console.error('Local logout error:', error); }
    supabase.auth.signOut({ scope: 'global' }).catch((error) => console.error('Global logout error:', error));
  };

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Close the drawer automatically if the viewport grows past mobile width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide navbar on scroll down, show on scroll up
  useEffect(() => {
    let frame = null;
    const updateNavbar = () => {
      frame = null;
      if (isMenuOpen) return;

      const currentScrollY = window.scrollY;
      if (currentScrollY < 80) {
        setIsNavbarVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsNavbarVisible(false);
      } else {
        setIsNavbarVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    const handleScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateNavbar);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [isMenuOpen]);

  return (
    <nav className={`${styles.nav} ${isNavbarVisible ? '' : styles.navHidden}`}>
      <div className={styles.navContent}>
        <div className={styles.logoSection}>
          <Link href="/" className={styles.logo} onClick={closeMenu}>
            <Image
              src="/images/elegant-style-navbar.png"
              alt="Elegant Style"
              width={1900}
              height={636}
              className={styles.logoImage}
              sizes="111px"
              priority
            />
          </Link>
        </div>

        {user && (
          <ProfileMenu mobile user={user} onNavigate={closeMenu} />
        )}

        <button
          ref={menuButton}
          className={`${styles.hamburger} ${isMenuOpen ? styles.hamburgerOpen : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Backdrop overlay for the mobile drawer */}
        <div
          className={`${styles.backdrop} ${isMenuOpen ? styles.backdropOpen : ''}`}
          onClick={closeMenu}
          aria-hidden="true"
        ></div>

        <div ref={menuPanel} id="primary-navigation" className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ""}`}>
          <Link href="/" className={styles.drawerLogo} onClick={closeMenu} aria-label="Elegant Style home">
            <Image src="/images/elegant-style-navbar.png" alt="Elegant Style" width={1900} height={636} sizes="160px" className={styles.drawerLogoImage} />
          </Link>
          <div className={styles.navMenu}>
            <Link href="/" onClick={closeMenu}>
              <HomeIcon />
              HOME
            </Link>
            <Link href="/ready-to-wear" onClick={closeMenu}>
              <CollectionIcon />
              READY-TO-WEAR
            </Link>
            <Link href="/course" onClick={closeMenu}>
              <SchoolIcon />
              FASHION ACADEMY
            </Link>
            <Link href="/about" onClick={closeMenu}>
              <AboutIcon />
              ABOUT US
            </Link>
            {/* Only people with an admin account ever see this link. */}
            {user && isAdmin && (
              <Link href="/admin" onClick={closeMenu}>
                <AdminIcon />
                ADMIN
              </Link>
            )}
          </div>

          <div className={styles.authSection}>
            {user ? (
              <>
                <ProfileMenu user={user} onNavigate={closeMenu} />
                <button
                  onClick={handleLogout}
                  className={styles.navLogout}
                >
                  <LogoutIcon />
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  className={styles.authLink}
                  href="/sign-in"
                  onClick={closeMenu}
                >
                  <LoginIcon />
                  Sign In
                </Link> 
                <Link
                  className={`${styles.authLink} ${styles.authLinkPrimary}`}
                  href="/sign-up"
                  onClick={closeMenu}
                >
                  <UserPlusIcon />
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Changing accounts remounts the navbar and clears menus, forms, and pending UI state.
export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  return (
    <NavbarContent
      key={user?.id ?? 'signed-out'}
      user={user}
      logout={logout}
      isAdmin={isAdmin}
    />
  );
}
