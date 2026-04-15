import {
  AssetStatus,
  AssetCriticality,
  NoteEntityType,
  PmStatus,
  PrismaClient,
  TrafficLightStatus,
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderType
} from "@prisma/client";

const prisma = new PrismaClient();

const now = new Date("2026-04-14T09:00:00.000Z");

type SparePartSeed = [string, string, string, number, number, string];

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getDueDate(createdAt: Date, priority: WorkOrderPriority) {
  const hoursByPriority: Record<WorkOrderPriority, number> = {
    P1: 1,
    P2: 4,
    P3: 48,
    P4: 72
  };

  return addHours(createdAt, hoursByPriority[priority]);
}

function makeOtNumber(index: number) {
  const year = now.getUTCFullYear();
  return `OT-${year}-${String(index).padStart(4, "0")}`;
}

async function main() {
  await prisma.workOrderMaterial.deleteMany();
  await prisma.scheduleAssignment.deleteMany();
  await prisma.note.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.pmChecklistItem.deleteMany();
  await prisma.pmPlan.deleteMany();
  await prisma.sparePart.deleteMany();
  await prisma.user.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.asset.deleteMany();

  const technicians = await Promise.all(
    [
      ["Marina Cruz", "marina.cruz@cmms.local", "Electrico", "06:00 - 14:00"],
      ["Luis Ortega", "luis.ortega@cmms.local", "Mecanico", "07:00 - 15:00"],
      ["Daniel Vega", "daniel.vega@cmms.local", "Instrumentacion", "08:00 - 16:00"],
      ["Carla Jimenez", "carla.jimenez@cmms.local", "Confiabilidad", "09:00 - 17:00"],
      ["Hugo Sanchez", "hugo.sanchez@cmms.local", "Servicios auxiliares", "10:00 - 18:00"]
    ].map(([name, email, specialty, shift]) =>
      prisma.technician.create({
        data: {
          name,
          email,
          specialty,
          shift
        }
      })
    )
  );

  await prisma.user.createMany({
    data: [
      {
        name: "Ana Supervisor",
        email: "admin@cmms.local",
        password: "admin123",
        role: UserRole.ADMIN
      },
      {
        name: technicians[0].name,
        email: "tech@cmms.local",
        password: "tech123",
        role: UserRole.TECHNICIAN,
        technicianId: technicians[0].id
      }
    ]
  });

  const assetData = [
    ["MX-PMP-101", "Bomba de proceso 101", "Bombeo principal de jarabe", "Produccion", AssetCriticality.A, "FlowMaster", "FP-900", "SN-P101", -820, -820, 16420],
    ["MX-PMP-102", "Bomba de proceso 102", "Respaldo de linea de jarabe", "Produccion", AssetCriticality.B, "FlowMaster", "FP-900", "SN-P102", -760, -760, 15800],
    ["MX-CMP-201", "Compresor de aire 201", "Compresor tornillo principal", "Utilidades", AssetCriticality.A, "Atlas Sim", "AS-250", "SN-C201", -620, -620, 17550],
    ["MX-CHL-301", "Chiller 301", "Sistema de agua helada", "HVAC", AssetCriticality.A, "CoolCore", "CH-800", "SN-CH301", -540, -540, 14600],
    ["MX-CNV-401", "Transportador 401", "Transportador de empaque linea 1", "Empaque", AssetCriticality.B, "FlexMove", "CV-120", "SN-C401", -480, -480, 13120],
    ["MX-MXR-501", "Mezclador 501", "Mezcla tanque principal", "Produccion", AssetCriticality.A, "MixTek", "MX-50", "SN-M501", -430, -430, 15210],
    ["MX-BLR-601", "Caldera 601", "Caldera de vapor principal", "Utilidades", AssetCriticality.A, "SteamPro", "BL-600", "SN-B601", -920, -920, 18300],
    ["MX-GEN-701", "Generador 701", "Respaldo electrico planta", "Energia", AssetCriticality.B, "PowerForge", "GN-700", "SN-G701", -880, -880, 12740],
    ["MX-ROB-801", "Robot paletizador 801", "Celula de paletizado automatica", "Logistica", AssetCriticality.B, "RoboStack", "RB-8", "SN-R801", -350, -350, 11080],
    ["MX-TNK-901", "Tanque CIP 901", "Tanque de limpieza en sitio", "Sanitario", AssetCriticality.C, "CleanLoop", "CIP-90", "SN-T901", -290, -290, 9840]
  ] as const;

  const assets = await Promise.all(
    assetData.map(
      (
        [
          tag,
          name,
          description,
          area,
          criticality,
          manufacturer,
          model,
          serialNumber,
          installOffset,
          operatingOffset,
          hours
        ],
        index
      ) =>
        prisma.asset.create({
          data: {
            tag,
            name,
            description,
            area,
            criticality,
            status: AssetStatus.OPERATIVE,
            manufacturer,
            model,
            serialNumber,
            installationDate: addDays(now, installOffset),
            lastFailureAt: index % 3 === 0 ? addDays(now, -index - 6) : null,
            operatingSince: addDays(now, operatingOffset),
            baselineOperatingHours: hours,
            technicalSpecifications: `Sistema ${name} con operacion nominal industrial y parametros de simulacion configurables.`
          }
        })
    )
  );

  const spareParts = await Promise.all(
    ([
      ["BRG-6205", "Rodamiento 6205", "Rodamiento estandar para bombas", 18, 23.5, "A-01"],
      ["SEAL-45", "Sello mecanico 45 mm", "Sello para bombas centrifugas", 6, 149.0, "A-03"],
      ["BELT-AX34", "Banda AX34", "Banda para ventiladores y transportadores", 12, 31.5, "B-02"],
      ["FLT-AIR-02", "Filtro de aire industrial", "Elemento para compresor", 9, 88.0, "C-01"],
      ["SNS-TEMP-10", "Sensor de temperatura", "PT100 simulada", 5, 64.0, "D-04"],
      ["LUBE-EP2", "Grasa EP2", "Lubricante multiuso", 20, 14.0, "L-01"]
    ] as SparePartSeed[]).map(([code, name, description, stock, unitCost, location]) =>
      prisma.sparePart.create({
        data: {
          code,
          name,
          description,
          stock,
          unitCost,
          location
        }
      })
    )
  );

  const pmPlans = await Promise.all(
    assets.slice(0, 6).map((asset, index) =>
      prisma.pmPlan.create({
        data: {
          code: `PM-${String(index + 1).padStart(3, "0")}`,
          assetId: asset.id,
          title: `Rutina preventiva ${asset.tag}`,
          description: `Rutina preventiva para ${asset.name}.`,
          frequencyDays: [7, 15, 30, 45, 60, 90][index],
          status: PmStatus.ACTIVE,
          trafficLight: [
            TrafficLightStatus.GREEN,
            TrafficLightStatus.GREEN,
            TrafficLightStatus.YELLOW,
            TrafficLightStatus.GREEN,
            TrafficLightStatus.YELLOW,
            TrafficLightStatus.RED
          ][index],
          nextDueAt: addDays(now, index + 2),
          checklistItems: {
            create: [
              { label: "Inspeccion visual general", sortOrder: 1 },
              { label: "Lubricacion de puntos criticos", sortOrder: 2 },
              { label: "Validacion de vibracion/temperatura", sortOrder: 3 }
            ]
          }
        }
      })
    )
  );

  const workOrders = [];

  for (let index = 0; index < 20; index += 1) {
    const asset = assets[index % assets.length];
    const technician = technicians[index % technicians.length];
    const priority = [
      WorkOrderPriority.P1,
      WorkOrderPriority.P2,
      WorkOrderPriority.P3,
      WorkOrderPriority.P4
    ][index % 4];
    const type = [
      WorkOrderType.CORRECTIVE,
      WorkOrderType.PREVENTIVE,
      WorkOrderType.PREDICTIVE
    ][index % 3];
    const status = [
      WorkOrderStatus.OPEN,
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.ON_HOLD,
      WorkOrderStatus.CLOSED
    ][index % 4];
    const createdAt = addHours(now, -(index * 6 + 2));
    const startedAt = status === WorkOrderStatus.OPEN ? null : addMinutes(createdAt, 30);
    const closedAt =
      status === WorkOrderStatus.CLOSED
        ? addMinutes(startedAt ?? createdAt, 60 + index * 8)
        : null;

    const workOrder = await prisma.workOrder.create({
      data: {
        number: makeOtNumber(index + 1),
        assetId: asset.id,
        type,
        priority,
        technicianId: status === WorkOrderStatus.OPEN ? null : technician.id,
        technicianName: status === WorkOrderStatus.OPEN ? "" : technician.name,
        status,
        description: `Atencion simulada para ${asset.name} (${type.toLowerCase()}).`,
        createdAt,
        dueDate: getDueDate(createdAt, priority),
        startedAt,
        closedAt,
        rootCause: closedAt ? "Desgaste operativo normal" : null,
        workPerformed: closedAt ? "Inspeccion, ajuste y validacion funcional" : null,
        repairTimeMinutes: closedAt ? 60 + index * 8 : null,
        pmPlanId: type === WorkOrderType.PREVENTIVE ? pmPlans[index % pmPlans.length].id : null
      }
    });

    workOrders.push(workOrder);

    if (index < 12) {
      await prisma.scheduleAssignment.create({
        data: {
          technicianId: technician.id,
          workOrderId: workOrder.id,
          startAt: addHours(now, index - 4),
          endAt: addHours(now, index - 3)
        }
      });
    }

    if (index < 10) {
      const sparePart = spareParts[index % spareParts.length];
      await prisma.workOrderMaterial.create({
        data: {
          workOrderId: workOrder.id,
          sparePartId: sparePart.id,
          quantity: (index % 3) + 1,
          unitCost: sparePart.unitCost
        }
      });
    }
  }

  await Promise.all(
    assets.slice(0, 4).map((asset, index) =>
      prisma.note.create({
        data: {
          entityType: NoteEntityType.ASSET,
          entityId: asset.id,
          assetId: asset.id,
          content: `Nota inicial de simulacion para ${asset.tag}. Observacion ${index + 1}.`
        }
      })
    )
  );

  await Promise.all(
    workOrders.slice(0, 4).map((workOrder, index) =>
      prisma.note.create({
        data: {
          entityType: NoteEntityType.WORK_ORDER,
          entityId: workOrder.id,
          workOrderId: workOrder.id,
          content: `Seguimiento interno para ${workOrder.number}. Registro ${index + 1}.`
        }
      })
    )
  );

  console.log("Seed completed with demo CMMS simulator data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
