/**
 * Normalizes an input phone string into Zambian E.164 (+260XXXXXXXXX) format.
 * Valid Zambian mobile numbers consist of country code 260 followed by 9 digits starting with 1-9 (e.g. 7 or 9 for Airtel/MTN/Zamtel).
 */
export function toZambianE164(input: string): string | null {
  const raw = input.replace(/\D/g, "").replace(/^00/, "");
  const n = raw.startsWith("260")
    ? raw
    : raw.startsWith("0")
      ? `260${raw.slice(1)}`
      : raw.length === 9
        ? `260${raw}`
        : "";
  return /^260[1-9]\d{8}$/.test(n) ? `+${n}` : null;
}

/**
 * Creates a valid, sanitized WhatsApp URL for Zambian phone numbers.
 * wa.me requires phone number without leading '+' or symbols.
 */
export function whatsAppUrl(phone: string, message: string): string | null {
  const e164 = toZambianE164(phone);
  return e164 ? `https://wa.me/${e164.slice(1)}?text=${encodeURIComponent(message)}` : null;
}
