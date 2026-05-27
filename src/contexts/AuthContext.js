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

    // Debounce auth check to prevent race conditions
    authCheckTimeout = setTimeout(checkAuth, 100);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (!userError && userData) {
            setUserData(userData);
            setIsAdmin(!!userData.is_admin);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserData(null);
          setIsAdmin(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(authCheckTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userData,
    loading,
    isAdmin,
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
