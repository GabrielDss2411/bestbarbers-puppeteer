import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium",
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 800 });

    console.log("➡️ Abrindo página de login...");
    await page.goto("https://app.bestbarbers.com.br/login", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    console.log("➡️ Preenchendo email...");
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 30000 });
    await page.type('input[type="email"], input[name="email"]', email, { delay: 50 });

    console.log("➡️ Preenchendo senha...");
    await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 30000 });
    await page.type('input[type="password"], input[name="password"]', password, { delay: 50 });

    console.log("➡️ Submetendo formulário...");
    await page.evaluate(() => {
      const form = document.querySelector("form");
      if (form) form.submit();
    });

    console.log("➡️ Aguardando login...");
    await page.waitForNavigation({
      waitUntil: "networkidle2",
      timeout: 60000
    });

    const cookies = await page.cookies();

    await browser.close();

    res.json({
      success: true,
      cookies
    });

  } catch (error) {
    console.error("❌ Erro no login:", error.message);

    if (browser) await browser.close();

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/", (req, res) => {
  res.send("BestBarbers Puppeteer API ON");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
