import { supabase } from "@/lib/supabase";
import { SessionCompany, SessionRole } from "@/types/session";

export const ACTIVE_COMPANY_COOKIE = "cmms-company";

type CompanyRow = {
  id: string;
  name: string | null;
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

export function pickActiveCompanyId(
  companies: SessionCompany[],
  role: SessionRole,
  preferredCompanyId?: string | null,
  fallbackCompanyId?: string | null
) {
  if (preferredCompanyId && companies.some((company) => company.id === preferredCompanyId)) {
    return preferredCompanyId;
  }

  if (role === "god") {
    return null;
  }

  if (fallbackCompanyId && companies.some((company) => company.id === fallbackCompanyId)) {
    return fallbackCompanyId;
  }

  return companies[0]?.id ?? null;
}

export function getScopedCompanyId(companyId: string | null | undefined) {
  return companyId ?? null;
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

export async function loadAccessibleCompanies(userId: string, role: string | null | undefined) {
  if (!userId) return [];

  if (role === "god") {
    const { data, error } = await supabase.from("companies").select("id, name").order("name", { ascending: true });
    if (error) return [];

    return ((data ?? []) as CompanyRow[]).map((company) => ({
      id: company.id,
      name: company.name ?? "Sample 1",
      role: "god"
    }));
  }

  const { data, error } = await supabase
    .from("user_companies")
    .select("company_id, role, companies:company_id(id, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return [];

  return ((data ?? []) as UserCompanyJoinRow[])
    .map((row) => {
      const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
      if (!row.company_id || !company?.id) return null;

      return {
        id: company.id,
        name: company.name ?? "Sample 1",
        role: row.role ?? "viewer"
      };
    })
    .filter((company): company is SessionCompany => Boolean(company));
}

export async function loadFirstAssignedCompanyId(userId: string) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_companies")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data?.company_id as string | null | undefined) ?? null;
}
