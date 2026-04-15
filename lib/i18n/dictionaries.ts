import { Dictionary, Locale } from "@/types/i18n";

export const dictionaries: Record<Locale, Dictionary> = {
  es: {
    appName: "CMMS Simulator",
    navigation: {
      dashboard: "Dashboard KPIs",
      assets: "Activos",
      workOrders: "Ordenes de Trabajo",
      pmPlans: "Plan de Mantenimiento",
      spareParts: "Refacciones",
      technicians: "Tecnicos"
    },
    auth: {
      title: "Ingreso al simulador",
      subtitle: "Accede con credenciales demo para revisar la base CMMS local.",
      email: "Correo",
      password: "Contrasena",
      submit: "Entrar",
      helper: "Demo: admin@cmms.local / admin123",
      invalid: "Credenciales invalidas para el simulador."
    },
    shell: {
      welcome: "Base tecnica del simulador CMMS",
      simulator: "Entorno local sin dependencias externas",
      moduleStatus: "Estado",
      sessionRole: "Rol",
      signOut: "Cerrar sesion",
      language: "Idioma",
      loading: "Cargando simulador..."
    },
    dashboard: {
      title: "Dashboard base",
      description: "Panel inicial para validar shell, navegacion y datos demo antes de desarrollar modulos.",
      assets: "Activos modelados",
      workOrders: "OTs demo",
      pmPlans: "Planes PM",
      technicians: "Tecnicos",
      foundationStatus: "Estado de la base",
      foundationDescription: "Prisma, SQLite, datos seed, sesion simulada y shell bilingue ya estan listos. La siguiente fase puede enfocarse en CRUDs y logica de mantenimiento por modulo."
    },
    modules: {
      title: "Modulo en preparacion",
      description: "La estructura de datos y la ruta ya estan listas para continuar con la implementacion progresiva.",
      comingSoon: "Siguiente fase"
    }
  },
  en: {
    appName: "CMMS Simulator",
    navigation: {
      dashboard: "KPI Dashboard",
      assets: "Assets",
      workOrders: "Work Orders",
      pmPlans: "Maintenance Plan",
      spareParts: "Spare Parts",
      technicians: "Technicians"
    },
    auth: {
      title: "Simulator sign in",
      subtitle: "Use demo credentials to access the local CMMS simulator base.",
      email: "Email",
      password: "Password",
      submit: "Sign in",
      helper: "Demo: admin@cmms.local / admin123",
      invalid: "Invalid simulator credentials."
    },
    shell: {
      welcome: "CMMS simulator technical foundation",
      simulator: "Local environment with no external dependencies",
      moduleStatus: "Status",
      sessionRole: "Role",
      signOut: "Sign out",
      language: "Language",
      loading: "Loading simulator..."
    },
    dashboard: {
      title: "Base dashboard",
      description: "Initial panel to validate shell, navigation, and seeded data before building full modules.",
      assets: "Modeled assets",
      workOrders: "Demo work orders",
      pmPlans: "PM plans",
      technicians: "Technicians",
      foundationStatus: "Foundation status",
      foundationDescription: "Prisma, SQLite, seed data, simulated session and bilingual shell are ready. The next phase can focus on CRUD flows and maintenance logic module by module."
    },
    modules: {
      title: "Module in preparation",
      description: "The route and data structure are ready for the next implementation phase.",
      comingSoon: "Next phase"
    }
  }
};
