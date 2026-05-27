"use client";
import React, { use } from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import styles from "./about.module.css";
import Link from "next/link";

export default function About() {

  return (
    <div>
      {/* Curriculum Card */}
        <div className={`${styles.card1} ${styles.curriculumCard}`}>
          <h3>Our Curriculum</h3>
          
          <div className={styles.programSection}>
            <h4>3 Months Program</h4>
            <ul className={styles.programList}>
              <li>Beginner sewing and garment construction</li>
              <li>Pattern drafting and cutting</li>
              <li>Clothing construction / cut-and-sew techniques</li>
            </ul>
          </div>

          <div className={styles.programSection}>
            <h4>6 Months Program</h4>
            <ul className={styles.programList}>
              <li>Beginner sewing and garment construction</li>
              <li>Pattern drafting and cutting</li>
              <li>Clothing construction / cut-and-sew techniques</li>
              <li>Fashion illustration / sketching</li>
              <li>Business and entrepreneurship modules</li>
              <li>Specialized garment types</li>
            </ul>
          </div>

          <div className={styles.benefitsSection}>
            <h4>What You Stand to Gain</h4>
            <ul className={styles.programList}>
              <li>Additional or primary income generation</li>
              <li>Entrepreneurship and self-employment opportunities</li>
              <li>Practical, marketable technical skills</li>
              <li>Creativity and self-expression boost</li>
              <li>Improved professional portfolio and credibility</li>
              <li>Networking and industry exposure</li>
            </ul>
          </div>
        </div>
    </div>
  );
}