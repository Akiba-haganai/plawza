import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, AlertTriangle } from "lucide-react";

export const Terms: React.FC = () => {
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
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted">Last updated: 1 November 2026 • Governed by the Laws of Zambia</p>
      </div>

      <div className="p-4 sm:p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Important Safety & Payment Notice</span>
        </div>
        <p>
          Plawza is an open digital plaza connecting students, landlords, businesses and roommates in Zambia.
          <strong> Never send advance money via Mobile Money (Airtel, MTN, Zamtel) before viewing a property in person during daylight.</strong> Always verify physical ownership and sign a written tenancy agreement.
        </p>
      </div>

      <div className="space-y-6 text-foreground text-sm sm:text-base leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Plawza (website or Progressive Web App), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not register, submit content, or use the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">2. Age Requirement (18+)</h2>
          <p>
            You must be at least eighteen (18) years of age to register an account or enter into housing contracts on Plawza. If you are under 18 and a student in tertiary education, you may only use Plawza with the explicit involvement and consent of a parent or legal guardian.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">3. User Content & Photo Ownership Rights</h2>
          <p>
            When you upload property photographs, shop logos, catalogue photos, or profile pictures to Plawza:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted">
            <li>You affirm and guarantee that you own the copyright to the photos or possess explicit written authorization from the copyright holder to upload and publish them.</li>
            <li>You must not scrape, copy, or upload watermarked or copyrighted photographs from other classified sites, social media groups, or third-party agencies.</li>
            <li>You grant Plawza a non-exclusive, royalty-free, worldwide license to display, optimize, and store the uploaded content strictly for operating and promoting the listing or catalogue on Plawza.</li>
            <li>Uploading false, misleading, or unauthorized photos constitutes a breach of these Terms and will result in immediate suspension and reporting.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">4. Honest Listing & Verification Badges</h2>
          <p>
            Plawza maintains strict content standards. Listing reviews and verification badges ("Phone Checked", "Ownership Checked") are internal administrative review logs indicating specific documents or calls verified by staff; they do not constitute financial insurance or tenancy guarantees.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">5. Prohibited Conduct</h2>
          <p>
            Users are strictly prohibited from:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted">
            <li>Demanding upfront "viewing fees" or booking deposits before in-person inspections.</li>
            <li>Publishing false contact details or impersonating landlords, educational institutions, or businesses.</li>
            <li>Harassing, discriminating, or violating the privacy of roommates or landlords.</li>
            <li>Using automated crawlers, scrapers, or tools to harvest telephone numbers or personal data.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">6. Account Termination & Self-Service Deletion</h2>
          <p>
            You may permanently delete your account and all associated listings, roommate profiles, and personal data at any time via your Account Dashboard. Plawza reserves the right to suspend or terminate accounts that breach these terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">7. Applicable Law & Dispute Resolution</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Republic of Zambia, including the Electronic Communications and Transactions Act and the Data Protection Act 2021.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-muted">
        <Link to="/privacy" className="hover:text-brand-700 underline">Privacy Policy</Link>
        <Link to="/copyright" className="hover:text-brand-700 underline">Copyright & Takedown Notice</Link>
      </div>
    </div>
  );
};
