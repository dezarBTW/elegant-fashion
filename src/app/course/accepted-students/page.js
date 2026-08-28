"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./accepted-students.module.css";

export default function AcceptedStudents() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [acceptedStudents, setAcceptedStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        router.push("/course");
        return;
      }
      fetchAcceptedStudents();
    }
  }, [user, loading, isAdmin, router]);

  const fetchAcceptedStudents = async () => {
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("accepted", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching accepted students:", error);
      } else {
        setAcceptedStudents(data || []);
      }
    } catch (error) {
      console.error("Error fetching accepted students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  if (loading || loadingStudents) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} aria-hidden="true" />
        <p>Loading accepted students...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/course" className={styles.backBtn}>
          ← Back to Fashion School
        </Link>
        <h1>Accepted Students</h1>
      </div>

      {acceptedStudents.length > 0 ? (
        <div className={styles.studentsList}>
          {acceptedStudents.map((student) => (
            <div key={student.id} className={styles.studentCard}>
              <div className={styles.studentInfo}>
                <h3>{student.first_name} {student.surname}</h3>
                <p>{student.email}</p>
                <p>{student.telephone}</p>
                <p className={styles.programme}>{student.chosen_programme}</p>
              </div>
              <Link
                href={`/course/registration/${student.id}`}
                className={styles.viewBtn}
              >
                View Registration
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noStudents}>
          <p>No accepted students yet.</p>
        </div>
      )}
    </div>
  );
}
