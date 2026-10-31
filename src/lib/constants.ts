export const LISTING_TYPES = [
  { value: "room", label: "Single Room" },
  { value: "shared_room", label: "Shared Room" },
  { value: "bedsitter", label: "Bedsitter / Studio" },
  { value: "flat", label: "Apartment / Flat" },
  { value: "house", label: "Standalone House" },
  { value: "hostel", label: "Student Hostel / Boarding" }
] as const;

export const UTILITIES_VOCABULARY = [
  { value: "water", label: "Water Included" },
  { value: "electricity", label: "Electricity Included" },
  { value: "wifi", label: "Wi-Fi Included" },
  { value: "security", label: "Security Guard Included" },
  { value: "refuse", label: "Garbage Collection" }
] as const;

export const AMENITIES_VOCABULARY = [
  { value: "wifi", label: "Wi-Fi Internet" },
  { value: "solar_backup", label: "Solar Power Backup" },
  { value: "generator", label: "Generator Backup" },
  { value: "borehole", label: "Borehole Water" },
  { value: "water_tank", label: "Reserve Water Tank" },
  { value: "prepaid_electricity", label: "Separate ZESCO Meter" },
  { value: "walled_fenced", label: "Wall Fence & Gate" },
  { value: "security_guard", label: "24/7 Security Guard" },
  { value: "private_bathroom", label: "Self-Contained (Private Bath)" },
  { value: "shared_bathroom", label: "Shared Bathroom" },
  { value: "kitchen", label: "Kitchen Access" },
  { value: "tiled_floor", label: "Tiled Flooring" },
  { value: "parking", label: "Secure Vehicle Parking" },
  { value: "study_area", label: "Quiet Study Desk / Area" },
  { value: "near_transport", label: "Near Minibus / Taxi Stop" },
  { value: "laundry_area", label: "Outdoor Laundry Basin" }
] as const;

export const REPORT_REASONS = [
  { value: "scam", label: "Suspected Scam or Upfront Money Demand" },
  { value: "unavailable", label: "Property Already Occupied / Unavailable" },
  { value: "misleading", label: "Misleading Photos or Information" },
  { value: "wrong_info", label: "Incorrect Price or Contact Info" },
  { value: "inappropriate", label: "Inappropriate or Offensive Content" },
  { value: "other", label: "Other Safety / Policy Issue" }
] as const;

// Roommate Lifestyle & Practical Preferences
export const ROOM_SHARING_OPTIONS = [
  { value: "own_room", label: "Own Private Room" },
  { value: "share_room", label: "Share Same Room" },
  { value: "either", label: "Either / Flexible" }
] as const;

export const NOISE_LEVEL_OPTIONS = [
  { value: "quiet", label: "Quiet / Study Focus" },
  { value: "moderate", label: "Moderate" },
  { value: "lively", label: "Lively / Social" }
] as const;

export const STUDY_ROUTINE_OPTIONS = [
  { value: "early", label: "Early Bird" },
  { value: "night", label: "Night Owl" },
  { value: "flexible", label: "Flexible Schedule" }
] as const;

export const TIDINESS_OPTIONS = [
  { value: "very_tidy", label: "Very Tidy" },
  { value: "average", label: "Average" },
  { value: "relaxed", label: "Relaxed" }
] as const;

export const GUESTS_OPTIONS = [
  { value: "rarely", label: "Rarely (Quiet space)" },
  { value: "sometimes", label: "Occasionally" },
  { value: "often", label: "Frequently (Friends visit)" }
] as const;

export const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Prefer not to say" }
] as const;

export const GENDER_PREF_OPTIONS = [
  { value: "any", label: "Any Gender" },
  { value: "same", label: "Same Gender Only" }
] as const;
