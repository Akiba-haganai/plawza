import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Building2,
  Search,
  Filter,
  X,
  RotateCcw,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Zap,
  Droplets,
  BatteryCharging,
  AlertTriangle,
  Bookmark,
  Heart,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useFavourites } from "@/hooks/useFavourites";
import { LISTING_TYPES, AMENITIES_VOCABULARY } from "@/lib/constants";
import { getPublicStorageUrl } from "@/lib/storage";
import { isStaleConfirmation } from "@/lib/differentiators";
import { LazyImage } from "@/components/common/LazyImage";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";
import { SafetyNotice } from "@/components/common/SafetyNotice";

interface ListingItem {
  id: string;
  owner_id?: string;
  title: string;
  description: string;
  listing_type: string;
  rent_zmw: number;
  deposit_zmw: number | null;
  town_id: string;
  area: string;
  campus_id: string | null;
  distance_note: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished: boolean;
  utilities_included: string[];
  amenities: string[];
  available_from: string | null;
  availability: "available" | "pending" | "occupied";
  contact_shared: boolean;
  status: string;
  last_confirmed_at: string;
  created_at: string;
  updated_at: string;
  accommodation_images?: Array<{ id: string; storage_path: string; sort_order: number }>;
}

const PAGE_SIZE = 12;

const SAVED_FILTERS_KEY = "plawza_saved_accommodation_filters";

interface SavedFilterData {
  search?: string;
  townId?: string;
  campusId?: string;
  listingType?: string;
  availability?: string;
  minRent?: string;
  maxRent?: string;
  powerBackup?: boolean;
  waterBackup?: boolean;
  amenities?: string[];
  sort?: string;
  label: string;
  savedAt: string;
}

export const AccommodationList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const { isFavourited, toggleFavourite } = useFavourites();
  const { towns, campuses } = useReferenceData();
  const appliedDefaultCampusRef = useRef(false);

  // Filters from URL query params (default sort: confirmed-recently first)
  const search = searchParams.get("search") || "";
  const townId = searchParams.get("town") || "";
  const campusId = searchParams.get("campus") || "";
  const listingType = searchParams.get("type") || "";
  const availability = searchParams.get("availability") || "";
  const minRent = searchParams.get("minRent") || "";
  const maxRent = searchParams.get("maxRent") || "";
  const powerBackup = searchParams.get("power") === "1";
  const waterBackup = searchParams.get("water") === "1";
  const sort = searchParams.get("sort") || "confirmed";
  const amenitiesKey = searchParams.getAll("amenity").sort().join(",");
  const selectedAmenities = useMemo(
    () => (amenitiesKey ? amenitiesKey.split(",") : []),
    [amenitiesKey]
  );

  // State
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Default to the student's profile campus on initial visit if no URL filters are set
  useEffect(() => {
    if (appliedDefaultCampusRef.current) return;
    if (!profile?.campus_id) return;
    if (Array.from(searchParams.keys()).length === 0) {
      appliedDefaultCampusRef.current = true;
      const next = new URLSearchParams(searchParams);
      next.set("campus", profile.campus_id);
      setSearchParams(next, { replace: true });
    } else {
      appliedDefaultCampusRef.current = true;
    }
  }, [profile?.campus_id, searchParams, setSearchParams]);

  // LocalStorage Saved Filters (Phase 7: no server table)
  const [savedFilter, setSavedFilter] = useState<SavedFilterData | null>(() => {
    try {
      const stored = localStorage.getItem(SAVED_FILTERS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Search input state
  const [searchInput, setSearchInput] = useState(search);

  // Sync search input with URL
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Update query params helper
  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value && value.trim()) {
      next.set(key, value.trim());
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const toggleAmenity = (amenity: string) => {
    const next = new URLSearchParams(searchParams);
    const existing = next.getAll("amenity");
    next.delete("amenity");

    if (existing.includes(amenity)) {
      existing.filter((a) => a !== amenity).forEach((a) => next.append("amenity", a));
    } else {
      [...existing, amenity].forEach((a) => next.append("amenity", a));
    }
    setSearchParams(next, { replace: true });
  };

  const handleResetFilters = () => {
    appliedDefaultCampusRef.current = true;
    setSearchParams(new URLSearchParams(), { replace: true });
    setSearchInput("");
  };

  // Phase 7 Differentiator: Save filters to localStorage (0 server tables)
  const handleSaveCurrentFilter = () => {
    const parts: string[] = [];
    if (campusId) parts.push(campuses.find((c) => c.id === campusId)?.short_name || "Campus");
    if (townId) parts.push(towns.find((t) => t.id === townId)?.name || "Town");
    if (listingType) parts.push(LISTING_TYPES.find((t) => t.value === listingType)?.label || listingType);
    if (maxRent) parts.push(`≤ ZMW ${maxRent}`);
    if (powerBackup) parts.push("Power Backup");
    if (waterBackup) parts.push("Water Backup");
    if (search.trim()) parts.push(`"${search.trim()}"`);

    const label = parts.length > 0 ? parts.join(" • ") : "All Listings";
    const data: SavedFilterData = {
      search: search || undefined,
      townId: townId || undefined,
      campusId: campusId || undefined,
      listingType: listingType || undefined,
      availability: availability || undefined,
      minRent: minRent || undefined,
      maxRent: maxRent || undefined,
      powerBackup: powerBackup || undefined,
      waterBackup: waterBackup || undefined,
      amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
      sort: sort !== "confirmed" ? sort : undefined,
      label,
      savedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(data));
      setSavedFilter(data);
      toast.success(`Filter saved: ${label}`);
    } catch (err) {
      console.error("Failed to save filter to localStorage:", err);
      toast.error("Could not save filter preference");
    }
  };

  const handleApplySavedFilter = () => {
    if (!savedFilter) return;
    appliedDefaultCampusRef.current = true;
    const next = new URLSearchParams();
    if (savedFilter.search) next.set("search", savedFilter.search);
    if (savedFilter.townId) next.set("town", savedFilter.townId);
    if (savedFilter.campusId) next.set("campus", savedFilter.campusId);
    if (savedFilter.listingType) next.set("type", savedFilter.listingType);
    if (savedFilter.availability) next.set("availability", savedFilter.availability);
    if (savedFilter.minRent) next.set("minRent", savedFilter.minRent);
    if (savedFilter.maxRent) next.set("maxRent", savedFilter.maxRent);
    if (savedFilter.powerBackup) next.set("power", "1");
    if (savedFilter.waterBackup) next.set("water", "1");
    if (savedFilter.sort) next.set("sort", savedFilter.sort);
    if (savedFilter.amenities) {
      savedFilter.amenities.forEach((a) => next.append("amenity", a));
    }
    setSearchParams(next, { replace: true });
    setSearchInput(savedFilter.search || "");
    toast.info(`Applied saved filter: ${savedFilter.label}`);
  };

  const handleClearSavedFilter = () => {
    try {
      localStorage.removeItem(SAVED_FILTERS_KEY);
      setSavedFilter(null);
      toast.info("Saved filter removed from device");
    } catch {
      // ignore
    }
  };

  // Main data loader
  const fetchListings = useCallback(
    async (pageIndex: number, isInitial = false) => {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        // Explicit column selection for anonymous queries (AGENTS Rule 13)
        let query = supabase
          .from("accommodation_listings")
          .select(
            `
            id, title, description, listing_type, rent_zmw, deposit_zmw,
            town_id, area, campus_id, distance_note, bedrooms, bathrooms, furnished,
            utilities_included, amenities, available_from, availability, contact_shared,
            status, last_confirmed_at, created_at, updated_at,
            accommodation_images(id, storage_path, sort_order)
          `
          )
          .eq("status", "active");

        // Search TSV
        if (search.trim()) {
          query = query.textSearch("search_tsv", search.trim(), { config: "simple" });
        }

        // Filters
        if (townId) query = query.eq("town_id", townId);
        if (campusId) query = query.eq("campus_id", campusId);
        if (listingType) query = query.eq("listing_type", listingType);
        if (availability && ["available", "pending", "occupied"].includes(availability)) {
          query = query.eq("availability", availability as "available" | "pending" | "occupied");
        }
        if (minRent) query = query.gte("rent_zmw", parseFloat(minRent));
        if (maxRent) query = query.lte("rent_zmw", parseFloat(maxRent));
        if (powerBackup) {
          // Matches either Solar Backup OR Generator Backup
          query = query.overlaps("amenities", ["solar_backup", "generator"]);
        }
        if (waterBackup) {
          // Matches either Borehole Water OR Reserve Water Tank
          query = query.overlaps("amenities", ["borehole", "water_tank"]);
        }
        if (selectedAmenities.length > 0) {
          query = query.contains("amenities", selectedAmenities);
        }

        // Sort: Default confirmed-recently first (Phase 7 Differentiator)
        if (sort === "rent_asc") {
          query = query.order("rent_zmw", { ascending: true });
        } else if (sort === "rent_desc") {
          query = query.order("rent_zmw", { ascending: false });
        } else if (sort === "newest") {
          query = query.order("created_at", { ascending: false });
        } else {
          // Default: confirmed-recently first
          query = query
            .order("last_confirmed_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false });
        }

        // Pagination
        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, error: err } = await query;

        if (err) throw err;

        const typedData = (data as unknown as ListingItem[]) || [];

        if (isInitial) {
          setListings(typedData);
        } else {
          setListings((prev) => [...prev, ...typedData]);
        }

        setHasMore(typedData.length === PAGE_SIZE);
        setPage(pageIndex);
      } catch (err) {
        console.error("Error querying accommodation listings:", err);
        setError("Failed to load listings. Please check your internet connection.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      search,
      townId,
      campusId,
      listingType,
      availability,
      minRent,
      maxRent,
      powerBackup,
      waterBackup,
      sort,
      selectedAmenities
    ]
  );

  useEffect(() => {
    fetchListings(0, true);
  }, [fetchListings]);

  const activeFiltersCount =
    (search ? 1 : 0) +
    (townId ? 1 : 0) +
    (campusId ? 1 : 0) +
    (listingType ? 1 : 0) +
    (availability ? 1 : 0) +
    (minRent ? 1 : 0) +
    (maxRent ? 1 : 0) +
    (powerBackup ? 1 : 0) +
    (waterBackup ? 1 : 0) +
    selectedAmenities.length;

  const formatDaysAgo = (dateStr: string) => {
    const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Confirmed today";
    if (diffDays === 1) return "Confirmed yesterday";
    if (diffDays > 30) return `${diffDays}d ago (Not recently confirmed)`;
    return `Confirmed ${diffDays}d ago`;
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-700" />
            Find Accommodation
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Boarding houses, rooms, bedsitters and flats near Zambian university campuses.
          </p>
        </div>

        <Link
          to="/dashboard/accommodation"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-accent-700 hover:bg-accent-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors min-h-[44px] w-fit"
        >
          Post Listing
        </Link>
      </div>

      <SafetyNotice compact />

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParam("search", searchInput);
          }}
          className="relative flex-1"
        >
          <Search className="w-4 h-4 text-muted absolute left-3 top-3.5" />
          <input aria-label="Search accommodation by area or keyword"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by area or keywords (e.g. town centre, borehole)..."
            className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-border bg-surface text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-700 min-h-[44px]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateParam("search", null);
              }}
              className="absolute right-2.5 top-3 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2">
          {/* Mobile Filter Modal Toggle */}
          <button
            type="button"
            onClick={() => setShowFiltersModal(true)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-bold transition-colors min-h-[44px] ${
              activeFiltersCount > 0
                ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/60 dark:border-brand-700"
                : "bg-surface border-border text-foreground hover:bg-slate-100"
            }`}
          >
            <Filter className="w-4 h-4 text-brand-700" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-brand-700 text-white text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown (Confirmed Recently by default) */}
          <select
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
            aria-label="Sort listings"
            className="px-3 py-2.5 rounded-lg border border-border bg-surface text-base sm:text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-brand-700 min-h-[44px]"
          >
            <option value="confirmed">Confirmed Recently</option>
            <option value="newest">Newest Listed</option>
            <option value="rent_asc">Rent: Low to High</option>
            <option value="rent_desc">Rent: High to Low</option>
          </select>
        </div>
      </div>

      {/* 1-Tap Quick-Filter Pills: Power Backup, Water Backup, & Campuses */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {/* Power Backup Pill (.overlaps(['solar_backup','generator'])) */}
        <button
          type="button"
          onClick={() => updateParam("power", powerBackup ? null : "1")}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold transition-colors shrink-0 min-h-[40px] cursor-pointer ${
            powerBackup
              ? "bg-amber-700 border-amber-700 text-white shadow-2xs"
              : "bg-surface border-border text-foreground hover:bg-amber-50 dark:hover:bg-amber-950/40"
          }`}
          title="Filter stays with Solar Backup or Generator"
        >
          <Zap className={`w-3.5 h-3.5 ${powerBackup ? "text-amber-200" : "text-amber-600"}`} />
          <span>Power Backup (Solar / Gen)</span>
        </button>

        {/* Water Backup Pill (.overlaps(['borehole','water_tank'])) */}
        <button
          type="button"
          onClick={() => updateParam("water", waterBackup ? null : "1")}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold transition-colors shrink-0 min-h-[40px] cursor-pointer ${
            waterBackup
              ? "bg-blue-700 border-blue-700 text-white shadow-2xs"
              : "bg-surface border-border text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/40"
          }`}
          title="Filter stays with Borehole or Reserve Water Tank"
        >
          <Droplets className={`w-3.5 h-3.5 ${waterBackup ? "text-blue-200" : "text-blue-600"}`} />
          <span>Water Backup (Borehole / Tank)</span>
        </button>

        {/* Campus Quick-Switch Pills */}
        {campuses.map((c) => {
          const isSelected = campusId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                appliedDefaultCampusRef.current = true;
                updateParam("campus", isSelected ? null : c.id);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold transition-colors shrink-0 min-h-[40px] cursor-pointer ${
                isSelected
                  ? "bg-brand-700 border-brand-700 text-white shadow-2xs"
                  : "bg-surface border-border text-muted hover:text-foreground"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Near {c.short_name || c.name}</span>
            </button>
          );
        })}
      </div>

      {/* Saved Filter Quick Bar (Phase 7: localStorage differentiator) */}
      {savedFilter && (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border flex items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Bookmark className="w-3.5 h-3.5 text-brand-700 shrink-0" />
            <span className="text-muted text-[11px] shrink-0">Saved Filter:</span>
            <span className="font-bold text-foreground truncate">{savedFilter.label}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleApplySavedFilter}
              className="px-2.5 py-1 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-[11px] font-bold transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleClearSavedFilter}
              title="Remove saved filter"
              className="p-3.5 text-muted hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-muted mr-1">Active:</span>
          <button
            type="button"
            onClick={handleSaveCurrentFilter}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 text-brand-800 dark:text-brand-200 border border-brand-200 dark:border-brand-800 text-xs font-bold transition-colors shadow-2xs mr-1"
          >
            <Bookmark className="w-3 h-3 text-brand-700" />
            <span>Save Filter to Device</span>
          </button>
          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-xs font-semibold">
              Search: "{search}"
              <button type="button" onClick={() => updateParam("search", null)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {campusId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-xs font-semibold">
              Campus: {campuses.find((c) => c.id === campusId)?.short_name || "Campus"}
              <button
                type="button"
                onClick={() => {
                  appliedDefaultCampusRef.current = true;
                  updateParam("campus", null);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {listingType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-xs font-semibold">
              Type: {LISTING_TYPES.find((t) => t.value === listingType)?.label || listingType}
              <button type="button" onClick={() => updateParam("type", null)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {minRent && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-xs font-semibold">
              Min: ZMW {minRent}
              <button type="button" onClick={() => updateParam("minRent", null)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {maxRent && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-xs font-semibold">
              Max: ZMW {maxRent}
              <button type="button" onClick={() => updateParam("maxRent", null)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {powerBackup && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-semibold">
              Power Backup
              <button type="button" onClick={() => updateParam("power", null)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {waterBackup && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 text-xs font-semibold">
              Water Backup
              <button type="button" onClick={() => updateParam("water", null)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedAmenities.map((amenity) => (
            <span
              key={amenity}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-xs font-semibold"
            >
              {AMENITIES_VOCABULARY.find((a) => a.value === amenity)?.label || amenity}
              <button type="button" onClick={() => toggleAmenity(amenity)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-xs font-bold text-accent-700 dark:text-accent-400 hover:underline ml-2"
          >
            <RotateCcw className="w-3 h-3" /> Reset all
          </button>
        </div>
      )}

      {/* Main Content Area: Skeleton Cards while loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-surface border border-border overflow-hidden animate-pulse"
            >
              <div className="aspect-16/10 bg-slate-200 dark:bg-slate-800" />
              <div className="p-4 space-y-2.5">
                <div className="h-5 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-2/5 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchListings(0, true)} />
      ) : listings.length === 0 ? (
        <Empty
          title="No listings found"
          description={
            activeFiltersCount > 0
              ? "No properties match your current filters. Try widening your price range or clearing some filters."
              : "No active accommodation listings in the database yet. Landlords can submit properties for free."
          }
          actionLabel={activeFiltersCount > 0 ? "Reset Filters" : "Post Accommodation"}
          onAction={activeFiltersCount > 0 ? handleResetFilters : () => window.location.assign("/dashboard/accommodation")}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((item) => {
              const primaryImage = item.accommodation_images?.[0];
              const imageUrl = primaryImage
                ? getPublicStorageUrl("listing-images", primaryImage.storage_path)
                : "";

              return (
                <Link
                  key={item.id}
                  to={`/accommodation/${item.id}`}
                  className="group rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm"
                >
                  <div>
                    {/* Property Image with Low-Data Support */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavourite("listing", item.id);
                        }}
                        aria-label={isFavourited("listing", item.id) ? "Remove from favourites" : "Save to favourites"}
                        title={isFavourited("listing", item.id) ? "Remove from favourites" : "Save to favourites"}
                        className={`absolute top-2.5 left-2.5 z-10 p-2 rounded-full backdrop-blur-xs transition-transform active:scale-90 shadow-xs cursor-pointer ${
                          isFavourited("listing", item.id)
                            ? "bg-white text-rose-500 fill-rose-500 shadow-sm"
                            : "bg-surface/85 text-muted hover:text-rose-500 hover:bg-white"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isFavourited("listing", item.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                      </button>
                      <LazyImage
                        src={imageUrl}
                        alt={item.title}
                        aspectRatio="aspect-16/10"
                        className="group-hover:scale-102 transition-transform duration-300"
                      />
                      {/* Availability & Freshness Tags */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
                        {item.availability === "available" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-[10px] font-bold shadow-xs">
                            <CheckCircle2 className="w-3 h-3" /> Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-white text-[10px] font-bold shadow-xs">
                            <Clock className="w-3 h-3" /> {item.availability}
                          </span>
                        )}

                        {/* Phase 7: Public "Not recently confirmed" text badge after 30 days */}
                        {isStaleConfirmation(item.last_confirmed_at, item.created_at, 30) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/90 text-amber-200 border border-amber-500/50 text-[10px] font-bold shadow-xs backdrop-blur-xs">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Not recently confirmed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Listing Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-lg font-black text-brand-700 dark:text-brand-300">
                          ZMW {item.rent_zmw.toLocaleString()}
                          <span className="text-xs font-normal text-muted">/mo</span>
                        </span>
                        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                          {LISTING_TYPES.find((t) => t.value === item.listing_type)?.label || item.listing_type}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-brand-700 transition-colors">
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-1 text-xs text-muted">
                        <MapPin className="w-3.5 h-3.5 text-accent-700 shrink-0" />
                        <span className="truncate">
                          {item.area}
                          {item.distance_note ? ` • ${item.distance_note}` : ""}
                        </span>
                      </div>

                      {/* Key Amenities Badges */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {(item.amenities.includes("solar_backup") || item.amenities.includes("generator")) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                            <Zap className="w-3 h-3 text-amber-600" />{" "}
                            {item.amenities.includes("solar_backup") ? "Solar" : "Generator"}
                          </span>
                        )}
                        {(item.amenities.includes("borehole") || item.amenities.includes("water_tank")) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 text-[10px] font-semibold">
                            <Droplets className="w-3 h-3 text-blue-600" />{" "}
                            {item.amenities.includes("borehole") ? "Borehole" : "Water Tank"}
                          </span>
                        )}
                        {item.amenities.includes("prepaid_electricity") && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                            <BatteryCharging className="w-3 h-3" /> ZESCO Meter
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Last Confirmed Footer */}
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-t border-border flex items-center justify-between text-[11px] text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted" />
                      {formatDaysAgo(item.last_confirmed_at)}
                    </span>
                    <span className="font-bold text-brand-700 dark:text-brand-300">View details →</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Load More Pagination */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => fetchListings(page + 1)}
                disabled={loadingMore}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-border bg-surface hover:bg-slate-100 text-xs font-bold text-foreground transition-colors min-h-[44px] disabled:opacity-50"
              >
                {loadingMore ? "Loading more listings..." : "Load More Listings"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Modal / Drawer */}
      {showFiltersModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl max-h-[85vh] overflow-y-auto p-5 sm:p-6 space-y-5 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <Filter className="w-5 h-5 text-brand-700" /> Filter Accommodation
              </h2>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="p-3.5 text-muted hover:text-foreground rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campus Picker */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="filter-campus">
                Nearby Campus
              </label>
              <select
                id="filter-campus"
                value={campusId}
                onChange={(e) => {
                  appliedDefaultCampusRef.current = true;
                  updateParam("campus", e.target.value);
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground focus:ring-2 focus:ring-brand-700 min-h-[44px]"
              >
                <option value="">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.short_name || ""})
                  </option>
                ))}
              </select>
            </div>

            {/* Town Picker */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="filter-town">
                City / Town
              </label>
              <select
                id="filter-town"
                value={townId}
                onChange={(e) => updateParam("town", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground focus:ring-2 focus:ring-brand-700 min-h-[44px]"
              >
                <option value="">All Towns</option>
                {towns.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.province})
                  </option>
                ))}
              </select>
            </div>

            {/* Accommodation Type */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="filter-type">
                Listing Type
              </label>
              <select
                id="filter-type"
                value={listingType}
                onChange={(e) => updateParam("type", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground focus:ring-2 focus:ring-brand-700 min-h-[44px]"
              >
                <option value="">Any Type</option>
                {LISTING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rent Range (ZMW) */}
            <div>
              <span className="block text-xs font-bold text-foreground mb-1.5">Monthly Rent Range (ZMW)</span>
              <div className="grid grid-cols-2 gap-2">
                <input aria-label="Minimum monthly rent in ZMW"
                  type="number"
                  inputMode="numeric"
                  placeholder="Min ZMW (e.g. 800)"
                  value={minRent}
                  onChange={(e) => updateParam("minRent", e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                />
                <input aria-label="Maximum monthly rent in ZMW"
                  type="number"
                  inputMode="numeric"
                  placeholder="Max ZMW (e.g. 2500)"
                  value={maxRent}
                  onChange={(e) => updateParam("maxRent", e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                />
              </div>
            </div>

            {/* Amenities Checkboxes */}
            <div>
              <span className="block text-xs font-bold text-foreground mb-1.5">Must Include Amenities</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {AMENITIES_VOCABULARY.map((amenity) => {
                  const checked = selectedAmenities.includes(amenity.value);
                  return (
                    <label
                      key={amenity.value}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        checked
                          ? "bg-brand-50 border-brand-300 text-brand-900 dark:bg-brand-950 dark:text-brand-100"
                          : "border-border text-muted hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAmenity(amenity.value)}
                        className="rounded-sm border-border text-brand-700 focus:ring-brand-700"
                      />
                      <span>{amenity.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 py-3 px-4 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-slate-100 min-h-[44px]"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold shadow-xs min-h-[44px]"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
