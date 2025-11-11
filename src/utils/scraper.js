/**
 * Web Scraper for BOSA Belgium E-Invoicing Content
 * Extracts e-invoicing related posts from https://bosa.belgium.be/en
 */

/**
 * Search keywords for e-invoicing content
 * ULTRA-COMPREHENSIVE list covering all possible variations and languages
 */
const E_INVOICING_KEYWORDS = [
  // English - Core Terms (with all hyphen variations)
  'e-invoice', 'e invoice', 'einvoice', 'einvoice',
  'e-invoicing', 'e invoicing', 'einvoicing', 'einvoicing',
  'electronic invoice', 'electronic invoicing',
  'digital invoice', 'digital invoicing',
  'e-billing', 'e billing', 'ebilling',
  'electronic billing', 'digital billing',
  'online invoice', 'online invoicing',
  'e-bill', 'e bill', 'ebill',
  'electronic bill',
  
  // English - Abbreviations
  'e-inv', 'e inv', 'einv',
  'e-bill', 'e bill', 'ebill',
  
  // English - Standards & Protocols
  'peppol', 'peppol network', 'peppol standard', 'peppol invoice',
  'ubl', 'universal business language', 'ubl invoice',
  'xml invoice', 'xml invoicing',
  'edi invoice', 'edi invoicing', 'electronic data interchange',
  'structured invoice', 'structured invoicing',
  
  // English - Tax/GST Related
  'irn', 'invoice reference number',
  'gst invoice', 'gst e-invoice', 'gst electronic invoice',
  'e-way bill', 'eway bill', 'e way bill',
  'tax invoice electronic', 'electronic tax invoice',
  
  // English - Related Terms
  'invoice automation', 'automated invoicing',
  'invoice digitization', 'invoice digitalization',
  'invoice compliance', 'invoice regulation',
  'invoice directive', 'invoice legislation',
  'invoice standard', 'invoice specification',
  'invoice format', 'invoice protocol',
  'standardized invoicing', 'structured invoicing',
  
  // Dutch (Nederlands) - Belgium official language
  'e-facturatie', 'e facturatie', 'efacturatie',
  'elektronische facturering', 'elektronische factuur', 'elektronische facturatie',
  'digitale facturering', 'digitale factuur', 'digitale facturatie',
  'online facturering', 'online factuur',
  'elektronisch factureren', 'digitaal factureren',
  'peppol facturatie', 'peppol factuur',
  'e-factuur', 'e factuur', 'efactuur',
  
  // French (Français) - Belgium official language
  'facturation électronique', 'facturation electronique',
  'facture électronique', 'facture electronique',
  'facturation numérique', 'facture numérique',
  'facturation digitale', 'facture digitale',
  'e-facturation', 'e facturation', 'efacturation',
  'peppol facturation', 'peppol facture',
  'facture digitale',
  
  // German (Deutsch) - Common in Belgium
  'elektronische rechnung', 'elektronisches rechnungswesen',
  'digitale rechnung', 'e-rechnung', 'e rechnung', 'erechnung',
  'elektronische fakturierung',
  
  // Spanish (Español)
  'factura electrónica', 'factura electronica',
  'facturación electrónica', 'facturacion electronica',
  'e-factura', 'e factura', 'efactura',
  
  // Italian (Italiano)
  'fattura elettronica', 'fatturazione elettronica',
  'e-fattura', 'e fattura', 'efattura',
  
  // Portuguese (Português) - Brazilian variations
  'nota fiscal eletrônica', 'nota fiscal eletronica',
  'nfe', 'nf-e', 'nfe invoice',
  'e-fatura', 'e fatura', 'efatura',
  
  // Turkish (Türkçe)
  'e-fatura', 'e fatura', 'efatura',
  'elektronik fatura',
  
  // Chinese (中文)
  '电子发票', '電子發票', // Simplified and Traditional
  
  // Japanese (日本語)
  '電子インボイス', '電子請求書',
  
  // Additional Variations with spaces, hyphens, no separator
  'einvoice', 'e-invoice', 'e invoice',
  'einvoicing', 'e-invoicing', 'e invoicing',
  'ebilling', 'e-billing', 'e billing',
  'efacturatie', 'e-facturatie', 'e facturatie',
  'efactuur', 'e-factuur', 'e factuur',
  'efacturation', 'e-facturation', 'e facturation',
  
  // Compound terms
  'einvoice system', 'e-invoice system', 'electronic invoicing system',
  'einvoice platform', 'e-invoice platform',
  'einvoice standard', 'e-invoice standard',
  'einvoice network', 'e-invoice network',
];

/**
 * Check if text contains e-invoicing keywords
 * Uses comprehensive matching including word boundaries and variations
 */
function containsEInvoicingKeywords(text) {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  
  // Check for exact keyword matches
  for (const keyword of E_INVOICING_KEYWORDS) {
    const lowerKeyword = keyword.toLowerCase();
    
    // Direct match
    if (lowerText.includes(lowerKeyword)) {
      return true;
    }
    
    // Match with word boundaries (handles "einvoice" in "einvoice system")
    const regex = new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      return true;
    }
  }
  
  // Check for variations with regex patterns (handles spaces, hyphens, no separator)
  const einvoicePatterns = [
    // English variations
    /\be[\s-]?invoice/i,           // e-invoice, e invoice, einvoice
    /\be[\s-]?invoicing/i,         // e-invoicing, e invoicing, einvoicing
    /\be[\s-]?billing/i,           // e-billing, e billing, ebilling
    /\be[\s-]?bill\b/i,            // e-bill, e bill, ebill
    /\be[\s-]?inv\b/i,             // e-inv, e inv, einv
    /\belectronic[\s-]?invoice/i,   // electronic invoice
    /\belectronic[\s-]?invoicing/i,// electronic invoicing
    /\bdigital[\s-]?invoice/i,      // digital invoice
    /\bdigital[\s-]?invoicing/i,   // digital invoicing
    /\bonline[\s-]?invoice/i,      // online invoice
    /\bonline[\s-]?invoicing/i,    // online invoicing
    
    // Dutch variations
    /\be[\s-]?facturatie/i,        // e-facturatie, e facturatie, efacturatie
    /\be[\s-]?factuur/i,            // e-factuur, e factuur, efactuur
    /\belektronisch[\s-]?factur/i, // elektronische facturering, etc.
    /\bdigitale[\s-]?factur/i,      // digitale facturering, etc.
    
    // French variations
    /\bfactur[\s-]?électronique/i,  // facturation électronique, facture électronique
    /\bfactur[\s-]?electronique/i,  // without accent
    /\bfactur[\s-]?numérique/i,     // facturation numérique
    /\bfactur[\s-]?digitale/i,      // facturation digitale
    /\be[\s-]?facturation/i,        // e-facturation, e facturation
    
    // German variations
    /\belektronisch[\s-]?rechnung/i, // elektronische rechnung
    /\be[\s-]?rechnung/i,           // e-rechnung, e rechnung
    /\belektronisch[\s-]?faktur/i,  // elektronische fakturierung
    
    // Spanish variations
    /\bfactur[\s-]?electr[oó]nica/i, // factura electrónica, facturación electrónica
    /\be[\s-]?factura/i,            // e-factura (Spanish)
    
    // Italian variations
    /\bfattur[\s-]?elettronica/i,   // fattura elettronica
    /\be[\s-]?fattura/i,            // e-fattura (Italian)
    
    // Portuguese/Brazilian variations
    /\bnota[\s-]?fiscal[\s-]?eletr[oô]nica/i, // nota fiscal eletrônica
    /\bnf[\s-]?e\b/i,                // NF-e, NFe
    /\be[\s-]?fatura/i,              // e-fatura (Portuguese)
    
    // Turkish variations
    /\belektronik[\s-]?fatura/i,     // elektronik fatura
    /\be[\s-]?fatura/i,              // e-fatura (Turkish)
    
    // Standards & Protocols
    /\bpeppol/i,                     // PEPPOL
    /\bubl[\s-]?invoice/i,           // UBL invoice
    /\bxml[\s-]?invoice/i,           // XML invoice
    /\bedi[\s-]?invoice/i,           // EDI invoice
    /\bstructured[\s-]?invoice/i,     // structured invoice
    
    // Tax/GST Related
    /\birn\b/i,                      // IRN (Invoice Reference Number)
    /\bgst[\s-]?e[\s-]?invoice/i,    // GST e-invoice
    /\bgst[\s-]?electronic[\s-]?invoice/i, // GST electronic invoice
    /\be[\s-]?way[\s-]?bill/i,       // e-way bill, eway bill
    /\beway[\s-]?bill/i,             // eway bill
  ];
  
  for (const pattern of einvoicePatterns) {
    if (pattern.test(lowerText)) {
      return true;
    }
  }
  
  return false;
}

// Rate limiting for LLM calls
let lastLLMCall = 0;
const LLM_DELAY = 500; // 500ms between LLM calls to avoid rate limits

/**
 * Verify content is about e-invoicing using LLM via backend proxy
 * This is a second verification step to filter out false positives
 */
async function verifyWithLLM(title, content, url) {
  // Rate limiting: wait if we called LLM recently
  const now = Date.now();
  const timeSinceLastCall = now - lastLLMCall;
  if (timeSinceLastCall < LLM_DELAY) {
    await new Promise(resolve => setTimeout(resolve, LLM_DELAY - timeSinceLastCall));
  }
  lastLLMCall = Date.now();
  
  // Use backend proxy to avoid CORS issues
  const PROXY_SERVER = 'http://localhost:3002';
  
  try {
    const response = await fetch(`${PROXY_SERVER}/api/verify-llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
        content: content.substring(0, 800)
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        const isEInvoicing = data.verified === true;
        
        console.log(`LLM verification (${data.method}) for "${title.substring(0, 50)}...": ${isEInvoicing ? 'YES' : 'NO'} (${data.response})`);
        
        return isEInvoicing;
      } else {
        console.log(`LLM verification failed: ${data.error}`);
        return await verifyWithAlternativeLLM(title, content);
      }
    } else {
      console.log(`Backend LLM endpoint error (${response.status}), using alternative verification`);
      return await verifyWithAlternativeLLM(title, content);
    }
  } catch (error) {
    console.log(`LLM verification failed: ${error.message}, using alternative verification`);
    return await verifyWithAlternativeLLM(title, content);
  }
}

/**
 * Alternative verification using enhanced keyword analysis
 * Used when LLM APIs are unavailable
 */
async function verifyWithAlternativeLLM(title, content) {
  const combinedText = `${title} ${content}`.toLowerCase();
  
  // Strong e-invoicing indicators (must have at least one)
  const strongIndicators = [
    'e-invoice', 'einvoice', 'e invoice',
    'e-invoicing', 'einvoicing', 'e invoicing',
    'electronic invoice', 'electronic invoicing',
    'e-facturatie', 'efacturatie', 'e facturatie',
    'elektronische factuur', 'elektronische facturering',
    'facturation électronique', 'facture électronique',
    'facturation electronique', 'facture electronique',
    'peppol', 'ubl invoice', 'xml invoice',
    'e-billing', 'ebilling', 'e billing',
    'digital invoice', 'digital invoicing',
    'e-factuur', 'efactuur', 'e factuur'
  ];
  
  // Count strong indicators
  const strongCount = strongIndicators.filter(indicator => 
    combinedText.includes(indicator.toLowerCase())
  ).length;
  
  if (strongCount === 0) {
    console.log(`Alternative verification: NO (no strong e-invoicing indicators)`);
    return false;
  }
  
  // Exclude terms that indicate non-e-invoicing content
  const excludeTerms = [
    'invoice software', 'invoice template', 'invoice generator',
    'create invoice', 'invoice app', 'invoice management',
    'billing software', 'accounting software', 'invoice tool',
    'invoice maker', 'free invoice', 'invoice design',
    'invoice format', 'invoice sample', 'invoice example'
  ];
  
  // Check if it's about generic invoicing tools/apps (not e-invoicing)
  const hasExcludeTerm = excludeTerms.some(term => {
    const hasTerm = combinedText.includes(term.toLowerCase());
    // Only exclude if it doesn't also mention e-invoicing
    const hasEInvoicing = combinedText.includes('e-invoicing') || 
                         combinedText.includes('electronic invoicing') ||
                         combinedText.includes('e-facturatie');
    return hasTerm && !hasEInvoicing;
  });
  
  if (hasExcludeTerm) {
    console.log(`Alternative verification: NO (generic invoicing tool, not e-invoicing)`);
    return false;
  }
  
  // Additional context check: ensure it's in meaningful context
  // If title mentions e-invoicing but content doesn't, be cautious
  const titleHasKeyword = strongIndicators.some(ind => title.toLowerCase().includes(ind));
  const contentHasKeyword = strongIndicators.some(ind => content.toLowerCase().includes(ind));
  
  // If only title has keyword but content is very short or doesn't mention it, be cautious
  if (titleHasKeyword && !contentHasKeyword && content.length < 50) {
    console.log(`Alternative verification: NO (only title mentions e-invoicing, content too short)`);
    return false;
  }
  
  console.log(`Alternative verification: YES (strong indicator count: ${strongCount})`);
  return true;
}

/**
 * Extract text content from HTML element
 */
function extractText(element) {
  if (!element) return '';
  return element.textContent || element.innerText || '';
}

/**
 * Extract publication date from various formats
 */
function extractDate(element, url) {
  if (!element) {
    // Try to extract from URL if it contains date
    const dateMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
    if (dateMatch) {
      return new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
    }
    return null;
  }

  const text = extractText(element);
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/);
  if (dateMatch) {
    return new Date(dateMatch[0]);
  }

  // Try to parse as date
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Parse HTML content and extract posts
 * Now uses two-step verification: keywords + LLM verification
 */
async function parseHTMLContent(html, baseUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const posts = [];

  // First, check if page content itself contains e-invoicing keywords
  const pageText = extractText(doc.body);
  const pageHasEInvoicing = containsEInvoicingKeywords(pageText);

  // If page has e-invoicing content, extract all relevant links
  if (pageHasEInvoicing) {
    // Look for all links on the page
    const allLinks = doc.querySelectorAll('a[href]');
    const seenUrls = new Set();
    
    for (const link of allLinks) {
      const href = link.getAttribute('href');
      if (!href || seenUrls.has(href)) continue;
      
      const linkText = extractText(link);
      const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      
      // Skip external links and non-content links
      if (fullUrl.includes('mailto:') || fullUrl.includes('tel:') || fullUrl.includes('#')) continue;
      if (!fullUrl.includes('bosa.belgium.be')) continue;
      
      seenUrls.add(href);
      
      // Check if link text or surrounding context mentions e-invoicing
      const parent = link.closest('article, .news-item, .post, li, .card, [class*="item"], div');
      const contextText = extractText(parent || link);
      
      if (containsEInvoicingKeywords(linkText + ' ' + contextText)) {
        const titleElement = parent ? parent.querySelector('h1, h2, h3, h4, .title, [class*="title"]') : link;
        const title = extractText(titleElement).trim() || linkText.trim() || 'E-Invoicing Related Content';
        
        if (title.length < 3) continue;
        
        const dateElement = parent ? parent.querySelector('.date, time, [class*="date"], [class*="published"]') : null;
        const publicationDate = extractDate(dateElement, fullUrl);
        
        let content = contextText || linkText;
        if (content.length > 500) {
          content = content.substring(0, 500) + '...';
        }
        
        // STEP 1: Keyword check (already passed)
        // STEP 2: LLM verification
        const llmVerified = await verifyWithLLM(title, content.trim(), fullUrl);
        
        if (llmVerified) {
          posts.push({
            publicationDate: publicationDate || new Date(),
            url: fullUrl,
            title: title,
            content: content.trim()
          });
        }
      }
    }
    
    // If we found posts, return them
    if (posts.length > 0) {
      return posts;
    }
  }
  
  // REMOVED: Generic fallback that was extracting non-e-invoicing content
  // We ONLY extract content that explicitly contains e-invoicing keywords

  // Look for various content structures
  const selectors = [
    'article',
    '.news-item',
    '.post',
    '.content-item',
    '[class*="news"]',
    '[class*="article"]',
    '[class*="post"]',
    'li[class*="item"]',
    '.card',
    '[class*="card"]',
    '.list-item',
    '[role="article"]'
  ];

  let foundElements = [];
  for (const selector of selectors) {
    const elements = doc.querySelectorAll(selector);
    if (elements.length > 0) {
      foundElements = Array.from(elements);
      break;
    }
  }

  // If no specific structure found, look for links with titles
  if (foundElements.length === 0) {
    const links = doc.querySelectorAll('a[href]');
    foundElements = Array.from(links).filter(link => {
      const text = extractText(link);
      const href = link.getAttribute('href') || '';
      return text.length > 10 && (
        containsEInvoicingKeywords(text) || 
        containsEInvoicingKeywords(href)
      );
    });
  }

  // Process each potential post - ONLY if it contains e-invoicing keywords
  for (const element of foundElements) {
    const titleElement = element.querySelector('h1, h2, h3, h4, .title, [class*="title"]') || element;
    const title = extractText(titleElement).trim();
    
    if (!title || title.length < 5) continue;
    
    // Get full content text for keyword checking
    const elementText = extractText(element);
    const combinedText = title + ' ' + elementText;
    
    // STRICT CHECK: Only extract if it actually contains e-invoicing keywords
    if (!containsEInvoicingKeywords(combinedText)) continue;

    // Extract URL
    let url = '';
    const linkElement = element.querySelector('a[href]') || (element.tagName === 'A' ? element : null);
    if (linkElement) {
      url = linkElement.getAttribute('href') || '';
      if (url && !url.startsWith('http')) {
        url = new URL(url, baseUrl).href;
      }
    }

    if (!url) continue;

    // Extract date
    const dateElement = element.querySelector('.date, [class*="date"], time, .published, [class*="published"]');
    const publicationDate = extractDate(dateElement, url);

    // Extract content/summary
    const contentElement = element.querySelector('.summary, .excerpt, .content, [class*="summary"], [class*="excerpt"], p');
    let content = extractText(contentElement || element);
    // Limit content length
    if (content.length > 500) {
      content = content.substring(0, 500) + '...';
    }

    // STEP 2: LLM API verification
    const llmVerified = await verifyWithLLM(title, content.trim(), url);
    
    if (llmVerified) {
      posts.push({
        publicationDate: publicationDate || new Date(),
        url: url,
        title: title,
        content: content.trim()
      });
    }
  }

  // Also search page content for links - ONLY if they contain e-invoicing keywords
  const allLinks = doc.querySelectorAll('a[href]');
  for (const link of allLinks) {
    const linkText = extractText(link);
    const href = link.getAttribute('href') || '';
    
    if (!href) continue;
    
    // Get context around the link
    const parent = link.closest('article, .news-item, .post, li, .card, div');
    const contextText = extractText(parent || link);
    const combinedLinkText = linkText + ' ' + contextText;
    
    // STRICT CHECK: Only extract if link or context contains e-invoicing keywords
    if (!containsEInvoicingKeywords(combinedLinkText)) continue;
    
    const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
    
    // Check if we already have this URL
    if (!posts.find(p => p.url === fullUrl) && fullUrl.includes('bosa.belgium.be')) {
      const dateElement = parent ? parent.querySelector('.date, time, [class*="date"]') : null;
      const titleElement = parent ? parent.querySelector('h1, h2, h3, h4, .title, [class*="title"]') : link;
      
      const finalTitle = extractText(titleElement).trim() || linkText.trim();
      if (finalTitle.length < 3) continue;
      
      let content = contextText || linkText;
      if (content.length > 500) {
        content = content.substring(0, 500) + '...';
      }
      
      // STEP 2: LLM API verification
      const llmVerified = await verifyWithLLM(finalTitle, content.trim(), fullUrl);
      
      if (llmVerified) {
        posts.push({
          publicationDate: extractDate(dateElement, fullUrl) || new Date(),
          url: fullUrl,
          title: finalTitle,
          content: content.trim()
        });
      }
    }
  }

  return posts;
}

/**
 * Scrape a single page
 */
async function scrapePage(url) {
  // Use backend proxy server (required)
  const html = await fetchPageViaProxy(url);
  
  if (!html) {
    throw new Error(`Failed to scrape ${url}. Please ensure the backend proxy server is running on port 3002 (run: python3 server.py).`);
  }
  
  return await parseHTMLContent(html, url);
}

/**
 * Fetch page content using backend proxy
 */
async function fetchPageViaProxy(url) {
  const PROXY_SERVER = 'http://localhost:3002';
  
  try {
    const response = await fetch(`${PROXY_SERVER}/api/scrape?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    if (data.success) {
      // Return HTML even if empty (for 404 pages)
      return data.html || '';
    } else {
      console.log(`Proxy returned error for ${url}:`, data.error);
      return null;
    }
  } catch (error) {
    console.log(`Proxy fetch failed for ${url}:`, error.message);
    return null;
  }
}

/**
 * Fetch and parse sitemap XML
 * Returns array of { url, lastmod } objects
 */
async function fetchSitemap(sitemapUrl) {
  try {
    const xml = await fetchPageViaProxy(sitemapUrl);
    if (!xml) {
      return null;
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.log('Sitemap XML parsing error:', parserError.textContent);
      return null;
    }
    
    const urls = [];
    const urlElements = doc.querySelectorAll('url');
    
    for (const urlElement of urlElements) {
      const loc = urlElement.querySelector('loc');
      const lastmod = urlElement.querySelector('lastmod');
      
      if (loc) {
        const url = loc.textContent.trim();
        const lastmodDate = lastmod ? new Date(lastmod.textContent.trim()) : null;
        
        urls.push({
          url: url,
          lastmod: lastmodDate && !isNaN(lastmodDate.getTime()) ? lastmodDate : null
        });
      }
    }
    
    // Also check for sitemap index (nested sitemaps)
    const sitemapElements = doc.querySelectorAll('sitemap');
    if (sitemapElements.length > 0) {
      console.log(`Found sitemap index with ${sitemapElements.length} nested sitemaps`);
      // For now, we'll handle the main sitemap. Can be extended to fetch nested sitemaps if needed.
    }
    
    return urls;
  } catch (error) {
    console.log(`Error fetching sitemap ${sitemapUrl}:`, error.message);
    return null;
  }
}

/**
 * Find sitemap URL - tries common locations
 */
async function findSitemapUrl(baseUrl) {
  const commonSitemapPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/sitemap/sitemap.xml',
    '/en/sitemap.xml',
    '/en/sitemap_index.xml'
  ];
  
  for (const path of commonSitemapPaths) {
    const sitemapUrl = baseUrl.replace(/\/$/, '') + path;
    console.log(`Trying sitemap: ${sitemapUrl}`);
    
    try {
      const xml = await fetchPageViaProxy(sitemapUrl);
      if (xml && (xml.includes('<urlset') || xml.includes('<sitemapindex'))) {
        console.log(`✓ Found sitemap at: ${sitemapUrl}`);
        return sitemapUrl;
      }
    } catch (e) {
      // Continue to next path
      continue;
    }
  }
  
  // Also try robots.txt to find sitemap location
  try {
    const robotsTxt = await fetchPageViaProxy(baseUrl + '/robots.txt');
    if (robotsTxt) {
      const sitemapMatch = robotsTxt.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) {
        const sitemapUrl = sitemapMatch[1].trim();
        console.log(`✓ Found sitemap in robots.txt: ${sitemapUrl}`);
        return sitemapUrl;
      }
    }
  } catch (e) {
    // robots.txt not found or error
  }
  
  return null;
}

/**
 * Get pages from sitemap filtered by date
 * Much more efficient than crawling - gets all URLs at once and filters by date
 */
async function getPagesFromSitemap(baseUrl, fromDate, toDate, visitedUrls) {
  console.log('Attempting to use sitemap for faster scraping...');
  
  const sitemapUrl = await findSitemapUrl(baseUrl);
  if (!sitemapUrl) {
    console.log('No sitemap found, falling back to crawling');
    return null;
  }
  
  const sitemapUrls = await fetchSitemap(sitemapUrl);
  if (!sitemapUrls || sitemapUrls.length === 0) {
    console.log('Sitemap is empty or invalid, falling back to crawling');
    return null;
  }
  
  console.log(`Found ${sitemapUrls.length} URLs in sitemap`);
  
  // Normalize dates for comparison
  const normalizeDate = (date) => {
    if (!date) return null;
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };
  
  const normalizedFromDate = fromDate ? normalizeDate(fromDate) : null;
  const normalizedToDate = toDate ? normalizeDate(toDate) : null;
  
  // Filter URLs by date and domain
  const filteredUrls = sitemapUrls
    .filter(item => {
      // Only include BOSA Belgium URLs
      if (!item.url.includes('bosa.belgium.be')) {
        return false;
      }
      
      // Skip already visited URLs
      if (visitedUrls.has(item.url)) {
        return false;
      }
      
      // Filter by date if we have lastmod date (OPTIMIZATION ONLY)
      // Note: We still check actual content dates later, this is just to skip obviously old pages
      if (item.lastmod && normalizedFromDate) {
        const normalizedLastmod = normalizeDate(item.lastmod);
        
        // Only exclude if lastmod is MORE THAN 1 YEAR before fromDate
        // This is a conservative filter since lastmod might not reflect actual content dates
        const oneYearBeforeFromDate = new Date(normalizedFromDate);
        oneYearBeforeFromDate.setFullYear(oneYearBeforeFromDate.getFullYear() - 1);
        
        if (normalizedLastmod < oneYearBeforeFromDate) {
          return false;
        }
        
        // Check toDate - only exclude if lastmod is clearly after toDate
        if (normalizedToDate && normalizedLastmod > normalizedToDate) {
          // Add 1 month buffer since lastmod might be update date, not publication date
          const oneMonthAfterToDate = new Date(normalizedToDate);
          oneMonthAfterToDate.setMonth(oneMonthAfterToDate.getMonth() + 1);
          
          if (normalizedLastmod > oneMonthAfterToDate) {
            return false;
          }
        }
      }
      // Note: We DON'T exclude pages without lastmod - they might still have relevant content
      
      return true;
    })
    .map(item => item.url);
  
  console.log(`Filtered to ${filteredUrls.length} URLs matching date criteria (from ${sitemapUrls.length} total)`);
  
  return filteredUrls;
}

/**
 * Find all pages to scrape
 */
async function findPagesToScrape(baseUrl) {
  const urlsToScrape = [baseUrl];
  
  try {
    // Try to find pagination or search results using backend proxy
    const searchUrls = [
      `${baseUrl}/news`,
      `${baseUrl}/updates`,
      `${baseUrl}/press`,
      `${baseUrl}/search?q=e-invoicing`,
      `${baseUrl}/search?q=electronic+invoicing`,
    ];

    // Try to scrape search pages via proxy
    for (const searchUrl of searchUrls) {
      try {
        const html = await fetchPageViaProxy(searchUrl);
        
        if (html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          // Find pagination links
          const paginationLinks = doc.querySelectorAll('a[href*="page"], a[href*="p="], .pagination a, [class*="pagination"] a');
          paginationLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
              const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
              if (!urlsToScrape.includes(fullUrl)) {
                urlsToScrape.push(fullUrl);
              }
            }
          });
          
          // Also check if this page has e-invoicing content
          const pageText = extractText(doc.body);
          if (containsEInvoicingKeywords(pageText)) {
            if (!urlsToScrape.includes(searchUrl)) {
              urlsToScrape.push(searchUrl);
            }
          }
        }
      } catch (e) {
        // Continue if this page fails
        console.log(`Could not access ${searchUrl}`);
      }
    }
  } catch (error) {
    console.error('Error finding pages:', error);
  }

  return urlsToScrape.slice(0, 10); // Limit to 10 pages
}

/**
 * Search for e-invoicing links on a page
 * STRICT: Only finds links that explicitly contain e-invoicing keywords
 */
function findEInvoicingLinks(html, baseUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = [];
  
  // Get all links
  const allLinks = doc.querySelectorAll('a[href]');
  const seenUrls = new Set();
  
  for (const link of allLinks) {
    const href = link.getAttribute('href');
    if (!href) continue;
    
    const linkText = extractText(link);
    const hrefLower = href.toLowerCase();
    const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
    
    // Skip if already seen or external
    if (seenUrls.has(fullUrl) || !fullUrl.includes('bosa.belgium.be')) continue;
    if (fullUrl.includes('mailto:') || fullUrl.includes('tel:') || fullUrl.includes('#')) continue;
    
    seenUrls.add(fullUrl);
    
    // Get context around the link for better keyword detection
    const parent = link.closest('article, .news-item, .post, li, .card, div, p');
    const contextText = extractText(parent || link);
    
    // STRICT CHECK: Combine link text, href, and context - must contain e-invoicing keywords
    const combinedText = linkText + ' ' + hrefLower + ' ' + contextText;
    
    if (containsEInvoicingKeywords(combinedText)) {
      links.push({
        url: fullUrl,
        title: linkText.trim() || 'E-Invoicing Related',
        text: linkText.toLowerCase()
      });
    }
  }
  
  return links;
}

/**
 * Extract all internal links from a page
 */
function extractAllLinks(html, baseUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = new Set();
  
  const allLinks = doc.querySelectorAll('a[href]');
  
  for (const link of allLinks) {
    const href = link.getAttribute('href');
    if (!href) continue;
    
    try {
      const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      
      // Only include BOSA Belgium internal links
      if (fullUrl.includes('bosa.belgium.be') && 
          !fullUrl.includes('mailto:') && 
          !fullUrl.includes('tel:') &&
          !fullUrl.includes('#') &&
          !fullUrl.includes('javascript:') &&
          !fullUrl.endsWith('.pdf') &&
          !fullUrl.endsWith('.doc') &&
          !fullUrl.endsWith('.docx') &&
          !fullUrl.endsWith('.zip')) {
        // Remove query parameters and fragments for deduplication
        const urlObj = new URL(fullUrl);
        urlObj.search = '';
        urlObj.hash = '';
        links.add(urlObj.href);
      }
    } catch (e) {
      // Skip invalid URLs
      continue;
    }
  }
  
  return Array.from(links);
}

/**
 * Crawl website recursively
 */
async function crawlWebsite(startUrl, maxPages = 100, maxDepth = 5) {
  const visited = new Set();
  const toVisit = [{ url: startUrl, depth: 0 }];
  const allLinks = new Set([startUrl]);
  let pagesScraped = 0;
  
  console.log(`Starting website crawl from ${startUrl}...`);
  console.log(`Max pages: ${maxPages}, Max depth: ${maxDepth}`);
  
  while (toVisit.length > 0 && pagesScraped < maxPages) {
    const { url, depth } = toVisit.shift();
    
    // Skip if already visited or too deep
    if (visited.has(url) || depth > maxDepth) continue;
    
    visited.add(url);
    pagesScraped++;
    
    try {
      console.log(`[${pagesScraped}/${maxPages}] Crawling (depth ${depth}): ${url}`);
      
      const html = await fetchPageViaProxy(url);
      if (html === null) {
        console.log(`  Failed to fetch ${url}`);
        continue;
      }
      
      // Extract all links from this page
      const links = extractAllLinks(html, url);
      
      // Add new links to visit queue
      for (const link of links) {
        if (!visited.has(link) && !allLinks.has(link)) {
          allLinks.add(link);
          toVisit.push({ url: link, depth: depth + 1 });
        }
      }
      
      // Delay for rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log(`  Error crawling ${url}:`, error.message);
      continue;
    }
  }
  
  console.log(`Crawl complete: Visited ${visited.size} pages, found ${allLinks.size} unique links`);
  return Array.from(visited);
}

/**
 * Main scraping function - crawls website and extracts e-invoicing content
 * Simple version: scrapes up to 100 pages without date filtering
 */
export async function scrapeBOSAWebsite() {
  const baseUrl = 'https://bosa.belgium.be/en';
  const maxPages = 100;
  const allPosts = [];
  
  console.log('Starting website scrape...');
  console.log(`Will scrape up to ${maxPages} pages`);
  
  // Crawl website - limit to 100 pages
  const allPages = await crawlWebsite(baseUrl, maxPages, 5, new Set());
  console.log(`Found ${allPages.length} pages to analyze for e-invoicing content`);
  
  // Analyze each page for e-invoicing content
  let analyzed = 0;
  
  for (const url of allPages) {
    analyzed++;
    
    try {
      console.log(`[${analyzed}/${allPages.length}] Analyzing: ${url}`);
      const posts = await scrapePage(url);
      
      allPosts.push(...posts);
      
      if (posts.length > 0) {
        console.log(`  ✓ Found ${posts.length} e-invoicing posts on this page`);
      }
      
      // Delay for rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log(`  Error analyzing ${url}:`, error.message);
      continue;
    }
  }

  // Remove duplicates based on URL
  const uniquePosts = [];
  const seenUrls = new Set();
  
  for (const post of allPosts) {
    if (!seenUrls.has(post.url)) {
      seenUrls.add(post.url);
      uniquePosts.push(post);
    }
  }

  console.log(`\n=== Scraping Complete ===`);
  console.log(`Pages crawled: ${allPages.length}`);
  console.log(`Total posts found: ${allPosts.length}`);
  console.log(`Unique e-invoicing posts: ${uniquePosts.length}`);
  
  return uniquePosts;
}

