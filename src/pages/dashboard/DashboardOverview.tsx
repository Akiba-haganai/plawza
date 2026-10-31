import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  Store,
  MessageSquare,
  LogOut,
  ShieldCheck,
  User,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { calculateMedianResponseHours, formatResponseTime } from "@/lib/differentiators";

export const DashboardOverview: React.FC = () => {
  const { user, profile, isStaff, signOut } = useAuth();

  const [responseHours, setResponseHours] = useState<number | null>(null);
  const [respondedCount, setRespondedCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const ownerId: string = user.id;

    async function loadReliability(id: string) {
      try {
        const { data } = await supabase
          .from("accommodation_enquiries")
          .select("created_at, updated_at, status")
          .eq("owner_id", id);

        if (data && data.length > 0) {
          const hours = calculateMedianResponseHours(data);
          setResponseHours(hours);
          const count = data.filter((e) => e.status !== "new" && e.updated_at).length;
          setRespondedCount(count);
        }
      } catch (err) {
        console.error("Failed to load landlord reliability metrics:", err);
      }
    }
    loadReliability(ownerId);
  }, [user]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Profile Summary */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-lg">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">
              {profile?.full_name || "My Account"}
            </h1>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStaff && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4" />
              Staff Moderation
            </Link>
          )}

          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-danger-600 transition-colors min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Landlord Reliability Summary (Phase 7 Differentiator: Private to owner, no public score) */}
      <div className="p-5 rounded-2xl bg-surface border border-border shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-700 dark:text-brand-300" />
            Landlord Response Reliability
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted">
            Private to You • No Public Score
          </span>
        </div>
        <div className="text-xl font-black text-foreground">
          Median Response Time: {formatResponseTime(responseHours)}
        </div>
        <p className="text-xs text-muted">
          Median time from receiving an accommodation viewing request to updating its status ({respondedCount} answered {respondedCount === 1 ? "enquiry" : "enquiries"}). Fast response helps retain prospective student tenants.
        </p>
      </div>

      {/* Dashboard Modules Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/dashboard/accommodation"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              Accommodation Listings
            </h2>
            <p className="text-xs text-muted mt-1">
              Create, edit, upload photos, and update availability for your rental properties.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/roommates"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              Roommate Profile
            </h2>
            <p className="text-xs text-muted mt-1">
              Manage your budget, campus preference, lifestyle habits, and contact visibility.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/businesses"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              My Campus Business
            </h2>
            <p className="text-xs text-muted mt-1">
              Set up business pages and manage your product catalogue, pricing, and stock status.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/enquiries"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              Viewing Enquiries
            </h2>
            <p className="text-xs text-muted mt-1">
              Track viewing requests sent by prospective student tenants for your properties.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};
