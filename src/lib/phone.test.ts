import { describe, it, expect } from "vitest";
import { toZambianE164, whatsAppUrl } from "./phone";

describe("toZambianE164", () => {
  it("normalizes standard 10-digit local format with leading 0", () => {
    expect(toZambianE164("0971234567")).toBe("+260971234567");
    expect(toZambianE164("0761234567")).toBe("+260761234567");
  });

  it("normalizes 9-digit format without leading 0", () => {
    expect(toZambianE164("971234567")).toBe("+260971234567");
  });

  it("normalizes international +260 format", () => {
    expect(toZambianE164("+260971234567")).toBe("+260971234567");
  });

  it("normalizes spaced formats", () => {
    expect(toZambianE164("260 97 123 4567")).toBe("+260971234567");
    expect(toZambianE164("+260 97 123 4567")).toBe("+260971234567");
    expect(toZambianE164("097 123 4567")).toBe("+260971234567");
  });

  it("normalizes leading 00 international prefix", () => {
    expect(toZambianE164("00260971234567")).toBe("+260971234567");
  });

  it("rejects too short numbers", () => {
    expect(toZambianE164("097123")).toBeNull();
    expect(toZambianE164("12345")).toBeNull();
  });

  it("rejects too long numbers", () => {
    expect(toZambianE164("0971234567890")).toBeNull();
  });

  it("rejects non-numeric letters and special chars without digits", () => {
    expect(toZambianE164("abcdefgh")).toBeNull();
    expect(toZambianE164("!@#$%^&*()")).toBeNull();
  });

  it("rejects empty strings and whitespace", () => {
    expect(toZambianE164("")).toBeNull();
    expect(toZambianE164("   ")).toBeNull();
  });

  it("rejects foreign numbers", () => {
    expect(toZambianE164("+14155552671")).toBeNull();
    expect(toZambianE164("+254712345678")).toBeNull();
    expect(toZambianE164("+27821234567")).toBeNull();
  });
});

describe("whatsAppUrl", () => {
  it("generates correct wa.me link with encoded message for valid numbers", () => {
    const url = whatsAppUrl("0971234567", "Hello! Is this room still available?");
    expect(url).toBe("https://wa.me/260971234567?text=Hello!%20Is%20this%20room%20still%20available%3F");
  });

  it("returns null for invalid phone numbers", () => {
    expect(whatsAppUrl("invalid-phone", "Hello")).toBeNull();
  });
});
