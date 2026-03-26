import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const allowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter((host) => host.length > 0);

export default defineConfig({
  plugins: [vue()],
  cacheDir: ".vite-cache",
  server: {
    port: 5173,
    allowedHosts
  },
  preview: {
    allowedHosts
  }
});
