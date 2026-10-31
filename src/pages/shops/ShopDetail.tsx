import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Store,
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Tag,
  Flag,
  Share2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { whatsAppUrl } from "@/lib/phone";
import { buildWhatsAppShareUrl } from "@/lib/differentiators";
import { getPublicStorageUrl } from "@/lib/storage";
import { isBusinessOpenNow, formatStockUpdated } from "@/lib/businessHours";
import { LazyImage } from "@/components/common/LazyImage";
import { Loading } from "@/components/common/Loading";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";

interface CatalogueItem {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  item_category: string | null;
  price_zmw: number | null;
  image_path: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  stock_updated_at: string;
  sort_order: number;
}

interface BusinessDetail {
  id: string;
  owner_id: string;
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
  town?: { name: string; province: string };
  category?: { name: string; slug: string };
  catalogue_items?: CatalogueItem[];
}

export const ShopDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please sign in to report a business.");
      return;
    }
    if (!business) return;

    setReportSubmitting(true);
    try {
      const { error: err } = await supabase.from("listing_reports").insert({
        reporter_id: user.id,
        business_id: business.id,
        reason: reportReason as "scam" | "misleading" | "inappropriate" | "wrong_info" | "other",
        details: reportDetails.trim() || null
      });

      if (err) throw err;

      setShowReportModal(false);
      setReportDetails("");
      toast.success("Thank you. Scam or abuse report submitted to moderators.");
    } catch (err: unknown) {
      console.error("Error submitting business report:", err);
      const message = err instanceof Error ? err.message : "Failed to submit report";
      toast.error(message);
    } finally {
      setReportSubmitting(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    const shopSlug: string = slug;

    async function loadShop() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await supabase
          .from("businesses")
          .select(`
            id, owner_id, name, slug, description, category_id, town_id, area,
            opening_hours, phone, whatsapp_phone, logo_path, cover_path, status,
            catalogue_items(
              id, business_id, name, description, item_category, price_zmw,
              image_path, stock_status, stock_updated_at, sort_order
            )
          `)
          .eq("slug", shopSlug)
          .eq("status", "active")
          .maybeSingle();

        if (err) throw err;
        if (!data) {
          setError("This campus shop could not be found or has not yet been approved.");
          return;
        }

        const b = data as unknown as BusinessDetail;

        // Fetch category & town details
        const [catRes, townRes] = await Promise.all([
          b.category_id
            ? supabase.from("categories").select("name, slug").eq("id", b.category_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from("towns").select("name, province").eq("id", b.town_id).maybeSingle()
        ]);

        if (catRes.data) b.category = catRes.data;
        if (townRes.data) b.town = townRes.data;

        // Sort items by sort_order
        if (b.catalogue_items) {
          b.catalogue_items.sort((x, y) => x.sort_order - y.sort_order);
        }

        setBusiness(b);
      } catch (err) {
        console.error("Failed to load shop catalogue:", err);
        setError("Error loading campus shop catalogue.");
      } finally {
        setLoading(false);
      }
    }

    loadShop();
  }, [slug]);

  if (loading) {
    return <Loading fullScreen message="Loading shop catalogue..." />;
  }

  if (error || !business) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <ErrorState
          title="Shop Not Found"
          message={error || "This shop catalogue is not currently active."}
          onRetry={() => window.location.reload()}
        />
        <div className="text-center">
          <Link
            to="/shops"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Browse all campus shops
          </Link>
        </div>
      </div>
    );
  }

  const coverUrl = business.cover_path ? getPublicStorageUrl("business-images", business.cover_path) : "";
  const logoUrl = business.logo_path ? getPublicStorageUrl("business-images", business.logo_path) : "";
  const openStatus = isBusinessOpenNow(business.opening_hours);
  const wa = business.whatsapp_phone ? whatsAppUrl(business.whatsapp_phone, `Hi! I'm browsing your shop "${business.name}" on Plawza.`) : null;

  // Catalogue Item Categories
  const items = business.catalogue_items || [];
  const uniqueItemCategories = Array.from(new Set(items.map((i) => i.item_category).filter(Boolean)));

  const filteredItems = items.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.item_category === selectedCategory;
  });

  const getStockBadge = (status: CatalogueItem["stock_status"]) => {
    switch (status) {
      case "in_stock":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            In Stock
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Low Stock
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
            <XCircle className="w-3 h-3 text-slate-500" />
            Out of Stock
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button and Report link */}
      <div className="flex items-center justify-between">
        <Link
          to="/shops"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shops
        </Link>

        <div className="flex items-center gap-2">
          {/* Phase 7 Differentiator: WhatsApp Share */}
          {business && (
            <a
              href={buildWhatsAppShareUrl(
                business.name,
                `${business.area}${business.town ? `, ${business.town.name}` : ""} • ${business.category?.name || "Campus Business"}`,
                window.location.href
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-colors min-h-[44px]"
              title="Share shop on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-danger-600 transition-colors min-h-[44px] px-2"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* Hero / Cover & Business Info Header */}
      <div className="rounded-3xl bg-surface border border-border shadow-xs overflow-hidden">
        {/* Cover Photo */}
        <div className="relative h-44 sm:h-56 bg-gradient-to-r from-brand-950 to-brand-900 overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="w-full h-full object-cover opacity-85" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <Store className="w-16 h-16" />
            </div>
          )}

          {/* Open Status Tag */}
          {openStatus && (
            <div className="absolute top-4 right-4">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                  openStatus.isOpen
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900/90 text-slate-200 border border-slate-700"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {openStatus.label}
              </span>
            </div>
          )}
        </div>

        {/* Info Header Body */}
        <div className="p-6 relative pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-surface border-4 border-surface shadow-xl shrink-0 flex items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-10 h-10 text-brand-700" />
              )}
            </div>

            {/* Direct Contact Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" /> Message on WhatsApp
                </a>
              )}
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-border bg-surface hover:bg-slate-100 text-foreground rounded-xl text-xs font-bold transition-colors min-h-[44px]"
                >
                  <Phone className="w-4 h-4 text-brand-700" /> Call {business.phone}
                </a>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">{business.name}</h1>
              {business.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-xs font-semibold">
                  <Tag className="w-3 h-3 text-brand-700" />
                  {business.category.name}
                </span>
              )}
            </div>

            <p className="text-xs text-muted flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-accent-700 shrink-0" />
              <span>{business.area}{business.town ? `, ${business.town.name}` : ""}</span>
            </p>

            {business.description && (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-1 max-w-3xl">
                {business.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Catalogue Filter Tabs */}
      {uniqueItemCategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 min-h-[44px] ${
              selectedCategory === "all"
                ? "bg-brand-700 text-white"
                : "bg-surface border border-border text-muted hover:text-foreground"
            }`}
          >
            All Items ({items.length})
          </button>
          {uniqueItemCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat as string)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 min-h-[44px] ${
                selectedCategory === cat
                  ? "bg-brand-700 text-white"
                  : "bg-surface border border-border text-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Catalogue Items Grid */}
      {filteredItems.length === 0 ? (
        <Empty
          icon={Store}
          title="No catalogue items listed yet"
          description="The shop owner has not published items to their online catalogue yet. You can still message or call them directly."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const itemImgUrl = item.image_path ? getPublicStorageUrl("business-images", item.image_path) : "";
            const itemWaUrl = business.whatsapp_phone
              ? whatsAppUrl(
                  business.whatsapp_phone,
                  `Hi ${business.name}, I'm interested in "${item.name}"${item.price_zmw !== null ? ` (ZMW ${item.price_zmw})` : ""} listed on Plawza. Is it in stock?`
                )
              : null;

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-surface border border-border shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  {itemImgUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-border bg-slate-100 dark:bg-slate-800">
                      <LazyImage
                        src={itemImgUrl}
                        alt={item.name}
                        aspectRatio="aspect-16/10"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      {getStockBadge(item.stock_status)}
                      <span className="text-[10px] text-muted">
                        {formatStockUpdated(item.stock_updated_at)}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-foreground">{item.name}</h3>

                    {item.price_zmw !== null ? (
                      <p className="text-base font-black text-brand-700 dark:text-brand-300">
                        ZMW {item.price_zmw.toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-muted">Contact for price</p>
                    )}

                    {item.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Enquire on WhatsApp CTA */}
                <div className="pt-3 border-t border-border">
                  {itemWaUrl ? (
                    <a
                      href={itemWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors min-h-[44px]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Enquire on WhatsApp
                    </a>
                  ) : business.phone ? (
                    <a
                      href={`tel:${business.phone}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-border bg-surface hover:bg-slate-100 text-foreground rounded-xl text-xs font-bold min-h-[44px]"
                    >
                      <Phone className="w-3.5 h-3.5 text-brand-700" /> Call Shop
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-danger-600">
                <Flag className="w-5 h-5" />
                <h2 className="text-base font-bold text-foreground">Report this Business</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-3.5 text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted">
              Help keep Plawza honest. Reports are investigated by campus staff moderators.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Reason for report</label>
                <select aria-label="Reason for report"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-700 min-h-[44px]"
                >
                  <option value="scam">Scam / Fraudulent activity</option>
                  <option value="misleading">Misleading or false pricing</option>
                  <option value="wrong_info">Incorrect contact details or address</option>
                  <option value="inappropriate">Inappropriate content or items</option>
                  <option value="other">Other problem</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Details (optional)</label>
                <textarea aria-label="Report details"
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe the issue or evidence..."
                  maxLength={1000}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-brand-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-2.5 px-3 rounded-lg border border-border text-xs font-bold hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-danger-600 hover:bg-danger-700 text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50"
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
