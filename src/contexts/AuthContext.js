"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { createAuthRequestGate } from "@/lib/authRequestGate.mjs";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [gate] = useState(createAuthRequestGate);

  useEffect(() => {
    let mounted = true;
    const clearIdentity = () => {
      setUser(null);
      setUserData(null);
      setIsAdmin(false);
      setLoading(false);
    };
    const loadUserData = async (ticket) => {
      if (!mounted || !gate.isCurrent(ticket)) return;
      try {
        const { data: profile, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", ticket.userId)
          .single();
        if (!mounted || !gate.isCurrent(ticket)) return;
        if (error) throw error;
        const latest = await supabase.auth.getSession();
        if (!mounted || !gate.isCurrent(ticket)) return;
        if (latest.error || latest.data.session?.user?.id !== ticket.userId) {
          gate.invalidate();
          clearIdentity();
          return;
        }
        if (profile?.id !== ticket.userId) return;
        if (profile.is_active === false) {
          await supabase.auth.signOut({ scope: "local" });
          if (mounted && gate.isCurrent(ticket)) {
            gate.invalidate();
            clearIdentity();
          }
          return;
        }
        setUserData(profile);
        setIsAdmin(profile.is_admin === true);
      } catch (error) {
        if (mounted && gate.isCurrent(ticket)) {
          setUserData(null);
          setIsAdmin(false);
          console.error(
            "Unable to load account profile",
            error?.code || "profile_error",
          );
        }
      } finally {
        if (mounted && gate.isCurrent(ticket)) setLoading(false);
      }
    };
    const adoptSession = (session) => {
      if (!mounted) return;
      const nextUser = session?.user || null;
      const ticket = gate.begin(nextUser?.id || null);
      setUser(nextUser);
      setUserData(null);
      setIsAdmin(false);
      setLoading(Boolean(nextUser));
      // Supabase auth callbacks must not await another auth operation.
      if (nextUser) window.setTimeout(() => void loadUserData(ticket), 0);
    };
    const initial = gate.begin(null);
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (mounted && gate.isCurrent(initial))
          adoptSession(error ? null : data.session);
      })
      .catch(() => {
        if (mounted && gate.isCurrent(initial)) adoptSession(null);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (
        [
          "INITIAL_SESSION",
          "SIGNED_IN",
          "SIGNED_OUT",
          "USER_UPDATED",
          "TOKEN_REFRESHED",
        ].includes(event)
      )
        adoptSession(session);
    });
    return () => {
      mounted = false;
      gate.invalidate();
      subscription.unsubscribe();
    };
  }, [gate]);

  const logout = () => {
    gate.invalidate();
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
