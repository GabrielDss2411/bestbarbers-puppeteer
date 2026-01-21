import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("BestBarbers Puppeteer API ON");
});

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
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ],
      timeout: 0
    });

    const page = await browser.newPage();

    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // 1️⃣ LOGIN
    await page.goto("https://adm.bestbarbers.app/login", {
      waitUntil: "domcontentloaded"
    });

    await page.waitForSelector('input[name="email"]', { visible: true });
    await page.type('input[name="email"]', email, { delay: 50 });

    await page.waitForSelector('input[name="password"]', { visible: true });
    await page.type('input[name="password"]', password, { delay: 50 });

    // botão real é submit dentro do form
    await page.keyboard.press("Enter");

    // 2️⃣ ESPERA URL DA AGENDA (NÃO load)
    await page.waitForFunction(
      () => window.location.pathname.includes("/agenda"),
      { timeout: 120000 }
    );

    // 3️⃣ FECHA MODAL DE AVALIAÇÃO (SE EXISTIR)
    try {
      await page.waitForSelector('button:has-text("Enviar Avaliação")', {
        timeout: 5000
      });
      await page.keyboard.press("Escape");
    } catch (_) {}

    // 4️⃣ ESPERA AGENDA VISÍVEL
    await page.waitForSelector("text/Agendamentos", { timeout: 120000 });

    // 5️⃣ COLETA DADOS
    const dados = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("div"))
        .filter(el => el.innerText.includes("Corte"));

      return cards.map(card => card.innerText);
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
      error: "Falha ao acessar BestBarbers",
      message: err.message
    });
  }
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
