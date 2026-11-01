import React from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft, Flag } from "lucide-react";

export const Copyright: React.FC = () => {
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
          <FileText className="w-3.5 h-3.5" />
          <span>Intellectual Property</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Copyright & Takedown Policy</h1>
        <p className="text-sm text-muted">Last updated: 1 November 2026 • Reporting Infringement on Plawza</p>
      </div>

      <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border text-foreground text-sm space-y-3">
        <div className="flex items-center gap-2 font-bold text-brand-950 dark:text-brand-100">
          <Flag className="w-5 h-5 text-accent-500 shrink-0" />
          <span>Zero Tolerance for Stolen Photography</span>
        </div>
        <p className="text-muted leading-relaxed">
          Plawza respects the intellectual property rights of property photographers, estate agents, landlords, and creators. We enforce strict policies against unauthorized photo re-use and act promptly to remove infringing material.
        </p>
      </div>

      <div className="space-y-6 text-foreground text-sm sm:text-base leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">1. Instant In-App Reporting</h2>
          <p>
            If you see your photographs or copyrighted content being used on a listing, shop, or roommate profile without permission:
          </p>
          <ol className="list-decimal pl-6 space-y-1 text-sm text-muted">
            <li>Click the <strong>Report</strong> button on the listing, shop, or profile page.</li>
            <li>Select the reason: <strong>"Photos or Content Copied Without Permission"</strong>.</li>
            <li>Provide brief details (e.g. link to your original post or business ownership).</li>
          </ol>
          <p className="text-sm text-muted mt-2">
            Our moderation team receives in-app copyright alerts immediately and will inspect the claim.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">2. Formal Takedown Notice Procedure</h2>
          <p>
            If you represent a copyright holder or business and wish to submit a formal Notice of Infringement, please email our designated agent at:
            <br />
            <strong>Email:</strong> takedowns@plawza.com
          </p>
          <p className="text-sm text-muted">
            Please include the following details in your notice:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted">
            <li>The URL(s) of the specific listing, shop, or image on Plawza.</li>
            <li>A description or link demonstrating your original copyrighted work.</li>
            <li>Your full name, contact telephone number, and physical or electronic address.</li>
            <li>A statement that you have a good-faith belief that the use is not authorized by the copyright owner, agent, or the law.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-brand-950 dark:text-brand-100">3. Repeat Infringer Policy</h2>
          <p>
            Users who repeatedly upload copyrighted photos without authorization or submit fraudulent listings will have their accounts permanently banned and their phone numbers blacklisted.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-muted">
        <Link to="/terms" className="hover:text-brand-700 underline">Terms of Service</Link>
        <Link to="/privacy" className="hover:text-brand-700 underline">Privacy Policy</Link>
      </div>
    </div>
  );
};
