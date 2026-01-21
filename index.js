import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.send("BestBarbers Puppeteer API ON");
});

/**
 * Login + acesso à agenda
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
    // ===============================
    // 1️⃣ ABRE CHROME (HEADLESS REAL)
    // ===============================
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium",
      headless: "new", // ✅ obrigatório em Docker/EasyPanel
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled"
      ],
      timeout: 0
    });

    const page = await browser.newPage();

    // ===============================
    // 2️⃣ SIMULA NAVEGADOR REAL
    // ===============================
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1366, height: 768 });

    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // ===============================
    // 3️⃣ ACESSA LOGIN
    // ===============================
    await page.goto("https://adm.bestbarbers.app/login", {
      waitUntil: "domcontentloaded"
    });

    // ===============================
    // 4️⃣ INPUT EMAIL (CHAKRA UI)
    // ===============================
    await page.waitForFunction(() => {
      const el = document.querySelector('input[name="email"]');
      return el && el.offsetParent !== null;
    });

    await page.click('input[name="email"]', { clickCount: 3 });
    await page.type('input[name="email"]', email, { delay: 80 });

    // ===============================
    // 5️⃣ INPUT PASSWORD
    // ===============================
    await page.waitForFunction(() => {
      const el = document.querySelector('input[name="password"]');
      return el && el.offsetParent !== null;
    });

    await page.click('input[name="password"]', { clickCount: 3 });
    await page.type('input[name="password"]', password, { delay: 80 });

    // ===============================
    // 6️⃣ SUBMIT LOGIN
    // ===============================
    await page.keyboard.press("Enter");

    // ===============================
    // 7️⃣ ESPERA REDIRECIONAR PARA AGENDA
    // ===============================
    await page.waitForFunction(
      () => window.location.pathname.includes("agenda"),
      { timeout: 120000 }
    );

    // ===============================
    // 8️⃣ FECHA MODAL (SE EXISTIR)
    // ===============================
    try {
      await page.waitForTimeout(3000);
      await page.keyboard.press("Escape");
    } catch (_) {}

    // ===============================
    // 9️⃣ CONFIRMA TELA DE AGENDAMENTOS
    // ===============================
    await page.waitForFunction(() => {
      return document.body.innerText.includes("Agendamentos");
    });

    // ===============================
    // 🔟 COLETA DADOS (EXEMPLO INICIAL)
    // ===============================
    const dados = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("div"))
        .map(el => el.innerText)
        .filter(txt => txt && txt.length > 30)
        .slice(0, 20);
    });

    await browser.close();

    return res.json({
      sucesso: true,
      total: dados.length,
      dados
    });

  } catch (err) {
    if (browser) await browser.close();

    return res.status(500).json({
      sucesso: false,
      erro: "Falha ao acessar BestBarbers",
      detalhe: err.message
    });
  }
});

/**
 * 🚨 PORTA CORRETA PARA EASYPANEL
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Puppeteer BestBarbers rodando na porta ${PORT}`);
});
