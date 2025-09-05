import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Use defineConfig to enable IntelliSense
export default defineConfig(({ mode }) => {
  // 1. Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    define: {
      // 2. Expose each VITE_* variable for use in your code
      "import.meta.env.VITE_AUTH_AUTHORITY": JSON.stringify(env.VITE_AUTH_AUTHORITY),
      "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
      "import.meta.env.VITE_GOOGLE_CLIENT_SECRET": JSON.stringify(env.VITE_GOOGLE_CLIENT_SECRET),
      "import.meta.env.VITE_GOOGLE_REDIRECT_URI": JSON.stringify(env.VITE_GOOGLE_REDIRECT_URI),
      "import.meta.env.VITE_GOOGLE_RESPONSE_TYPE": JSON.stringify(env.VITE_GOOGLE_RESPONSE_TYPE),
      "import.meta.env.VITE_GOOGLE_SCOPE": JSON.stringify(env.VITE_GOOGLE_SCOPE),
    },
  };
});
