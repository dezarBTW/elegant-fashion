"use client";
import Link from "next/link";
import styles from "./privacy.module.css";

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Legal</span>
          <h1>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last updated: August 2026</p>
        </header>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Information We Collect</h2>
            <p>
              We collect information that you provide directly to us when using our services. The types of information we collect depend on how you interact with us.
            </p>

            <h3>Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Email address</li>
              <li>Username</li>
              <li>Encrypted password (managed by Supabase Auth)</li>
            </ul>

            <h3>Student Registration Data</h3>
            <p>When you apply for our fashion school programmes, we collect:</p>
            <ul>
              <li>Full name (surname, first name, middle name)</li>
              <li>Gender</li>
              <li>Date of birth and age</li>
              <li>Nationality</li>
              <li>Marital status</li>
              <li>State of origin</li>
              <li>Residential address</li>
              <li>Telephone number</li>
              <li>Email address</li>
              <li>Chosen programme (3-month or 6-month)</li>
              <li>Passport photograph</li>
            </ul>

            <h3>Product and Order Data</h3>
            <p>When you browse or inquire about our ready-to-wear collections, we may collect:</p>
            <ul>
              <li>Product preferences and interactions</li>
              <li>Contact information when making bespoke inquiries</li>
            </ul>

            <h3>Automatically Collected Data</h3>
            <p>We may automatically collect certain technical information:</p>
            <ul>
              <li>Rate limiting identifiers (email-based) to prevent abuse</li>
              <li>Basic usage data to improve our services</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li><strong>Account management:</strong> To create and manage your account, authenticate your identity, and provide access to our services.</li>
              <li><strong>Student registration:</strong> To process your course application, assess eligibility, manage admissions, and maintain academic records.</li>
              <li><strong>Communication:</strong> To respond to your inquiries, send updates about your application or orders, and provide customer support.</li>
              <li><strong>Service improvement:</strong> To understand how our services are used and improve the user experience.</li>
              <li><strong>Security:</strong> To protect against fraud, abuse, and unauthorized access through rate limiting and input validation.</li>
              <li><strong>Legal compliance:</strong> To comply with applicable laws and regulations in Nigeria.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. Where Your Data Is Stored</h2>
            <p>
              Your data is stored using the following infrastructure:
            </p>
            <ul>
              <li><strong>Supabase (PostgreSQL Database):</strong> All structured data including account information, student registrations, and product data are stored in a Supabase-hosted PostgreSQL database with Row Level Security (RLS) policies to protect your data.</li>
              <li><strong>Supabase Storage:</strong> Uploaded passport photographs and product images are stored in Supabase Storage buckets with controlled access.</li>
              <li><strong>Supabase Auth:</strong> Authentication credentials (email and encrypted passwords) are managed through Supabase&apos;s authentication service.</li>
              <li><strong>Vercel/Next.js:</strong> Our website is hosted on Vercel using the Next.js framework. No sensitive data is stored in the hosting environment.</li>
            </ul>
            <p>
              All data storage providers comply with applicable data protection standards. Data is stored in secure data centers with encryption in transit and at rest.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul>
              <li><strong>Service providers:</strong> We use Supabase for database, authentication, and storage services. These providers have access to your data only to perform services on our behalf.</li>
              <li><strong>Legal requirements:</strong> We may disclose your information if required by law, regulation, or legal process, or to protect our rights, property, or safety.</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              <li><strong>Consent:</strong> We may share your information with your explicit consent.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information:
            </p>
            <ul>
              <li>All data transmission is encrypted using HTTPS/TLS</li>
              <li>Passwords are hashed and managed by Supabase Auth (never stored in plaintext)</li>
              <li>Database access is controlled through Row Level Security (RLS) policies</li>
              <li>Input sanitization is applied to prevent injection attacks</li>
              <li>Rate limiting protects against brute-force and abuse attempts</li>
              <li>File uploads are validated for type and size</li>
            </ul>
            <p>
              However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Your Data Rights</h2>
            <p>You have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Access:</strong> You can request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> You can request that we correct any inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> You can request deletion of your account and personal data. You can deactivate your account through your profile menu.</li>
              <li><strong>Data portability:</strong> You can request a copy of your data in a portable format.</li>
              <li><strong>Objection:</strong> You can object to certain processing of your personal data.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us using the details provided at the bottom of this policy.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Data Retention</h2>
            <p>
              We retain your personal data for as long as necessary to provide our services and fulfill the purposes outlined in this policy:
            </p>
            <ul>
              <li><strong>Account data:</strong> Retained while your account is active. You may request deletion at any time.</li>
              <li><strong>Student registration data:</strong> Retained for academic record-keeping purposes throughout your programme and thereafter as required by applicable regulations.</li>
              <li><strong>Testimonials:</strong> Retained indefinitely unless you request removal.</li>
              <li><strong>Technical data (rate limiting):</strong> Retained for a limited duration for security purposes only.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>8. Cookies and Tracking</h2>
            <p>
              Our website uses essential cookies and local storage necessary for authentication and session management through Supabase. We do not use advertising cookies, tracking pixels, or third-party analytics.
            </p>
            <p>
              Authentication tokens are stored locally in your browser to maintain your signed-in session. These are necessary for the website to function properly.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Children&apos;s Privacy</h2>
            <p>
              Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information promptly.
            </p>
            <p>
              Users between 13 and 18 must have parental or guardian consent to use our services, particularly for course registration.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised &ldquo;Last updated&rdquo; date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
            </p>
            <ul>
              <li>Email: <a href="mailto:patrickesther26@gmail.com" className={styles.internalLink}>patrickesther26@gmail.com</a></li>
              <li>WhatsApp: <a href="https://wa.me/2348166361710" className={styles.internalLink} target="_blank" rel="noopener noreferrer">08166361710</a></li>
              <li>Address: No 27 Biobgblo Issac Boro Express Way, Opposite Charismatic Church, Beside Rogas Plant, Bayelsa State, Nigeria</li>
            </ul>
          </section>
        </div>

        <footer className={styles.footer}>
          <Link href="/" className={styles.backLink}>Return to Home</Link>
          <Link href="/terms" className={styles.internalLink}>Terms of Service</Link>
        </footer>
      </div>
    </div>
  );
}
