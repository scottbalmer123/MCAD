import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "FIREBASE_"],
  server: {
    port: 5173
  }
});
