'use client';

import React, { useState, useEffect } from 'react';
import styles from '../components/Navbar.module.css';
import Link from 'next/link';
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

const UserIcon = () => (
  <svg className={styles.authIcon} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
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

const getEmailInitials = (email) => {
  const localPart = email?.split('@')[0]?.trim() || '';
  const parts = localPart.split(/[._-]+/).filter(Boolean);

  if (parts.length > 1) {
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase() || '?';
};

function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openProfileMenu, setOpenProfileMenu] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const lastScrollY = React.useRef(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [isAccountActionLoading, setIsAccountActionLoading] = useState(false);

  // Logout: clear local state first (instant, no network required),
  // then best-effort revoke session on Supabase in background.
  const handleLogout = async () => {
    setIsMenuOpen(false); // Close menu immediately
    setOpenProfileMenu(null);

    // Step 1: Clear local state immediately (synchronous, works offline)
    logout();

    // Step 2: Navigate away immediately
    router.push('/');
    router.refresh();

    // Step 3: Best-effort revoke session on Supabase (background, doesn't block UI)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Local logout error:', error);
    }

    // Step 4: Also try to revoke globally (background, non-blocking)
    supabase.auth.signOut({ scope: 'global' }).catch((error) => {
      console.error('Global logout error:', error);
    });
  };

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const openPasswordModal = () => {
    setOpenProfileMenu(null);
    setAccountMessage('');
    setAccountError('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setIsPasswordModalOpen(true);
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setAccountMessage('');
    setAccountError('');

    if (!currentPassword) {
      setAccountError('Enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setAccountError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setAccountError('Passwords do not match.');
      return;
    }

    setIsAccountActionLoading(true);
    const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (reauthenticationError) {
      setIsAccountActionLoading(false);
      setAccountError('Your current password is incorrect.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsAccountActionLoading(false);

    if (error) {
      setAccountError(error.message || 'Unable to change your password.');
      return;
    }

    setAccountMessage('Password changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleDeactivateAccount = async () => {
    if (!user?.id) {
      setIsDeactivateModalOpen(false);
      setAccountError('Your session has expired. Please sign in again.');
      return;
    }

    if (!deactivatePassword) {
      setAccountError('Enter your password to confirm deactivation.');
      return;
    }

    setIsAccountActionLoading(true);
    setAccountError('');

    const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deactivatePassword,
    });

    if (reauthenticationError) {
      setIsAccountActionLoading(false);
      setAccountError('Your password is incorrect.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', user.id);

    if (error) {
      setIsAccountActionLoading(false);
      setAccountError(error.message || 'Unable to deactivate your account.');
      return;
    }

    await supabase.auth.signOut({ scope: 'local' });
    logout();
    setIsAccountActionLoading(false);
    setIsDeactivateModalOpen(false);
    router.replace('/sign-in?deactivated=true');
    router.refresh();
  };

  const toggleProfileMenu = (menuName) => {
    setOpenProfileMenu((previous) => previous === menuName ? null : menuName);
    setAccountError('');
    setAccountMessage('');
  };

  const ProfileMenu = ({ mobile = false }) => (
    <div className={`${styles.profileMenuWrapper} ${mobile ? styles.mobileProfileMenuWrapper : ''}`}>
      <button
        type="button"
        className={`${styles.profileIcon} ${mobile ? styles.mobileProfileIcon : styles.drawerProfileIcon}`}
        title={user.email || 'Signed in user'}
        aria-label={`Signed in as ${user.email || 'user'}`}
        aria-expanded={openProfileMenu === (mobile ? 'mobile' : 'desktop')}
        aria-haspopup="menu"
        onClick={() => toggleProfileMenu(mobile ? 'mobile' : 'desktop')}
      >
        {getEmailInitials(user.email)}
      </button>
      {openProfileMenu === (mobile ? 'mobile' : 'desktop') && (
        <div className={styles.profileMenu} role="menu">
          <button type="button" role="menuitem" onClick={() => setOpenProfileMenu(null)}>
            <CollectionIcon />
            My Cart
            <span className={styles.cartCount}>0</span>
          </button>
          <button type="button" role="menuitem" onClick={openPasswordModal}>
            <UserIcon />
            Change password
          </button>
          <button type="button" role="menuitem" className={styles.deactivateAction} onClick={() => {
            setOpenProfileMenu(null);
            setAccountError('');
            setDeactivatePassword('');
            setIsDeactivateModalOpen(true);
          }}>
            Deactivate account
          </button>
        </div>
      )}
    </div>
  );

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!user) {
      setOpenProfileMenu(null);
      setIsPasswordModalOpen(false);
      setIsDeactivateModalOpen(false);
      setIsAccountActionLoading(false);
    }
  }, [user]);

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
    const handleScroll = () => {
      if (isMenuOpen || isPasswordModalOpen || isDeactivateModalOpen) return;

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

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMenuOpen, isPasswordModalOpen, isDeactivateModalOpen]);

  return (
    <nav className={`${styles.nav} ${isNavbarVisible ? '' : styles.navHidden}`}>
      <div className={styles.navContent}>
        <div className={styles.logoSection}>
          <Link href="/" className={styles.logo} onClick={closeMenu}>
            ELEGANT STYLE FASHION
          </Link>
        </div>

        {user && (
          <ProfileMenu mobile />
        )}

        <button
          className={`${styles.hamburger} ${isMenuOpen ? styles.hamburgerOpen : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
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

        <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ''}`}>
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
          </div>

          <div className={styles.authSection}>
            {user ? (
              <>
                <ProfileMenu />
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
      {isPasswordModalOpen && (
        <div className={styles.accountModalOverlay} role="presentation" onClick={() => setIsPasswordModalOpen(false)}>
          <section className={styles.accountModal} role="dialog" aria-modal="true" aria-labelledby="change-password-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="change-password-title">Change password</h2>
            {accountError && <p className={styles.accountError} role="alert">{accountError}</p>}
            {accountMessage && <p className={styles.accountSuccess} role="status">{accountMessage}</p>}
            <form onSubmit={handlePasswordChange}>
              <label htmlFor="current-password">Current password</label>
              <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={isAccountActionLoading} required />
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isAccountActionLoading} required />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isAccountActionLoading} required />
              <div className={styles.accountModalActions}>
                <button type="button" className={styles.modalSecondaryButton} onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.modalPrimaryButton} disabled={isAccountActionLoading}>{isAccountActionLoading ? 'Updating...' : 'Update password'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {isDeactivateModalOpen && (
        <div className={styles.accountModalOverlay} role="presentation" onClick={() => setIsDeactivateModalOpen(false)}>
          <section className={styles.accountModal} role="dialog" aria-modal="true" aria-labelledby="deactivate-account-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="deactivate-account-title">Deactivate account?</h2>
            <p>Your account and its data will stay in the database, but you will be signed out and unable to sign in until an administrator reactivates it.</p>
            {accountError && <p className={styles.accountError} role="alert">{accountError}</p>}
            <form onSubmit={(event) => { event.preventDefault(); handleDeactivateAccount(); }}>
              <label htmlFor="deactivate-password">Confirm your password</label>
              <input
                id="deactivate-password"
                type="password"
                autoComplete="current-password"
                value={deactivatePassword}
                onChange={(event) => setDeactivatePassword(event.target.value)}
                disabled={isAccountActionLoading}
                required
              />
              <div className={styles.accountModalActions}>
                <button type="button" className={styles.modalSecondaryButton} onClick={() => setIsDeactivateModalOpen(false)}>Keep account</button>
                <button type="submit" className={styles.deactivateButton} disabled={isAccountActionLoading}>{isAccountActionLoading ? 'Deactivating...' : 'Deactivate account'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
