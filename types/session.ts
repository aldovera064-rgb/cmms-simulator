export type SessionRole = "god" | "admin" | "supervisor" | "technician" | "viewer";

export type SessionCompany = {
  id: string;
  name: string;
  role: string;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
  technicianId?: string | null;
  activeCompanyId?: string | null;
  companies?: SessionCompany[];
};
