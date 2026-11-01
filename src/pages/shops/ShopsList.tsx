import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Store,
  Plus,
  Search,
  MapPin,
  Clock,
  MessageCircle,
  Phone,
  ArrowRight,
  RotateCcw,
  Tag
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useReferenceData } from "@/hooks/useReferenceData";
import { whatsAppUrl } from "@/lib/phone";
import { getPublicStorageUrl } from "@/lib/storage";
import { isBusinessOpenNow } from "@/lib/businessHours";
import { Loading } from "@/components/common/Loading";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";

interface BusinessItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  town_id: string;
  area: string;
  opening_hours: unknown;
  phone: string | null;
  whatsapp_phone: string | null;
  logo_path: string | null;
  cover_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  town?: { name: string; province: string };
  category?: { name: string; slug: string };
}

export const ShopsList: React.FC = () => {
  const { user } = useAuth();
  const { towns, categories } = useReferenceData();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const townId = searchParams.get("town") || "";
  const categoryId = searchParams.get("category") || "";

  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(search);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value && value.trim()) next.set(key, value.trim());
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setSearchInput("");
  };

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Explicit column list for anonymous read permissions (AGENTS Rule 13)
      let query = supabase
        .from("businesses")
        .select(`
          id, name, slug, description, category_id, town_id, area,
          opening_hours, phone, whatsapp_phone, logo_path, cover_path, status,
          created_at, updated_at,
          town:towns(name, province),
          category:categories(name, slug)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.textSearch("search_tsv", search.trim(), { config: "simple" });
      }
      if (townId) query = query.eq("town_id", townId);
      if (categoryId) query = query.eq("category_id", categoryId);

      const { data, error: err } = await query;
      if (err) throw err;

      const typedData = (data as unknown as BusinessItem[]) || [];
      setBusinesses(typedData);
    } catch (err) {
      console.error("Failed to load campus shops:", err);
      setError("Unable to load campus shops.");
    } finally {
      setLoading(false);
    }
  }, [search, townId, categoryId]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const activeFiltersCount = (search ? 1 : 0) + (townId ? 1 : 0) + (categoryId ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Store className="w-6 h-6 text-brand-700" />
            Campus Shops & Catalogues
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Browse stationery, food, electronics, print shops, and student services with live stock and direct WhatsApp links.
          </p>
        </div>

        <Link
          to={user ? "/dashboard/businesses" : "/login?redirect=/dashboard/businesses"}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors min-h-[44px] w-fit"
        >
          <Plus className="w-4 h-4" />
          List My Shop
        </Link>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParam("search", searchInput);
          }}
          className="relative flex-1"
        >
          <Search className="w-4 h-4 text-muted absolute left-3 top-3.5" />
          <input aria-label="Search shops or products"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search shops or products (e.g. printing, calculators, meals)..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-brand-700 min-h-[44px]"
          />
        </form>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => updateParam("category", e.target.value)}
            aria-label="Filter by category"
            className="px-3 py-2.5 rounded-lg border border-border bg-surface text-xs font-bold text-foreground min-h-[44px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Town Filter */}
          <select
            value={townId}
            onChange={(e) => updateParam("town", e.target.value)}
            aria-label="Filter by town"
            className="px-3 py-2.5 rounded-lg border border-border bg-surface text-xs font-bold text-foreground min-h-[44px]"
          >
            <option value="">All Towns</option>
            {towns.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-accent-700 hover:underline px-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <Loading fullScreen message="Loading local campus shops..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadBusinesses} />
      ) : businesses.length === 0 ? (
        <Empty
          icon={Store}
          title="No campus shops found"
          description={
            activeFiltersCount > 0
              ? "No business catalogues match your current filters. Try resetting the category or search."
              : "No active businesses listed yet. Students and campus vendors can list their shop for free."
          }
          actionLabel={activeFiltersCount > 0 ? "Reset Filters" : "Register Business"}
          onAction={activeFiltersCount > 0 ? handleResetFilters : () => window.location.assign("/dashboard/businesses")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {businesses.map((biz) => {
            const logoUrl = biz.logo_path ? getPublicStorageUrl("business-images", biz.logo_path) : "";
            const coverUrl = biz.cover_path ? getPublicStorageUrl("business-images", biz.cover_path) : "";
            const openStatus = isBusinessOpenNow(biz.opening_hours);
            const wa = biz.whatsapp_phone ? whatsAppUrl(biz.whatsapp_phone, `Hi, I saw your shop "${biz.name}" on Plawza!`) : null;

            return (
              <div
                key={biz.id}
                className="group rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm"
              >
                <div>
                  {/* Cover Header */}
                  <div className="relative h-28 bg-gradient-to-r from-brand-900 to-brand-950 overflow-hidden">
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover opacity-85" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Store className="w-12 h-12" />
                      </div>
                    )}

                    {/* Open Status Tag */}
                    {openStatus && (
                      <div className="absolute top-2.5 right-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                            openStatus.isOpen
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-800 text-slate-200"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {openStatus.isOpen ? "Open Now" : "Closed"}
                        </span>
                      </div>
                    )}

                    {/* Logo Overlay */}
                    <div className="absolute -bottom-4 left-4 w-14 h-14 rounded-xl overflow-hidden bg-surface border-2 border-surface shadow-md flex items-center justify-center">
                      {logoUrl ? (
                        <img src={logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-brand-700" />
                      )}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="pt-6 px-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {biz.category && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-700 dark:text-accent-400 uppercase tracking-wider">
                          <Tag className="w-3 h-3" />
                          {biz.category.name}
                        </span>
                      )}
                    </div>

                    <Link to={`/shops/${biz.slug}`}>
                      <h2 className="text-base font-black text-foreground group-hover:text-brand-700 transition-colors line-clamp-1">
                        {biz.name}
                      </h2>
                    </Link>

                    <p className="text-xs text-muted flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-accent-700 shrink-0" />
                      <span>{biz.area}{biz.town ? `, ${biz.town.name}` : ""}</span>
                    </p>

                    {biz.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {biz.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Controls & Direct Contact */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors min-h-[44px]"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}
                    {biz.phone && (
                      <a
                        href={`tel:${biz.phone}`}
                        className="p-2 border border-border bg-surface hover:bg-slate-100 text-foreground rounded-lg text-xs font-bold min-h-[44px]"
                        title={`Call ${biz.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-brand-700" />
                      </a>
                    )}
                  </div>

                  <Link
                    to={`/shops/${biz.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline"
                  >
                    View Catalogue <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
