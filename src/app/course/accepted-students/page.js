"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Student management moved into the admin area. This keeps old links and bookmarks working;
// the admin layout then decides whether the visitor is allowed to see the page.
export default function AcceptedStudentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/students?tab=accepted");
  }, [router]);

  return null;
}
