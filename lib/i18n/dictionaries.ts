import { Dictionary, Locale } from "@/types/i18n";

export const dictionaries: Record<Locale, Dictionary> = {
  es: {
    appName: "CMMS Simulator",
    navigation: {
      dashboard: "Dashboard KPIs",
      assets: "Activos",
      workOrders: "Órdenes de Trabajo",
      pmPlans: "Plan de Mantenimiento",
      spareParts: "Refacciones",
      technicians: "Técnicos"
    },
    auth: {
      title: "Ingreso al simulador",
      subtitle: "Sistema CMMS para gestión de mantenimiento industrial",
      username: "Nombre de usuario",
      password: "Contraseña",
      login: "Iniciar sesión",
      createAccount: "Crear cuenta",
      loginMode: "Iniciar sesión",
      signupMode: "Crear cuenta",
      country: "País",
      selectCountry: "Seleccionar",
      passwordMin: "Mínimo 5 caracteres",
      helper: "Usa tu usuario y contraseña de administrador.",
      invalid: "Credenciales inválidas para el simulador."
    },
    shell: {
      welcome: "Sistema CMMS para gestión de mantenimiento industrial",
      simulator: "Plataforma de mantenimiento industrial",
      moduleStatus: "Estado",
      sessionRole: "Rol",
      signOut: "Cerrar sesión",
      language: "Idioma",
      loading: "Cargando simulador..."
    },
    dashboard: {
      title: "Dashboard industrial",
      description: "Sistema CMMS para gestión de mantenimiento industrial",
      assets: "Activos",
      workOrders: "Órdenes",
      pmPlans: "Planes PM",
      technicians: "Técnicos",
      foundationStatus: "Estado operativo",
      foundationDescription: "Sistema CMMS para gestión de mantenimiento industrial",
      assetsChart: "Activos por área",
      workOrdersChart: "Estado de órdenes",
      pmChart: "PM vs Correctivo",
      open: "Abiertas",
      inProgress: "En proceso",
      overdue: "Atrasadas",
      closed: "Cerradas",
      pmLabel: "PM",
      correctiveLabel: "Correctivo",
      availability: "Disponibilidad de activos",
      mttr: "MTTR",
      mtbf: "MTBF",
      overdueWorkOrders: "OT atrasadas"
    },
    modules: {
      title: "Módulo en preparación",
      description: "Sistema CMMS para gestión de mantenimiento industrial",
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
      subtitle: "CMMS system for industrial maintenance management",
      username: "Username",
      password: "Password",
      login: "Login",
      createAccount: "Create account",
      loginMode: "Sign in",
      signupMode: "Create account",
      country: "Country",
      selectCountry: "Select",
      passwordMin: "Minimum 5 characters",
      helper: "Use your admin username and password.",
      invalid: "Invalid simulator credentials."
    },
    shell: {
      welcome: "CMMS system for industrial maintenance management",
      simulator: "Industrial maintenance platform",
      moduleStatus: "Status",
      sessionRole: "Role",
      signOut: "Sign out",
      language: "Language",
      loading: "Loading simulator..."
    },
    dashboard: {
      title: "Industrial dashboard",
      description: "CMMS system for industrial maintenance management",
      assets: "Assets",
      workOrders: "Work Orders",
      pmPlans: "PM Plans",
      technicians: "Technicians",
      foundationStatus: "Operational status",
      foundationDescription: "CMMS system for industrial maintenance management",
      assetsChart: "Assets by area",
      workOrdersChart: "Work order status",
      pmChart: "PM vs Corrective",
      open: "Open",
      inProgress: "In progress",
      overdue: "Overdue",
      closed: "Closed",
      pmLabel: "PM",
      correctiveLabel: "Corrective",
      availability: "Asset availability",
      mttr: "MTTR",
      mtbf: "MTBF",
      overdueWorkOrders: "Overdue work orders"
    },
    modules: {
      title: "Module in preparation",
      description: "CMMS system for industrial maintenance management",
      comingSoon: "Next phase"
    }
  }
};
