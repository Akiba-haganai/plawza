import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Building2, Store, Trash2, ExternalLink, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getPublicStorageUrl } from "@/lib/storage";
import { LISTING_TYPES } from "@/lib/constants";

interface SavedListing {
  id: string;
  title: string;
  rent_zmw: number;
  listing_type: string;
  area: string;
  accommodation_images: { storage_path: string }[];
  campus?: { short_name: string | null; name: string } | null;
  town?: { name: string } | null;
}

interface SavedBusiness {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  description: string | null;
  area: string;
  category?: { name: string } | null;
  town?: { name: string } | null;
}

interface FavouriteRow {
  id: string;
  listing_id: string | null;
  business_id: string | null;
  listing: SavedListing | null;
  business: SavedBusiness | null;
}

export const DashboardFavourites: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"listings" | "businesses">("listings");
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [businesses, setBusinesses] = useState<SavedBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavourites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("favourites")
        .select(`
          id,
          listing_id,
          business_id,
          listing:accommodation_listings (
            id,
            title,
            rent_zmw,
            listing_type,
            area,
            accommodation_images (storage_path),
            campus:campuses (short_name, name),
            town:towns (name)
          ),
          business:businesses (
            id,
            name,
            slug,
            logo_path,
            description,
            area,
            category:categories (name),
            town:towns (name)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const savedListings: SavedListing[] = [];
        const savedBusinesses: SavedBusiness[] = [];

        (data as unknown as FavouriteRow[]).forEach((row) => {
          if (row.listing) savedListings.push(row.listing);
          if (row.business) savedBusinesses.push(row.business);
        });

        setListings(savedListings);
        setBusinesses(savedBusinesses);
      }
    } catch (err) {
      console.error("Failed to load favourites:", err);
      toast.error("Could not load saved favourites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavourites();
  }, [user]);

  const removeListing = async (listingId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("favourites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (error) throw error;
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      toast.success("Removed from saved stays.");
    } catch {
      toast.error("Failed to remove favourite.");
    }
  };

  const removeBusiness = async (businessId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("favourites")
        .delete()
        .eq("user_id", user.id)
        .eq("business_id", businessId);

      if (error) throw error;
      setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
      toast.success("Removed from saved businesses.");
    } catch {
      toast.error("Failed to remove favourite.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            <span>Saved Favourites</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Keep track of student boarding houses, private apartments, and campus services you like.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("listings")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[40px] ${
              activeTab === "listings"
                ? "bg-surface text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Stays ({listings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("businesses")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[40px] ${
              activeTab === "businesses"
                ? "bg-surface text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Shops ({businesses.length})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl bg-surface border border-border p-4 space-y-3 animate-pulse">
              <div className="aspect-4/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : activeTab === "listings" ? (
        listings.length === 0 ? (
          <div className="p-12 text-center bg-surface rounded-2xl border border-border space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No saved stays yet</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              When exploring student accommodation, tap the heart icon on any listing to bookmark it here for easy comparison.
            </p>
            <div className="pt-2">
              <Link
                to="/accommodation"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold transition-colors min-h-[44px]"
              >
                Browse Stays
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => {
              const imagePath = listing.accommodation_images?.[0]?.storage_path;
              const imageUrl = imagePath
                ? getPublicStorageUrl("listing-images", imagePath)
                : null;
              const typeLabel =
                LISTING_TYPES.find((t) => t.value === listing.listing_type)?.label ||
                listing.listing_type.replace(/_/g, " ");

              return (
                <div
                  key={listing.id}
                  className="group bg-surface rounded-2xl border border-border overflow-hidden shadow-xs hover:border-brand-500 transition-all flex flex-col"
                >
                  <div className="relative aspect-4/3 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted">
                        <Building2 className="w-10 h-10 opacity-40" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeListing(listing.id)}
                      title="Remove from favourites"
                      aria-label="Remove from favourites"
                      className="absolute top-2.5 right-2.5 p-2 rounded-full bg-surface/90 backdrop-blur-xs text-rose-500 hover:bg-white transition-colors shadow-xs cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-base font-black text-brand-700 dark:text-brand-300">
                          ZMW {Number(listing.rent_zmw || 0).toLocaleString()}
                          <span className="text-[11px] font-normal text-muted">/mo</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-muted">
                          {typeLabel}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-brand-700 transition-colors">
                        {listing.title}
                      </h4>
                      <p className="text-xs text-muted flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {listing.area}
                          {listing.town?.name ? `, ${listing.town.name}` : ""}
                          {listing.campus?.short_name ? ` (${listing.campus.short_name})` : ""}
                        </span>
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-border flex items-center justify-end">
                      <Link
                        to={`/accommodation/${listing.id}`}
                        className="text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : businesses.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-2xl border border-border space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No saved shops yet</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Save student barbers, printers, food vendors and groceries around campus to quickly access their catalogues.
          </p>
          <div className="pt-2">
            <Link
              to="/shops"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold transition-colors min-h-[44px]"
            >
              Explore Campus Shops
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((biz) => {
            const logoUrl = biz.logo_path
              ? getPublicStorageUrl("business-images", biz.logo_path)
              : null;

            return (
              <div
                key={biz.id}
                className="group bg-surface rounded-2xl border border-border p-4 shadow-xs hover:border-brand-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-border">
                      {logoUrl ? (
                        <img src={logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-muted" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBusiness(biz.id)}
                      title="Remove from favourites"
                      aria-label="Remove from favourites"
                      className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    {biz.category?.name || "Business"} • {biz.area}{biz.town?.name ? `, ${biz.town.name}` : ""}
                  </span>
                  <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-brand-700 transition-colors">
                    {biz.name}
                  </h4>
                  {biz.description && (
                    <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">
                      {biz.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-border flex items-center justify-end">
                  <Link
                    to={`/shops/${biz.slug}`}
                    className="text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline flex items-center gap-1"
                  >
                    <span>Visit Shop</span>
                    <ExternalLink className="w-3 h-3" />
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
export default DashboardFavourites;
