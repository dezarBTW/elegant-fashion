"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    let authCheckTimeout;

    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // Ignore "Auth session missing" error - it's normal when not logged in
          if (sessionError.message !== 'Auth session missing!') {
            console.error("Session error:", sessionError);
          }
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          setUser(session.user);
          
          // Fetch user data from users table
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (!userError && userData && mounted) {
            if (userData.is_active === false) {
              await supabase.auth.signOut({ scope: "local" });
              setUser(null);
              setUserData(null);
              setIsAdmin(false);
              return;
            }
            setUserData(userData);
            setIsAdmin(!!userData.is_admin);
          }
        }
      } catch (error) {
        // Ignore "Auth session missing" error - it's normal when not logged in
        if (error.message !== 'Auth session missing!') {
          console.error("Auth check error:", error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const loadUserData = async (userId) => {
      const { data: profile, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (mounted && !userError && profile) {
        if (profile.is_active === false) {
          await supabase.auth.signOut({ scope: "local" });
          setUser(null);
          setUserData(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setUserData(profile);
        setIsAdmin(!!profile.is_admin);
      }
    };

    // Debounce auth check to prevent race conditions
    authCheckTimeout = setTimeout(checkAuth, 100);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setLoading(false);
        window.setTimeout(() => loadUserData(session.user.id), 0);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(authCheckTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = () => {
    // Clear local state immediately (synchronous, no network required)
    setUser(null);
    setUserData(null);
    setIsAdmin(false);
    setLoading(false);
  };

  const value = {
    user,
    userData,
    loading,
    isAdmin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
