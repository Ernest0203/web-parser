const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Раздаём собранный React
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

async function parseWithPuppeteer(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ]
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  const html = await page.content();
  await browser.close();
  return html;
}

// async function parseWithPuppeteer(url) {
//   const browser = await puppeteer.launch({
//     headless: 'new',
//     args: [
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-dev-shm-usage',
//       '--disable-gpu'
//     ]
//   });
//   const page = await browser.newPage();
//   await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
//   const html = await page.content();
//   await browser.close();
//   return html;
// }

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
    meta,
    headings,
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

// Все роуты → React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));