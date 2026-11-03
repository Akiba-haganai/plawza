import { describe, it, expect } from "vitest";
import { generateQrMatrix } from "./qrCode";
import { PRODUCTION_SITE_URL } from "./ogPreview";

describe("generateQrMatrix", () => {
  it("generates a square QR matrix with intact 7x7 finder patterns for a short URL", () => {
    const matrix = generateQrMatrix("https://plawza.akiba-hara.workers.dev");
    expect(matrix.length).toBe(29); // Version 3 (29x29)
    expect(matrix[0]?.length).toBe(29);

    // Top-left 7x7 finder pattern outer corners and center 3x3 should be dark
    expect(matrix[0]?.[0]).toBe(true);
    expect(matrix[0]?.[6]).toBe(true);
    expect(matrix[6]?.[0]).toBe(true);
    expect(matrix[6]?.[6]).toBe(true);
    expect(matrix[3]?.[3]).toBe(true);
    // Separator row/col 7 should be light
    expect(matrix[7]?.[0]).toBe(false);
    expect(matrix[0]?.[7]).toBe(false);
  });

  it("encodes full Plawza accommodation UUID URLs without throwing", () => {
    const url = `${PRODUCTION_SITE_URL}/accommodation/123e4567-e89b-12d3-a456-426614174000`;
    const matrix = generateQrMatrix(url);
    expect(matrix.length).toBeGreaterThanOrEqual(33);
    expect(matrix.length).toBe(matrix[0]?.length);
  });

  it("throws when payload exceeds maximum supported byte length", () => {
    const huge = "https://example.com/" + "a".repeat(200);
    expect(() => generateQrMatrix(huge)).toThrow(/QR payload too long/);
  });
});
