import express from "express";
import puppeteer from "puppeteer";
import "dotenv/config";

const app = express();
app.use(express.json());

app.post("/login", async (req, res) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.goto("https://adm.bestbarbers.app/login", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.type("input[type=email]", process.env.LOGIN_EMAIL, { delay: 40 });
    await page.type("input[type=password]", process.env.LOGIN_PASSWORD, { delay: 40 });

    await Promise.all([
      page.click("button[type=submit]"),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    const cookies = await page.cookies();

    res.json({
      success: true,
      cookies,
      createdAt: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(3333, () => {
  console.log("🚀 Puppeteer API rodando na porta 3333");
});
