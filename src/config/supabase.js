/**
 * Supabase Configuration
 * Cloud database for persistent storage of scraped e-invoicing posts
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials are configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured. Using localStorage as fallback.');
  console.warn('To enable cloud storage, add to .env:');
  console.warn('VITE_SUPABASE_URL=your_supabase_url');
  console.warn('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Check if Supabase is enabled
export const isSupabaseEnabled = () => {
  return supabase !== null;
};

// Table name for e-invoicing posts
export const POSTS_TABLE = 'einvoicing_posts';

// Table name for page cache (stores all crawled pages)
export const PAGE_CACHE_TABLE = 'page_cache';

/**
 * Initialize Supabase table if it doesn't exist
 * Run this once to set up the database schema
 */
export async function initializeSupabaseTable() {
  if (!supabase) {
    console.log('Supabase not configured, skipping table initialization');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Check if table exists by trying to query it
    const { data, error } = await supabase
      .from(POSTS_TABLE)
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist - need to create it via SQL
      console.log('⚠️ Tables do not exist. Please create them in Supabase Dashboard:');
      console.log(`
-- Table 1: E-Invoicing Posts (only posts related to e-invoicing)
CREATE TABLE IF NOT EXISTS ${POSTS_TABLE} (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_url TEXT UNIQUE NOT NULL,
  post_title TEXT NOT NULL,
  publication_date TEXT,
  content_summary TEXT,
  scrape_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'Existing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for posts table
CREATE INDEX IF NOT EXISTS idx_post_url ON ${POSTS_TABLE}(post_url);
CREATE INDEX IF NOT EXISTS idx_scrape_timestamp ON ${POSTS_TABLE}(scrape_timestamp);

-- Table 2: Page Cache (stores ALL crawled pages for intelligent re-scraping)
CREATE TABLE IF NOT EXISTS ${PAGE_CACHE_TABLE} (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_url TEXT UNIQUE NOT NULL,
  page_title TEXT,
  last_scraped TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  content_hash TEXT,
  has_einvoicing_content BOOLEAN DEFAULT false,
  einvoicing_posts_count INTEGER DEFAULT 0,
  last_modified TEXT,
  http_status INTEGER DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for page cache
CREATE INDEX IF NOT EXISTS idx_page_url ON ${PAGE_CACHE_TABLE}(page_url);
CREATE INDEX IF NOT EXISTS idx_last_scraped ON ${PAGE_CACHE_TABLE}(last_scraped);
CREATE INDEX IF NOT EXISTS idx_has_einvoicing ON ${PAGE_CACHE_TABLE}(has_einvoicing_content);
CREATE INDEX IF NOT EXISTS idx_content_hash ON ${PAGE_CACHE_TABLE}(content_hash);

-- Enable Row Level Security
ALTER TABLE ${POSTS_TABLE} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${PAGE_CACHE_TABLE} ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now)
CREATE POLICY "Allow all operations on posts" ON ${POSTS_TABLE}
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on page_cache" ON ${PAGE_CACHE_TABLE}
  FOR ALL USING (true) WITH CHECK (true);
      `);
      return { success: false, error: 'Tables need to be created' };
    }

    console.log('✅ Supabase tables are ready');
    return { success: true };
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    return { success: false, error: error.message };
  }
}
