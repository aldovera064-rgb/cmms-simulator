"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CalendarSection } from "@/components/profile/calendar-section";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast-context";
import { useCover } from "@/lib/cover-context";
import { useI18n } from "@/lib/i18n/context";
import { hasMinimumRole } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string;
  username: string;
  birth_date: string;
  gender: string;
  avatar_url: string;
};

type UserPermissions = {
  can_edit_profile: boolean;
  can_edit_avatar: boolean;
  can_edit_data: boolean;
  can_edit_calendar: boolean;
};

const DEFAULT_PERMS: UserPermissions = { can_edit_profile: true, can_edit_avatar: true, can_edit_data: true, can_edit_calendar: true };

const GENDERS = [
  { value: "masculino", label: "Masculino", labelEn: "Male" },
  { value: "femenino", label: "Femenino", labelEn: "Female" },
  { value: "otro", label: "Otro", labelEn: "Other" },
  { value: "no_responder", label: "Prefiero no responder", labelEn: "Prefer not to say" }
];

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function ProfilePageClient() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const { locale } = useI18n();
  const { user } = useSession();
  const { cover } = useCover();
  const { showToast } = useToast();

  const currentUserId = user?.id ?? null;
  const viewingUserId = targetUserId || currentUserId;
  const isOwnProfile = !targetUserId || targetUserId === currentUserId;
  const hasCover = Boolean(cover.url);

  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    username: "",
    birth_date: "",
    gender: "",
    avatar_url: ""
  });
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMS);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const age = calculateAge(profile.birth_date);

  const canEdit = isOwnProfile
    ? permissions.can_edit_profile
    : hasMinimumRole(user?.role, "admin");

  const canEditAvatar = isOwnProfile
    ? permissions.can_edit_avatar
    : hasMinimumRole(user?.role, "admin");

  const canEditCalendar = isOwnProfile
    ? permissions.can_edit_calendar
    : hasMinimumRole(user?.role, "admin");

  const copy = locale === "en"
    ? {
        title: "Profile", subtitle: "Manage your personal information",
        fullName: "Full name", username: "Username", birthDate: "Date of birth",
        age: "Age", gender: "Gender", avatar: "Profile photo", changePassword: "Change password",
        newPassword: "New password", confirmPassword: "Confirm password", save: "Save",
        saving: "Saving...", uploadPhoto: "Upload photo", years: "years",
        calendar: "Calendar", changePasswordBtn: "Change password",
        saveError: "Error saving profile", saveSuccess: "Profile saved"
      }
    : {
        title: "Perfil", subtitle: "Administra tu información personal",
        fullName: "Nombre completo", username: "Usuario", birthDate: "Fecha de nacimiento",
        age: "Edad", gender: "Género", avatar: "Foto de perfil", changePassword: "Cambiar contraseña",
        newPassword: "Nueva contraseña", confirmPassword: "Confirmar contraseña", save: "Guardar",
        saving: "Guardando...", uploadPhoto: "Subir foto", years: "años",
        calendar: "Agenda", changePasswordBtn: "Cambiar contraseña",
        saveError: "Error al guardar perfil", saveSuccess: "Perfil guardado"
      };

  // ── LOAD profile from DB ──
  useEffect(() => {
    const load = async () => {
      if (!viewingUserId) return;
      setLoadingProfile(true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, username, birth_date, gender, avatar_url")
        .eq("user_id", viewingUserId)
        .maybeSingle();

      if (profileError) {
        console.error("PROFILE LOAD ERROR:", profileError);
      }

      if (profileData) {
        const loaded: Profile = {
          full_name: (profileData.full_name as string) ?? "",
          username: (profileData.username as string) ?? "",
          birth_date: (profileData.birth_date as string) ?? "",
          gender: (profileData.gender as string) ?? "",
          avatar_url: (profileData.avatar_url as string) ?? ""
        };
        setProfile(loaded);
        if (loaded.avatar_url) setAvatarPreview(loaded.avatar_url);
      } else {
        const { data: adminData } = await supabase.from("admins").select("username").eq("id", viewingUserId).maybeSingle();
        if (adminData) {
          setProfile((prev) => ({ ...prev, username: (adminData.username as string) ?? "" }));
        }
      }

      // Load permissions
      if (user?.activeCompanyId) {
        const { data: permData } = await supabase
          .from("user_permissions")
          .select("can_edit_profile, can_edit_avatar, can_edit_data, can_edit_calendar")
          .eq("user_id", viewingUserId)
          .eq("company_id", user.activeCompanyId)
          .maybeSingle();

        if (permData) {
          setPermissions({
            can_edit_profile: permData.can_edit_profile as boolean ?? true,
            can_edit_avatar: permData.can_edit_avatar as boolean ?? true,
            can_edit_data: permData.can_edit_data as boolean ?? true,
            can_edit_calendar: permData.can_edit_calendar as boolean ?? true
          });
        }
      }

      setLoadingProfile(false);
    };

    void load();
  }, [viewingUserId, user?.activeCompanyId]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Máximo 2MB", "error");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── SAVE profile to DB (with real Auth context + error check + state reload) ──
  const handleSave = async () => {
    if (!viewingUserId || !canEdit) return;
    setSaving(true);

    const targetId = viewingUserId;

    let avatarUrl = profile.avatar_url;

    // Upload avatar if new file
    if (avatarFile && canEditAvatar) {
      const filePath = `${targetId}/avatar.png`;
      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        console.error("AVATAR UPLOAD ERROR:", uploadError);
        showToast(copy.saveError, "error");
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("profiles").getPublicUrl(filePath);
      avatarUrl = publicUrlData.publicUrl + "?t=" + Date.now();
    }

    // Upsert profile with .select() to verify persistence
    const { data: savedData, error: saveError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: targetId,
          full_name: profile.full_name,
          username: profile.username,
          birth_date: profile.birth_date || null,
          gender: profile.gender || null,
          avatar_url: avatarUrl
        },
        { onConflict: "user_id" }
      )
      .select("full_name, username, birth_date, gender, avatar_url")
      .single();

    if (saveError) {
      console.error("PROFILE SAVE ERROR:", saveError);
      showToast(copy.saveError + ": " + saveError.message, "error");
      setSaving(false);
      return;
    }

    // Reload state from DB response — guarantees what we show is what DB has
    if (savedData) {
      const reloaded: Profile = {
        full_name: (savedData.full_name as string) ?? "",
        username: (savedData.username as string) ?? "",
        birth_date: (savedData.birth_date as string) ?? "",
        gender: (savedData.gender as string) ?? "",
        avatar_url: (savedData.avatar_url as string) ?? ""
      };
      setProfile(reloaded);
      setAvatarPreview(reloaded.avatar_url || "");
    }

    setAvatarFile(null);
    setSaving(false);
    showToast(copy.saveSuccess, "success");
  };

  const handlePasswordChange = async () => {
    if (!viewingUserId || !isOwnProfile) return;
    if (newPassword.length < 5) {
      showToast(locale === "en" ? "Minimum 5 characters" : "Mínimo 5 caracteres", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(locale === "en" ? "Passwords don't match" : "Las contraseñas no coinciden", "error");
      return;
    }

    const { error } = await supabase.from("admins").update({ password: newPassword }).eq("id", viewingUserId);
    if (error) {
      console.error("PASSWORD CHANGE ERROR:", error);
      showToast("Error: " + error.message, "error");
      return;
    }
    setPasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
    showToast(locale === "en" ? "Password changed" : "Contraseña actualizada", "success");
  };

  if (loadingProfile) {
    return (
      <div className="space-y-6">
        <Panel className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 rounded-xl bg-border/50" />
            <div className="h-4 w-64 rounded-xl bg-border/30" />
            <div className="h-32 rounded-xl bg-border/20" />
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Panel className="relative overflow-hidden p-8 border-[#d6d0b8]">
        {hasCover && (
          <>
            <img src={cover.url!} alt="" className="absolute inset-0 h-full w-full object-cover pointer-events-none" style={{ objectPosition: cover.position, transform: `scale(${cover.scale})`, transformOrigin: cover.position }} draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 pointer-events-none" />
          </>
        )}
        {!hasCover && <div className="absolute inset-0 industrial-grid pointer-events-none" />}
        <div className="relative z-10 flex items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-4 border-white/30" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white text-2xl font-bold border-4 border-white/30">
                {(profile.full_name || profile.username || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
            {canEditAvatar && (
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white text-xs opacity-0 group-hover:opacity-100 transition cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                📷
              </label>
            )}
          </div>
          <div>
            <h1 className={`text-2xl font-semibold ${hasCover ? "text-white" : ""}`}>
              {profile.full_name || profile.username || copy.title}
            </h1>
            <p className={`text-sm ${hasCover ? "text-white/80" : "text-muted"}`}>
              @{profile.username} {age !== null && `· ${age} ${copy.years}`}
            </p>
          </div>
        </div>
      </Panel>

      {/* Profile form */}
      <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">{copy.title}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 text-sm">
              <span className="text-muted">{copy.fullName}</span>
              <input
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60"
                value={profile.full_name}
                onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
                disabled={!canEdit}
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="text-muted">{copy.username}</span>
              <input
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none opacity-60"
                value={profile.username}
                disabled
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="text-muted">{copy.birthDate}</span>
              <input
                type="date"
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60"
                value={profile.birth_date}
                onChange={(e) => setProfile((prev) => ({ ...prev, birth_date: e.target.value }))}
                disabled={!canEdit}
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="text-muted">{copy.gender}</span>
              <select
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60"
                value={profile.gender}
                onChange={(e) => setProfile((prev) => ({ ...prev, gender: e.target.value }))}
                disabled={!canEdit}
              >
                <option value="">—</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {locale === "en" ? g.labelEn : g.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {age !== null && (
            <p className="text-sm text-muted">
              {copy.age}: <span className="font-semibold text-foreground">{age} {copy.years}</span>
            </p>
          )}

          <div className="flex gap-3">
            {canEdit && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? copy.saving : copy.save}
              </Button>
            )}
            {isOwnProfile && (
              <Button variant="secondary" onClick={() => setPasswordModal(true)}>
                {copy.changePasswordBtn}
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {/* Calendar / Agenda */}
      {viewingUserId && (
        <CalendarSection userId={viewingUserId} canEdit={canEditCalendar} locale={locale} />
      )}

      {/* Password change modal */}
      <Modal open={passwordModal} title={copy.changePassword} onClose={() => setPasswordModal(false)}>
        <div className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.newPassword}</span>
            <input
              type="password"
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.confirmPassword}</span>
            <input
              type="password"
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPasswordModal(false)}>
              {locale === "en" ? "Cancel" : "Cancelar"}
            </Button>
            <Button onClick={handlePasswordChange}>
              {copy.save}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
