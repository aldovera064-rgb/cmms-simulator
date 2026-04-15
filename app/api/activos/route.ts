export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getAssets, parseAssetPayload } from "@/features/assets/server";
import { prisma } from "@/lib/prisma";
import { AssetFormValues } from "@/types/assets";

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json([]);
  }

  const assets = await getAssets();
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
   if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json(
      { error: "Simulador en produccion" },
      { status: 200 }
    );
  }
  const payload = (await request.json()) as Partial<AssetFormValues>;
  const parsed = parseAssetPayload(payload);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const asset = await prisma.asset.create({
      data: parsed.data,
      select: {
        id: true,
        tag: true,
        name: true,
        area: true,
        criticality: true,
        status: true,
        manufacturer: true,
        model: true,
        serialNumber: true,
        installationDate: true,
        lastFailureAt: true,
        technicalSpecifications: true
      }
    });

    return NextResponse.json({
      ...asset,
      installationDate: asset.installationDate.toISOString(),
      lastFailureAt: asset.lastFailureAt?.toISOString() ?? null
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "El TAG ya existe. Usa un TAG unico." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "No se pudo crear el activo." }, { status: 500 });
  }
}
