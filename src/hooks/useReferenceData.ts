import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Town = Database["public"]["Tables"]["towns"]["Row"];
type Campus = Database["public"]["Tables"]["campuses"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

interface ReferenceData {
  towns: Town[];
  campuses: Campus[];
  categories: Category[];
}

// One shared request for the whole session: reference data rarely changes, and
// every page uses it, so fetching it per component wastes slow mobile data.
let cache: ReferenceData | null = null;
let inFlight: Promise<ReferenceData> | null = null;

async function fetchReferenceData(): Promise<ReferenceData> {
  const [townsRes, campusesRes, categoriesRes] = await Promise.all([
    supabase.from("towns").select("*").order("name", { ascending: true }),
    supabase.from("campuses").select("*").order("name", { ascending: true }),
    supabase.from("categories").select("*").order("sort_order", { ascending: true })
  ]);

  const failure = townsRes.error ?? campusesRes.error ?? categoriesRes.error;
  if (failure) throw new Error(failure.message);

  return {
    towns: townsRes.data ?? [],
    campuses: campusesRes.data ?? [],
    categories: categoriesRes.data ?? []
  };
}

function loadReferenceData(): Promise<ReferenceData> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = fetchReferenceData()
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        inFlight = null; // allow a retry after a failure
      });
  }
  return inFlight;
}

export function useReferenceData() {
  const [data, setData] = useState<ReferenceData>(cache ?? { towns: [], campuses: [], categories: [] });
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let mounted = true;

    loadReferenceData()
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((err: unknown) => {
        console.error("Failed to load reference data:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { towns: data.towns, campuses: data.campuses, categories: data.categories, loading };
}
