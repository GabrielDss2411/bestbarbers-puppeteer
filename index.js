import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * ============================
 * HEALTH CHECK
 * ============================
 */
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

/**
 * ============================
 * TESTE BÁSICO DO PUPPETEER
 * ============================
 * Verifica se Chromium + Puppeteer estão funcionando no container
 */
app.get("/puppeteer-test", async (req, res) => {
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
    await page.goto("https://example.com", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    const title = await page.title();

    await browser.close();

    return res.json({
      success: true,
      title
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
 * ============================
 * LOGIN AUTOMATIZADO
 * ============================
 * Recebe email e senha via POST
 */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email e password são obrigatórios"
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

    await page.goto("https://adm.bestbarbers.app", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Aguarda campos de login
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.waitForSelector('input[name="password"]', { timeout: 30000 });

    await page.type('input[name="email"]', email, { delay: 50 });
    await page.type('input[name="password"]', password, { delay: 50 });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 })
    ]);

    // Captura cookies após login
    const cookies = await page.cookies();

    await browser.close();

    return res.json({
      success: true,
      cookies
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
 * ============================
 * START SERVER
 * ============================
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
