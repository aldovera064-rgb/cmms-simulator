"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  ROLE_ORDER,
  UserRole,
  canEditModule,
  canCreateRole,
  canDeleteRole,
  GOD_USERNAME,
  normalizeRole,
  normalizeUsername
} from "@/lib/rbac";
import { useI18n } from "@/lib/i18n/context";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  username: string;
  role: UserRole;
  country: string | null;
};

export function ManageUsersPanel() {
  const { locale } = useI18n();
  const { user } = useSession();
  const actorRole = normalizeRole(user?.role);
  const activeCompanyId = user?.activeCompanyId ?? null;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("12345");
  const [role, setRole] = useState<UserRole>("viewer");
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState("");
  const [existingUsername, setExistingUsername] = useState("");
  const [addExistingLoading, setAddExistingLoading] = useState(false);
  const [addExistingMessage, setAddExistingMessage] = useState("");
  const canAccessPanel = canEditModule(user?.role, "manage_users");

  const copy =
    locale === "en"
      ? {
          accessControl: "Access Control",
          manageUsers: "Manage Users",
          subtitleActive: "New users are assigned to the active company.",
          subtitleInactive: "Select an active company to assign users.",
          usernamePlaceholder: "username",
          passwordPlaceholder: "password",
          createButton: "Create",
          addExistingLabel: "Add existing user to this company",
          existingUsernamePlaceholder: "existing username",
          addButton: "Add to company",
          userNotFound: "User not found.",
          userAlreadyInCompany: "User already belongs to this company.",
          userAdded: "User successfully added.",
          usernameHeader: "Username",
          roleHeader: "Role",
          actionsHeader: "Actions",
          saveName: "Save name",
          cancel: "Cancel",
          editName: "Edit name",
          delete: "Delete",
          removeFromCompany: "Remove from company",
          locked: "Locked"
        }
      : {
          accessControl: "Control de Acceso",
          manageUsers: "Administrar usuarios",
          subtitleActive: "Los nuevos usuarios se asignan a la empresa activa.",
          subtitleInactive: "Selecciona una empresa activa para asignar usuarios.",
          usernamePlaceholder: "usuario",
          passwordPlaceholder: "contraseña",
          createButton: "Crear",
          addExistingLabel: "Agregar usuario existente a esta empresa",
          existingUsernamePlaceholder: "usuario existente",
          addButton: "Agregar a empresa",
          userNotFound: "Usuario no encontrado.",
          userAlreadyInCompany: "El usuario ya pertenece a esta empresa.",
          userAdded: "Usuario agregado correctamente.",
          usernameHeader: "Usuario",
          roleHeader: "Rol",
          actionsHeader: "Acciones",
          saveName: "Guardar nombre",
          cancel: "Cancelar",
          editName: "Editar nombre",
          delete: "Eliminar",
          removeFromCompany: "Quitar de empresa",
          locked: "Bloqueado"
        };

  async function loadUsers() {
    if (!activeCompanyId) {
      setUsers([]);
      return;
    }

    const membershipResponse = await supabase.from("user_companies").select("user_id").eq("company_id", activeCompanyId);
    const userIds = (membershipResponse.data ?? [])
      .map((row) => row.user_id as string | null)
      .filter((value): value is string => Boolean(value));

    if (membershipResponse.error || userIds.length === 0) {
      setUsers([]);
      return;
    }

    const preferredQuery = await supabase.from("admins").select("id, username, role, country").in("id", userIds).order("username", { ascending: true });
    if (!preferredQuery.error) {
      setUsers(
        (preferredQuery.data ?? []).map((row) => ({
          id: row.id as string,
          username: (row.username as string) ?? "",
          role: normalizeUsername((row.username as string) ?? "") === GOD_USERNAME ? "god" : normalizeRole(row.role as string | null | undefined),
          country: (row.country as string | null | undefined) ?? null
        }))
      );
      return;
    }

    const fallbackQuery = await supabase.from("admins").select("id, username, country").in("id", userIds).order("username", { ascending: true });
    setUsers(
      (fallbackQuery.data ?? []).map((row) => ({
        id: row.id as string,
        username: (row.username as string) ?? "",
        role: "admin",
        country: (row.country as string | null | undefined) ?? null
      }))
    );
  }

  useEffect(() => {
    void loadUsers();
  }, [activeCompanyId, actorRole]);

  const creatableRoles = ROLE_ORDER.filter((candidate) => canCreateRole(actorRole, candidate));

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername || !password || !canCreateRole(actorRole, role) || !activeCompanyId) return;

    setLoading(true);
    console.log("ROLE:", role);
    const preferredInsert = await supabase
      .from("admins")
      .insert([
        {
          username: normalizedUsername,
          password,
          role: normalizedUsername === GOD_USERNAME ? "god" : role
        }
      ])
      .select("id, username, role")
      .single();

    const createdUserId = preferredInsert.data?.id as string | undefined;

    let resolvedUserId = createdUserId;

    if (preferredInsert.error && preferredInsert.error.message.toLowerCase().includes("role")) {
      await supabase.from("admins").insert([
        {
          username: normalizedUsername,
          password
        }
      ]);
      const fallbackUser = await supabase.from("admins").select("id").eq("username", normalizedUsername).maybeSingle();
      resolvedUserId = (fallbackUser.data?.id as string | undefined) ?? resolvedUserId;
    }

    if (resolvedUserId && activeCompanyId) {
      await supabase.from("user_companies").insert([
        {
          user_id: resolvedUserId,
          company_id: activeCompanyId,
          role
        }
      ]);
    }

    if (normalizedUsername === GOD_USERNAME) {
      await supabase.from("admins").update({ role: "god" }).eq("id", resolvedUserId);
    }

    await loadUsers();
    setUsername("");
    setPassword("12345");
    setRole(creatableRoles[0] ?? "viewer");
    setLoading(false);
  };

  const startEditUsername = (entry: AdminUser) => {
    if (actorRole !== "god") return;
    if (entry.username === user?.name) return;
    setEditingUserId(entry.id);
    setEditingUsername(entry.username);
  };

  const saveUsername = async (entry: AdminUser) => {
    if (actorRole !== "god") return;
    const nextUsername = normalizeUsername(editingUsername);
    if (!nextUsername) return;
    if (nextUsername === normalizeUsername(entry.username)) {
      setEditingUserId(null);
      setEditingUsername("");
      return;
    }
    await supabase.from("admins").update({ username: nextUsername }).eq("id", entry.id);
    setEditingUserId(null);
    setEditingUsername("");
    await loadUsers();
  };

  const handleRoleChange = async (target: AdminUser, nextRole: UserRole) => {
    if (!canCreateRole(actorRole, nextRole)) return;
    if (!canDeleteRole(actorRole, target.role) && actorRole !== "god") return;
    if (target.username === user?.name) return;

    console.log("UPDATING ROLE:", nextRole);
    await supabase.from("admins").update({ role: nextRole }).eq("id", target.id);
    await supabase.from("user_companies").update({ role: nextRole }).eq("user_id", target.id);
    await loadUsers();
  };

  const handleDelete = async (target: AdminUser) => {
    if (!canDeleteRole(actorRole, target.role)) return;
    if (target.username === user?.name) return;

    if (actorRole === "god") {
      // God: full delete (remove from all companies + delete user)
      await supabase.from("user_companies").delete().eq("user_id", target.id);
      await supabase.from("admins").delete().eq("id", target.id);
    } else {
      // Admin: remove from current company only
      await supabase.from("user_companies").delete().eq("user_id", target.id).eq("company_id", activeCompanyId);
    }
    await loadUsers();
  };

  const handleAddExistingUser = async () => {
    if (!activeCompanyId) return;
    const normalized = normalizeUsername(existingUsername);
    if (!normalized) return;

    setAddExistingLoading(true);
    setAddExistingMessage("");

    // Find user in admins
    const { data: found } = await supabase
      .from("admins")
      .select("id, username")
      .eq("username", normalized)
      .maybeSingle();

    if (!found) {
      setAddExistingMessage(copy.userNotFound);
      setAddExistingLoading(false);
      return;
    }

    // Check if already in company
    const { data: existing } = await supabase
      .from("user_companies")
      .select("id")
      .eq("user_id", found.id)
      .eq("company_id", activeCompanyId)
      .maybeSingle();

    if (existing) {
      setAddExistingMessage(copy.userAlreadyInCompany);
      setAddExistingLoading(false);
      return;
    }

    const { error } = await supabase
      .from("user_companies")
      .insert({ user_id: found.id, company_id: activeCompanyId, role: "viewer" });

    if (error) {
      setAddExistingMessage("Error: " + error.message);
    } else {
      setAddExistingMessage(copy.userAdded);
      setExistingUsername("");
      await loadUsers();
    }
    setAddExistingLoading(false);
  };

  if (!canAccessPanel) return null;

  return (
    <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">{copy.accessControl}</p>
          <h2 className="mt-2 text-xl font-semibold">{copy.manageUsers}</h2>
          <p className="mt-2 text-sm text-muted">
            {activeCompanyId ? copy.subtitleActive : copy.subtitleInactive}
          </p>
        </div>

        <form className="grid gap-3 md:grid-cols-[1fr_180px_170px_auto]" onSubmit={handleCreate}>
          <input
            className="rounded-2xl border border-border bg-panelAlt px-3 py-2 text-sm"
            placeholder={copy.usernamePlaceholder}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            className="rounded-2xl border border-border bg-panelAlt px-3 py-2 text-sm"
            placeholder={copy.passwordPlaceholder}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <select
            className="rounded-2xl border border-border bg-panelAlt px-3 py-2 text-sm"
            value={role}
            onChange={(event) => setRole(normalizeRole(event.target.value))}
          >
            {creatableRoles.map((availableRole) => (
              <option key={availableRole} value={availableRole}>
                {availableRole}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={loading || creatableRoles.length === 0}>
            {copy.createButton}
          </Button>
        </form>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted">{copy.addExistingLabel}</label>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2 text-sm"
              placeholder={copy.existingUsernamePlaceholder}
              value={existingUsername}
              onChange={(event) => { setExistingUsername(event.target.value); setAddExistingMessage(""); }}
            />
          </div>
          <Button type="button" disabled={addExistingLoading || !existingUsername.trim()} onClick={() => void handleAddExistingUser()}>
            {addExistingLoading ? "..." : copy.addButton}
          </Button>
        </div>
        {addExistingMessage ? <p className="text-xs text-muted">{addExistingMessage}</p> : null}

        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left">{copy.usernameHeader}</th>
                <th className="px-4 py-2 text-left">{copy.roleHeader}</th>
                <th className="px-4 py-2 text-right">{copy.actionsHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((entry) => {
                const canMutateRole = entry.username !== user?.name && canDeleteRole(actorRole, entry.role);
                const roleOptions = ROLE_ORDER.filter((candidate) => canCreateRole(actorRole, candidate));
                return (
                  <tr key={entry.id}>
                    <td className="px-4 py-2">
                      {actorRole === "god" && editingUserId === entry.id ? (
                        <input
                          className="rounded-xl border border-border bg-panel px-2 py-1 text-xs"
                          value={editingUsername}
                          maxLength={20}
                          onChange={(event) => setEditingUsername(event.target.value)}
                        />
                      ) : (
                        entry.username
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {canMutateRole ? (
                        <select
                          className="rounded-xl border border-border bg-panel px-2 py-1 text-xs"
                          value={entry.role}
                          onChange={(event) => void handleRoleChange(entry, normalizeRole(event.target.value))}
                        >
                          {roleOptions.map((candidate) => (
                            <option key={candidate} value={candidate}>
                              {candidate}
                            </option>
                          ))}
                        </select>
                      ) : (
                        entry.role
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {actorRole === "god" && entry.username !== user?.name ? (
                          editingUserId === entry.id ? (
                            <>
                              <Button onClick={() => void saveUsername(entry)}>{copy.saveName}</Button>
                              <Button variant="secondary" onClick={() => setEditingUserId(null)}>
                                {copy.cancel}
                              </Button>
                            </>
                          ) : (
                            <Button variant="secondary" onClick={() => startEditUsername(entry)}>
                              {copy.editName}
                            </Button>
                          )
                        ) : null}
                        {canMutateRole ? (
                          <Button variant="danger" onClick={() => void handleDelete(entry)}>
                            {actorRole === "god" ? copy.delete : copy.removeFromCompany}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">{copy.locked}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
