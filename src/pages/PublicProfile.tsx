import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Building2,
  Store,
  MapPin,
  Calendar,
  ShieldCheck,
  Phone,
  MessageCircle,
    Share2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/common/Avatar";
import { getPublicStorageUrl } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Listing = Database["public"]["Tables"]["accommodation_listings"]["Row"] & {
  accommodation_images: { storage_path: string }[];
  campus?: { short_name: string; name: string } | null;
  town?: { name: string } | null;
};
type Business = Database["public"]["Tables"]["businesses"]["Row"] & {
  category?: { name: string } | null;
  town?: { name: string } | null;
};

export const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stays" | "businesses">("stays");

  useEffect(() => {
    if (!id) return;
    const profileId: string = id;

    async function loadPublicData() {
      setLoading(true);
      try {
        const [profRes, verifRes, staysRes, bizRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
          supabase.from("verifications").select("id").eq("profile_id", profileId).is("revoked_at", null).maybeSingle(),
          supabase
            .from("accommodation_listings")
            .select(`
              *,
              accommodation_images (storage_path),
              campus:campuses (short_name, name),
              town:towns (name)
            `)
            .eq("owner_id", profileId)
            .eq("status", "active")
            .order("created_at", { ascending: false }),
          supabase
            .from("businesses")
            .select(`
              *,
              category:categories (name),
              town:towns (name)
            `)
            .eq("owner_id", profileId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
        ]);

        if (profRes.data) setProfile(profRes.data);
        setIsVerified(Boolean(verifRes.data));
        if (staysRes.data) setListings(staysRes.data as any);
        if (bizRes.data) setBusinesses(bizRes.data as any);
      } catch (err) {
        console.error("Failed to load public profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, [id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name || "Member"} on Plawza`,
          url: window.location.href
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-xs text-muted">
        Loading member profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center bg-surface rounded-2xl border border-border space-y-3">
        <h2 className="text-lg font-bold text-foreground">Member Not Found</h2>
        <p className="text-xs text-muted">
          This user profile either does not exist or has been removed.
        </p>
        <Link
          to="/"
          className="inline-block mt-2 px-4 py-2 rounded-lg bg-brand-700 text-white text-xs font-bold"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const displayName = profile.full_name?.trim() || "Plawza Member";
  const avatarSource = profile.avatar_path || profile.avatar_url;
  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long"
  });

  const canViewPhone =
    profile.contact_visibility === "public" ||
    (profile.contact_visibility === "verified_only" && Boolean(user)) ||
    user?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Profile Header Banner */}
      <div className="p-6 sm:p-8 bg-surface rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <Avatar src={avatarSource} name={displayName} size="2xl" showBorder />

        <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-foreground">{displayName}</h1>
                {isVerified && (
                  <span
                    title="Verified Plawza Member"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted flex items-center justify-center sm:justify-start gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Member since {memberSince}</span>
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors self-center sm:self-start cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>

          {profile.bio && (
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
              {profile.bio}
            </p>
          )}

          {/* Contact button if allowed */}
          {profile.phone && canViewPhone && (
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <a
                href={`https://wa.me/${profile.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>

              <a
                href={`tel:${profile.phone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-muted" />
                <span>{profile.phone}</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Listings / Content Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("stays")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "stays"
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Stays ({listings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("businesses")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "businesses"
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Campus Shops ({businesses.length})</span>
            </button>
          </div>
        </div>

        {activeTab === "stays" ? (
          listings.length === 0 ? (
            <div className="p-8 text-center bg-surface rounded-2xl border border-border text-xs text-muted">
              No active accommodation stays listed by this member.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((item) => {
                const imagePath = item.accommodation_images?.[0]?.storage_path;
                const imageUrl = imagePath
                  ? getPublicStorageUrl("listing-images", imagePath)
                  : null;

                return (
                  <Link
                    key={item.id}
                    to={`/accommodation/${item.id}`}
                    className="group bg-surface rounded-2xl border border-border overflow-hidden shadow-xs hover:border-brand-500 transition-all flex flex-col"
                  >
                    <div className="relative aspect-4/3 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted">
                          <Building2 className="w-10 h-10 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-base font-black text-brand-700 dark:text-brand-300 block mb-1">
                          ZMW {item.rent_zmw.toLocaleString()}
                          <span className="text-[11px] font-normal text-muted">/mo</span>
                        </span>
                        <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-brand-700 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {item.campus?.short_name || item.campus?.name || item.town?.name || "Zambia"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : businesses.length === 0 ? (
          <div className="p-8 text-center bg-surface rounded-2xl border border-border text-xs text-muted">
            No active campus shops or businesses listed by this member.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((biz) => {
              const logoUrl = biz.logo_path
                ? getPublicStorageUrl("business-images", biz.logo_path)
                : null;

              return (
                <Link
                  key={biz.id}
                  to={`/shops/${biz.slug}`}
                  className="group bg-surface rounded-2xl border border-border p-4 shadow-xs hover:border-brand-500 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-border mb-3">
                      {logoUrl ? (
                        <img src={logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-muted" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                      {biz.category?.name || "Business"} • {biz.town?.name || "Campus"}
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
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default PublicProfile;
