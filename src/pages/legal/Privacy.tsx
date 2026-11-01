import React from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowLeft, Shield } from "lucide-react";

export const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:underline min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-bold border border-brand-200 dark:border-brand-800">
          <Lock className="w-3.5 h-3.5" />
          <span>Privacy & Data Protection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted">Last updated: 1 November 2026 • Compliant with Zambia Data Protection Act 2021</p>
      </div>

      <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border text-foreground text-sm space-y-3">
        <div className="flex items-center gap-2 font-bold text-brand-950 dark:text-brand-100">
          <Shield className="w-5 h-5 text-brand-700 dark:text-brand-400 shrink-0" />
          <span>Our Privacy Principles</span>
        </div>
        <p className="text-muted leading-relaxed">
          Plawza is engineered from the database level up to protect Zambian users against spam, number harvesting, and unauthorized surveillance. Private phone numbers are never exposed in public tables or to anonymous visitors.
        </p>
      </div>

      <div className="space-y-6 text-foreground text-sm sm:text-base leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">1. Information We Collect</h2>
          <p>We collect only the minimum information required to operate the digital plaza:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted">
            <li><strong>Account Data:</strong> Email address and encrypted password (managed securely by Supabase Authentication).</li>
            <li><strong>Profile & Contact Data:</strong> Display name and Zambian phone number (+260). Private phone numbers are stored in a dedicated, isolated private contacts table with restricted row-level security.</li>
            <li><strong>Roommate Profile Information:</strong> Campus affiliation, preferred areas, budget range, and lifestyle preferences (study hours, noise tolerance, sharing preferences).</li>
            <li><strong>Content Uploads:</strong> Photos of properties, shop items, and avatars uploaded by users.</li>
            <li><strong>Enquiry Logs:</strong> Messages and viewing requests sent between prospective tenants and property owners.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">2. How Phone Numbers Are Protected</h2>
          <p>
            Unlike traditional classifieds where numbers are plastered on public web pages:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted">
            <li><strong>Landlords:</strong> Your contact number is hidden from anonymous web crawlers. Only registered, signed-in users can reveal your contact information through a controlled database procedure.</li>
            <li><strong>Roommates:</strong> Your phone number is strictly private by default. It is only shared if you explicitly turn on the "Share contact details" consent toggle in your profile.</li>
            <li><strong>Shops:</strong> Business contact numbers and WhatsApp numbers are published publicly as part of the shop catalogue directory.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">3. Purpose and Legal Basis for Processing</h2>
          <p>
            We process your data in accordance with the <em>Data Protection Act No. 3 of 2021 of Zambia</em> for the legitimate purposes of:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted">
            <li>Facilitating verified accommodation discovery and roommate matching.</li>
            <li>Detecting and preventing scams, fraud, and duplicate listings.</li>
            <li>Enforcing community safety and moderation rules.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">4. Third-Party Sharing</h2>
          <p>
            We do not sell, rent, or monetize your personal information to third-party advertising brokers. Data is stored on enterprise-grade cloud infrastructure (Supabase / AWS / Cloudflare) under strict encryption in transit and at rest.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">5. Your Data Subject Rights (Zambia DPA 2021)</h2>
          <p>
            Under Zambian data protection law, you have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted">
            <li>Access and inspect the personal data held about you.</li>
            <li>Request immediate correction of inaccurate or outdated information.</li>
            <li><strong>Right to Erasure (Self-Service Deletion):</strong> You can delete your account and all associated personal data directly from your Dashboard at any time. When deleted, your account, listings, images, and messages are permanently erased.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">6. Contact Our Privacy Office</h2>
          <p>
            For privacy inquiries, rights requests, or concerns regarding your personal data under the Zambia Data Protection Act, please contact us at:
            <br />
            <strong>Email:</strong> privacy@plawza.com
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-muted">
        <Link to="/terms" className="hover:text-brand-700 underline">Terms of Service</Link>
        <Link to="/copyright" className="hover:text-brand-700 underline">Copyright & Takedown Notice</Link>
      </div>
    </div>
  );
};
