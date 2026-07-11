import type { CrmRecord } from "@/types/crm";

const ALLOWED_CRM_STATUSES = new Set([
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
  ""
]);

const ALLOWED_DATA_SOURCES = new Set([
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
  ""
]);

// Map of standard country names, ISO codes, and variations to dial codes
const COUNTRY_TO_DIAL_CODE: Record<string, string> = {
  // Asia & Middle East
  "india": "+91", "in": "+91", "ind": "+91",
  "singapore": "+65", "sg": "+65", "sgp": "+65",
  "malaysia": "+60", "my": "+60", "mys": "+60",
  "united arab emirates": "+971", "uae": "+971", "ae": "+971", "are": "+971",
  "saudi arabia": "+966", "sa": "+966", "sau": "+966",
  "qatar": "+974", "qa": "+974", "qat": "+974",
  "oman": "+968", "om": "+968", "omn": "+968",
  "kuwait": "+965", "kw": "+965", "kwt": "+965",
  "bahrain": "+973", "bh": "+973", "bhr": "+973",
  "hong kong": "+852", "hk": "+852", "hkg": "+852",
  "japan": "+81", "jp": "+81", "jpn": "+81",
  "china": "+86", "cn": "+86", "chn": "+86",
  "south korea": "+82", "kr": "+82", "kor": "+82",
  "thailand": "+66", "th": "+66", "tha": "+66",
  "vietnam": "+84", "vn": "+84", "vnm": "+84",
  "indonesia": "+62", "id": "+62", "idn": "+62",
  "philippines": "+63", "ph": "+63", "phl": "+63",
  "taiwan": "+886", "tw": "+886", "twn": "+886",
  "bangladesh": "+880", "bd": "+880", "bgd": "+880",
  "pakistan": "+92", "pk": "+92", "pak": "+92",
  "sri lanka": "+94", "lk": "+94", "lka": "+94",
  "nepal": "+977", "np": "+977", "npl": "+977",
  "maldives": "+960", "mv": "+960", "mdv": "+960",
  "israel": "+972", "il": "+972", "isr": "+972",
  "turkey": "+90", "tr": "+90", "tur": "+90",
  "russia": "+7", "ru": "+7", "rus": "+7",

  // North America
  "united states": "+1", "usa": "+1", "us": "+1",
  "canada": "+1", "ca": "+1", "can": "+1",
  "mexico": "+52", "mx": "+52", "mex": "+52",

  // Europe
  "united kingdom": "+44", "uk": "+44", "gb": "+44", "gbr": "+44", "england": "+44", "scotland": "+44",
  "germany": "+49", "de": "+49", "deu": "+49",
  "france": "+33", "fr": "+33", "fra": "+33",
  "italy": "+39", "it": "+39", "ita": "+39",
  "spain": "+34", "es": "+34", "esp": "+34",
  "netherlands": "+31", "nl": "+31", "nld": "+31",
  "switzerland": "+41", "ch": "+41", "che": "+41",
  "sweden": "+46", "se": "+46", "swe": "+46",
  "norway": "+47", "no": "+47", "nor": "+47",
  "denmark": "+45", "dk": "+45", "dnk": "+45",
  "finland": "+358", "fi": "+358", "fin": "+358",
  "ireland": "+353", "ie": "+353", "irl": "+353",
  "belgium": "+32", "be": "+32", "bel": "+32",
  "austria": "+43", "at": "+43", "aut": "+43",
  "portugal": "+351", "pt": "+351", "prt": "+351",
  "greece": "+30", "gr": "+30", "grc": "+30",
  "poland": "+48", "pl": "+48", "pol": "+48",
  "ukraine": "+380", "ua": "+380", "ukr": "+380",

  // Oceania
  "australia": "+61", "au": "+61", "aus": "+61",
  "new zealand": "+64", "nz": "+64", "nzl": "+64",

  // South America
  "brazil": "+55", "br": "+55", "bra": "+55",
  "argentina": "+54", "ar": "+54", "arg": "+54",
  "colombia": "+57", "co": "+57", "col": "+57",
  "chile": "+56", "cl": "+56", "chl": "+56",
  "peru": "+51", "pe": "+51", "per": "+51",

  // Africa
  "south africa": "+27", "za": "+27", "zaf": "+27",
  "egypt": "+20", "eg": "+20", "egy": "+20",
  "nigeria": "+234", "ng": "+234", "nga": "+234",
  "kenya": "+254", "ke": "+254", "ken": "+254",
  "morocco": "+212", "ma": "+212", "mar": "+212",
  "ghana": "+233", "gh": "+233", "gha": "+233",
};

/**
 * Validates and sanitizes a single CrmRecord.
 * Mutates invalid fields to blank them out where possible.
 * Returns valid = false if critical contact info is missing.
 */
export function validateRecord(record: CrmRecord): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  let valid = true;

  // 0. Parse & Normalize Phone Number and Country Code
  const rawPhone = record.mobile_without_country_code ? String(record.mobile_without_country_code).trim() : "";
  if (rawPhone) {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length === 10) {
      record.mobile_without_country_code = digits;
      // Infer country code from country field (normalizing to lowercase, stripping dots/punctuation)
      const normCountry = (record.country || "").trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
      record.country_code = COUNTRY_TO_DIAL_CODE[normCountry] || "+91"; // Default to +91 (India)
    } else if (digits.length >= 11 && digits.length <= 15) {
      record.mobile_without_country_code = digits.slice(-10);
      const leftover = digits.slice(0, -10).replace(/^0+/, "");
      if (leftover) {
        record.country_code = `+${leftover}`;
      } else {
        // leftover was just "00" or "0" -> treat as no country code found, infer/default
        const normCountry = (record.country || "").trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
        record.country_code = COUNTRY_TO_DIAL_CODE[normCountry] || "+91"; // Default to +91 (India)
      }
    } else {
      // Fewer than 10 digits, or more than 15 -> do NOT guess. Show raw value, empty country_code, append warning to notes.
      record.mobile_without_country_code = rawPhone;
      record.country_code = "";
      
      const warningMsg = `Unclear phone number: ${rawPhone}`;
      if (record.crm_note) {
        if (!record.crm_note.includes(warningMsg)) {
          record.crm_note = `${record.crm_note}. ${warningMsg}`;
        }
      } else {
        record.crm_note = warningMsg;
      }
      issues.push(`Unclear phone format: "${rawPhone}". Left raw with empty country code.`);
    }
  } else {
    record.mobile_without_country_code = "";
    record.country_code = "";
  }

  // 1. Validate crm_status
  if (!ALLOWED_CRM_STATUSES.has(record.crm_status)) {
    issues.push(`Invalid crm_status: "${record.crm_status}". Blanking it out.`);
    record.crm_status = "";
  }

  // 2. Validate data_source
  if (!ALLOWED_DATA_SOURCES.has(record.data_source)) {
    issues.push(`Invalid data_source: "${record.data_source}". Blanking it out.`);
    record.data_source = "";
  }

  // 3. Validate created_at
  if (record.created_at) {
    const timestamp = Date.parse(record.created_at);
    if (isNaN(timestamp)) {
      issues.push(`Invalid created_at format: "${record.created_at}". Blanking it out.`);
      record.created_at = "";
    }
  }

  // 4. Validate presence of at least email or mobile_without_country_code
  const hasEmail = typeof record.email === "string" && record.email.trim().length > 0;
  const hasPhone = typeof record.mobile_without_country_code === "string" && record.mobile_without_country_code.trim().length > 0;

  if (!hasEmail && !hasPhone) {
    issues.push("Record lacks both email and phone number.");
    valid = false;
  }

  if (issues.length > 0) {
    console.warn(`[Validation Warning] Record index: ${record.name || 'unnamed'} - Issues found:`, issues);
  }

  return { valid, issues };
}
