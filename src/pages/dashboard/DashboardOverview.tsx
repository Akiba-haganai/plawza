import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  Store,
  MessageSquare,
  ShieldCheck,
      Settings,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/common/Avatar";
import { calculateMedianResponseHours, formatResponseTime } from "@/lib/differentiators";

export const DashboardOverview: React.FC = () => {
  const { user, profile, isStaff } = useAuth();
  const [responseHours, setResponseHours] = useState<number | null>(null);
  const [, setRespondedCount] = useState<number>(0);
  const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [staleListingsCount, setStaleListingsCount] = useState(0);
  const [enquiriesCount, setEnquiriesCount] = useState(0);
  const [favouritesCount, setFavouritesCount] = useState(0);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.trim()?.split(/\s+/)[0] || "there";
  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Member";
  const avatarSource = profile?.avatar_path || profile?.avatar_url;

  // Calculate profile completeness score
  const checks = [
    Boolean(profile?.full_name?.trim()),
    Boolean(profile?.avatar_path || profile?.avatar_url),
    Boolean(profile?.phone?.trim()),
    Boolean(profile?.bio?.trim() || profile?.town_id)
  ];
  const completedChecks = checks.filter(Boolean).length;
  const completenessPercent = Math.round((completedChecks / checks.length) * 100);

  useEffect(() => {
    if (!user) return;
    const ownerId: string = user.id;

    async function loadDashboardStats(id: string) {
      try {
        const [enqRes, staysRes, favsRes] = await Promise.all([
          supabase.from("accommodation_enquiries").select("created_at, updated_at, status").eq("owner_id", id),
          supabase.from("accommodation_listings").select("id, status, last_confirmed_at").eq("owner_id", id),
          supabase.from("favourites").select("id", { count: "exact", head: true }).eq("user_id", id)
        ]);

        if (enqRes.data && enqRes.data.length > 0) {
          const hours = calculateMedianResponseHours(enqRes.data);
          setResponseHours(hours);
          const count = enqRes.data.filter((e) => e.status !== "new" && e.updated_at).length;
          setRespondedCount(count);
          setEnquiriesCount(enqRes.data.length);
        }

        if (staysRes.data) {
          const active = staysRes.data.filter((s) => s.status === "active");
          setActiveListingsCount(active.length);

          const twentyFiveDaysAgo = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString();
          const stale = active.filter((s) => s.last_confirmed_at < twentyFiveDaysAgo);
          setStaleListingsCount(stale.length);
        }

        if (favsRes.count !== null) {
          setFavouritesCount(favsRes.count);
        }
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      }
    }

    loadDashboardStats(ownerId);
  }, [user]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Personalized Header Summary */}
      <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar src={avatarSource} name={displayName} size="xl" showBorder />
          <div>
            <h1 className="text-2xl font-black text-foreground">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-xs text-muted mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <Link
                to={`/u/${user?.id}`}
                className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline flex items-center gap-1"
              >
                <span>View Public Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              {isStaff && (
                <span className="px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-950/80 text-accent-800 dark:text-accent-300 text-[10px] font-black uppercase tracking-wider">
                  Staff Moderator
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/dashboard/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-bold transition-colors min-h-[42px]"
          >
            <Settings className="w-4 h-4 text-muted" />
            <span>Settings</span>
          </Link>
          {isStaff && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-700 hover:bg-accent-500 text-white text-xs font-bold transition-colors min-h-[42px]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Moderation</span>
            </Link>
          )}
        </div>
      </div>

      {/* Listing Confirmation Warning (if any listing is stale) */}
      {staleListingsCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-950 dark:text-amber-100">
                {staleListingsCount} {staleListingsCount === 1 ? "stay listing needs" : "stay listings need"} availability confirmation
              </h3>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                Listings unconfirmed for 25+ days rank lower in student searches. Confirm availability to boost ranking.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/accommodation"
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors"
          >
            Confirm Now
          </Link>
        </div>
      )}

      {/* Profile Completeness Card */}
      {completenessPercent < 100 && (
        <div className="p-5 rounded-2xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/80 dark:border-brand-900/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-700 dark:text-brand-300" />
              <span className="text-xs font-bold text-foreground">
                Profile Completeness: {completenessPercent}%
              </span>
            </div>
            <Link
              to="/dashboard/settings"
              className="text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline flex items-center gap-1"
            >
              <span>Complete Profile</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-700 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completenessPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-muted">
            Adding a photo, bio, and phone number increases trust and gets you up to 3x more enquiry responses from prospective roommates and tenants.
          </p>
        </div>
      )}

      {/* Key Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/dashboard/accommodation"
          className="p-4 rounded-xl bg-surface border border-border shadow-xs hover:border-brand-500 transition-colors"
        >
          <span className="text-[11px] font-semibold text-muted block">Active Stays</span>
          <span className="text-2xl font-black text-foreground mt-0.5 block">{activeListingsCount}</span>
        </Link>

        <Link
          to="/dashboard/enquiries"
          className="p-4 rounded-xl bg-surface border border-border shadow-xs hover:border-brand-500 transition-colors"
        >
          <span className="text-[11px] font-semibold text-muted block">Enquiries</span>
          <span className="text-2xl font-black text-foreground mt-0.5 block">{enquiriesCount}</span>
        </Link>

        <Link
          to="/dashboard/favourites"
          className="p-4 rounded-xl bg-surface border border-border shadow-xs hover:border-brand-500 transition-colors"
        >
          <span className="text-[11px] font-semibold text-muted block">Saved Favourites</span>
          <span className="text-2xl font-black text-foreground mt-0.5 block">{favouritesCount}</span>
        </Link>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <span className="text-[11px] font-semibold text-muted block">Response Time</span>
          <span className="text-sm font-black text-foreground mt-1 block truncate">
            {formatResponseTime(responseHours)}
          </span>
        </div>
      </div>

      {/* Feature Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/dashboard/accommodation"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              My Stays & Boarding Houses
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Post, edit, and update availability for your student boarding houses and apartments.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/roommates"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              Roommate Profile
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Find compatible campus roommates based on budget, lifestyle, and study habits.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/businesses"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              My Campus Shops & Services
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Manage your student shop, catalogue items, business hours, and WhatsApp contact.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/enquiries"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              Viewing Enquiries
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Respond to tenant viewing requests, coordinate visits, and track contact reveals.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};
export default DashboardOverview;
