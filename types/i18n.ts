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
    username: string;
    password: string;
    login: string;
    createAccount: string;
    loginMode: string;
    signupMode: string;
    country: string;
    selectCountry: string;
    passwordMin: string;
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
    assetsChart: string;
    workOrdersChart: string;
    pmChart: string;
    open: string;
    inProgress: string;
    overdue: string;
    closed: string;
    pmLabel: string;
    correctiveLabel: string;
    availability: string;
    mttr: string;
    mtbf: string;
    overdueWorkOrders: string;
  };
  modules: {
    title: string;
    description: string;
    comingSoon: string;
  };
};
