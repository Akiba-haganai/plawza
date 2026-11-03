import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  Store,
  ArrowRight,
  MapPin,
  Clock,
  RotateCcw,
  Sparkles,
  GraduationCap,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAuth } from "@/context/AuthContext";
import { isStaleConfirmation } from "@/lib/differentiators";
import { LISTING_TYPES } from "@/lib/constants";
import {
  formatTimeAgo,
  filterFeedItems,
  FeedItem,
  FeedCategory
} from "@/lib/feedHelpers";

export const PlazaNoticeboard: React.FC = () => {
  const { campuses } = useReferenceData();
  const { profile } = useAuth();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<string | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory>("all");
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync initial campus with user profile if available
  useEffect(() => {
    if (profile?.campus_id) {
      setSelectedCampus(profile.campus_id);
    }
  }, [profile?.campus_id]);

  // Reset expansion when filtering changes so page remains compact
  useEffect(() => {
    setIsExpanded(false);
  }, [selectedCampus, selectedCategory]);

  // Lookup map for campus short names or names
  const campusMap = useMemo(() => {
    const map = new Map<string, string>();
    campuses.forEach((c) => {
      map.set(c.id, c.short_name || c.name);
    });
    return map;
  }, [campuses]);

  const loadFeedData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Parallel lightweight fetch of latest active items
      // (Explicit columns according to AGENTS Rule 13)
      const [staysRes, roommatesRes, shopsRes] = await Promise.all([
        supabase
          .from("accommodation_listings")
          .select(
            "id, title, listing_type, rent_zmw, area, campus_id, amenities, availability, status, last_confirmed_at, created_at"
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("roommate_profiles")
          .select(
            "id, display_name, bio, campus_id, preferred_areas, budget_min_zmw, budget_max_zmw, room_sharing, created_at, status"
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("businesses")
          .select(
            "id, name, slug, description, category_id, area, status, created_at, category:categories(name, slug)"
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6)
      ]);

      const feed: FeedItem[] = [];

      // Transform stays
      if (staysRes.data) {
        for (const stay of staysRes.data) {
          const chips: string[] = [];
          const hasPowerBackup = stay.amenities?.some((a: string) =>
            ["solar_backup", "generator"].includes(a)
          );
          const hasWaterBackup = stay.amenities?.some((a: string) =>
            ["borehole", "water_tank"].includes(a)
          );
          if (hasPowerBackup) chips.push("⚡ Solar / Generator");
          if (hasWaterBackup) chips.push("💧 Water Backup");

          const isFresh = !isStaleConfirmation(stay.last_confirmed_at, stay.created_at);
          if (isFresh) chips.push("✓ Confirmed active");

          const stayTypeLabel =
            LISTING_TYPES.find((t) => t.value === stay.listing_type)?.label || "Accommodation";

          feed.push({
            id: stay.id,
            type: "stay",
            title: stay.title,
            subtitle: `${stayTypeLabel} in ${stay.area}`,
            campusId: stay.campus_id,
            campusName: stay.campus_id ? campusMap.get(stay.campus_id) : null,
            area: stay.area,
            createdAt: stay.created_at,
            linkTo: `/accommodation/${stay.id}`,
            badgeText: "Stay Alert",
            highlight: `K${stay.rent_zmw?.toLocaleString()}/mo`,
            chips
          });
        }
      }

      // Transform roommates
      if (roommatesRes.data) {
        for (const roommate of roommatesRes.data) {
          const chips: string[] = [];
          if (roommate.room_sharing === "own_room") {
            chips.push("Own room");
          } else if (roommate.room_sharing === "share_room") {
            chips.push("Shared room");
          }

          if (roommate.preferred_areas && roommate.preferred_areas.length > 0) {
            chips.push(`Near ${roommate.preferred_areas[0]}`);
          }

          const budgetText = roommate.budget_max_zmw
            ? `Budget up to K${roommate.budget_max_zmw.toLocaleString()}/mo`
            : "Budget flexible";

          feed.push({
            id: roommate.id,
            type: "roommate",
            title: `${roommate.display_name} is seeking a roommate`,
            subtitle: roommate.bio || "Looking for a compatible roommate",
            campusId: roommate.campus_id,
            campusName: roommate.campus_id ? campusMap.get(roommate.campus_id) : null,
            area: roommate.preferred_areas?.[0] || "Flexible area",
            createdAt: roommate.created_at,
            linkTo: "/roommates",
            badgeText: "Roommate Match",
            highlight: budgetText,
            chips
          });
        }
      }

      // Transform shops
      if (shopsRes.data) {
        for (const shop of shopsRes.data) {
          const categoryName = (shop.category as unknown as { name?: string })?.name || "Local Shop";
          const chips: string[] = ["💬 WhatsApp direct"];
          if (shop.area) chips.push(shop.area);

          const haystack = `${shop.name} ${shop.area || ""} ${shop.description || ""}`.toLowerCase();
          const matchedCampus = campuses.find((c) => {
            const short = c.short_name?.toLowerCase();
            const full = c.name.toLowerCase();
            return (short && haystack.includes(short)) || haystack.includes(full);
          });
          const isCampusBased =
            Boolean(matchedCampus) ||
            /\b(campus|unza|cbu|university|college)\b/i.test(haystack);

          feed.push({
            id: shop.id,
            type: "shop",
            title: shop.name,
            subtitle:
              shop.description ||
              (shop.area ? `${categoryName} in ${shop.area}` : categoryName),
            campusId: matchedCampus?.id ?? null,
            campusName: matchedCampus ? matchedCampus.short_name || matchedCampus.name : null,
            area: shop.area,
            createdAt: shop.created_at,
            linkTo: `/shops/${shop.slug}`,
            badgeText: isCampusBased ? "Campus Shop" : "Local Shop",
            highlight: categoryName,
            chips
          });
        }
      }

      // Sort newest first
      feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(feed);
    } catch (err) {
      console.error("Failed to load noticeboard updates:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campusMap, campuses]);

  useEffect(() => {
    loadFeedData();
  }, [loadFeedData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadFeedData();
  };

  // Filter items purely client-side with 0 network latency
  const displayedItems = useMemo(() => {
    return filterFeedItems(items, selectedCampus, selectedCategory);
  }, [items, selectedCampus, selectedCategory]);

  const INITIAL_ITEM_CAP = 4;
  const visibleItems = isExpanded
    ? displayedItems
    : displayedItems.slice(0, INITIAL_ITEM_CAP);

  return (
    <section aria-labelledby="noticeboard-heading" className="space-y-4">
      {/* Noticeboard Header Card */}
      <div className="rounded-3xl bg-surface border border-border p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Stream</span>
            </div>
            <h2 id="noticeboard-heading" className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Plaza Noticeboard
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Live updates: newly verified stays, roommate requests, and local shops &amp; services.
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading || refreshing}
            aria-label="Refresh noticeboard updates"
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors min-h-[44px]"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-brand-700" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Unified Filter Bar: Category Tabs + Area/Campus Selector */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 min-h-[40px] ${
                selectedCategory === "all"
                  ? "bg-brand-700 text-white shadow-2xs"
                  : "text-muted hover:text-foreground bg-slate-100/80 dark:bg-slate-800/70"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>All Updates</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("stays")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 min-h-[40px] ${
                selectedCategory === "stays"
                  ? "bg-brand-700 text-white shadow-2xs"
                  : "text-muted hover:text-foreground bg-slate-100/80 dark:bg-slate-800/70"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Stays</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("shops")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 min-h-[40px] ${
                selectedCategory === "shops"
                  ? "bg-brand-700 text-white shadow-2xs"
                  : "text-muted hover:text-foreground bg-slate-100/80 dark:bg-slate-800/70"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Local Shops</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("roommates")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 min-h-[40px] ${
                selectedCategory === "roommates"
                  ? "bg-brand-700 text-white shadow-2xs"
                  : "text-muted hover:text-foreground bg-slate-100/80 dark:bg-slate-800/70"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Roommates</span>
            </button>
          </div>

          {/* Contextual Area / Campus Select */}
          {campuses.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <label
                htmlFor="noticeboard-campus-filter"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-muted uppercase tracking-wider shrink-0"
              >
                <GraduationCap className="w-3.5 h-3.5 text-brand-700 dark:text-brand-400" />
                <span>Area:</span>
              </label>
              <select
                id="noticeboard-campus-filter"
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-brand-600 min-h-[40px]"
              >
                <option value="all">All Areas &amp; Campuses</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    Near {campus.short_name || campus.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stream Items Grid */}
      {loading ? (
        /* Skeleton Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 rounded-2xl bg-surface border border-border animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-20 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-14 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
              <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="pt-2 flex gap-2">
                <div className="w-16 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        /* Empty State */
        <div className="p-8 text-center rounded-2xl bg-surface border border-border space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No recent updates for this filter</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {selectedCampus !== "all"
              ? "No live items found for this filter yet. Check all areas or be the first to post!"
              : "No recent updates found. Check back soon!"}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedCampus("all");
                setSelectedCategory("all");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-700 text-white font-bold text-xs hover:bg-brand-900 transition-colors min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Show all updates
            </button>
          </div>
        </div>
      ) : (
        /* High-Density Feed Cards */
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
            {visibleItems.map((item) => {
              const isStay = item.type === "stay";
              const isRoommate = item.type === "roommate";

              const badgeStyles = isStay
                ? "bg-blue-50 text-brand-800 border-blue-200 dark:bg-blue-950/60 dark:text-brand-300 dark:border-blue-800"
                : isRoommate
                ? "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";

              const Icon = isStay ? Building2 : isRoommate ? Users : Store;

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.linkTo}
                  className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-surface border border-border hover:border-brand-700 dark:hover:border-brand-400 transition-all shadow-2xs hover:shadow-xs min-h-[105px]"
                >
                  <div className="space-y-1.5">
                    {/* Top Row: Type Badge + Time Ago + Price Highlight */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-bold ${badgeStyles}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{item.badgeText}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-muted">
                          <Clock className="w-3 h-3 opacity-70" />
                          <span>{formatTimeAgo(item.createdAt)}</span>
                        </span>
                      </div>

                      <span className="text-xs sm:text-sm font-black text-brand-800 dark:text-brand-200 shrink-0">
                        {item.highlight}
                      </span>
                    </div>

                    {/* Title + Action Indicator */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors line-clamp-1 leading-snug">
                        {item.title}
                      </h3>
                      <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-brand-700 dark:group-hover:text-brand-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>

                    {/* Subtitle / Location */}
                    <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted line-clamp-1">
                      <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                      <span>
                        {item.campusName ? `${item.campusName} • ` : ""}
                        {item.area}
                      </span>
                    </div>

                    {/* Chips (Amenities / Key details) */}
                    {item.chips.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {item.chips.map((chip, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Progressive Disclosure Toggle Button */}
          {displayedItems.length > INITIAL_ITEM_CAP && (
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold transition-colors shadow-2xs min-h-[40px]"
              >
                <span>
                  {isExpanded
                    ? "Show fewer updates"
                    : `Show all ${displayedItems.length} updates`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
