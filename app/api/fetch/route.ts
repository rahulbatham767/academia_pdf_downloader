import { NextRequest, NextResponse } from 'next/server';

// ─── Utility ────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w\s\-\.]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100)
    .trim() || 'document';
}

// ─── Academia.edu Handler ────────────────────────────────────────────────────

async function handleAcademia(url: string, browser: import('puppeteer').Browser) {
  const page = await browser.newPage();

  try {
    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to the Academia.edu page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Extract metadata
    const meta = await page.evaluate(() => {
      const title =
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.querySelector('h1')?.textContent ||
        document.title ||
        'Untitled Document';

      const description =
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        document.querySelector('meta[name="description"]')?.getAttribute('content') ||
        '';

      const author =
        document.querySelector('meta[name="author"]')?.getAttribute('content') ||
        document.querySelector('[data-author]')?.getAttribute('data-author') ||
        '';

      const thumbnail =
        document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

      return { title, description, author, thumbnail };
    });

    // Try to find a direct PDF download link first
    const directPdfUrl = await page.evaluate(() => {
      // Look for direct PDF links
      const links = Array.from(document.querySelectorAll('a[href]'));
      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        if (href.includes('.pdf') && !href.includes('javascript')) {
          return href;
        }
      }

      // Look for download buttons
      const downloadBtn = document.querySelector(
        '[data-behavior="download"], .js-download, a[href*="download"]'
      ) as HTMLAnchorElement | null;
      return downloadBtn?.href || null;
    });

    // ── Attempt 1: Direct PDF URL ────────────────────────────────────────────
    if (directPdfUrl) {
      const pdfResponse = await page.goto(directPdfUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      const contentType = pdfResponse?.headers()['content-type'] || '';

      if (contentType.includes('pdf')) {
        const pdfBuffer = await pdfResponse?.buffer();
        if (pdfBuffer) {
          await page.close();
          return {
            fileName: sanitizeFileName(meta.title),
            base64: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
            meta,
          };
        }
      }
    }

    // ── Attempt 2: Print the page as PDF ────────────────────────────────────
    // Re-navigate to the original URL if we left it
    const currentUrl = page.url();
    if (!currentUrl.includes('academia.edu')) {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    }

    // Inject CSS to clean up the page for PDF generation
    await page.addStyleTag({
      content: `
        /* Hide navigation, ads, popups, and UI chrome */
        nav, header, footer, .js-modal, .modal, .overlay, .popup,
        .cookie-banner, .signup-wall, .login-prompt, .ads, [class*="ad-"],
        .share-bar, .recommendation, .sidebar, .related-works,
        .toolbar, .sticky-header, [class*="paywall"], [class*="upsell"],
        [class*="signup"], [class*="login-"], [class*="auth-"],
        .notification, .toast, .alert-banner { 
          display: none !important; 
        }
        
        /* Ensure the document content is visible */
        body { background: white !important; color: black !important; }
        .document-page, .page, article, main { 
          display: block !important; 
          visibility: visible !important;
          width: 100% !important;
        }
        
        /* Remove fixed positioning that interferes */
        [style*="position: fixed"], [style*="position:fixed"] {
          position: relative !important;
        }
      `
    });

    await page.emulateMediaType('screen');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: false,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    await page.close();

    return {
      fileName: sanitizeFileName(meta.title),
      base64: `data:application/pdf;base64,${Buffer.from(pdf).toString('base64')}`,
      meta,
    };
  } catch (err) {
    await page.close();
    throw err;
  }
}

// ─── Scribd Handler (as provided by user) ───────────────────────────────────

async function handleScribd(url: string, browser: import('puppeteer').Browser) {
  const page = await browser.newPage();
  const docId = url.match(/document\/(\d+)/)?.[1];

  if (!docId) throw new Error('Invalid Scribd ID');

  // 1. Capture metadata for the sanitized filename
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const title = await page.evaluate(() =>
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title
  );

  // 2. Load the Embed player (the engine for the GraphQL events)
  const embedUrl = `https://www.scribd.com/embeds/${docId}/content?start_page=1&view_mode=scroll`;
  await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  // 3. INJECT DE-VIRTUALIZATION & COMPRESSION CSS
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
    `
  });

  // 4. THE ASSEMBLY LOGIC: Sequential Hydration
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const pageElements = document.querySelectorAll('.react-pdf__Page, .page_bundle');

    for (const pageEl of Array.from(pageElements)) {
      pageEl.scrollIntoView({ behavior: 'auto', block: 'start' });

      let attempts = 0;
      while (attempts < 25) {
        const isLoaded = pageEl.querySelector('canvas, img, .text_layer');
        const isStillFetching = pageEl.querySelector('.fetching, .spinner, .loading_bridge');

        if (isLoaded && !isStillFetching) break;

        await delay(400);
        attempts++;
      }
    }
  });

  // 5. PDF GENERATION
  await page.emulateMediaType('screen');

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await page.close();

  return {
    fileName: sanitizeFileName(title),
    base64: `data:application/pdf;base64,${Buffer.from(pdf).toString('base64')}`,
    meta: { title, description: '', author: '', thumbnail: '' },
  };
}

// ─── URL Classifier ──────────────────────────────────────────────────────────

function classifyUrl(url: string): 'academia' | 'scribd' | 'unknown' {
  if (url.includes('academia.edu')) return 'academia';
  if (url.includes('scribd.com')) return 'scribd';
  return 'unknown';
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let browser: import('puppeteer').Browser | null = null;

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const urlType = classifyUrl(parsedUrl.toString());

    if (urlType === 'unknown') {
      return NextResponse.json(
        { error: 'Only Academia.edu and Scribd URLs are supported' },
        { status: 400 }
      );
    }

    // Launch Puppeteer
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,900',
      ],
    });

    // Route to the appropriate handler
    const result =
      urlType === 'academia'
        ? await handleAcademia(url, browser)
        : await handleScribd(url, browser);

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      base64: result.base64,
      meta: result.meta,
    });
  } catch (error: unknown) {
    console.error('[fetch-pdf] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch document';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ─── Metadata Prefetch (GET) ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(url);

    if (!classifyUrl(parsedUrl.toString())) {
      return NextResponse.json({ error: 'Unsupported URL' }, { status: 400 });
    }

    // Quick metadata fetch without puppeteer
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    });

    const html = await response.text();

    const getMetaContent = (property: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
      return match?.[1] || '';
    };

    const meta = {
      title: getMetaContent('og:title') || url,
      description: getMetaContent('og:description') || getMetaContent('description'),
      author: getMetaContent('author'),
      thumbnail: getMetaContent('og:image'),
    };

    return NextResponse.json({ success: true, meta });
  } catch (error) {
    console.error('[metadata] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
  }
}
