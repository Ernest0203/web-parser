const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

puppeteer.use(StealthPlugin());

async function getBrowser() {
  if (process.env.NODE_ENV === 'production') {
    //const localPuppeteer = require('puppeteer');
    // const chromium = require('@sparticuz/chromium');
    // chromium.setHeadlessMode = true;
    // chromium.setGraphicsMode = false;
    // return localPuppeteer.launch({
    //   headless: true,
    //   executablePath: await chromium.executablePath(),
    //   args: [
    //     ...chromium.args,
    //     '--no-sandbox',
    //     '--disable-setuid-sandbox',
    //     '--disable-dev-shm-usage',
    //     '--disable-gpu',
    //     '--disable-web-security',
    //   ],
    //   defaultViewport: { width: 1280, height: 720 }
    // });

    return puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
    });
  } else {
    return puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

async function detectIfSPA(url) {
  try {
    const res = await axios.get(url, { timeout: 8000 });
    const $ = cheerio.load(res.data);
    return $('body').text().trim().length < 200;
  } catch {
    return true;
  }
}

// async function parseWithPuppeteer(url) {
//   const browser = await getBrowser();
//   try {
//     const page = await browser.newPage();
//     await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
//     await new Promise(r => setTimeout(r, 2000));
//     const html = await page.content();
//     return html;
//   } finally {
//     await browser.close();
//   }
// }

async function parseWithPuppeteer(url) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  const html = await page.content();
  await browser.close();
  return html;
}

async function parseWithAxios(url) {
  const res = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  return res.data;
}

function extractData(html, url) {
  const $ = cheerio.load(html);
  const meta = {};
  $('meta').each((_, el) => {
    const name = $(el).attr('name') || $(el).attr('property');
    const content = $(el).attr('content');
    if (name && content) meta[name] = content;
  });
  const links = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && !href.startsWith('#')) links.push({ href, text });
  });
  const images = [];
  $('img').each((_, el) => {
    images.push({ src: $(el).attr('src'), alt: $(el).attr('alt') || '' });
  });
  const headings = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    headings.push({ tag: el.tagName, text: $(el).text().trim() });
  });
  const paragraphs = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });
  return {
    url,
    title: $('title').text().trim(),
    meta, headings,
    paragraphs: paragraphs.slice(0, 20),
    links: links.slice(0, 50),
    images: images.slice(0, 20),
    parsedAt: new Date().toISOString()
  };
}

app.post('/api/parse', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  try {
    const isSPA = await detectIfSPA(url);
    const html = isSPA ? await parseWithPuppeteer(url) : await parseWithAxios(url);
    const data = extractData(html, url);
    data.renderMethod = isSPA ? 'puppeteer (SPA/React)' : 'axios (SSR/static)';
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parse-maersk', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const match = url.match(/tracking\/([A-Z0-9]+)/i);
  if (!match) return res.status(400).json({ error: 'Не удалось извлечь номер контейнера из URL' });

  const trackingNumber = match[1];

  let browser;
  try {
    browser = await getBrowser();
    // browser = await puppeteer.launch({
    //   headless: true,
    //   executablePath: process.env.CHROMIUM_PATH || undefined,
    //   args: [
    //     '--no-sandbox',
    //     '--disable-setuid-sandbox',
    //     '--disable-dev-shm-usage',
    //     '--disable-gpu'
    //   ]
    // });

    const page = await browser.newPage();

    // Перехватываем API ответ прямо в браузере
    let trackingData = null;

    await new Promise(r => setTimeout(r, 1000));

    await page.setRequestInterception(true);
    page.on('request', req => req.continue());

    page.on('response', async response => {
      const respUrl = response.url();
      if (respUrl.includes('synergy/tracking') || respUrl.includes('/tracking/')) {
        try {
          const json = await response.json();
          trackingData = json;
        } catch {}
      }
    });

    // await page.goto(`https://www.maersk.com/tracking/${trackingNumber}`, {
    //   waitUntil: 'networkidle2',
    //   timeout: 30000
    // });

    await page.goto(`https://www.maersk.com/tracking/${trackingNumber}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });

    // Ждём ещё немного чтобы API успел ответить
    await new Promise(r => setTimeout(r, 10000));

    await browser.close();

    if (trackingData) {
      res.json({ trackingNumber, ...trackingData });
    } else {
      // Если не перехватили API — парсим HTML
      const html = await page.content();
      res.json({ trackingNumber, raw: 'API не перехвачен', html: html.slice(0, 500) });
    }

  } catch (err) {
    console.error(err);
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));