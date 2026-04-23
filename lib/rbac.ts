export const ROLE_ORDER = ["viewer", "technician", "supervisor", "admin", "god"] as const;

export type UserRole = (typeof ROLE_ORDER)[number];

export const DEFAULT_ROLE: UserRole = "admin";
export const GOD_USERNAME = "aldovera";
export const USERNAME_MAX_LENGTH = 20;

const ROLE_LEVEL: Record<UserRole, number> = {
  viewer: 0,
  technician: 1,
  supervisor: 2,
  admin: 3,
  god: 4
};

export function normalizeRole(value: string | null | undefined): UserRole {
  if (!value) return DEFAULT_ROLE;
  const nextValue = value.toLowerCase();
  if (nextValue === "viewer") return "viewer";
  if (nextValue === "technician") return "technician";
  if (nextValue === "supervisor") return "supervisor";
  if (nextValue === "admin") return "admin";
  if (nextValue === "god") return "god";
  return DEFAULT_ROLE;
}

export function resolveRole(username: string, role: string | null | undefined): UserRole {
  if (normalizeUsername(username) === GOD_USERNAME) return "god";
  return normalizeRole(role);
}

export function isGod(role: string | null | undefined) {
  return normalizeRole(role) === "god";
}

export function hasMinimumRole(role: string | null | undefined, required: UserRole) {
  return ROLE_LEVEL[normalizeRole(role)] >= ROLE_LEVEL[required];
}

export function canManageUsers(role: string | null | undefined) {
  return hasMinimumRole(role, "admin");
}

export function canCreateAssets(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return normalized !== "viewer" && normalized !== "technician";
}

export function canEditWorkOrders(role: string | null | undefined) {
  return normalizeRole(role) !== "viewer";
}

export function canEditPm(role: string | null | undefined) {
  return normalizeRole(role) !== "viewer";
}

export function isReadOnlyRole(role: string | null | undefined) {
  return normalizeRole(role) === "viewer";
}

export function canCreateRole(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === "god") return true;
  if (actorRole === "viewer") return false;
  if (actorRole === "technician") return false;
  return ROLE_LEVEL[targetRole] < ROLE_LEVEL[actorRole];
}

export function canDeleteRole(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === "god") return targetRole !== "god";
  if (actorRole === "viewer") return false;
  if (actorRole === "technician") return false;
  return ROLE_LEVEL[targetRole] < ROLE_LEVEL[actorRole];
}

export type EditableModule = "assets" | "work_orders" | "pm_plans" | "spare_parts" | "technicians" | "manage_users";

export function canEditModule(role: string | null | undefined, module: EditableModule) {
  const normalized = normalizeRole(role);
  if (normalized === "god") return true;
  if (normalized === "viewer") return false;

  if (module === "work_orders" || module === "pm_plans") {
    return normalized === "technician" || normalized === "supervisor" || normalized === "admin";
  }

  if (module === "assets" || module === "spare_parts" || module === "technicians") {
    return normalized === "supervisor" || normalized === "admin";
  }

  if (module === "manage_users") {
    return normalized === "admin";
  }

  return false;
}

export function normalizeUsername(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .slice(0, USERNAME_MAX_LENGTH);
}
