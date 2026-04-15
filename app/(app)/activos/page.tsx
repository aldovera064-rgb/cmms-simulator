import { AssetsPageClient } from "@/components/assets/assets-page-client";

export const dynamic = "force-dynamic";

export default function ActivosPage() {
  return (
    <AssetsPageClient
      initialAssets={[]}
    />
  );
}