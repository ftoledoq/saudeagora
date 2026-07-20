import { defineConfig, devices } from "@playwright/test";

// SMOKE_BASE_URL aponta pro deploy que acabou de ficar pronto (setado pelo
// workflow via deployment_status.target_url) — em local, default pro dev
// server. Nunca hardcoda a URL de produção aqui: o objetivo é testar
// exatamente o deploy que acabou de sair, não sempre o domínio principal.
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
