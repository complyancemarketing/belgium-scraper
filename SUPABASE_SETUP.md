# Supabase Setup Guide

This guide will help you set up Supabase cloud storage for your Belgium E-Invoicing Scraper.

## Why Supabase?

Your scraped data will now be stored in the cloud (Supabase PostgreSQL database) instead of browser localStorage. This means:
- ✅ Access your data from any device
- ✅ Data persists even if you clear browser cache
- ✅ Automatic backups
- ✅ Better performance for large datasets
- ✅ Still works offline (falls back to localStorage)

## Setup Steps

### 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email

### 2. Create a New Project

1. After logging in, click "New Project"
2. Fill in the details:
   - **Name**: `belgium-einvoicing` (or any name you prefer)
   - **Database Password**: Choose a strong password (save it somewhere safe)
   - **Region**: Choose the closest region to Belgium (e.g., Europe West)
   - **Pricing Plan**: Free tier is sufficient for this project
3. Click "Create new project"
4. Wait 1-2 minutes for the project to be created

### 3. Get Your API Credentials

1. In your Supabase project dashboard, click on the ⚙️ **Settings** icon (bottom left)
2. Click **API** in the sidebar
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **Project API keys** → **anon public**: A long token starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. Create the Database Table

1. In your Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste the following SQL code:

```sql
-- Create table for e-invoicing posts
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

-- Create index for faster lookups
CREATE INDEX idx_post_url ON einvoicing_posts(post_url);

-- Enable Row Level Security (RLS)
ALTER TABLE einvoicing_posts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a personal project)
-- For production, you'd want more restrictive policies
CREATE POLICY "Allow all operations" ON einvoicing_posts
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
5. You should see "Success. No rows returned"

### 5. Update Your .env File

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

**Example:**
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxMjQwMjM2MCwiZXhwIjoxOTI3OTc4MzYwfQ.1234567890abcdefghijklmnopqrstuvwxyz
```

### 6. Restart Your Development Server

1. Stop the current dev server (Ctrl+C in terminal)
2. Restart it:
```bash
npm run dev
```

## Verification

After setup, you can verify it's working:

1. Open your browser console (F12)
2. Look for these messages when the app loads:
   - ✅ `"✓ Supabase client initialized successfully"`
   - ✅ `"📊 Loading all posts from Supabase..."`
   - ✅ `"✅ Loaded X posts from Supabase"`

3. Try scraping or importing data - you should see Supabase messages in the console

## Viewing Your Data in Supabase

1. Go to your Supabase dashboard
2. Click **Table Editor** (left sidebar)
3. Select `einvoicing_posts` table
4. You'll see all your scraped posts in a nice table format
5. You can search, filter, and even manually edit data if needed

## Migrating Existing Data

If you already have data in localStorage:

1. Click **📥 Download Excel** to export your current data
2. Then click **📤 Import Excel** to import it back
3. The data will now be saved to Supabase automatically

## Troubleshooting

### "Failed to connect to Supabase"
- Check that your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Make sure there are no extra spaces in the `.env` file
- Restart the dev server after changing `.env`

### "Database error: relation does not exist"
- The table wasn't created properly
- Go back to SQL Editor and run the CREATE TABLE query again

### App still works but no Supabase messages
- Check if `.env` file has the actual credentials (not placeholders)
- The app will fall back to localStorage if Supabase isn't configured
- Check browser console for error messages

### Data not syncing
- Open browser console and look for error messages
- Check Supabase dashboard → Logs to see server-side errors
- Make sure Row Level Security policy was created

## Security Notes

- ✅ The **anon key** is safe to use in your frontend code
- ✅ Row Level Security (RLS) is enabled on the table
- ⚠️ Never share your database password
- ⚠️ For production, consider more restrictive RLS policies

## Backup Your Data

Supabase automatically backs up your database, but you can also:

1. Use the **📥 Download Excel** button in your app
2. Or from Supabase dashboard → Database → Backups
3. Or export SQL: SQL Editor → Export as SQL

## Free Tier Limits

Supabase free tier includes:
- ✅ 500 MB database space (plenty for thousands of posts)
- ✅ 2 GB bandwidth per month
- ✅ Unlimited API requests
- ✅ 7 days of log retention

For this scraper, you'll likely never hit these limits!

## Need Help?

If you encounter any issues:
1. Check the browser console for error messages
2. Check Supabase dashboard → Logs
3. Re-verify your credentials in `.env`
4. Make sure the table was created successfully

---

**Ready to start?** Follow steps 1-6 above, and you'll have cloud storage set up in about 10 minutes! 🚀
