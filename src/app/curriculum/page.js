"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./curriculum.module.css";
import ScrollRevealRoot from "@/components/ScrollRevealRoot";
import BackToTopButton from "@/components/BackToTopButton";

function StudentsIcon() {
  return (
    <svg
      className={styles.statSvg}
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg
      className={styles.statSvg}
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7h6M9 11h4" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg
      className={styles.statSvg}
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      <path d="m9 8 2 2 4-4" />
    </svg>
  );
}

const threeMonthModules = [
  {
    number: "Module 01",
    title: "Beginner Sewing & Garment Construction",
    description:
      "Master machine operations, precision stitching, seam allowances, and foundational garment assembly.",
  },
  {
    number: "Module 02",
    title: "Pattern Drafting & Cutting",
    description:
      "Learn accurate body measurements, foundational blocks, dart manipulation, and precise fabric cutting.",
  },
  {
    number: "Module 03",
    title: "Clothing Construction / Cut-and-Sew",
    description:
      "Hands-on construction of essential garments, standard fitting techniques, and professional edge finishing.",
  },
];

const sixMonthModules = [
  {
    number: "Module 01",
    title: "Complete Foundation Track",
    description:
      "Full coverage of beginner sewing mechanics, block drafting, accurate cutting, and core garment assembly.",
  },
  {
    number: "Module 02",
    title: "Fashion Illustration & Sketching",
    description:
      "Figure drawing, translating creative ideas to paper, rendering textures, and designing coherent fashion collections.",
  },
  {
    number: "Module 03",
    title: "Specialized Garment Types",
    description:
      "Advanced tailoring techniques, bespoke collars, structured sleeves, eveningwear, and intricate finishes.",
  },
  {
    number: "Module 04",
    title: "Business & Entrepreneurship",
    description:
      "Costing and pricing strategies, studio setup, client consultation workflow, and launching your own fashion label.",
  },
];

const benefits = [
  "Additional or primary income generation",
  "Entrepreneurship and self-employment opportunities",
  "Practical, marketable technical skills",
  "Creativity and self-expression boost",
  "Improved professional portfolio and credibility",
  "Networking and industry exposure",
];

export default function Curriculum() {
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setStudentCount(1000);
      return undefined;
    }

    const target = 1000;
    const duration = 1500;
    const intervalTime = 20;
    const totalSteps = Math.ceil(duration / intervalTime);
    let step = 0;
    let timerId;

    const countUp = () => {
      step += 1;
      const progress = Math.min(step / totalSteps, 1);
      // Ease-out curve for smooth deceleration towards 1000
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeOut * target);
      setStudentCount(current);

      if (progress < 1) {
        timerId = setTimeout(countUp, intervalTime);
      } else {
        setStudentCount(target);
      }
    };

    timerId = setTimeout(countUp, 50);

    return () => clearTimeout(timerId);
  }, []);

  const formattedStudents =
    studentCount >= 1000 ? "1k+" : `${studentCount.toLocaleString()}+`;

  return (
    <ScrollRevealRoot className={styles.page}>
      <div className={styles.pageHeader} data-reveal>
        <span className={styles.eyebrow}>The programme</span>
        <h1 className={styles.pageTitle}>Fashion School Curriculum</h1>
        <p className={styles.pageSubtitle}>
          What you&apos;ll learn on the path to becoming a professional fashion designer
        </p>
      </div>

      <div className={styles.pageContainer}>
        {/* Top Key Metrics Strip - First Content Seen */}
        <section className={styles.statsSection} aria-label="Curriculum highlights & achievements">
          <div className={styles.statsGrid}>
            <div data-reveal data-reveal-delay="0">
              <div className={styles.statCard}>
                <div className={styles.statIconWrapper}>
                  <StudentsIcon />
                </div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>{formattedStudents}</span>
                  <h3 className={styles.statLabel}>Students Empowered</h3>
                  <p className={styles.statDescription}>
                    Trained across bespoke tailoring and professional garment construction.
                  </p>
                </div>
              </div>
            </div>

            <div data-reveal data-reveal-delay="90">
              <div className={styles.statCard}>
                <div className={styles.statIconWrapper}>
                  <CoursesIcon />
                </div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>10</span>
                  <h3 className={styles.statLabel}>Standard Fashion Courses</h3>
                  <p className={styles.statDescription}>
                    Curated modules spanning foundational sewing to advanced couture techniques.
                  </p>
                </div>
              </div>
            </div>

            <div data-reveal data-reveal-delay="180">
              <div className={styles.statCard}>
                <div className={styles.statIconWrapper}>
                  <SuccessIcon />
                </div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>99%</span>
                  <h3 className={styles.statLabel}>Success Rate</h3>
                  <p className={styles.statDescription}>
                    Of committed graduates establish independent studios or industry careers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Month Programme Section */}
        <section className={styles.programSection}>
          <div className={styles.programHeader} data-reveal>
            <div className={styles.titleWrapper}>
              <span className={styles.programBadge}>Foundation</span>
              <h2 className={styles.programTitle}>3-Month Programme</h2>
            </div>
            <p className={styles.programFee}>&#8358;150,000</p>
          </div>
          <p className={styles.programDescription} data-reveal data-reveal-delay="80">
            An intensive foundational course designed to take you from zero sewing experience to confidently drafting, cutting, and sewing polished everyday garments.
          </p>
          <div className={styles.cardsGrid}>
            {threeMonthModules.map((item, index) => (
              <div key={item.title} data-reveal data-reveal-delay={String(index * 90)}>
                <div className={styles.moduleCard}>
                  <span className={styles.moduleNumber}>{item.number}</span>
                  <h3 className={styles.moduleTitle}>{item.title}</h3>
                  <p className={styles.moduleDescription}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6-Month Programme Section */}
        <section className={styles.programSection}>
          <div className={styles.programHeader} data-reveal>
            <div className={styles.titleWrapper}>
              <span className={styles.programBadge}>Advanced</span>
              <h2 className={styles.programTitle}>6-Month Programme</h2>
            </div>
            <p className={styles.programFee}>&#8358;250,000</p>
          </div>
          <p className={styles.programDescription} data-reveal data-reveal-delay="80">
            Everything in the 3-month foundation track, plus specialized couture techniques, professional fashion illustration, and comprehensive business modules to launch your fashion career.
          </p>
          <div className={styles.cardsGrid}>
            {sixMonthModules.map((item, index) => (
              <div key={item.title} data-reveal data-reveal-delay={String(index * 90)}>
                <div className={styles.moduleCard}>
                  <span className={styles.moduleNumber}>{item.number}</span>
                  <h3 className={styles.moduleTitle}>{item.title}</h3>
                  <p className={styles.moduleDescription}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits Section */}
        <div className={styles.benefitsSection} data-reveal>
          <h3 className={styles.benefitsHeading}>What You Stand to Gain</h3>
          <div className={styles.benefitsGrid}>
            {benefits.map((benefit) => (
              <p key={benefit} className={styles.benefitItem}>
                {benefit}
              </p>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className={styles.ctaBanner} data-reveal>
          <h3>Ready to start your fashion journey?</h3>
          <p>Register now for our upcoming cohort at Elegant Style Fashion Academy.</p>
          <Link href="/course" className={styles.ctaButton}>
            Enroll in Fashion School
          </Link>
        </div>
      </div>
      <BackToTopButton />
    </ScrollRevealRoot>
  );
}
