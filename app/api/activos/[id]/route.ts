export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  getAssetById,
  parseAssetDetailUpdatePayload,
  parseAssetPayload
} from "@/features/assets/server";
import { prisma } from "@/lib/prisma";
import { AssetDetailUpdateInput, AssetFormValues } from "@/types/assets";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
   if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json(null);
  }
  const { id } = await context.params;
  const asset = await getAssetById(id);

  if (!asset) {
    return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
  }

  return NextResponse.json(asset);
}

export async function PUT(request: Request, context: RouteContext) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Simulador en produccion" });
  }
  const { id } = await context.params;
  const payload = (await request.json()) as Partial<AssetFormValues & AssetDetailUpdateInput>;
  const isPartialDetailUpdate = !("tag" in payload);
  const parsed = isPartialDetailUpdate
    ? parseAssetDetailUpdatePayload(payload)
    : parseAssetPayload(payload);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updateData =
    "status" in parsed.data &&
    parsed.data.status === "MAINTENANCE" &&
    !("lastFailureAt" in parsed.data)
      ? { ...parsed.data, lastFailureAt: new Date() }
      : parsed.data;

  try {
    const asset = await prisma.asset.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        tag: true,
        description: true,
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

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
    }

    return NextResponse.json(
      { error: "No se pudo actualizar el activo." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
   if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ ok: true });
  }
  const { id } = await context.params;

  const related = await prisma.asset.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          workOrders: true,
          pmPlans: true,
          notes: true
        }
      }
    }
  });

  if (!related) {
    return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
  }

  if (related._count.workOrders > 0 || related._count.pmPlans > 0) {
    return NextResponse.json(
      {
        error:
          "No se puede eliminar este activo porque ya tiene ordenes de trabajo o planes PM vinculados."
      },
      { status: 409 }
    );
  }

  try {
    await prisma.note.deleteMany({
      where: { assetId: id }
    });

    await prisma.asset.delete({
      where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el activo." }, { status: 500 });
  }
}
