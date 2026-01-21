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
 * Coleta agenda após login
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
    // 1️⃣ ABRE CHROME (DEBUG VISUAL)
    // ===============================
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium",
      headless: "new",          // 🔥 DEBUG VISUAL (OBRIGATÓRIO AGORA)
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
    // 2️⃣ DISFARCE DE NAVEGADOR REAL
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
    // 4️⃣ ESPERA INPUT EMAIL (CHAKRA)
    // ===============================
    await page.waitForFunction(() => {
      const input = document.querySelector('input[name="email"]');
      return input && input.offsetParent !== null;
    });

    await page.click('input[name="email"]', { clickCount: 3 });
    await page.type('input[name="email"]', email, { delay: 80 });

    // ===============================
    // 5️⃣ ESPERA INPUT PASSWORD
    // ===============================
    await page.waitForFunction(() => {
      const input = document.querySelector('input[name="password"]');
      return input && input.offsetParent !== null;
    });

    await page.click('input[name="password"]', { clickCount: 3 });
    await page.type('input[name="password"]', password, { delay: 80 });

    // ===============================
    // 6️⃣ SUBMIT (ENTER FUNCIONA MELHOR)
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

    // ===================
