import { AssetsPageClient } from "@/components/assets/assets-page-client";
import { getAssets } from "@/features/assets/server";

export const dynamic = "force-dynamic";

export default async function ActivosPage() {
  const assets = await getAssets();

  return <AssetsPageClient initialAssets={assets} />;
}
