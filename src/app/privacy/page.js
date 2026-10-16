"use client";
import Link from "next/link";
import { openCookieSettings } from "@/lib/cookieConsent";
import styles from "./privacy.module.css";

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Legal</span>
          <h1>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last updated: October 2026</p>
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

            <h3>Bespoke Requests</h3>
            <p>When you send a bespoke outfit request through our website, we collect:</p>
            <ul>
              <li>Your name (optional)</li>
              <li>Your phone number, so we can contact you by call or WhatsApp</li>
              <li>Your description of the outfit you want</li>
              <li>Up to four reference photos that you choose to attach, such as fabric or styling inspiration</li>
            </ul>

            <h3>Automatically Collected Data</h3>
            <p>We may automatically collect certain technical information:</p>
            <ul>
              <li>Rate limiting identifiers to prevent abuse (email-based for sign-in, and a scrambled one-way version of your IP address, not the address itself, for bespoke requests)</li>
              <li>Your cookie choices, so that we remember your preference (see section 8)</li>
              <li>Basic usage data to improve our services</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li><strong>Account management:</strong> To create and manage your account, authenticate your identity, and provide access to our services.</li>
              <li><strong>Student registration:</strong> To process your course application, assess eligibility, manage admissions, and maintain academic records.</li>
              <li><strong>Bespoke requests:</strong> To review your outfit request, contact you about it, and prepare a quote.</li>
              <li><strong>Communication:</strong> To respond to your inquiries, send updates about your application or orders, and provide customer support.</li>
              <li><strong>Service improvement:</strong> To understand how our services are used and improve the user experience.</li>
              <li><strong>Security:</strong> To protect against fraud, abuse, and unauthorized access through rate limiting and input validation.</li>
              <li><strong>Legal compliance:</strong> To comply with applicable laws and regulations in Nigeria, including the Nigeria Data Protection Act 2023.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. Where Your Data Is Stored</h2>
            <p>
              Your data is stored using the following infrastructure:
            </p>
            <ul>
              <li><strong>Supabase (PostgreSQL Database):</strong> All structured data including account information, student registrations, and product data are stored in a Supabase-hosted PostgreSQL database with Row Level Security (RLS) policies to protect your data.</li>
              <li><strong>Supabase Storage:</strong> Uploaded passport photographs, product images, and bespoke reference photos are stored in Supabase Storage buckets with controlled access. Bespoke reference photos are kept in a private bucket that only our administrators can open.</li>
              <li><strong>Supabase Auth:</strong> Authentication credentials (email and encrypted passwords) are managed through Supabase&apos;s authentication service.</li>
              <li><strong>Resend (email delivery):</strong> When you send a bespoke request, we receive it by email through Resend, an email delivery service. The email contains the details of your request, and your photos as attachments.</li>
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
              <li><strong>Service providers:</strong> We use Supabase for database, authentication, and storage services, and Resend to deliver bespoke request emails to us. These providers have access to your data only to perform services on our behalf.</li>
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
              <li><strong>Withdraw consent:</strong> Where we rely on your consent, such as for optional cookies, you can withdraw it at any time. See section 8 for how to change your cookie choices.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us using the details provided at the bottom of this policy. If you are not satisfied with our response, you also have the right to complain to the Nigeria Data Protection Commission.
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
              <li><strong>Bespoke requests:</strong> Retained while we are working on your outfit and for as long as we need to follow up with you. When a request is deleted, its photos are removed from our storage automatically shortly afterwards.</li>
              <li><strong>Testimonials:</strong> Retained indefinitely unless you request removal.</li>
              <li><strong>Technical data (rate limiting):</strong> Retained for a limited duration for security purposes only.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>8. Cookies and Similar Storage</h2>
            <p>We use cookies and similar browser storage in two groups:</p>
            <ul>
              <li><strong>Strictly necessary (always on):</strong> Your sign-in session (authentication tokens kept in your browser by Supabase), security features, and temporary copies of public product information so that pages load faster. The website cannot work properly without these.</li>
              <li><strong>Analytics and performance (optional, off by default):</strong> We do not currently run analytics. If we add it in future, it will only run if you have allowed it.</li>
            </ul>
            <p>
              We do not use advertising cookies or tracking pixels, and we do not use third-party analytics at this time.
            </p>

            <h3>Your cookie choices</h3>
            <p>
              The first time you visit, we ask for your choice. We save it on your device, in your browser storage and in a small cookie named &ldquo;cookie_consent&rdquo;, for up to 6 months, and then we ask again. You can change your mind at any time:
            </p>
            <p>
              <button type="button" className={styles.cookieButton} onClick={openCookieSettings}>
                Change cookie settings
              </button>
            </p>
            <p>
              You can also clear cookies and site data in your browser settings. Doing so will sign you out, and we will ask for your cookie choice again.
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
              <li>Address: Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State.</li>
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
