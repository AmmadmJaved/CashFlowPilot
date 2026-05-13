import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cashpilot.app",
  appName: "CashFlowPilot",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    allowNavigation: ["cashpilot.live", "accounts.google.com"],
  },
};

export default config;