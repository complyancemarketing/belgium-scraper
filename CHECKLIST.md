# ✅ Supabase Migration Checklist

Use this checklist to verify your Supabase cloud storage setup.

## Pre-Setup Checklist

- [ ] Have existing data? Export it first: Click **📥 Download Excel**
- [ ] Save the Excel file somewhere safe (backup)

## Setup Checklist

### 1. Supabase Account & Project
- [ ] Created Supabase account at https://supabase.com
- [ ] Created new project (name: `belgium-einvoicing` or similar)
- [ ] Noted down database password (saved securely)
- [ ] Project creation completed (wait ~2 minutes)

### 2. Database Table Creation
- [ ] Opened SQL Editor in Supabase dashboard
- [ ] Created new query
- [ ] Pasted SQL from QUICKSTART.md or SUPABASE_SETUP.md
- [ ] Executed query successfully (should see "Success. No rows returned")
- [ ] Verified table exists: Table Editor → See `einvoicing_posts` table

### 3. API Credentials
- [ ] Opened Settings → API in Supabase dashboard
- [ ] Copied **Project URL** (starts with `https://`)
- [ ] Copied **anon public** key (starts with `eyJhbGciOiJI...`)
- [ ] Pasted both into `.env` file
- [ ] No extra spaces or quotes in `.env`
- [ ] `.env` file saved

### 4. Application Setup
- [ ] Dev server restarted (`npm run dev`)
- [ ] Opened browser to app URL
- [ ] Opened browser console (F12)
- [ ] Saw message: `✓ Supabase client initialized successfully`

## Verification Checklist

### Basic Functionality
- [ ] **Load Data**: App loads without errors
- [ ] **Console Check**: See Supabase success messages in console
- [ ] **Table View**: Supabase Dashboard → Table Editor shows `einvoicing_posts`

### Scraping Test
- [ ] Click **🔍 Scrape Now** button
- [ ] Scraping completes successfully
- [ ] Console shows: `💾 Saving X posts to Supabase...`
- [ ] Console shows: `✅ Successfully saved/updated X posts to Supabase`
- [ ] Refresh Supabase Table Editor - see new posts!

### Import/Export Test
- [ ] **Import**: Click **📤 Import Excel**
- [ ] Select your backup Excel file
- [ ] Console shows: `✅ Successfully imported X posts to Supabase`
- [ ] Check Table Editor - see imported data
- [ ] **Export**: Click **📥 Download Excel**
- [ ] Excel file downloads successfully
- [ ] Open Excel - verify data is correct

### Duplicate Prevention Test
- [ ] Import same Excel file again
- [ ] Check Table Editor - row count shouldn't double
- [ ] Verify no duplicate URLs exist

### Multi-Device Test (Optional)
- [ ] Open app on Device A
- [ ] Scrape or add data
- [ ] Open app on Device B (different computer/browser)
- [ ] See same data appears!

### Email Notifications Test
- [ ] Go to Settings tab
- [ ] Enable auto-refresh
- [ ] Enter email address
- [ ] Test email button works
- [ ] Auto-refresh finds new posts
- [ ] Email received with new posts

## Console Messages Checklist

When everything works, you should see:

### ✅ On App Load:
```
✓ Supabase client initialized successfully
📊 Loading all posts from Supabase...
✅ Loaded X posts from Supabase
```

### ✅ On Scrape:
```
🔍 Scraping BOSA Belgium...
💾 Saving X posts to Supabase...
✅ Successfully saved/updated X posts to Supabase
```

### ✅ On Import:
```
📤 Importing Excel file to Supabase...
✅ Successfully imported X posts to Supabase
```

### ⚠️ If Supabase Not Configured:
```
⚠️ Supabase not configured, using localStorage fallback
```

## Troubleshooting Checklist

### If Console Shows "Supabase not configured"
- [ ] Check `.env` file has real values (not `your_supabase_project_url`)
- [ ] Check no typos in variable names (`VITE_SUPABASE_URL`, not `SUPABASE_URL`)
- [ ] Restart dev server after editing `.env`
- [ ] Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)

### If Console Shows "Failed to connect to Supabase"
- [ ] Check URL format: `https://xxxxx.supabase.co` (must have `https://`)
- [ ] Check anon key is complete (very long token)
- [ ] Test connection: Open Project URL in browser (should see Supabase API page)
- [ ] Check Supabase project is active (not paused)

### If Console Shows "Relation does not exist"
- [ ] Table wasn't created
- [ ] Go to SQL Editor
- [ ] Run CREATE TABLE query again
- [ ] Check for error messages in SQL output
- [ ] Verify table name is exactly `einvoicing_posts`

### If Data Not Saving
- [ ] Check browser console for error messages
- [ ] Check Supabase Dashboard → Logs for errors
- [ ] Verify Row Level Security policy was created
- [ ] Try running the RLS policy SQL again

### If Duplicate Posts Being Created
- [ ] Check if `post_url` unique constraint exists
- [ ] In SQL Editor, run:
  ```sql
  SELECT * FROM pg_indexes WHERE tablename = 'einvoicing_posts';
  ```
- [ ] Should see index on `post_url`

## Migration Checklist (If You Have Existing Data)

### Before Migration
- [ ] Export current data: **📥 Download Excel**
- [ ] Save Excel file (backup)
- [ ] Note how many rows you have

### During Migration
- [ ] Complete Supabase setup (see above)
- [ ] Import Excel to Supabase: **📤 Import Excel**
- [ ] Wait for success message

### After Migration
- [ ] Check Supabase Table Editor
- [ ] Verify row count matches original
- [ ] Download Excel from cloud
- [ ] Compare with original Excel file
- [ ] Verify all data present and correct

### Cleanup (Optional)
- [ ] Clear browser cache
- [ ] Reload app
- [ ] Verify data still loads (from Supabase)
- [ ] localStorage can now be safely cleared

## Performance Checklist

### Loading Speed
- [ ] Initial load < 2 seconds
- [ ] Scraping completes in reasonable time
- [ ] No lag when switching tabs

### Browser Console
- [ ] No red errors
- [ ] Only warnings (if any) are from third-party libraries
- [ ] Supabase operations complete successfully

### Supabase Dashboard
- [ ] Table Editor loads quickly
- [ ] Can search/filter data
- [ ] Data updates immediately after scraping

## Security Checklist

- [ ] `.env` file **NOT** committed to git
- [ ] `.gitignore` includes `.env`
- [ ] Using **anon key** (public), not service_role key (secret)
- [ ] Row Level Security enabled on table
- [ ] Policy created for operations

## Final Verification

### Complete System Test
1. [ ] Start fresh browser session (incognito/private)
2. [ ] Open app
3. [ ] See empty state or existing data loads
4. [ ] Click **🔍 Scrape Now**
5. [ ] New posts appear
6. [ ] Check Supabase dashboard - posts there too
7. [ ] Open app in different browser
8. [ ] Same data appears!
9. [ ] **✅ SUCCESS!** Cloud storage is working!

## What to Do Next

### If All Checks Pass ✅
- [ ] Bookmark Supabase dashboard URL
- [ ] Set up auto-refresh in Settings tab
- [ ] Configure email notifications
- [ ] Start monitoring e-invoicing posts!
- [ ] Access from any device, anywhere

### If Some Checks Fail ⚠️
- [ ] Review error messages in console
- [ ] Check Supabase Dashboard → Logs
- [ ] Re-read SUPABASE_SETUP.md
- [ ] Try troubleshooting steps above
- [ ] App still works (using localStorage) while you debug

### Need Help?
- [ ] Check browser console (F12)
- [ ] Check Supabase Dashboard → Logs
- [ ] Review MIGRATION_SUMMARY.md
- [ ] Review SUPABASE_SETUP.md
- [ ] Verify all environment variables

---

## 🎉 Completion Status

When you can check all boxes above, you're done! Your scraper now has:
- ☁️ Cloud storage (accessible anywhere)
- 🔄 Automatic sync across devices
- 💾 Reliable backups
- 📈 Scalable to thousands of posts
- 🔒 Secure with RLS policies

**Congratulations!** You've successfully migrated to Supabase cloud storage! 🚀
