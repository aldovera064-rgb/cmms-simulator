/**
 * Global date formatting utility.
 * Reads user preferences from localStorage (cmms_date_format, cmms_timezone).
 */

type DateFormatPattern = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";

function getDateFormat(): DateFormatPattern {
  if (typeof window === "undefined") return "YYYY-MM-DD";
  const stored = localStorage.getItem("cmms_date_format");
  if (stored === "DD/MM/YYYY" || stored === "MM/DD/YYYY") return stored;
  return "YYYY-MM-DD";
}

function getTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  return localStorage.getItem("cmms_timezone") || "UTC";
}

/** Parse a date string safely, handling date-only strings to avoid timezone shift */
function safeParse(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (!value) return null;

  // Date-only string (YYYY-MM-DD) → append T00:00:00 to prevent timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date value using the user's global date format and timezone settings.
 * Returns "-" for null/invalid values.
 */
export function formatDateGlobal(value: string | null | Date, includeTime = false): string {
  if (!value) return "-";

  const parsed = safeParse(value);
  if (!parsed) return "-";

  const format = getDateFormat();
  const timezone = getTimezone();

  try {
    const options: Intl.DateTimeFormatOptions = { timeZone: timezone };

    const year = parsed.toLocaleString("en-US", { ...options, year: "numeric" });
    const month = parsed.toLocaleString("en-US", { ...options, month: "2-digit" });
    const day = parsed.toLocaleString("en-US", { ...options, day: "2-digit" });

    let formatted: string;
    switch (format) {
      case "DD/MM/YYYY":
        formatted = `${day}/${month}/${year}`;
        break;
      case "MM/DD/YYYY":
        formatted = `${month}/${day}/${year}`;
        break;
      default:
        formatted = `${year}-${month}-${day}`;
    }

    if (includeTime) {
      const time = parsed.toLocaleString("en-US", {
        ...options,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      formatted += ` ${time}`;
    }

    return formatted;
  } catch {
    // Fallback if timezone is invalid
    return parsed.toLocaleDateString();
  }
}
