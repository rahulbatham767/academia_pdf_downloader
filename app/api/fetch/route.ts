import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer, { Browser } from 'puppeteer-core';

// ─── Env ─────────────────────────────────────────────────────────────────────

const LOCAL_CHROME_PATH =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const IS_LOCAL = process.env.NODE_ENV === 'development';

// ─── Utility ──────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  if (!name || name.trim() === '') return `Document_${Date.now()}`;
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .trim()
    .substring(0, 100);
}

// ─── Browser Factory (only used for Scribd) ───────────────────────────────────

async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    args: [
      ...chromium.args,
      '--disable-web-security',
      '--force-device-scale-factor=1',
    ],
    executablePath: IS_LOCAL
      ? LOCAL_CHROME_PATH
      : await chromium.executablePath(),
    headless: IS_LOCAL ? true : (chromium.headless as any),
  }) as unknown as Browser;
}

// ─── 1. Academia.edu Handler — uses downacademia.net API (no browser needed) ──

async function handleAcademia(url: string): Promise<{
  fileName: string;
  base64: string;
  meta: { title: string; description: string; author: string; thumbnail: string };
}> {
  // Step 1: Parse/submit the paper URL
  const parseRes = await fetch('https://downacademia.net/api/parse_paper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!parseRes.ok) {
    throw new Error(`Academia API error: ${parseRes.status} ${parseRes.statusText}`);
  }

  const parseData = await parseRes.json();
  console.log('[academia] parseData:', parseData);

  if (!parseData.success) {
    throw new Error('Academia Parse Failed: ' + (parseData.message || 'Unknown error'));
  }

  const apiTitle: string = parseData.data.title || 'Academia_Document';
  const docId: string = parseData.data.documentId;

  // Step 2: Poll until the PDF is ready (max ~24 seconds)
  let downloadUrl = '';
  for (let i = 0; i < 12; i++) {
    const statusRes = await fetch(
      `https://downacademia.net/api/check_status?id=${docId}`
    );
    const statusData = await statusRes.json();

    if (statusData.success && statusData.data?.status === 'completed') {
      downloadUrl = statusData.data.file?.url || '';
      break;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!downloadUrl) throw new Error('Academia download timed out. Please try again.');

  // Step 3: Download the PDF buffer
  const pdfRes = await fetch(downloadUrl);
  if (!pdfRes.ok) throw new Error('Failed to download PDF from Academia.');
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

  // Step 4: Fetch page metadata for preview (title, thumbnail, etc.)
  let meta = { title: apiTitle, description: '', author: '', thumbnail: '' };
  try {
    const htmlRes = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    });
    const html = await htmlRes.text();

    const getMetaContent = (prop: string) => {
      const m =
        html.match(
          new RegExp(
            `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
            'i'
          )
        ) ||
        html.match(
          new RegExp(
            `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
            'i'
          )
        );
      return m?.[1] || '';
    };

    meta = {
      title: apiTitle, // always prefer the API title
      description:
        getMetaContent('og:description') || getMetaContent('description'),
      author: getMetaContent('author'),
      thumbnail: getMetaContent('og:image'),
    };
  } catch {
    // metadata fetch is best-effort — don't fail the whole request
  }

  return {
    fileName: `${sanitizeFileName(apiTitle)}.pdf`,
    base64: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
    meta,
  };
}

// ─── 2. Scribd Handler — Puppeteer (event-aware sequential hydration) ─────────

async function handleScribd(url: string, browser: Browser): Promise<{
  fileName: string;
  base64: string;
  meta: { title: string; description: string; author: string; thumbnail: string };
}> {
  const page = await browser.newPage();
  const docId = url.match(/document\/(\d+)/)?.[1];

  if (!docId) throw new Error('Invalid Scribd URL — could not extract document ID.');

  // 1. Capture metadata / title
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const title = await page.evaluate(
    () =>
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute('content') || document.title
  );

  // 2. Load the embed player
  const embedUrl = `https://www.scribd.com/embeds/${docId}/content?start_page=1&view_mode=scroll`;
  await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  // 3. De-virtualisation CSS
  await page.addStyleTag({
    content: `
      #doc_container { width: 100% !important; height: auto !important; }
      .react-pdf__Page, .page_bundle, .page-container {
        display: block !important;
        visibility: visible !important;
        position: relative !important;
        width: 100% !important;
        height: auto !important;
        break-after: page !important;
        opacity: 1 !important;
      }
      .blurred_page, .loading_bridge, .upsell, .header, .footer { display: none !important; }
    `,
  });

  // 4. Sequential hydration — scroll each page into view and wait for tiles
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const pageElements = document.querySelectorAll('.react-pdf__Page, .page_bundle');

    for (const pageEl of Array.from(pageElements)) {
      pageEl.scrollIntoView({ behavior: 'auto', block: 'start' });

      let attempts = 0;
      while (attempts < 25) {
        const isLoaded = pageEl.querySelector('canvas, img, .text_layer');
        const isStillFetching = pageEl.querySelector(
          '.fetching, .spinner, .loading_bridge'
        );
        if (isLoaded && !isStillFetching) break;
        await delay(400);
        attempts++;
      }
    }
  });

  // 5. Generate PDF
  await page.emulateMediaType('screen');
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await page.close();

  const cleanTitle =
    !title || title.toLowerCase().includes('scribd')
      ? `Scribd_Document_${Date.now()}`
      : title;

  return {
    fileName: `${sanitizeFileName(cleanTitle)}.pdf`,
    base64: `data:application/pdf;base64,${Buffer.from(pdf).toString('base64')}`,
    meta: { title: cleanTitle, description: '', author: '', thumbnail: '' },
  };
}

// ─── URL Classifier ───────────────────────────────────────────────────────────

type Platform = 'ACADEMIA' | 'SCRIBD' | 'UNKNOWN';

function classifyUrl(url: string): Platform {
  if (url.includes('academia.edu')) return 'ACADEMIA';
  if (url.includes('scribd.com')) return 'SCRIBD';
  return 'UNKNOWN';
}

// ─── POST — Main download handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const platform = classifyUrl(parsedUrl.toString());

    if (platform === 'UNKNOWN') {
      return NextResponse.json(
        { error: 'Only Academia.edu and Scribd URLs are supported.' },
        { status: 400 }
      );
    }

    let result: { fileName: string; base64: string; meta: { title: string; description: string; author: string; thumbnail: string } };

    if (platform === 'ACADEMIA') {
      // Academia uses a plain HTTP API — no browser required
      result = await handleAcademia(url);
    } else {
      // Scribd needs a real browser
      browser = await launchBrowser();
      result = await handleScribd(url, browser);
    }

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      base64: result.base64,
      meta: result.meta,
    });
  } catch (error: unknown) {
    console.error('[fetch-pdf] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch document';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => { });
  }
}

// ─── GET — Metadata prefetch ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  try {
    new URL(url); // validate
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (classifyUrl(url) === 'UNKNOWN') {
    return NextResponse.json({ error: 'Unsupported URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    });

    const html = await response.text();

    const getMetaContent = (prop: string) => {
      const m =
        html.match(
          new RegExp(
            `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
            'i'
          )
        ) ||
        html.match(
          new RegExp(
            `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
            'i'
          )
        );
      return m?.[1] || '';
    };

    const meta = {
      title: getMetaContent('og:title') || url,
      description:
        getMetaContent('og:description') || getMetaContent('description'),
      author: getMetaContent('author'),
      thumbnail: getMetaContent('og:image'),
    };

    return NextResponse.json({ success: true, meta });
  } catch (error) {
    console.error('[metadata] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}