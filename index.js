import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

const PORT = 3000;

/**
 * Fecha o modal de avaliação (se existir)
 */
async function fecharModalSeExistir(page) {
  try {
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });

    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return;

      const closeButton =
        dialog.querySelector('button[aria-label="Close"]') ||
        dialog.querySelector('button svg')?.closest('button');

      if (closeButton) closeButton.click();
    });

    await page.waitForTimeout(1500);
  } catch {
    // Modal não apareceu → segue fluxo
  }
}

/**
 * LOGIN + COLETA DE AGENDA
 */
app.post("/agenda", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "email e password são obrigatórios"
    });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium",
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);

    // 1️⃣ LOGIN
    await page.goto("https://adm.bestbarbers.app/login", {
      waitUntil: "domcontentloaded"
    });

    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', email, { delay: 50 });

    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', password, { delay: 50 });

    // botão de login (chakra)
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const btn = buttons.find(b => b.innerText.toLowerCase().includes("entrar"));
      if (btn) btn.click();
    });

    // 2️⃣ AGUARDA A AGENDA
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await page.waitForSelector("aside", { timeout: 60000 });

    // 3️⃣ FECHA MODAL (CRÍTICO)
    await fecharModalSeExistir(page);

    // 4️⃣ GARANTE QUE AGENDA RENDERIZOU
    await page.waitForTimeout(3000);

    // 5️⃣ EXTRAI AGENDA
    const agenda = await page.evaluate(() => {
      const cards = document.querySelectorAll("div");
      const dados = [];

      cards.forEach(card => {
        const texto = card.innerText?.trim();
        if (!texto) return;

        if (
          texto.includes("Clube Podium") ||
          texto.includes("Reunião") ||
          texto.includes("Corte") ||
          texto.includes("Barba")
        ) {
          dados.push({
            texto
          });
        }
      });

      return dados;
    });

    await browser.close();

    return res.json({
      success: true,
      total: agenda.length,
      agenda
    });

  } catch (error) {
    if (browser) await browser.close();

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.send("BestBarbers Puppeteer API ON");
});

app.listen(PORT, () => {
  console.log(`🚀 Puppeteer rodando na porta ${PORT}`);
});
