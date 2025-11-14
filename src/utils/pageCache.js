/**
 * Page Cache Module
 * Stores all crawled pages to avoid re-scraping unchanged content
 * Only NEW or UPDATED pages are scraped on subsequent runs
 */

import { supabase, isSupabaseEnabled, PAGE_CACHE_TABLE } from '../config/supabase.js';

// LocalStorage fallback key
const CACHE_STORAGE_KEY = 'bosa_page_cache';

/**
 * Generate content hash for change detection
 */
function generateContentHash(content) {
  // Simple hash function for content comparison
  let hash = 0;
  const str = content.substring(0, 5000); // First 5KB for performance
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Load all cached pages from Supabase or localStorage
 * @returns {Promise<Map<string, Object>>} Map of URL -> page metadata
 */
export async function loadPageCache() {
  const cacheMap = new Map();
  
  if (isSupabaseEnabled()) {
    try {
      console.log('📥 Loading page cache from Supabase...');
      
      const { data, error } = await supabase
        .from(PAGE_CACHE_TABLE)
        .select('*')
        .order('last_scraped', { ascending: false });
      
      if (error) {
        console.warn('Failed to load from Supabase, using localStorage:', error.message);
        return loadPageCacheFromLocalStorage();
      }
      
      if (data && data.length > 0) {
        data.forEach(page => {
          cacheMap.set(page.page_url, {
            url: page.page_url,
            title: page.page_title,
            lastScraped: page.last_scraped,
            contentHash: page.content_hash,
            hasEInvoicingContent: page.has_einvoicing_content,
            postsCount: page.einvoicing_posts_count,
            lastModified: page.last_modified,
            httpStatus: page.http_status
          });
        });
        console.log(`✅ Loaded ${cacheMap.size} cached pages from Supabase`);
      } else {
        console.log('ℹ️ No cached pages found (first time scraping)');
      }
      
      return cacheMap;
    } catch (error) {
      console.error('Error loading page cache from Supabase:', error);
      return loadPageCacheFromLocalStorage();
    }
  } else {
    return loadPageCacheFromLocalStorage();
  }
}

/**
 * Load page cache from localStorage (fallback)
 */
function loadPageCacheFromLocalStorage() {
  try {
    const cached = localStorage.getItem(CACHE_STORAGE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      const cacheMap = new Map(Object.entries(data));
      console.log(`✅ Loaded ${cacheMap.size} cached pages from localStorage`);
      return cacheMap;
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  return new Map();
}

/**
 * Save page cache to Supabase and localStorage
 * @param {Map<string, Object>} cacheMap - Map of URL -> page metadata
 */
export async function savePageCache(cacheMap) {
  if (isSupabaseEnabled()) {
    try {
      console.log(`💾 Saving ${cacheMap.size} pages to cache...`);
      
      // Convert Map to array of objects
      const pages = Array.from(cacheMap.entries()).map(([url, meta]) => ({
        page_url: url,
        page_title: meta.title || '',
        last_scraped: meta.lastScraped || new Date().toISOString(),
        content_hash: meta.contentHash || '',
        has_einvoicing_content: meta.hasEInvoicingContent || false,
        einvoicing_posts_count: meta.postsCount || 0,
        last_modified: meta.lastModified || null,
        http_status: meta.httpStatus || 200,
        updated_at: new Date().toISOString()
      }));
      
      // Upsert in batches (Supabase limit is ~1000 per request)
      const batchSize = 500;
      for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(PAGE_CACHE_TABLE)
          .upsert(batch, { 
            onConflict: 'page_url',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`Error saving batch ${i / batchSize + 1}:`, error);
        } else {
          console.log(`✅ Saved batch ${i / batchSize + 1} (${batch.length} pages)`);
        }
      }
      
      console.log(`✅ Successfully saved page cache to Supabase`);
      
      // Also save to localStorage as backup
      savePageCacheToLocalStorage(cacheMap);
      
    } catch (error) {
      console.error('Error saving page cache to Supabase:', error);
      savePageCacheToLocalStorage(cacheMap);
    }
  } else {
    savePageCacheToLocalStorage(cacheMap);
  }
}

/**
 * Save page cache to localStorage (fallback)
 */
function savePageCacheToLocalStorage(cacheMap) {
  try {
    const cacheObj = Object.fromEntries(cacheMap);
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheObj));
    console.log(`✅ Saved ${cacheMap.size} pages to localStorage cache`);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Update cache entry for a single page
 * @param {Map} cacheMap - The cache map to update
 * @param {string} url - Page URL
 * @param {string} content - Page HTML content
 * @param {Object} metadata - Additional metadata
 */
export function updateCacheEntry(cacheMap, url, content, metadata = {}) {
  const contentHash = generateContentHash(content);
  
  cacheMap.set(url, {
    url,
    title: metadata.title || '',
    lastScraped: new Date().toISOString(),
    contentHash,
    hasEInvoicingContent: metadata.hasEInvoicingContent || false,
    postsCount: metadata.postsCount || 0,
    lastModified: metadata.lastModified || null,
    httpStatus: metadata.httpStatus || 200
  });
  
  return contentHash;
}

/**
 * Check if a page has changed since last scrape
 * @param {Map} cacheMap - The cache map
 * @param {string} url - Page URL
 * @param {string} content - Current page HTML content
 * @returns {boolean} True if page has changed or is new
 */
export function hasPageChanged(cacheMap, url, content) {
  const cached = cacheMap.get(url);
  
  // New page - definitely changed
  if (!cached) {
    return true;
  }
  
  // Check content hash
  const currentHash = generateContentHash(content);
  return cached.contentHash !== currentHash;
}

/**
 * Get pages that need to be re-scraped
 * @param {Map} cacheMap - The cache map
 * @param {Array<string>} allPageUrls - All discovered page URLs
 * @param {number} maxAgeDays - Maximum age in days before re-scraping
 * @returns {Object} { newPages, changedPages, cachedPages }
 */
export function getPagesToRescrape(cacheMap, allPageUrls, maxAgeDays = 30) {
  const newPages = [];
  const cachedPages = [];
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  for (const url of allPageUrls) {
    const cached = cacheMap.get(url);
    
    if (!cached) {
      // Brand new page
      newPages.push(url);
    } else {
      // Check if cache is too old
      const lastScraped = new Date(cached.lastScraped).getTime();
      const age = now - lastScraped;
      
      if (age > maxAgeMs) {
        // Cache expired, need to re-check
        newPages.push(url);
      } else {
        // Still fresh, can skip
        cachedPages.push(url);
      }
    }
  }
  
  return {
    newPages,        // Pages to scrape
    cachedPages,     // Pages to skip
    totalPages: allPageUrls.length,
    cacheHitRate: (cachedPages.length / allPageUrls.length * 100).toFixed(1) + '%'
  };
}

/**
 * Get statistics about the page cache
 */
export function getCacheStats(cacheMap) {
  const stats = {
    totalPages: cacheMap.size,
    pagesWithEInvoicing: 0,
    pagesWithoutEInvoicing: 0,
    totalEInvoicingPosts: 0,
    oldestScrape: null,
    newestScrape: null
  };
  
  let oldest = Infinity;
  let newest = 0;
  
  for (const [url, meta] of cacheMap.entries()) {
    if (meta.hasEInvoicingContent) {
      stats.pagesWithEInvoicing++;
      stats.totalEInvoicingPosts += meta.postsCount || 0;
    } else {
      stats.pagesWithoutEInvoicing++;
    }
    
    const scraped = new Date(meta.lastScraped).getTime();
    if (scraped < oldest) {
      oldest = scraped;
      stats.oldestScrape = meta.lastScraped;
    }
    if (scraped > newest) {
      newest = scraped;
      stats.newestScrape = meta.lastScraped;
    }
  }
  
  return stats;
}

/**
 * Clear all page cache (use with caution)
 */
export async function clearPageCache() {
  if (isSupabaseEnabled()) {
    try {
      const { error } = await supabase
        .from(PAGE_CACHE_TABLE)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) {
        console.error('Error clearing Supabase cache:', error);
      } else {
        console.log('✅ Cleared page cache from Supabase');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
  
  // Clear localStorage
  localStorage.removeItem(CACHE_STORAGE_KEY);
  console.log('✅ Cleared page cache from localStorage');
}
