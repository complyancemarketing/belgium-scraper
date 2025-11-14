# 🚀 Quick Start - Supabase Cloud Storage

## You're 5 Minutes Away from Cloud Storage!

### Step 1: Create Supabase Project (2 minutes)
1. Go to https://supabase.com
2. Sign up (free)
3. Click "New Project"
4. Name: `belgium-einvoicing`
5. Choose password & region (Europe West)
6. Click "Create new project"

### Step 2: Create Database Table (1 minute)
1. In your project, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste this:

```sql
-- Table 1: E-Invoicing Posts (only posts related to e-invoicing)
CREATE TABLE einvoicing_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url TEXT UNIQUE NOT NULL,
  post_title TEXT NOT NULL,
  publication_date TEXT,
  content_summary TEXT,
  scrape_timestamp TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'Existing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_post_url ON einvoicing_posts(post_url);

-- Table 2: Page Cache (stores ALL crawled pages for intelligent re-scraping)
CREATE TABLE page_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_page_url ON page_cache(page_url);
CREATE INDEX idx_last_scraped ON page_cache(last_scraped);
CREATE INDEX idx_has_einvoicing ON page_cache(has_einvoicing_content);
CREATE INDEX idx_content_hash ON page_cache(content_hash);

-- Enable Row Level Security
ALTER TABLE einvoicing_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_cache ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now)
CREATE POLICY "Allow all operations on posts" ON einvoicing_posts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on cache" ON page_cache
  FOR ALL USING (true) WITH CHECK (true);
```

4. Click **Run**

### Step 3: Get Your Credentials (1 minute)
1. Click **⚙️ Settings** (bottom left)
2. Click **API**
3. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGci...` (long token)

### Step 4: Update .env File (1 minute)
1. Open `.env` in your project
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_actual_key_here
```

### Step 5: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

## ✅ How to Verify It's Working

1. Open browser console (F12)
2. Look for: `✓ Supabase client initialized successfully`
3. Scrape some data
4. Go to Supabase → **Table Editor** → `einvoicing_posts`
5. See your data in the cloud! 🎉

## 📊 View Your Data Anytime

- **Supabase Dashboard**: https://supabase.com/dashboard
- Click your project → **Table Editor** → `einvoicing_posts`
- Search, filter, export - all in a nice UI

## 🔄 Migrate Existing Data (Optional)

If you already have data:
1. Click **📥 Download Excel** (exports from localStorage)
2. Click **📤 Import Excel** (imports to Supabase)
3. Done! Data now in cloud ☁️

## 🆘 Troubleshooting

**Not seeing Supabase messages?**
- Check `.env` has real values (not placeholders)
- Restart dev server
- Check browser console for errors

**"Relation does not exist" error?**
- SQL wasn't run properly
- Go back to SQL Editor and run it again

**Still works but using localStorage?**
- That's the fallback - app works without Supabase
- But to get cloud storage, complete steps above

## 📚 Full Documentation

- **Detailed Setup**: See `SUPABASE_SETUP.md`
- **What Changed**: See `MIGRATION_SUMMARY.md`

---

**That's it!** Your scraper now stores data in the cloud. Access it from anywhere! 🌍
