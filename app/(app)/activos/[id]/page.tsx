import { notFound } from "next/navigation";

import { AssetDetailClient } from "@/components/assets/asset-detail-client";
import { getAssetById } from "@/features/assets/server";

type AssetDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { id } = await params;
  const asset = await getAssetById(id);

  if (!asset) {
    notFound();
  }

  return <AssetDetailClient initialAsset={asset} />;
}
