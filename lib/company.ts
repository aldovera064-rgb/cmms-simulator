import { supabase } from "@/lib/supabase";
import { SessionCompany } from "@/types/session";

export const ACTIVE_COMPANY_COOKIE = "cmms-company";
export const LEGACY_COMPANY_ID = "legacy-global";

type CompanyRow = {
  id: string;
  name: string | null;
  created_by?: string | null;
  created_at?: string | null;
};

type UserCompanyJoinRow = {
  company_id: string | null;
  role: string | null;
  companies:
    | {
        id: string;
        name: string | null;
      }
    | {
        id: string;
        name: string | null;
      }[]
    | null;
};

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const entry = document.cookie.split("; ").find((item) => item.startsWith(`${name}=`));
  if (!entry) return "";
  return decodeURIComponent(entry.slice(name.length + 1));
}

export function readActiveCompanyCookie() {
  return readCookie(ACTIVE_COMPANY_COOKIE) || null;
}

export function writeActiveCompanyCookie(companyId: string | null) {
  if (typeof document === "undefined") return;

  if (!companyId) {
    document.cookie = `${ACTIVE_COMPANY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  document.cookie = `${ACTIVE_COMPANY_COOKIE}=${encodeURIComponent(companyId)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function pickActiveCompanyId(companies: SessionCompany[], preferredCompanyId?: string | null) {
  if (preferredCompanyId && companies.some((company) => company.id === preferredCompanyId)) {
    return preferredCompanyId;
  }

  return companies[0]?.id ?? null;
}

export function isLegacyCompanyId(companyId: string | null | undefined) {
  return companyId === LEGACY_COMPANY_ID;
}

export function getScopedCompanyId(companyId: string | null | undefined) {
  if (!companyId || isLegacyCompanyId(companyId)) {
    return null;
  }

  return companyId;
}

export function getCompanyName(companies: SessionCompany[] | undefined, companyId: string | null | undefined) {
  if (!companies || !companyId) return "";
  return companies.find((company) => company.id === companyId)?.name ?? "";
}

export function applyCompanyFilter<TQuery extends { eq: (column: string, value: string) => TQuery }>(
  query: TQuery,
  activeCompanyId: string | null | undefined
) {
  const scopedCompanyId = getScopedCompanyId(activeCompanyId);
  if (!scopedCompanyId) {
    return query;
  }

  return query.eq("company_id", scopedCompanyId);
}

function isMissingTenantInfrastructure(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("companies") ||
    normalized.includes("user_companies") ||
    normalized.includes("company_id") ||
    normalized.includes("relationship") ||
    normalized.includes("schema cache")
  );
}

export async function loadAccessibleCompanies(userId: string, role: string | null | undefined) {
  if (!userId) return [];

  if (role === "god") {
    const { data, error } = await supabase.from("companies").select("id, name").order("name", { ascending: true });
    if (error) {
      if (isMissingTenantInfrastructure(error.message)) {
        return [{ id: LEGACY_COMPANY_ID, name: "Vista global", role: "god" }];
      }
      return [];
    }

    return ((data ?? []) as CompanyRow[]).map((company) => ({
      id: company.id,
      name: company.name ?? "Sin nombre",
      role: "god"
    }));
  }

  const { data, error } = await supabase
    .from("user_companies")
    .select("company_id, role, companies:company_id(id, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTenantInfrastructure(error.message)) {
      return [{ id: LEGACY_COMPANY_ID, name: "Vista global", role: role ?? "admin" }];
    }
    return [];
  }

  return ((data ?? []) as UserCompanyJoinRow[])
    .map((row) => {
      const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
      if (!row.company_id || !company?.id) return null;

      return {
        id: company.id,
        name: company.name ?? "Sin nombre",
        role: row.role ?? "viewer"
      };
    })
    .filter((company): company is SessionCompany => Boolean(company));
}
