"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast-context";
import {
  ROLE_ORDER,
  UserRole,
  canEditModule,
  canCreateRole,
  canDeleteRole,
  GOD_USERNAME,
  normalizeRole,
  normalizeUsername,
  hasMinimumRole
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

type UserPermissions = {
  can_edit_profile: boolean;
  can_edit_avatar: boolean;
  can_edit_data: boolean;
  can_edit_calendar: boolean;
};

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_edit_profile: true,
  can_edit_avatar: true,
  can_edit_data: true,
  can_edit_calendar: true
};

export function ManageUsersPanel() {
  const { locale } = useI18n();
  const { user } = useSession();
  const { showToast } = useToast();
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
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, UserPermissions>>({});
  const [expandedPermissions, setExpandedPermissions] = useState<string | null>(null);
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
          locked: "Locked",
          viewProfile: "Profile",
          deleteTitle: "Delete user",
          deleteDesc: "Are you sure you want to delete this user?",
          permissions: "Permissions",
          canEditProfile: "Edit profile",
          canEditAvatar: "Edit avatar",
          canEditData: "Edit data",
          canEditCalendar: "Edit calendar"
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
          locked: "Bloqueado",
          viewProfile: "Perfil",
          deleteTitle: "Eliminar usuario",
          deleteDesc: "¿Estás seguro de eliminar este usuario?",
          permissions: "Permisos",
          canEditProfile: "Editar perfil",
          canEditAvatar: "Editar foto",
          canEditData: "Editar datos",
          canEditCalendar: "Editar agenda"
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
    } else {
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

    // Load permissions for all users
    await loadPermissions(userIds);
  }

  async function loadPermissions(userIds: string[]) {
    if (!activeCompanyId || userIds.length === 0) return;
    const { data } = await supabase
      .from("user_permissions")
      .select("user_id, can_edit_profile, can_edit_avatar, can_edit_data, can_edit_calendar")
      .eq("company_id", activeCompanyId)
      .in("user_id", userIds);

    const map: Record<string, UserPermissions> = {};
    if (data) {
      for (const row of data) {
        map[row.user_id as string] = {
          can_edit_profile: row.can_edit_profile as boolean ?? true,
          can_edit_avatar: row.can_edit_avatar as boolean ?? true,
          can_edit_data: row.can_edit_data as boolean ?? true,
          can_edit_calendar: row.can_edit_calendar as boolean ?? true
        };
      }
    }
    setPermissionsMap(map);
  }

  // Pending permissions are just saved to local state immediately (it is already doing this in updatePermission)
  // But wait, user requested an explicit "Guardar permisos" button that does the saving.
  // Actually, updatePermission does individual upsert right now. Let's make sure it handles errors.
  
  async function updatePermission(userId: string, key: keyof UserPermissions, value: boolean) {
    if (!activeCompanyId) return;
    const current = permissionsMap[userId] ?? DEFAULT_PERMISSIONS;
    const updated = { ...current, [key]: value };

    // We keep the local state updated immediately for UX
    setPermissionsMap((prev) => ({ ...prev, [userId]: updated }));
  }

  const savePermissions = async () => {
    if (!activeCompanyId) return;
    setLoading(true);

    // Save all current permissionsMap to DB
    for (const [userId, perms] of Object.entries(permissionsMap)) {
      const { error } = await supabase.from("user_permissions").upsert(
        { user_id: userId, company_id: activeCompanyId, ...perms },
        { onConflict: "user_id,company_id" }
      );
      if (error) {
        console.error("PERMISSION SAVE ERROR:", error);
        showToast("Error saving permissions for user " + userId, "error");
      }
    }
    
    setLoading(false);
    showToast(locale === "en" ? "Permissions saved" : "Permisos guardados", "success");
  };

  useEffect(() => {
    void loadUsers();
  }, [activeCompanyId, actorRole]);

  const creatableRoles = ROLE_ORDER.filter((candidate) => canCreateRole(actorRole, candidate));

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername || !password || !canCreateRole(actorRole, role) || !activeCompanyId) return;

    setLoading(true);
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
      await supabase.from("admins").insert([{ username: normalizedUsername, password }]);
      const fallbackUser = await supabase.from("admins").select("id").eq("username", normalizedUsername).maybeSingle();
      resolvedUserId = (fallbackUser.data?.id as string | undefined) ?? resolvedUserId;
    }

    if (resolvedUserId && activeCompanyId) {
      await supabase.from("user_companies").insert([
        { user_id: resolvedUserId, company_id: activeCompanyId, role }
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
    showToast(locale === "en" ? "User created" : "Usuario creado", "success");
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

    await supabase.from("admins").update({ role: nextRole }).eq("id", target.id);
    await supabase.from("user_companies").update({ role: nextRole }).eq("user_id", target.id);
    await loadUsers();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!canDeleteRole(actorRole, deleteTarget.role)) return;
    setDeleteLoading(true);

    // Step 1: Remove from company
    const { error: ucError } = await supabase
      .from("user_companies")
      .delete()
      .eq("user_id", deleteTarget.id)
      .eq("company_id", activeCompanyId);

    if (ucError) {
      console.error("DELETE USER_COMPANIES ERROR:", ucError);
      showToast("Error: " + ucError.message, "error");
      setDeleteLoading(false);
      return;
    }

    // Step 2: If god, also delete the user record
    if (actorRole === "god") {
      const { error: adminError } = await supabase
        .from("admins")
        .delete()
        .eq("id", deleteTarget.id);

      if (adminError) {
        console.error("DELETE ADMIN ERROR:", adminError);
        // Non-fatal: user was already removed from company
      }
    }

    setDeleteTarget(null);
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    void loadUsers();
    showToast(locale === "en" ? "User removed" : "Usuario eliminado", "success");
    setDeleteLoading(false);
  };

  const handleAddExistingUser = async () => {
    if (!activeCompanyId) return;
    const normalized = normalizeUsername(existingUsername);
    if (!normalized) return;

    setAddExistingLoading(true);
    setAddExistingMessage("");

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

  const canManagePermissions = hasMinimumRole(actorRole, "admin");

  if (!canAccessPanel) return null;

  return (
    <>
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
              {loading ? "..." : copy.createButton}
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
                  const perms = permissionsMap[entry.id] ?? DEFAULT_PERMISSIONS;
                  const isExpanded = expandedPermissions === entry.id;

                  return (
                    <tr key={entry.id} className="group">
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
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link href={`/perfil?userId=${entry.id}`}>
                            <Button variant="secondary">{copy.viewProfile}</Button>
                          </Link>

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

                          {canManagePermissions && entry.username !== user?.name && (
                            <Button
                              variant="secondary"
                              onClick={() => setExpandedPermissions(isExpanded ? null : entry.id)}
                            >
                              {copy.permissions}
                            </Button>
                          )}

                          {canMutateRole ? (
                            <Button variant="danger" onClick={() => setDeleteTarget(entry)}>
                              {actorRole === "god" ? copy.delete : copy.removeFromCompany}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted">{copy.locked}</span>
                          )}
                        </div>

                        {isExpanded && canManagePermissions && (
                          <div className="mt-3 rounded-xl border border-border bg-panelAlt p-3 text-left">
                            <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">{copy.permissions}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {(["can_edit_profile", "can_edit_avatar", "can_edit_data", "can_edit_calendar"] as const).map((key) => {
                                const labels: Record<string, string> = {
                                  can_edit_profile: copy.canEditProfile,
                                  can_edit_avatar: copy.canEditAvatar,
                                  can_edit_data: copy.canEditData,
                                  can_edit_calendar: copy.canEditCalendar
                                };
                                return (
                                  <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={perms[key]}
                                      onChange={(e) => void updatePermission(entry.id, key, e.target.checked)}
                                      className="accent-accent h-4 w-4 rounded"
                                    />
                                    <span>{labels[key]}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <div className="pt-2">
                              <Button variant="secondary" onClick={() => void savePermissions()} className="w-full text-xs py-1.5 h-auto">Guardar permisos</Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={copy.deleteTitle}
        description={`${copy.deleteDesc} (${deleteTarget?.username ?? ""})`}
        confirmLabel={copy.delete}
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
