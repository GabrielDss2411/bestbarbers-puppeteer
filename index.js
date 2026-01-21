import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

/**
 * HEALTH CHECK
 */
app.get("/", (req, res) => {
  res.send("BestBarbers Puppeteer API ON");
});

/**
 * LOGIN
 */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "email e password são obrigatórios",
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
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    // IMPORTANTE: user agent real
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.goto("https://adm.bestbarbers.app/login", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Campo email ou telefone
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.type('input[name="email"]', email, { delay: 40 });

    // Campo senha
    await page.waitForSelector('input[name="password"]', { timeout: 30000 });
    await page.type('input[name="password"]', password, { delay: 40 });

    // 🔥 SUBMIT REAL (ENTER)
    await page.keyboard.press("Enter");

    // Aguarda redirecionamento pós-login
    await page.waitForNavigation({
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const urlAtual = page.url();

    // Se ainda estiver na tela de login, falhou
    if (urlAtual.includes("/login")) {
      throw new Error("Login não efetuado (permaneceu na tela de login)");
    }

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      url: urlAtual,
    });

  } catch (err) {
    console.error("ERRO LOGIN:", err.message);

    res.status(500).json({
      success: false,
      error: err.message,
    });

  } finally {
    if (browser) await browser.close();
  }
});

/**
 * START SERVER
 */
app.listen(PORT, HOST, () => {
  console.log(`🚀 API rodando em http://${HOST}:${PORT}`);
});
