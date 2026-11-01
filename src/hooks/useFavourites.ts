import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useFavourites() {
  const { user } = useAuth();
  const [favouriteListingIds, setFavouriteListingIds] = useState<Set<string>>(new Set());
  const [favouriteBusinessIds, setFavouriteBusinessIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadFavourites = useCallback(async () => {
    if (!user) {
      setFavouriteListingIds(new Set());
      setFavouriteBusinessIds(new Set());
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("favourites")
        .select("id, listing_id, business_id")
        .eq("user_id", user.id);

      if (!error && data) {
        const listingSet = new Set<string>();
        const businessSet = new Set<string>();
        data.forEach((fav) => {
          if (fav.listing_id) listingSet.add(fav.listing_id);
          if (fav.business_id) businessSet.add(fav.business_id);
        });
        setFavouriteListingIds(listingSet);
        setFavouriteBusinessIds(businessSet);
      }
    } catch (err) {
      console.error("Failed to load user favourites:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  const isFavourited = (type: "listing" | "business", id: string): boolean => {
    return type === "listing"
      ? favouriteListingIds.has(id)
      : favouriteBusinessIds.has(id);
  };

  const toggleFavourite = async (type: "listing" | "business", id: string): Promise<boolean> => {
    if (!user) {
      toast.info("Please sign in to save favourites to your account.", {
        action: {
          label: "Sign In",
          onClick: () => {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          }
        }
      });
      return false;
    }

    const currentlySaved = isFavourited(type, id);

    // Optimistic update
    if (type === "listing") {
      setFavouriteListingIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setFavouriteBusinessIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.delete(id);
        else next.add(id);
        return next;
      });
    }

    try {
      if (currentlySaved) {
        // Remove from favourites
        const matchCol = type === "listing" ? "listing_id" : "business_id";
        const { error } = await supabase
          .from("favourites")
          .delete()
          .eq("user_id", user.id)
          .eq(matchCol, id);

        if (error) throw error;
        toast.success("Removed from your saved favourites.");
        return false;
      } else {
        // Add to favourites
        if (type === "listing") {
          const { error } = await supabase.from("favourites").insert({
            user_id: user.id,
            listing_id: id,
            business_id: null
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("favourites").insert({
            user_id: user.id,
            listing_id: null,
            business_id: id
          });
          if (error) throw error;
        }
        toast.success("Saved to your favourites!");
        return true;
      }
    } catch (err) {
      console.error("Failed to toggle favourite:", err);
      // Revert optimistic update
      loadFavourites();
      toast.error("Could not update favourites. Please try again.");
      return currentlySaved;
    }
  };

  return {
    isFavourited,
    toggleFavourite,
    loading,
    refreshFavourites: loadFavourites
  };
}
