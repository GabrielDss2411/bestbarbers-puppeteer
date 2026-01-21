import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

let browser;
let page;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium",
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });
  }
  return browser;
}

// 🔹 Health check
app.get("/", (req, res) => {
  res.send("BestBarbers Puppeteer API ON");
});

// 🔐 LOGIN
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1366, height: 768 });

    // ✅ URL CORRETA
    await page.goto("https://adm.bestbarbers.app/login", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Aguarda os campos corretos
    await page.waitForSelector('input[type="email"]');
    await page.waitForSelector('input[type="password"]');

    await page.type('input[type="email"]', email, { delay: 50 });
    await page.type('input[type="password"]', senha, { delay: 50 });

    // Botão real do sistema
    await page.click('button[type="submit"]');

    // Aguarda redirecionamento para admin
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    const urlAtual = page.url();

    if (!urlAtual.includes("/admin")) {
      throw new Error("Login não redirecionou para /admin");
    }

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      url: urlAtual
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 👥 EXEMPLO: BUSCAR CLIENTES
app.get("/admin/clientes", async (req, res) => {
  try {
    if (!page) {
      return res.status(401).json({ error: "Sessão não iniciada" });
    }

    await page.goto("https://adm.bestbarbers.app/admin/clientes", {
      waitUntil: "networkidle2"
    });

    const clientes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("table tbody tr")).map(tr => {
        const tds = tr.querySelectorAll("td");
        return {
          nome: tds[0]?.innerText || "",
          telefone: tds[1]?.innerText || "",
          email: tds[2]?.innerText || ""
        };
      });
    });

    res.json(clientes);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});