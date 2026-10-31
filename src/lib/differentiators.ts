/**
 * Differentiator helper calculations:
 * 1. Confirmation staleness and overdue nudges
 * 2. Rent split calculator
 * 3. WhatsApp share URL builder
 * 4. Landlord reliability median response time calculator
 */

/**
 * Calculates calendar days elapsed since a given ISO timestamp.
 * Returns 0 if dateStr is null or in the future.
 */
export function calculateDaysSince(dateStr: string | null, nowMs: number = Date.now()): number {
  if (!dateStr) return 0;
  const targetMs = new Date(dateStr).getTime();
  if (isNaN(targetMs)) return 0;
  const diffMs = nowMs - targetMs;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines whether a listing is overdue for an availability confirmation nudge.
 * Uses last_confirmed_at if available; falls back to created_at.
 */
export function isConfirmationOverdue(
  lastConfirmedAt: string | null | undefined,
  createdAt: string,
  thresholdDays: number = 14,
  nowMs: number = Date.now()
): boolean {
  const baseDate = lastConfirmedAt || createdAt;
  const days = calculateDaysSince(baseDate, nowMs);
  return days >= thresholdDays;
}

/**
 * Determines whether a listing should display the public "Not recently confirmed" badge (after 30 days).
 */
export function isStaleConfirmation(
  lastConfirmedAt: string | null | undefined,
  createdAt: string,
  thresholdDays: number = 30,
  nowMs: number = Date.now()
): boolean {
  return isConfirmationOverdue(lastConfirmedAt, createdAt, thresholdDays, nowMs);
}

/**
 * Calculates per-person rent split given monthly rent, optional utilities, and number of people.
 * Returns rounded integer ZMW per person.
 */
export function calculateRentSplit(
  rentZmw: number,
  utilitiesZmw: number = 0,
  peopleCount: number = 1
): number {
  const validRent = Math.max(0, rentZmw);
  const validUtils = Math.max(0, utilitiesZmw);
  const validPeople = Math.max(1, Math.floor(peopleCount));
  const total = validRent + validUtils;
  return Math.round(total / validPeople);
}

/**
 * Builds a direct wa.me share link (link-only, no specific recipient phone)
 * allowing users to share properties, shops, and roommate profiles into WhatsApp chats.
 */
export function buildWhatsAppShareUrl(title: string, details: string, url: string): string {
  const cleanTitle = title.trim();
  const cleanDetails = details.trim();
  const cleanUrl = url.trim();

  const lines = [
    cleanTitle ? `*${cleanTitle}*` : "",
    cleanDetails ? cleanDetails : "",
    cleanUrl ? `View on Plawza: ${cleanUrl}` : ""
  ].filter(Boolean);

  const message = lines.join("\n\n");
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export interface EnquiryTimestampRecord {
  created_at: string;
  updated_at?: string | null;
  status: string;
}

/**
 * Calculates the median response time (in hours) for an owner from actual enquiry status changes.
 * Only enquiries that were moved from 'new' to 'contacted' or 'closed' are counted.
 * Returns null if no enquiries have been responded to.
 */
export function calculateMedianResponseHours(
  enquiries: EnquiryTimestampRecord[]
): number | null {
  if (!enquiries || enquiries.length === 0) return null;

  const durationsHours: number[] = [];

  for (const enq of enquiries) {
    // Only count enquiries that have been acted upon (not 'new')
    if (enq.status === "new" || !enq.updated_at) continue;

    const startMs = new Date(enq.created_at).getTime();
    const endMs = new Date(enq.updated_at).getTime();

    if (isNaN(startMs) || isNaN(endMs)) continue;

    const diffHours = Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
    durationsHours.push(diffHours);
  }

  if (durationsHours.length === 0) return null;

  durationsHours.sort((a, b) => a - b);
  const mid = Math.floor(durationsHours.length / 2);

  if (durationsHours.length % 2 === 1) {
    const val = durationsHours[mid] ?? 0;
    return Math.round(val * 10) / 10;
  } else {
    const a = durationsHours[mid - 1] ?? 0;
    const b = durationsHours[mid] ?? 0;
    const avg = (a + b) / 2;
    return Math.round(avg * 10) / 10;
  }
}

/**
 * Formats response hours into a friendly human string (e.g. "within 1 hr", "2.5 hrs", "1.5 days").
 */
export function formatResponseTime(hours: number | null): string {
  if (hours === null || isNaN(hours)) return "No enquiries answered yet";
  if (hours < 1) return "Within 1 hour";
  if (hours < 24) {
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded} ${rounded === 1 ? "hour" : "hours"}`;
  }
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days} ${days === 1 ? "day" : "days"}`;
}
