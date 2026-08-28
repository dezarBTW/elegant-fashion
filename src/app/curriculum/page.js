"use client";
import React from "react";
import styles from "./curriculum.module.css";

export default function Curriculum() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <span className={styles.eyebrow}>The programme</span>
        <h1 className={styles.pageTitle}>Fashion school curriculum</h1>
        <p className={styles.pageSubtitle}>
          What you&apos;ll learn on the path to becoming a professional fashion designer
        </p>
      </div>

      <div className={styles.pageContainer}>
        <ol className={styles.timeline}>
          <li className={styles.tier}>
            <span className={styles.tierNumber}>01</span>
            <div className={styles.tierBody}>
              <h3>3-month programme</h3>
              <ul className={styles.programList}>
                <li>Beginner sewing and garment construction</li>
                <li>Pattern drafting and cutting</li>
                <li>Clothing construction / cut-and-sew techniques</li>
              </ul>
            </div>
          </li>

          <li className={styles.tier}>
            <span className={styles.tierNumber}>02</span>
            <div className={styles.tierBody}>
              <h3>6-month programme</h3>
              <p className={styles.tierNote}>Everything in the 3-month track, plus:</p>
              <ul className={styles.programList}>
                <li>Fashion illustration / sketching</li>
                <li>Business and entrepreneurship modules</li>
                <li>Specialized garment types</li>
              </ul>
            </div>
          </li>
        </ol>

        <div className={styles.benefitsSection}>
          <h3>What you stand to gain</h3>
          <div className={styles.benefitsGrid}>
            <p>Additional or primary income generation</p>
            <p>Entrepreneurship and self-employment opportunities</p>
            <p>Practical, marketable technical skills</p>
            <p>Creativity and self-expression boost</p>
            <p>Improved professional portfolio and credibility</p>
            <p>Networking and industry exposure</p>
          </div>
        </div>
      </div>
    </div>
  );
}
