"use client";
import React from "react";
import Image from "next/image";
import { socialLinks } from "@/lib/socialLinks.mjs";
import styles from "./contact.module.css";
import ScrollRevealRoot from "@/components/ScrollRevealRoot";

export default function Contact() {
  return (
    <ScrollRevealRoot className={styles.container}>
      <div className={styles.header} data-reveal>
        <span className={styles.eyebrow}>Visit or connect</span>
        <h1>Contact us</h1>
        <p>Reach the workroom, the school, or the shop floor directly.</p>
      </div>

      <div className={styles.cardsGrid}>
        <div className={styles.card} data-reveal data-reveal-delay="80">
          <div className={styles.cardIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h3>Our location</h3>
          <p>Km 4 Isaac Boro Express Way,</p>
          <p>Yenagoa, Bayelsa State.</p>
        </div>

        {socialLinks.map((social, index) => (
          <div key={social.id} className={styles.card} data-reveal data-reveal-delay={String(80 + (index % 3) * 80)}>
            <div className={`${styles.cardIcon} ${styles.socialIcon}`}>
              <Image src={social.icon} width={24} height={24} alt="" />
            </div>
            <h3>{social.name}</h3>
            <a href={social.href} target="_blank" rel="noopener noreferrer" className={styles.cardLink} aria-label={`${social.name}: ${social.handle} (opens in a new tab)`}>
              {social.handle}
            </a>
          </div>
        ))}

        <div className={styles.card} data-reveal data-reveal-delay="80">
          <div className={styles.cardIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>
          <h3>Email</h3>
          <a href="mailto:elegantyoufashion18@gmail.com" className={styles.cardLink}>
            elegantyoufashion18@<wbr />gmail.com
          </a>
        </div>
      </div>
    </ScrollRevealRoot>
  );
}
