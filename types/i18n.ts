export type Locale = "es" | "en";

export type Dictionary = {
  appName: string;
  navigation: {
    dashboard: string;
    assets: string;
    workOrders: string;
    pmPlans: string;
    spareParts: string;
    technicians: string;
  };
  auth: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    submit: string;
    helper: string;
    invalid: string;
  };
  shell: {
    welcome: string;
    simulator: string;
    moduleStatus: string;
    sessionRole: string;
    signOut: string;
    language: string;
    loading: string;
  };
  dashboard: {
    title: string;
    description: string;
    assets: string;
    workOrders: string;
    pmPlans: string;
    technicians: string;
    foundationStatus: string;
    foundationDescription: string;
  };
  modules: {
    title: string;
    description: string;
    comingSoon: string;
  };
};
