import { PRODUCTION_SITE_URL } from "./supabase";
export { PRODUCTION_SITE_URL };

export interface OgMetadata {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  type?: "website" | "article" | "profile";
}

export interface ListingOgSource {
  id: string;
  title: string;
  description?: string | null;
  listing_type?: string | null;
  rent_zmw: number;
  area: string;
  availability?: string | null;
  town?: { name: string } | null;
  campus?: { short_name?: string | null; name: string } | null;
  accommodation_images?: Array<{ storage_path: string; sort_order?: number | null }> | null;
}

export interface ShopOgSource {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  area: string;
  logo_path?: string | null;
  cover_path?: string | null;
  town?: { name: string } | null;
  category?: { name: string } | null;
}

/**
 * Escapes untrusted database strings before injecting into HTML <title> or <meta content="..."> attributes.
 */
export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n|\r/g, " ")
    .trim();
}

/**
 * Formats an accommodation listing into WhatsApp / social OpenGraph metadata.
 */
export function buildListingOgMetadata(
  listing: ListingOgSource,
  supabaseUrl: string,
  siteOrigin: string = PRODUCTION_SITE_URL
): OgMetadata {
  const cleanOrigin = siteOrigin.replace(/\/+$/, "");
  const cleanSupabase = supabaseUrl.replace(/\/+$/, "");

  const rentFormatted = `ZMW ${Number(listing.rent_zmw || 0).toLocaleString()}/mo`;
  const townName = listing.town?.name ? `, ${listing.town.name}` : "";
  const campusLabel = listing.campus?.short_name || listing.campus?.name;
  const campusSuffix = campusLabel ? ` (Near ${campusLabel})` : "";

  const title = `${listing.title} — ${rentFormatted} | PLAWZA`;

  const statusText =
    listing.availability === "available"
      ? "Available now"
      : listing.availability
        ? `Status: ${listing.availability}`
        : "Student & community stay";

  const locationSummary = `${statusText} • ${listing.area}${townName}${campusSuffix}`;
  const rawDesc = listing.description ? listing.description.replace(/\s+/g, " ").trim() : "";
  const description = rawDesc
    ? `${locationSummary} — ${rawDesc.slice(0, 160)}${rawDesc.length > 160 ? "…" : ""}`
    : `${locationSummary}. View photos, rent split, and request a viewing on Plawza.`;

  // Pick first image by sort_order
  const sortedImages = [...(listing.accommodation_images || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const primaryPath = sortedImages[0]?.storage_path;
  const imageUrl = primaryPath
    ? `${cleanSupabase}/storage/v1/object/public/listing-images/${primaryPath}`
    : `${cleanOrigin}/brand/og-image.png`;

  return {
    title,
    description,
    imageUrl,
    canonicalUrl: `${cleanOrigin}/accommodation/${encodeURIComponent(listing.id)}`,
    type: "website"
  };
}

/**
 * Formats a campus business / shop into WhatsApp / social OpenGraph metadata.
 */
export function buildShopOgMetadata(
  shop: ShopOgSource,
  supabaseUrl: string,
  siteOrigin: string = PRODUCTION_SITE_URL
): OgMetadata {
  const cleanOrigin = siteOrigin.replace(/\/+$/, "");
  const cleanSupabase = supabaseUrl.replace(/\/+$/, "");

  const categoryLabel = shop.category?.name || "Local Shop";
  const townName = shop.town?.name ? `, ${shop.town.name}` : "";
  const title = `${shop.name} — ${categoryLabel} in ${shop.area}${townName} | PLAWZA`;

  const rawDesc = shop.description ? shop.description.replace(/\s+/g, " ").trim() : "";
  const description = rawDesc
    ? `${rawDesc.slice(0, 180)}${rawDesc.length > 180 ? "…" : ""}`
    : `Browse ${shop.name}'s catalogue, prices in ZMW, and order directly on WhatsApp via Plawza.`;

  const chosenImagePath = shop.cover_path || shop.logo_path;
  const imageUrl = chosenImagePath
    ? `${cleanSupabase}/storage/v1/object/public/business-images/${chosenImagePath}`
    : `${cleanOrigin}/brand/og-image.png`;

  return {
    title,
    description,
    imageUrl,
    canonicalUrl: `${cleanOrigin}/shops/${encodeURIComponent(shop.slug)}`,
    type: "website"
  };
}

/**
 * Injects dynamic OpenGraph, Twitter Card, canonical URL, and <title> tags into index.html.
 */
export function injectOgTagsIntoHtml(html: string, meta: OgMetadata): string {
  const safeTitle = escapeHtmlAttr(meta.title);
  const safeDesc = escapeHtmlAttr(meta.description);
  const safeImage = escapeHtmlAttr(meta.imageUrl);
  const safeUrl = escapeHtmlAttr(meta.canonicalUrl);
  const safeType = escapeHtmlAttr(meta.type || "website");

  let result = html;

  // Replace <title>...</title>
  result = result.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);

  // Replace meta description
  result = result.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${safeDesc}" />`
  );

  // Replace canonical link
  result = result.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${safeUrl}" />`
  );

  // Replace Open Graph tags
  result = result.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${safeType}" />`
  );
  result = result.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${safeUrl}" />`
  );
  result = result.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  result = result.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  result = result.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${safeImage}" />`
  );

  // Replace Twitter tags
  result = result.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  result = result.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );
  result = result.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${safeImage}" />`
  );

  return result;
}
