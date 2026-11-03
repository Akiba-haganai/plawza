import { describe, it, expect } from "vitest";
import {
  escapeHtmlAttr,
  buildListingOgMetadata,
  buildShopOgMetadata,
  injectOgTagsIntoHtml
} from "./ogPreview";

describe("ogPreview — WhatsApp & Social OpenGraph Tag Injection", () => {
  const SUPABASE_URL = "https://tcxnlleyhxcpdvchlybl.supabase.co";
  const SITE_URL = "https://plawza.akiba-hara.workers.dev";

  it("escapes HTML special characters safely", () => {
    expect(escapeHtmlAttr(`"Luxury" & <Cozy> 'Room'\nLine 2`)).toBe(
      "&quot;Luxury&quot; &amp; &lt;Cozy&gt; &#39;Room&#39; Line 2"
    );
  });

  it("builds listing OG metadata with primary image sorted by sort_order", () => {
    const meta = buildListingOgMetadata(
      {
        id: "11111111-2222-3333-4444-555555555555",
        title: "2-Bed Boarding House",
        description: "Solar backup and borehole water included.",
        rent_zmw: 2500,
        area: "Riverside",
        availability: "available",
        town: { name: "Kitwe" },
        campus: { short_name: "CBU", name: "Copperbelt University" },
        accommodation_images: [
          { storage_path: "u1/img2.webp", sort_order: 2 },
          { storage_path: "u1/img1.webp", sort_order: 0 }
        ]
      },
      SUPABASE_URL,
      SITE_URL
    );

    expect(meta.title).toContain("2-Bed Boarding House");
    expect(meta.title).toContain("ZMW 2,500/mo");
    expect(meta.description).toContain("Available now • Riverside, Kitwe (Near CBU)");
    expect(meta.imageUrl).toBe(
      "https://tcxnlleyhxcpdvchlybl.supabase.co/storage/v1/object/public/listing-images/u1/img1.webp"
    );
    expect(meta.canonicalUrl).toBe(
      "https://plawza.akiba-hara.workers.dev/accommodation/11111111-2222-3333-4444-555555555555"
    );
  });

  it("falls back to default Plawza OG image when a listing has no photos", () => {
    const meta = buildListingOgMetadata(
      {
        id: "11111111-2222-3333-4444-555555555555",
        title: "Single Room",
        rent_zmw: 1200,
        area: "Handsworth",
        accommodation_images: []
      },
      SUPABASE_URL,
      SITE_URL
    );

    expect(meta.imageUrl).toBe("https://plawza.akiba-hara.workers.dev/brand/og-image.png");
  });

  it("builds shop OG metadata using cover_path or logo_path", () => {
    const meta = buildShopOgMetadata(
      {
        id: "aaaa-bbbb",
        name: "Campus Prints & Stationery",
        slug: "campus-prints-kitwe",
        description: "Fast dissertation binding and colour printing.",
        area: "Jambo Drive",
        logo_path: "u2/logo.webp",
        cover_path: "u2/cover.webp",
        town: { name: "Kitwe" },
        category: { name: "Printing & Stationery" }
      },
      SUPABASE_URL,
      SITE_URL
    );

    expect(meta.title).toBe(
      "Campus Prints & Stationery — Printing & Stationery in Jambo Drive, Kitwe | PLAWZA"
    );
    expect(meta.description).toContain("Fast dissertation binding");
    expect(meta.imageUrl).toBe(
      "https://tcxnlleyhxcpdvchlybl.supabase.co/storage/v1/object/public/business-images/u2/cover.webp"
    );
    expect(meta.canonicalUrl).toBe(
      "https://plawza.akiba-hara.workers.dev/shops/campus-prints-kitwe"
    );
  });

  it("injects OpenGraph and Twitter meta tags into index.html template", () => {
    const sampleHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta name="description" content="Default description" />
    <link rel="canonical" href="https://plawza.akiba-hara.workers.dev/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://plawza.akiba-hara.workers.dev/" />
    <meta property="og:title" content="PLAWZA — A Digital Plaza for Everyone" />
    <meta property="og:description" content="Default OG description" />
    <meta property="og:image" content="https://plawza.akiba-hara.workers.dev/brand/og-image.png" />
    <meta name="twitter:title" content="PLAWZA — A Digital Plaza for Everyone" />
    <meta name="twitter:description" content="Default Twitter description" />
    <meta name="twitter:image" content="https://plawza.akiba-hara.workers.dev/brand/og-image.png" />
    <title>PLAWZA — A Digital Plaza for Everyone</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

    const injected = injectOgTagsIntoHtml(sampleHtml, {
      title: `Chanda's "Solar" Flat — ZMW 3,000/mo | PLAWZA`,
      description: "Available • Kalundu, Lusaka",
      imageUrl: "https://tcxnlleyhxcpdvchlybl.supabase.co/storage/v1/object/public/listing-images/pic.webp",
      canonicalUrl: "https://plawza.akiba-hara.workers.dev/accommodation/abc-123"
    });

    expect(injected).toContain(
      `<title>Chanda&#39;s &quot;Solar&quot; Flat — ZMW 3,000/mo | PLAWZA</title>`
    );
    expect(injected).toContain(
      `<meta property="og:title" content="Chanda&#39;s &quot;Solar&quot; Flat — ZMW 3,000/mo | PLAWZA" />`
    );
    expect(injected).toContain(
      `<meta property="og:image" content="https://tcxnlleyhxcpdvchlybl.supabase.co/storage/v1/object/public/listing-images/pic.webp" />`
    );
    expect(injected).toContain(
      `<meta property="og:url" content="https://plawza.akiba-hara.workers.dev/accommodation/abc-123" />`
    );
  });
});
