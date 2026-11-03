import {
  buildListingOgMetadata,
  buildShopOgMetadata,
  injectOgTagsIntoHtml,
  PRODUCTION_SITE_URL,
  type ListingOgSource,
  type ShopOgSource
} from "../src/lib/ogPreview";

export interface AssetFetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

export interface WorkerEnv {
  ASSETS: AssetFetcher;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

interface CachedSupabaseCreds {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

let cachedCreds: CachedSupabaseCreds | null = null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

async function resolveSupabaseCreds(
  request: Request,
  env: WorkerEnv
): Promise<CachedSupabaseCreds | null> {
  if (cachedCreds) return cachedCreds;

  const directUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const directKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (directUrl && directKey) {
    cachedCreds = { supabaseUrl: directUrl, supabaseAnonKey: directKey };
    return cachedCreds;
  }

  try {
    const envUrl = new URL("/og-env.json", request.url);
    const res = await env.ASSETS.fetch(new Request(envUrl.toString()));
    if (res.ok) {
      const json = (await res.json()) as Partial<CachedSupabaseCreds>;
      if (json.supabaseUrl && json.supabaseAnonKey) {
        cachedCreds = {
          supabaseUrl: json.supabaseUrl,
          supabaseAnonKey: json.supabaseAnonKey
        };
        return cachedCreds;
      }
    }
  } catch {
    // Ignore and return null if og-env.json is unavailable
  }

  return null;
}

async function fetchFromSupabase<T>(
  supabaseUrl: string,
  anonKey: string,
  pathAndQuery: string
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, "");
    const res = await fetch(`${cleanUrl}/rest/v1/${pathAndQuery}`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!res.ok) return null;
    const rows = (await res.json()) as T[];
    return Array.isArray(rows) && rows.length > 0 ? (rows[0] ?? null) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    // Never expose internal build-time OG env helper publicly
    if (pathname === "/og-env.json") {
      return new Response("Not Found", { status: 404 });
    }

    // Fetch the SPA HTML (or static file) from Cloudflare Assets
    const assetResponse = await env.ASSETS.fetch(request);

    // Only rewrite GET/HEAD HTML responses
    if (request.method !== "GET" && request.method !== "HEAD") {
      return assetResponse;
    }
    const contentType = assetResponse.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return assetResponse;
    }

    // Match /accommodation/:id or /shops/:slug
    const accommodationMatch = pathname.match(/^\/accommodation\/([^/]+)$/);
    const shopMatch = pathname.match(/^\/shops\/([^/]+)$/);

    if (!accommodationMatch && !shopMatch) {
      return assetResponse;
    }

    const creds = await resolveSupabaseCreds(request, env);
    if (!creds) {
      return assetResponse;
    }

    const siteOrigin = url.origin || PRODUCTION_SITE_URL;

    try {
      if (accommodationMatch && accommodationMatch[1]) {
        const listingId = decodeURIComponent(accommodationMatch[1]);
        if (!UUID_REGEX.test(listingId)) {
          return assetResponse;
        }

        const query =
          `accommodation_listings?select=id,title,description,listing_type,rent_zmw,area,availability,` +
          `town:towns(name),campus:campuses(short_name,name),accommodation_images(storage_path,sort_order)` +
          `&id=eq.${encodeURIComponent(listingId)}&status=eq.active&limit=1`;

        const listing = await fetchFromSupabase<ListingOgSource>(
          creds.supabaseUrl,
          creds.supabaseAnonKey,
          query
        );

        if (!listing) {
          return assetResponse;
        }

        const html = await assetResponse.text();
        const ogMeta = buildListingOgMetadata(listing, creds.supabaseUrl, siteOrigin);
        const updatedHtml = injectOgTagsIntoHtml(html, ogMeta);

        const headers = new Headers(assetResponse.headers);
        headers.set("Content-Type", "text/html; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=60, s-maxage=300");

        return new Response(updatedHtml, {
          status: assetResponse.status,
          headers
        });
      }

      if (shopMatch && shopMatch[1]) {
        const slug = decodeURIComponent(shopMatch[1]);
        if (!SLUG_REGEX.test(slug)) {
          return assetResponse;
        }

        const query =
          `businesses?select=id,name,slug,description,area,logo_path,cover_path,` +
          `town:towns(name),category:categories(name)` +
          `&slug=eq.${encodeURIComponent(slug)}&status=eq.active&limit=1`;

        const shop = await fetchFromSupabase<ShopOgSource>(
          creds.supabaseUrl,
          creds.supabaseAnonKey,
          query
        );

        if (!shop) {
          return assetResponse;
        }

        const html = await assetResponse.text();
        const ogMeta = buildShopOgMetadata(shop, creds.supabaseUrl, siteOrigin);
        const updatedHtml = injectOgTagsIntoHtml(html, ogMeta);

        const headers = new Headers(assetResponse.headers);
        headers.set("Content-Type", "text/html; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=60, s-maxage=300");

        return new Response(updatedHtml, {
          status: assetResponse.status,
          headers
        });
      }
    } catch {
      // Fallback gracefully to the unmodified SPA HTML if anything goes wrong
      return assetResponse;
    }

    return assetResponse;
  }
};
