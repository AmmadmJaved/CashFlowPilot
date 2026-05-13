import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cashpilot.app",
  appName: "CashFlowPilot",
  webDir: "dist/public",
  server: {
    url: "https://cashpilot.live",
    androidScheme: "https",
  },
};

export default config;