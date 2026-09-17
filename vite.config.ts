// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Netlify injecte NETLIFY=true dans l'environnement de build.
// On ne touche à rien d'autre : le preset "netlify" suffit, sans output.dir,
// publicDir ni redirection SPA qui casseraient la structure par défaut.
const isNetlify =
  process.env["NETLIFY"] === "true" || process.env["NETLIFY"] === "1";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(isNetlify ? { nitro: { preset: "netlify" } } : {}),
});
