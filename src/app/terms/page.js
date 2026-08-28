"use client";
import Link from "next/link";
import styles from "./terms.module.css";

export default function TermsOfService() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Legal</span>
          <h1>Terms of Service</h1>
          <p className={styles.lastUpdated}>Last updated: August 2026</p>
        </header>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Who May Use the Services</h2>
            <p>
              Elegant Fashion provides ready-to-wear clothing, bespoke tailoring services, and fashion design training through this website and our physical locations in Bayelsa State, Nigeria.
            </p>
            <p>
              You may use our services if you are at least 13 years of age. If you are under 18, you may only use our services under the supervision of a parent or legal guardian. By creating an account, registering for courses, or placing an order, you represent that you meet these age requirements.
            </p>
            <p>
              We reserve the right to refuse service to anyone for any reason at any time. This includes terminating or suspending accounts that violate these terms or misuse our systems.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Privacy</h2>
            <p>
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. By using our services, you agree to the collection and use of information in accordance with our Privacy Policy.
            </p>
            <p>
              Key points regarding your data:
            </p>
            <ul>
              <li>Account information (email, password) is managed through Supabase Auth</li>
              <li>Student registration data is stored securely in our Supabase database</li>
              <li>Uploaded passport photographs are stored in Supabase Storage</li>
              <li>We do not sell, trade, or rent your personal information to third parties</li>
              <li>Data is used solely to provide and improve our services</li>
            </ul>
            <p>
              Please review our <Link href="/privacy" className={styles.internalLink}>Privacy Policy</Link> for full details.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. Content on the Services</h2>
            <p>
              All content provided through our services is owned by Elegant Fashion or our licensors and is protected by copyright, trademark, and other intellectual property laws. This includes:
            </p>
            <ul>
              <li>Product images, descriptions, and prices</li>
              <li>Website design, layout, and branding</li>
              <li>Course materials, curriculum, and educational content</li>
              <li>Testimonials and client reviews</li>
              <li>Logos, trademarks, and service marks</li>
            </ul>
            <p>
              You may not reproduce, distribute, modify, or create derivative works from any content on our services without our express written permission.
            </p>
            <p>
              When you submit content such as testimonials, reviews, or registration information, you grant us a license to use, display, and store that content as necessary to provide our services.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Using the Services</h2>
            <h3>Account Responsibilities</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>

            <h3>Course Registration</h3>
            <p>
              When registering for our fashion school programmes, you agree to provide accurate and complete information. Admission is subject to review and acceptance. Programme fees (&#8358;150,000 for 3-month, &#8358;250,000 for 6-month) are payable upon acceptance, with payment details provided during orientation.
            </p>

            <h3>Product Purchases</h3>
            <p>
              Ready-to-wear products are subject to availability. Prices are subject to change without notice. We reserve the right to limit quantities, refuse orders, and cancel orders at our discretion.
            </p>

            <h3>Bespoke Services</h3>
            <p>
              Bespoke and custom tailoring services require consultation. Pricing, timelines, and specifications are agreed upon individually. Cancellation policies for bespoke orders will be communicated during consultation.
            </p>

            <h3>Acceptable Use</h3>
            <p>
              You agree not to:
            </p>
            <ul>
              <li>Use our services for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the integrity of our services</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Use automated systems to access our services without permission</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Disclaimers and Limitations of Liability</h2>
            <h3>No Warranties</h3>
            <p>
              Our services are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We make no warranties, express or implied, regarding the reliability, accuracy, or availability of our services.
            </p>

            <h3>Limitation of Liability</h3>
            <p>
              To the fullest extent permitted by applicable law, Elegant Fashion shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of our services.
            </p>
            <p>
              Our total liability to you for any claims arising from these terms or your use of our services shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or one thousand Nigerian Naira (&#8358;1,000), whichever is greater.
            </p>

            <h3>Third-Party Links</h3>
            <p>
              Our services may contain links to third-party websites or services. We are not responsible for the content, privacy policies, or practices of any third-party sites.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. General</h2>
            <h3>Governing Law</h3>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions.
            </p>

            <h3>Dispute Resolution</h3>
            <p>
              Any disputes arising from these terms or your use of our services shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through arbitration or in the courts of Bayelsa State, Nigeria.
            </p>

            <h3>Changes to Terms</h3>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of material changes by posting the updated terms on this page with a revised &ldquo;Last updated&rdquo; date. Your continued use of our services after changes are posted constitutes acceptance of the updated terms.
            </p>

            <h3>Contact Information</h3>
            <p>
              If you have any questions about these Terms of Service, please contact us:
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
          <Link href="/privacy" className={styles.internalLink}>Privacy Policy</Link>
        </footer>
      </div>
    </div>
  );
}
