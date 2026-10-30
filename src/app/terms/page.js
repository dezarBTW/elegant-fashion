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
          <p className={styles.lastUpdated}>Last updated: <time dateTime="2026-10-17">17 October 2026</time></p>
        </header>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Who May Use the Services</h2>
            <p>
              These terms apply to elegantstyle.com.ng and the ready-to-wear clothing, bespoke tailoring enquiries, and fashion design training provided by Elegant Style at Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State, Nigeria.
            </p>
            <p>
              You may use our website if you are at least 13 years of age. If you are under 18, you must involve a parent or legal guardian before submitting personal information, applying for training, or making a purchase. A parent or guardian must authorise any purchase or service agreement on your behalf.
            </p>
            <p>
              We may restrict access or suspend accounts where necessary to address misuse, fraud, security risks, or breaches of these terms, subject to applicable law. Browsing the shop, sending a bespoke enquiry, and using guest checkout do not require an account. Submitting a fashion school application requires sign-in.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Privacy</h2>
            <p>
              Our Privacy Policy explains how we handle account information, application details and drafts, uploaded photographs, bespoke enquiries, orders, and payments. Optional cookie choices are separate from acceptance of these terms; you can reject optional cookies and still use the site.
            </p>
            <p>
              Key points regarding your data:
            </p>
            <ul>
              <li>Supabase provides account authentication, database storage, and photo storage; passwords are stored as hashes</li>
              <li>School applications and saved browser drafts contain the information entered in the application form</li>
              <li>Bachs processes ready-to-wear payments, and Resend delivers bespoke, registration, paid-order, refund, and complaint service emails</li>
              <li>We do not sell, trade, or rent your personal information to third parties</li>
              <li>Account deactivation and deletion of personal data are separate requests</li>
            </ul>
            <p>
              Please review our <Link href="/privacy" className={styles.internalLink}>Privacy Policy</Link> for full details.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. Content on the Services</h2>
            <p>
              All content provided through our services is owned by Elegant Style or our licensors and is protected by copyright, trademark, and other intellectual property laws. This includes:
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
              You must have permission to submit photographs or other material, including images showing another person. You allow us to store and use submitted material to assess your application or enquiry and provide the requested service. A reference photo helps explain your preferences; it does not transfer ownership or require us to reproduce someone else&apos;s protected design. Submitting personal information or a reference photo does not give us permission to publish it for marketing.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Using the Services</h2>
            <h3>Account Responsibilities</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
            <p>
              Use an email address you control and complete email confirmation when prompted. Password recovery is available through the sign-in page. The profile avatar opens your account dashboard, where you can view your details and deactivate your account. Password accounts confirm their current password; Google-connected accounts can confirm deactivation with a six-digit code sent to their account email. Deactivation marks the account inactive, disables account access, and signs you out; it does not erase applications, orders, support requests, or other records. Contact us separately about reactivation, deletion, or an existing order.
            </p>

            <h3>Course Registration</h3>
            <p>
              Provide accurate application details and a passport photograph in JPG or PNG format, up to 5 MB. Select a sponsorship type and, for Scholarship, name the organization sponsoring your training. A sponsorship selection does not itself award funding or confirm an arrangement with that organization. The current programmes are 3 months (&#8358;150,000), 6 months (&#8358;200,000), and 1 year (&#8358;300,000). After registration, visit the academy from Monday to Friday, 8am to 5pm, for payment details, orientation, and physical verification, as instructed on your registration confirmation. The ready-to-wear checkout does not collect course fees.
            </p>
            <p>
              An application acknowledgement or registration reference confirms submission, not admission. Our staff review applications and update their status. Your registration details show your application information and admission outcome. Accepted-student management is restricted to the administrative area. Draft details may be saved on your device while you complete the form, as explained in the Privacy Policy.
            </p>
            <p>
              The shop receives a registration notification, and we attempt to send an acceptance email when an application is first accepted. Email delivery can fail or be delayed; check your registration details for the recorded decision or contact the academy. A missing email does not require another application.
            </p>

            <h3>Product Purchases</h3>
            <p>
              Ready-to-wear products are subject to availability. Prices are shown in Nigerian Naira (NGN), and the items, current prices, discounts, and delivery charge are checked again when checkout starts. Adding an item to your cart does not reserve it or lock its price. Checkout currently allows up to 10 of each item and 20 different items. A change to a displayed price does not by itself change a payment already confirmed for an order.
            </p>
            <h3>Payments and Receipts</h3>
            <p>
              Ready-to-wear payments are made on Bachs&apos;s hosted checkout. Provide a valid email address and Nigerian phone number, and review the total before paying. We do not ask you to enter your card number, PIN, or card security code on this website. Returning from the payment page, closing it, or receiving an order reference does not by itself confirm payment. The order status page shows confirmation after the payment is verified.
            </p>
            <p>
              After verified payment, the site attempts to email a receipt to the address you supplied and an order notification to the shop. Email delivery can fail or be delayed; a missing email does not mean payment failed. Check the order status or contact us with your reference before paying again. If a payment is pending, needs review, or its setup could not be confirmed, contact us before starting another payment. Use the resume-payment link when the status page offers one for an unpaid order.
            </p>
            <p>
              Online order status is tied to the browser used to place the order through an order-access cookie valid for seven days. Clearing site data, using another browser or device, or waiting until the cookie expires may prevent online access. Keep your order reference and contact us if you need help recovering order information. An order reference alone does not give access to the online status page.
            </p>
            <h3>Pickup, Delivery, and Order Progress</h3>
            <p>
              Pickup from our Yenagoa address and delivery within Yenagoa are free. Delivery elsewhere in Nigeria costs &#8358;2,000, included in the total before payment. Provide an accurate delivery address, city, state, and contact number. We will contact you to arrange pickup or delivery; the website does not promise a delivery date merely because payment has succeeded.
            </p>
            <p>
              Payment status and fulfilment progress are separate. Paid orders can move through processing, ready for pickup or dispatch, shipped where applicable, and completed. Our staff update fulfilment progress; a paid status alone does not mean an order has been dispatched or is ready to collect.
            </p>
            <p>
              Your payment email includes an &ldquo;I have received the product&rdquo; link. Only submit its confirmation after you have received every product in that order. The confirmation records your acknowledgement and its time separately from staff fulfilment updates. Opening the email or link alone does not confirm receipt, and acknowledging receipt does not remove any applicable rights concerning faulty or incorrect products.
            </p>
            <h3>Order Changes, Cancellations, and Problems</h3>
            <p>
              Contact us with your order reference as soon as possible if you need to change or cancel an order, have paid twice, or receive an incorrect, damaged, or faulty item. Signed-in customers can view paid orders matched to their verified account email, submit a refund reason for an ordered product, or describe a complaint about a product they confirm they received. Requests and staff responses appear in the account dashboard, and we attempt to send confirmation and status emails. Contact the shop if an order used a different email or you cannot access your account.
            </p>
            <p>
              Submitting a refund request does not guarantee approval. Approval records the shop&apos;s decision; it does not automatically return funds. The shop arranges any payment refund separately through Bachs and discusses any return or collection arrangements with you. There is one refund request and one complaint per product per order; contact the shop with the existing reference for further information. These terms do not remove any cancellation, refund, quality, or other consumer rights that cannot lawfully be excluded.
            </p>
            <p>
              Buy again adds one unit of an available product to your cart. Current availability, price, and delivery charges apply when you start the new checkout; an earlier purchase does not reserve stock or guarantee its previous price.
            </p>

            <h3>Bespoke Services</h3>
            <p>
              The bespoke request form lets you describe an outfit, provide a contact phone number, optionally give your name, and attach up to four reference photos of up to 5 MB each. Supported image formats are shown on the form, and images may be converted or compressed on your device before upload. Only upload material you have permission to share, and avoid including unnecessary sensitive information.
            </p>
            <p>
              Submitting a request is an enquiry, not a confirmed booking or paid order. We may contact you by phone or WhatsApp to discuss measurements, availability, a quote, and next steps. Price, specifications, timing, any deposit, and cancellation arrangements are agreed separately before work proceeds, subject to your applicable consumer rights. The ready-to-wear checkout does not collect bespoke deposits.
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
              To the fullest extent permitted by applicable law, Elegant Style shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of our services.
            </p>
            <p>
              Subject to rights and liabilities that cannot lawfully be excluded or limited, our total liability for claims arising from these terms or your use of our services shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or one thousand Nigerian Naira (&#8358;1,000), whichever is greater. Nothing in this section limits a mandatory consumer remedy or a liability that applicable law does not allow us to limit.
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
              Please contact us first so we can try to resolve a complaint in good faith. If it remains unresolved, you may pursue the remedies available under applicable law, including a complaint to the <a href="https://fccpc.gov.ng/consumers/consumer-rights-responsibilities/rights-responsibilities/" className={styles.internalLink} target="_blank" rel="noopener noreferrer">Federal Competition and Consumer Protection Commission</a> or the courts with jurisdiction. Arbitration may be used where lawfully agreed; these terms do not make it your only remedy.
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
              <li>Address: Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State.</li>
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
