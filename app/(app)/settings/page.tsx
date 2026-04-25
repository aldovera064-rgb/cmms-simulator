import { SettingsPageClient } from "@/components/settings/settings-page-client";

export const metadata = {
  title: "Settings | CMMS Simulator",
  description: "CMMS configuration and preferences"
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
