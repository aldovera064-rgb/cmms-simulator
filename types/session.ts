export type SessionRole = "admin" | "technician";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
  technicianId?: string | null;
};
