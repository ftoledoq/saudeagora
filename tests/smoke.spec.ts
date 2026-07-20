import { test, expect, type Page } from "@playwright/test";

// Smoke test da jornada crítica dos dois papéis — existe especificamente
// pra pegar a classe de regressão que quebrou numa apresentação real
// (corrida de navegação levando a /login com sessão válida, toque
// bloqueado). Roda contra o deploy que acabou de sair (ver
// playwright.config.ts + .github/workflows/smoke-test.yml), não contra
// localhost em produção.
//
// Credenciais vêm de env vars (secrets do GitHub Actions), nunca
// hardcoded — mesma higiene já usada no resto do projeto pra credencial de
// teste (ver TESTE_CREDENCIAIS.md, gitignored).

const CLIENTE = {
  email: process.env.SMOKE_CLIENTE_EMAIL ?? "",
  senha: process.env.SMOKE_CLIENTE_SENHA ?? "",
};

const PROFISSIONAL = {
  email: process.env.SMOKE_PROFISSIONAL_EMAIL ?? "",
  senha: process.env.SMOKE_PROFISSIONAL_SENHA ?? "",
};

test.beforeAll(() => {
  if (!CLIENTE.email || !CLIENTE.senha || !PROFISSIONAL.email || !PROFISSIONAL.senha) {
    throw new Error(
      "Credenciais de teste ausentes — configure SMOKE_CLIENTE_EMAIL, SMOKE_CLIENTE_SENHA, " +
        "SMOKE_PROFISSIONAL_EMAIL, SMOKE_PROFISSIONAL_SENHA como secrets do GitHub Actions."
    );
  }
});

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Login redireciona pro "next" (default "/") — esperar sair de /login é a
  // confirmação de que autenticou, sem depender de texto específico da home.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

// Navega pelos 3 itens da tab bar e falha se QUALQUER um cair em /login —
// esse é o sintoma exato do bug de corrida original. Retorna a URL final de
// cada clique pra quem chamar decidir o que mais checar.
async function navegarTabBarSemCairEmLogin(page: Page) {
  for (const label of ["Buscar", "Agenda", "Perfil"]) {
    await page.getByRole("navigation").getByRole("link", { name: label }).click();
    await expect(page, `"${label}" não deveria levar a /login com sessão ativa`).not.toHaveURL(/\/login/);
  }
}

test.describe("Jornada crítica — cliente", () => {
  test("login, navegação sem cair em login incorreto, ação principal", async ({ page }) => {
    await login(page, CLIENTE.email, CLIENTE.senha);

    await navegarTabBarSemCairEmLogin(page);

    // Ação principal do cliente: ver as próprias reservas sem erro.
    await page.getByRole("navigation").getByRole("link", { name: "Agenda" }).click();
    await expect(page).toHaveURL(/\/minhas-reservas/);
    await expect(page.getByRole("heading", { name: "Seus agendamentos" })).toBeVisible();
  });

  test("recarregar a página e navegar logo em seguida não cai em login (corrida)", async ({ page }) => {
    // Reproduz o cenário real que quebrou: carga fria (equivalente a um PWA
    // retomando de segundo plano) seguida de toque imediato na tab bar,
    // antes de qualquer resolução assíncrona ter tempo de rodar.
    await login(page, CLIENTE.email, CLIENTE.senha);
    await page.reload();
    await page.getByRole("navigation").getByRole("link", { name: "Perfil" }).click();
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe("Jornada crítica — profissional", () => {
  test("login, navegação sem cair em login incorreto, ação principal", async ({ page }) => {
    await login(page, PROFISSIONAL.email, PROFISSIONAL.senha);

    await navegarTabBarSemCairEmLogin(page);

    // Ação principal do profissional: ver a agenda de pedidos sem erro.
    await page.getByRole("navigation").getByRole("link", { name: "Agenda" }).click();
    await expect(page).toHaveURL(/\/agenda/);
    await expect(page.getByRole("heading", { name: "Pedidos de agendamento" })).toBeVisible();
  });

  test("recarregar a página e navegar logo em seguida não cai em login (corrida)", async ({ page }) => {
    await login(page, PROFISSIONAL.email, PROFISSIONAL.senha);
    await page.reload();
    await page.getByRole("navigation").getByRole("link", { name: "Agenda" }).click();
    await expect(page).not.toHaveURL(/\/login/);
  });
});
