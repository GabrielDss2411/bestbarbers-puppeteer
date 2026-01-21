import express from "express";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

/**
 * LOGIN BESTBARBERS
 * Endpoint chamado pelo n8n
 */
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      success: false,
      error: "Email e senha são obrigatórios",
    });
  }

  let browser;

  try {
    console.log("🚀 Iniciando Puppeteer...");

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

    await page.setViewport({ width: 1366, height: 768 });

    console.log("🌐 Abrindo página de login...");
    await page.goto("https://adm.bestbarbers.app/login", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    /**
     * Aguarda o React/Chakra montar os inputs
     */
    console.log("⏳ Aguardando campo de email...");
    await page.waitForFunction(
      () => document.querySelector('input[name="email"]'),
      { timeout: 60000 }
    );

    /**
     * EMAIL
     * <input type="inputMask" name="email" placeholder="E-mail ou Telefone">
     */
    console.log("✉️ Preenchendo email...");
    await page.focus('input[name="email"]');
    await page.keyboard.type(email, { delay: 40 });

    /**
     * SENHA
     * <input type="password" name="password" placeholder="Sua senha">
     */
    console.log("🔑 Preenchendo senha...");
    await page.waitForSelector('input[type="password"]', { timeout: 60000 });
    await page.focus('input[type="password"]');
    await page.keyboard.type(senha, { delay: 40 });

    /**
     * BOTÃO ENTRAR (Chakra UI)
     */
    console.log("🟢 Clicando no botão Entrar...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button"))
        .find(b => b.innerText.toLowerCase().includes("entrar"));
      if (!btn) {
        throw new Error("Botão Entrar não encontrado");
      }
      btn.click();
    });

    /**
     * Aguarda redirecionamento pós-login
     */
    await page.waitForTimeout(6000);

    const urlPosLogin = page.url();
    console.log("✅ URL pós-login:", urlPosLogin);

    /**
     * Cookies da sessão
     */
    const cookies = await page.cookies();
    console.log("🍪 Cookies capturados:", cookies.length);

    await browser.close();

    return res.json({
      success: true,
      urlPosLogin,
      cookies,
    });

  } catch (error) {
    console.error("❌ ERRO NO LOGIN:", error.message);

    try {
      if (browser) {
        const pages = await browser.pages();
        if (pages.length > 0) {
          await pages[0].screenshot({
            path: "/app/erro-login.png",
            fullPage: true,
          });
        }
        await browser.close();
      }
    } catch (_) {}

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * HEALTH CHECK
 */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "bestbarbers-puppeteer",
  });
});

app.listen(PORT, () => {
  console.log(`✅ API Puppeteer rodando na porta ${PORT}`);
});
