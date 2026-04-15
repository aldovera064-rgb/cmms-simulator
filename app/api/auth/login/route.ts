import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Missing credentials." }, { status: 400 });
  }

  // MODO DEMO (Vercel)
  if (process.env.VERCEL_ENV === "production") {
    if (
      body.email === "admin@cmms.local" &&
      body.password === "admin123"
    ) {
      return NextResponse.json({
        id: "demo-admin",
        email: "admin@cmms.local",
        name: "Admin Demo",
        role: "admin",
        technicianId: null
      });
    }

    return NextResponse.json(
      { error: "Credenciales inválidas para el simulador." },
      { status: 401 }
    );
  }

  // LOCAL (usa Prisma)
  const { prisma } = await import("@/lib/prisma");
  const { UserRole } = await import("@prisma/client");

  const user = await prisma.user.findUnique({
    where: {
      email: body.email
    }
  });

  if (!user || user.password !== body.password) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role === UserRole.ADMIN ? "admin" : "technician",
    technicianId: user.technicianId
  });
}