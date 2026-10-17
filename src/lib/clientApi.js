import { supabase } from "./supabaseClient";

export async function authenticatedFetch(url, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  const response = await fetch(url, {
    ...options, cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${data.session.access_token}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}
