import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

let browser;
let page;

// === CONFIG ===
const LOGIN_URL = "https://app.bestbarbers.com.br/login";
const ADMIN_URL = "https://app.bestbarbers.com.br/admin";

// === INIT BROWSER ===
async function initBrowser() {
  if (browser) return;

  browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--dns-prefetch-disable",
      "--disable-features=UseOzonePlatform",
      "--host-resolver-rules=MAP * 8.8.8.8"
    ]
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
}

// === LOGIN ===
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha obrigatórios" });
    }

    await initBrowser();

    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });

    await page.waitForSelector('input[type="email"]', { timeout: 15000 });

    await page.type('input[type="email"]', email, { delay: 50 });
    await page.type('input[type="password"]', senha, { delay: 50 });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    if (page.url().includes("/login")) {
      return res.status(401).json({ error: "Login inválido" });
    }

    res.json({ success: true, url: page.url() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === DASHBOARD ADMIN ===
app.get("/admin/dashboard", async (req, res) => {
  try {
    await initBrowser();

    await page.goto(ADMIN_URL, { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      return {
        title: document.title,
        url: location.href
      };
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === CLIENTES (EXEMPLO) ===
app.get("/admin/clientes", async (req, res) => {
  try {
    await page.goto(`${ADMIN_URL}/clientes`, {
      waitUntil: "networkidle2"
    });

    const clientes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("table tbody tr")).map(tr => {
        const tds = tr.querySelectorAll("td");
        return {
          nome: tds[0]?.innerText,
          telefone: tds[1]?.innerText,
          email: tds[2]?.innerText
        };
      });
    });

    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === START SERVER ===
app.listen(3000, () => {
  console.log("🚀 Puppeteer API rodando na porta 3000");
});
