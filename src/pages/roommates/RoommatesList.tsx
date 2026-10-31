import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users,
  UserPlus,
  Sparkles,
  MapPin,
  Phone,
  MessageCircle,
  Eye,
  Flag,
  Info,
  CheckCircle2,
  Share2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useReferenceData } from "@/hooks/useReferenceData";
import { whatsAppUrl } from "@/lib/phone";
import { buildWhatsAppShareUrl } from "@/lib/differentiators";
import { getPublicStorageUrl } from "@/lib/storage";
import {
  ROOM_SHARING_OPTIONS,
  NOISE_LEVEL_OPTIONS,
  STUDY_ROUTINE_OPTIONS,
  REPORT_REASONS
} from "@/lib/constants";
import { LazyImage } from "@/components/common/LazyImage";
import { Loading } from "@/components/common/Loading";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";

interface RoommateProfileItem {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  campus_id: string | null;
  preferred_areas: string[];
  budget_min_zmw: number | null;
  budget_max_zmw: number | null;
  move_in_date: string | null;
  room_sharing: "own_room" | "share_room" | "either" | null;
  noise_level: "quiet" | "moderate" | "lively" | null;
  study_routine: "early" | "night" | "flexible" | null;
  tidiness: "relaxed" | "average" | "very_tidy" | null;
  guests: "rarely" | "sometimes" | "often" | null;
  contact_shared: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MatchResult {
  profile_id: string;
  display_name: string;
  avatar_path: string | null;
  bio: string | null;
  campus_id: string | null;
  budget_min_zmw: number | null;
  budget_max_zmw: number | null;
  score: number;
  criteria_compared: number;
  reasons: string[];
}

export const RoommatesList: React.FC = () => {
  const { user } = useAuth();
  const { campuses } = useReferenceData();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tabs: 'all' | 'matches'
  const activeTab = searchParams.get("tab") === "matches" ? "matches" : "all";

  // Filter params
  const campusFilter = searchParams.get("campus") || "";
  const sharingFilter = searchParams.get("sharing") || "";
  const maxBudgetFilter = searchParams.get("maxBudget") || "";

  // Profiles State
  const [profiles, setProfiles] = useState<RoommateProfileItem[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User has active profile check
  const [userHasActiveProfile, setUserHasActiveProfile] = useState<boolean | null>(null);

  // Revealed Contacts map: profile_id -> { phone, whatsapp_phone }
  const [revealedContacts, setRevealedContacts] = useState<
    Record<string, { phone: string; whatsapp_phone: string | null }>
  >({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  // Report Modal
  const [reportingProfileId, setReportingProfileId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>("misleading");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Tab switcher
  const setTab = (tab: "all" | "matches") => {
    const next = new URLSearchParams(searchParams);
    if (tab === "matches") next.set("tab", "matches");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value && value.trim()) next.set(key, value.trim());
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  // Check if current user has an active roommate profile
  useEffect(() => {
    if (!user) {
      setUserHasActiveProfile(false);
      return;
    }

    supabase
      .from("roommate_profiles")
      .select("id, status")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setUserHasActiveProfile(Boolean(data && data.status === "active"));
      });
  }, [user]);

  // Load All Active Profiles (Anon explicit column list: no gender, no owner_id)
  const loadAllProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("roommate_profiles")
        .select(`
          id, display_name, bio, avatar_path, campus_id, preferred_areas,
          budget_min_zmw, budget_max_zmw, move_in_date, room_sharing,
          noise_level, study_routine, tidiness, guests, contact_shared,
          status, created_at, updated_at
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (campusFilter) query = query.eq("campus_id", campusFilter);
      if (sharingFilter) query = query.eq("room_sharing", sharingFilter);
      if (maxBudgetFilter) query = query.lte("budget_min_zmw", parseFloat(maxBudgetFilter));

      const { data, error: err } = await query;
      if (err) throw err;

      setProfiles((data as unknown as RoommateProfileItem[]) || []);
    } catch (err) {
      console.error("Error loading roommate profiles:", err);
      setError("Unable to load roommate profiles.");
    } finally {
      setLoading(false);
    }
  }, [campusFilter, sharingFilter, maxBudgetFilter]);

  // Load Best Matches via deterministic match_roommates RPC
  const loadMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase.rpc("match_roommates", { p_limit: 50 });
      if (err) throw err;

      setMatches((data as unknown as MatchResult[]) || []);
    } catch (err) {
      console.error("Error calling match_roommates:", err);
      setError("Failed to calculate compatible matches. Please ensure your profile is active.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "matches") {
      loadMatches();
    } else {
      loadAllProfiles();
    }
  }, [activeTab, loadAllProfiles, loadMatches]);

  // Reveal Contact handler
  const handleRevealContact = async (profileId: string) => {
    if (!user) {
      toast.info("Please sign in to view contact details.");
      return;
    }
    if (revealingId) return;

    setRevealingId(profileId);
    try {
      const { data, error: err } = await supabase.rpc("reveal_contact", {
        p_kind: "roommate",
        p_id: profileId
      });

      if (err) throw err;

      if (data && data.length > 0) {
        const first = data[0];
        if (first) {
          const contactInfo: { phone: string; whatsapp_phone: string | null } = {
            phone: first.phone,
            whatsapp_phone: first.whatsapp_phone
          };
          setRevealedContacts((prev) => {
            const next: Record<string, { phone: string; whatsapp_phone: string | null }> = {
              ...prev,
              [profileId]: contactInfo
            };
            return next;
          });
          toast.success("Contact details revealed!");
        }
      } else {
        toast.error("Contact details not available.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Contact details are unavailable";
      toast.error(message);
    } finally {
      setRevealingId(null);
    }
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportingProfileId) return;

    setReportSubmitting(true);
    try {
      const { error: err } = await supabase.from("listing_reports").insert({
        reporter_id: user.id,
        roommate_id: reportingProfileId,
        reason: reportReason as "scam" | "misleading" | "inappropriate" | "wrong_info" | "other",
        details: reportDetails.trim() || null
      });

      if (err) throw err;

      toast.success("Report submitted to moderation.");
      setReportingProfileId(null);
      setReportDetails("");
    } catch (err: unknown) {
      console.error("Report failed:", err);
      const message = err instanceof Error ? err.message : "Failed to submit report";
      toast.error(message);
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-700" />
            Find Campus Roommates
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Connect with student roommates based on budget, move-in timing, and study habits.
          </p>
        </div>

        <Link
          to="/dashboard/roommates"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors min-h-[44px] w-fit"
        >
          <UserPlus className="w-4 h-4" />
          {userHasActiveProfile ? "Edit My Profile" : "Create Roommate Profile"}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 min-h-[44px] ${
            activeTab === "all"
              ? "border-brand-700 text-brand-700 dark:text-brand-300 bg-brand-50/50 dark:bg-brand-950/40"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Browse All Profiles
        </button>

        <button
          type="button"
          onClick={() => setTab("matches")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 min-h-[44px] ${
            activeTab === "matches"
              ? "border-brand-700 text-brand-700 dark:text-brand-300 bg-brand-50/50 dark:bg-brand-950/40"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4 text-accent-700" />
          Best Matches for Me
        </button>
      </div>

      {/* MATCHES TAB: Explanation & Profile Requirement */}
      {activeTab === "matches" ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Info className="w-4 h-4 text-brand-700 shrink-0" />
              <span>Deterministic Lifestyle Match Scoring</span>
            </div>
            <p className="text-muted leading-relaxed">
              Compatibility scores are computed directly by comparing criteria you and other students have provided (campus, overlapping budget, move-in window, study routines, and quiet habits).
              <strong> The score is a practical preference guide only, not a compatibility guarantee.</strong>
            </p>
          </div>

          {!user ? (
            <div className="p-8 text-center bg-surface rounded-2xl border border-border space-y-3">
              <Users className="w-10 h-10 text-muted mx-auto opacity-60" />
              <h2 className="text-base font-bold text-foreground">Sign In to See Your Matches</h2>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Sign in and set up your student roommate profile to compare campus and budget compatibility with other students.
              </p>
              <Link
                to="/login?redirect=/roommates?tab=matches"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-700 hover:bg-brand-900 text-white rounded-lg text-xs font-bold shadow-xs min-h-[44px]"
              >
                Sign In to View Matches
              </Link>
            </div>
          ) : userHasActiveProfile === false ? (
            <div className="p-8 text-center bg-surface rounded-2xl border border-border space-y-3">
              <UserPlus className="w-10 h-10 text-brand-700 mx-auto opacity-80" />
              <h2 className="text-base font-bold text-foreground">Set Up Your Active Roommate Profile First</h2>
              <p className="text-xs text-muted max-w-sm mx-auto">
                To generate matches, you need an active roommate profile with your budget, preferred campus, and study routine.
              </p>
              <Link
                to="/dashboard/roommates"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-700 hover:bg-brand-900 text-white rounded-lg text-xs font-bold shadow-xs min-h-[44px]"
              >
                Set Up My Profile
              </Link>
            </div>
          ) : loading ? (
            <Loading fullScreen message="Comparing roommate compatibility preferences..." />
          ) : error ? (
            <ErrorState message={error} onRetry={loadMatches} />
          ) : matches.length === 0 ? (
            <Empty
              icon={Users}
              title="No roommate matches yet"
              description="No other students currently match your campus or budget preferences. We will list compatible profiles here as students join."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((match) => {
                const avatarUrl = match.avatar_path ? getPublicStorageUrl("avatars", match.avatar_path) : "";
                const campusObj = campuses.find((c) => c.id === match.campus_id);
                const revealed = revealedContacts[match.profile_id];

                return (
                  <div
                    key={match.profile_id}
                    className="p-5 rounded-2xl bg-surface border border-border shadow-2xs space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header: Score & Match Criteria */}
                      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-100 font-black text-xs">
                            <Sparkles className="w-3.5 h-3.5 text-accent-700" />
                            {match.score}% Match
                          </span>
                          <span className="text-[11px] text-muted">
                            (Based on {match.criteria_compared} criteria compared)
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <a
                            href={buildWhatsAppShareUrl(
                              `Roommate Profile: ${match.display_name}`,
                              `Compatible match (${match.score}%) • Campus Student`,
                              window.location.href
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted hover:text-emerald-600 p-3.5 transition-colors"
                            title="Share roommate profile on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setReportingProfileId(match.profile_id)}
                            className="text-muted hover:text-danger-600 p-3.5"
                            title="Report profile"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Matched Reasons Chips */}
                      {match.reasons && match.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-3">
                          {match.reasons.map((reason) => (
                            <span
                              key={reason}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Profile Overview */}
                      <div className="flex items-center gap-3.5 pt-3">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-brand-700 shrink-0 flex items-center justify-center">
                          {avatarUrl ? (
                            <LazyImage
                              src={avatarUrl}
                              alt={match.display_name}
                              aspectRatio="aspect-square"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-6 h-6 text-muted opacity-40" />
                          )}
                        </div>

                        <div>
                          <h3 className="text-base font-black text-foreground">{match.display_name}</h3>
                          <p className="text-xs text-muted flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-accent-700" />
                            {campusObj ? `${campusObj.name} (${campusObj.short_name})` : "Campus Student"}
                          </p>
                          {(match.budget_min_zmw !== null || match.budget_max_zmw !== null) && (
                            <p className="text-xs font-bold text-brand-700 dark:text-brand-300 mt-0.5">
                              Budget: ZMW {match.budget_min_zmw || 0} - {match.budget_max_zmw || "open"} /mo
                            </p>
                          )}
                        </div>
                      </div>

                      {match.bio && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 pt-2 italic line-clamp-3">
                          "{match.bio}"
                        </p>
                      )}
                    </div>

                    {/* Contact Action */}
                    <div className="pt-3 border-t border-border">
                      {revealed ? (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs space-y-2">
                          <span className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Phone: {revealed.phone}
                          </span>
                          <div className="flex gap-2">
                            {revealed.whatsapp_phone && whatsAppUrl(revealed.whatsapp_phone, `Hi ${match.display_name}, I saw our roommate match on Plawza!`) && (
                              <a
                                href={whatsAppUrl(revealed.whatsapp_phone, `Hi ${match.display_name}, I saw our roommate match on Plawza!`)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold min-h-[44px]"
                              >
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                              </a>
                            )}
                            <a
                              href={`tel:${revealed.phone}`}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 border border-border bg-surface hover:bg-slate-100 text-foreground rounded-lg text-xs font-bold min-h-[44px]"
                            >
                              <Phone className="w-4 h-4 text-brand-700" /> Call
                            </a>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevealContact(match.profile_id)}
                          disabled={revealingId === match.profile_id}
                          className="w-full py-2.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-900 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50"
                        >
                          <Eye className="w-4 h-4" />
                          {revealingId === match.profile_id ? "Revealing Contact..." : "Connect / Show Contact"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* BROWSE ALL PROFILES TAB */
        <div className="space-y-4">
          {/* Filter Controls Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={campusFilter}
              onChange={(e) => updateParam("campus", e.target.value)}
              aria-label="Filter by campus"
              className="px-3 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-foreground min-h-[44px]"
            >
              <option value="">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short_name || c.name}
                </option>
              ))}
            </select>

            <select
              value={sharingFilter}
              onChange={(e) => updateParam("sharing", e.target.value)}
              aria-label="Filter by room sharing"
              className="px-3 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-foreground min-h-[44px]"
            >
              <option value="">Any Room Sharing</option>
              {ROOM_SHARING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <input aria-label="Maximum budget in ZMW"
              type="number"
              placeholder="Max Budget ZMW"
              value={maxBudgetFilter}
              onChange={(e) => updateParam("maxBudget", e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-surface text-xs text-foreground placeholder:text-muted min-h-[44px] w-36"
            />

            {(campusFilter || sharingFilter || maxBudgetFilter) && (
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
                className="text-xs font-bold text-accent-700 hover:underline px-2"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <Loading fullScreen message="Loading active roommate profiles..." />
          ) : error ? (
            <ErrorState message={error} onRetry={loadAllProfiles} />
          ) : profiles.length === 0 ? (
            <Empty
              icon={Users}
              title="No active roommate profiles"
              description="Be among the first students to list your preferences and connect with potential flatmates."
              actionLabel="Create Roommate Profile"
              onAction={() => window.location.assign("/dashboard/roommates")}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((item) => {
                const avatarUrl = item.avatar_path ? getPublicStorageUrl("avatars", item.avatar_path) : "";
                const campusObj = campuses.find((c) => c.id === item.campus_id);
                const revealed = revealedContacts[item.id];

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-surface border border-border shadow-2xs space-y-3.5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Avatar & Display Name */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-13 h-13 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-brand-700 shrink-0 flex items-center justify-center">
                            {avatarUrl ? (
                              <LazyImage
                                src={avatarUrl}
                                alt={item.display_name}
                                aspectRatio="aspect-square"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-6 h-6 text-muted opacity-40" />
                            )}
                          </div>

                          <div>
                            <h3 className="text-sm font-black text-foreground">{item.display_name}</h3>
                            <p className="text-xs text-muted flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-accent-700" />
                              {campusObj ? campusObj.short_name || campusObj.name : "Campus student"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <a
                            href={buildWhatsAppShareUrl(
                              `Roommate Profile: ${item.display_name}`,
                              `Budget: ZMW ${item.budget_min_zmw || 0} - ${item.budget_max_zmw || "open"}/mo • Campus: ${campusObj ? campusObj.short_name || campusObj.name : "campus"}`,
                              window.location.href
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted hover:text-emerald-600 p-3.5 transition-colors"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setReportingProfileId(item.id)}
                            className="text-muted hover:text-danger-600 p-3.5"
                            title="Report profile"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Budget */}
                      {(item.budget_min_zmw !== null || item.budget_max_zmw !== null) && (
                        <div className="pt-2 text-xs font-bold text-brand-700 dark:text-brand-300">
                          Budget: ZMW {item.budget_min_zmw || 0} - {item.budget_max_zmw || "open"} /mo
                        </div>
                      )}

                      {/* Bio */}
                      {item.bio && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 pt-1 line-clamp-2 leading-relaxed">
                          {item.bio}
                        </p>
                      )}

                      {/* Preferred Areas */}
                      {item.preferred_areas && item.preferred_areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {item.preferred_areas.slice(0, 3).map((area) => (
                            <span
                              key={area}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Practical Lifestyle Badges */}
                      <div className="flex flex-wrap gap-1 pt-2">
                        {item.room_sharing && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-brand-900 dark:text-brand-200 text-[10px] font-bold">
                            {ROOM_SHARING_OPTIONS.find((o) => o.value === item.room_sharing)?.label}
                          </span>
                        )}
                        {item.study_routine && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 text-[10px] font-bold">
                            {STUDY_ROUTINE_OPTIONS.find((o) => o.value === item.study_routine)?.label}
                          </span>
                        )}
                        {item.noise_level && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold">
                            {NOISE_LEVEL_OPTIONS.find((o) => o.value === item.noise_level)?.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact Action */}
                    <div className="pt-3 border-t border-border">
                      {revealed ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs space-y-1.5">
                          <span className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Phone: {revealed.phone}
                          </span>
                          <div className="flex gap-1.5">
                            {revealed.whatsapp_phone && whatsAppUrl(revealed.whatsapp_phone, `Hi ${item.display_name}, I saw your roommate profile on Plawza!`) && (
                              <a
                                href={whatsAppUrl(revealed.whatsapp_phone, `Hi ${item.display_name}, I saw your roommate profile on Plawza!`)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                              </a>
                            )}
                            <a
                              href={`tel:${revealed.phone}`}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 border border-border bg-surface hover:bg-slate-100 text-foreground rounded-md text-xs font-bold"
                            >
                              <Phone className="w-3.5 h-3.5 text-brand-700" /> Call
                            </a>
                          </div>
                        </div>
                      ) : item.contact_shared ? (
                        <button
                          type="button"
                          onClick={() => handleRevealContact(item.id)}
                          disabled={revealingId === item.id}
                          className="w-full py-2.5 px-3 rounded-xl bg-brand-700 hover:bg-brand-900 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {revealingId === item.id ? "Revealing..." : user ? "Show Contact" : "Sign In to Show Contact"}
                        </button>
                      ) : (
                        <span className="block text-center text-[11px] text-muted py-2">
                          Contact sharing not enabled by student
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      {reportingProfileId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-danger-600 font-bold text-base">
              <Flag className="w-5 h-5" />
              <span>Report Roommate Profile</span>
            </div>
            <p className="text-xs text-muted">
              Reports help maintain student safety and trust. Moderators investigate all submitted reports.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="rep-room-reason">
                  Reason for Report
                </label>
                <select
                  id="rep-room-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="rep-room-details">
                  Details
                </label>
                <textarea
                  id="rep-room-details"
                  rows={3}
                  required
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe the issue..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingProfileId(null)}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-danger-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50"
                >
                  {reportSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
