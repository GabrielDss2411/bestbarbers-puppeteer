import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

// 🔴 ESSENCIAL
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

/**
 * HEALTH CHECK
 */
app.get("/", (req, res) => {
  res.status(200).send("BestBarbers Puppeteer API ON");
});

/**
 * LOGIN
 */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email e password são obrigatórios" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium",
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    await page.goto("https://adm.bestbarbers.app/login", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Campo email / telefone
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.type('input[name="email"]', email, { delay: 50 });

    // Campo senha
    await page.waitForSelector('input[name="password"]', { timeout: 30000 });
    await page.type('input[name="password"]', password, { delay: 50 });

    // Botão submit (chakra geralmente é button[type=submit])
    await page.click('button[type="submit"]');

    // Aguarda navegação pós-login
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

    res.json({
      success: true,
      message: "Login executado com sucesso",
    });

  } catch (error) {
    console.error("ERRO:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });

  } finally {
    if (browser) await browser.close();
  }
});

/**
 * 🔥 ISSO RESOLVE 90% DOS PROBLEMAS
 */
app.listen(PORT, HOST, () => {
  console.log(`🚀 API rodando em http://${HOST}:${PORT}`);
});
