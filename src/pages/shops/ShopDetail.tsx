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
  X,
  Heart,
  QrCode,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useFavourites } from "@/hooks/useFavourites";
import { supabase } from "@/lib/supabase";
import { whatsAppUrl } from "@/lib/phone";
import { buildWhatsAppShareUrl } from "@/lib/differentiators";
import { getPublicStorageUrl } from "@/lib/storage";
import { downloadNoticeboardFlyer } from "@/lib/flyerGenerator";
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
  owner_id?: string;
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

interface BasketEntry {
  itemId: string;
  name: string;
  price_zmw: number | null;
  quantity: number;
}

interface StoredShopBasket {
  businessId: string;
  businessSlug: string;
  businessName: string;
  entries: Record<string, BasketEntry>;
}

const BASKET_STORAGE_KEY = "plawza_whatsapp_shop_basket_v1";

export const ShopDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { isFavourited, toggleFavourite } = useFavourites();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Host summary (from public-safe security definer RPC)
  const [hostSummary, setHostSummary] = useState<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    created_at: string;
    is_verified: boolean;
  } | null>(null);

  // WhatsApp Order Basket (single-shop localStorage basket)
  const [basketEntries, setBasketEntries] = useState<Record<string, BasketEntry>>({});

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Load basket from localStorage when business loads
  useEffect(() => {
    if (!business) return;
    try {
      const raw = localStorage.getItem(BASKET_STORAGE_KEY);
      if (!raw) {
        setBasketEntries({});
        return;
      }
      const parsed = JSON.parse(raw) as StoredShopBasket;
      if (parsed && parsed.businessId === business.id && parsed.entries) {
        setBasketEntries(parsed.entries);
      } else {
        setBasketEntries({});
      }
    } catch {
      setBasketEntries({});
    }
  }, [business]);

  const persistBasket = (nextEntries: Record<string, BasketEntry>) => {
    setBasketEntries(nextEntries);
    if (!business) return;
    try {
      if (Object.keys(nextEntries).length === 0) {
        localStorage.removeItem(BASKET_STORAGE_KEY);
      } else {
        const payload: StoredShopBasket = {
          businessId: business.id,
          businessSlug: business.slug,
          businessName: business.name,
          entries: nextEntries
        };
        localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(payload));
      }
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleUpdateBasketQuantity = (item: CatalogueItem, delta: number) => {
    if (!business) return;
    const existing = basketEntries[item.id]?.quantity || 0;
    const nextQty = Math.max(0, Math.min(99, existing + delta));
    const next = { ...basketEntries };
    if (nextQty <= 0) {
      delete next[item.id];
    } else {
      next[item.id] = {
        itemId: item.id,
        name: item.name,
        price_zmw: item.price_zmw,
        quantity: nextQty
      };
    }
    persistBasket(next);
  };

  const handleClearBasket = () => {
    persistBasket({});
    toast.info("Cleared WhatsApp order basket");
  };

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
        reason: reportReason as "scam" | "misleading" | "inappropriate" | "wrong_info" | "copyright" | "other",
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
            id, name, slug, description, category_id, town_id, area,
            opening_hours, phone, whatsapp_phone, logo_path, cover_path, status,
            town:towns(name, province),
            category:categories(name, slug),
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

        // Sort items by sort_order
        if (b.catalogue_items) {
          b.catalogue_items.sort((x, y) => x.sort_order - y.sort_order);
        }

        setBusiness(b);

        // Load public host summary in background
        const hostRes = await supabase.rpc("get_host_summary", { p_business_id: b.id });
        if (hostRes.data && typeof hostRes.data === "object") {
          setHostSummary(
            hostRes.data as {
              id: string;
              full_name: string;
              avatar_url: string | null;
              created_at: string;
              is_verified: boolean;
            }
          );
        }
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
  const waTargetPhone = business.whatsapp_phone || business.phone;
  const wa = waTargetPhone ? whatsAppUrl(waTargetPhone, `Hi! I'm browsing your shop "${business.name}" on Plawza.`) : null;

  // Catalogue Item Categories
  const items = business.catalogue_items || [];
  const uniqueItemCategories = Array.from(new Set(items.map((i) => i.item_category).filter(Boolean)));

  const filteredItems = items.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.item_category === selectedCategory;
  });

  // WhatsApp Basket calculations
  const basketList = Object.values(basketEntries);
  const totalBasketCount = basketList.reduce((acc, entry) => acc + entry.quantity, 0);
  const totalBasketZmw = basketList.reduce(
    (acc, entry) => acc + (entry.price_zmw !== null ? entry.price_zmw * entry.quantity : 0),
    0
  );
  const hasUnpricedBasketItem = basketList.some((entry) => entry.price_zmw === null);

  const buildBasketWhatsAppUrl = (): string | null => {
    if (!waTargetPhone || basketList.length === 0) return null;
    const lines = basketList.map((entry) => {
      const lineTotal =
        entry.price_zmw !== null
          ? `ZMW ${(entry.price_zmw * entry.quantity).toLocaleString()}`
          : "Price on request";
      return `• ${entry.quantity}x ${entry.name} (${lineTotal})`;
    });
    const totalLine =
      totalBasketZmw > 0
        ? `\nListed Total: ZMW ${totalBasketZmw.toLocaleString()}${
            hasUnpricedBasketItem ? " + unpriced items" : ""
          }`
        : "";
    const message = `Hi ${business.name}, I'd like to order/enquire about these items from your Plawza catalogue:\n\n${lines.join(
      "\n"
    )}${totalLine}\n\nPlease let me know if they are available.`;
    return whatsAppUrl(waTargetPhone, message);
  };

  const basketWaUrl = buildBasketWhatsAppUrl();

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
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Back button and Action bar */}
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/shops"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shops
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save Shop Button */}
          <button
            type="button"
            onClick={() => toggleFavourite("business", business.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-bold transition-colors min-h-[44px] cursor-pointer ${
              isFavourited("business", business.id)
                ? "border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300"
                : "border-border bg-surface hover:bg-slate-100 text-foreground"
            }`}
            title={isFavourited("business", business.id) ? "Remove shop from favourites" : "Save shop to favourites"}
          >
            <Heart className={`w-4 h-4 ${isFavourited("business", business.id) ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{isFavourited("business", business.id) ? "Saved" : "Save"}</span>
          </button>

          {/* Noticeboard Flyer & QR Poster Button */}
          <button
            type="button"
            onClick={() => {
              const badges = [
                business.category?.name || "Campus Shop",
                `${items.length} Catalogue Items`,
                ...uniqueItemCategories.slice(0, 2).map((c) => String(c))
              ];
              downloadNoticeboardFlyer({
                kind: "shop",
                title: business.name,
                subtitle: business.category?.name || "Student Shop & Services",
                locationText: `${business.area}${business.town?.name ? `, ${business.town.name}` : ""}`,
                badges,
                path: `/shops/${business.slug}`,
                filename: `plawza-shop-${business.slug}.png`
              });
              toast.success("Downloaded shop noticeboard & QR flyer!");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-slate-100 text-xs font-bold text-foreground transition-colors min-h-[44px] cursor-pointer"
            title="Download Shop Flyer & QR Card"
          >
            <QrCode className="w-4 h-4 text-brand-700" />
            <span>Flyer / QR</span>
          </button>

          {/* Phase 7 Differentiator: WhatsApp Share */}
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
                    ? "bg-emerald-700 text-white"
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
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors min-h-[44px]"
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">{business.name}</h1>
              {business.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-xs font-semibold">
                  <Tag className="w-3 h-3 text-brand-700" />
                  {business.category.name}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent-700 shrink-0" />
                <span>{business.area}{business.town ? `, ${business.town.name}` : ""}</span>
              </span>

              {hostSummary && (
                <Link
                  to={`/u/${hostSummary.id}`}
                  className="inline-flex items-center gap-1.5 font-bold text-brand-700 dark:text-brand-300 hover:underline"
                >
                  <span>• Managed by {hostSummary.full_name}</span>
                  {hostSummary.is_verified && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

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
            const qtyInBasket = basketEntries[item.id]?.quantity || 0;
            const isOutOfStock = item.stock_status === "out_of_stock";
            const itemWaUrl = waTargetPhone
              ? whatsAppUrl(
                  waTargetPhone,
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

                {/* WhatsApp Order Basket Controls + Single Item Enquiry */}
                <div className="pt-3 border-t border-border space-y-2">
                  {!isOutOfStock && waTargetPhone && (
                    <div>
                      {qtyInBasket > 0 ? (
                        <div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateBasketQuantity(item, -1)}
                            className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground hover:bg-slate-100 cursor-pointer"
                            aria-label={`Remove one ${item.name}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-black text-brand-900 dark:text-brand-100">
                            {qtyInBasket} in basket
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateBasketQuantity(item, 1)}
                            className="w-10 h-10 rounded-lg bg-brand-700 text-white flex items-center justify-center hover:bg-brand-800 cursor-pointer"
                            aria-label={`Add one more ${item.name}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateBasketQuantity(item, 1)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold shadow-xs transition-colors min-h-[44px] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add to WhatsApp Basket
                        </button>
                      )}
                    </div>
                  )}

                  {itemWaUrl ? (
                    <a
                      href={itemWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold transition-colors min-h-[40px]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Ask About This Item Only
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

      {/* Sticky WhatsApp Order Basket Summary Bar */}
      {totalBasketCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-3xl mx-auto">
          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">
                      WhatsApp Order Basket ({totalBasketCount} {totalBasketCount === 1 ? "item" : "items"})
                    </span>
                    {totalBasketZmw > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-black">
                        ZMW {totalBasketZmw.toLocaleString()}
                        {hasUnpricedBasketItem ? "+" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                    {basketList.map((e) => `${e.quantity}x ${e.name}`).join(", ")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClearBasket}
                  className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors min-h-[44px] cursor-pointer"
                  title="Clear basket"
                  aria-label="Clear WhatsApp basket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {basketWaUrl && (
                  <a
                    href={basketWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-colors min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send Order on WhatsApp
                  </a>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2">
              Note: Prices are as listed; Plawza is not part of the sale. Confirm stock, delivery, and payment directly with {business.name}.
            </p>
          </div>
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
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-700 min-h-[44px]"
                >
                  <option value="scam">Scam / Fraudulent activity</option>
                  <option value="misleading">Misleading or false pricing</option>
                  <option value="wrong_info">Incorrect contact details or address</option>
                  <option value="copyright">Photos or content copied without permission</option>
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
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-brand-700"
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
