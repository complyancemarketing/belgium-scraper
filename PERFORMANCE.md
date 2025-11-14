# ⚡ Scraping Performance Guide

## How Long Will "Scrape Now" Take?

The answer depends on your scenario and how you use the scraper.

---

## 🎯 Understanding Your Data

### What's in Your Excel File?
Your Excel contains **only e-invoicing posts** (e.g., 50-200 posts), NOT all 6600 website pages.

**Example:**
- Total pages on BOSA website: ~6600
- E-invoicing related posts: ~50-200 (what you have in Excel)
- Regular pages (not e-invoicing): ~6400+ (will be analyzed but skipped)

---

## ⏱️ Time Estimates

### Scenario 1: First Time Scraping (No Excel Import)
**"Scrape Now" button - Full crawl**

```
Starting comprehensive website scrape...
Will crawl ENTIRE website (no page limit)
  ↓
Crawl all ~6600 pages (depth 5)
  ↓
Analyze each page for e-invoicing keywords
  ↓
Find ~150 e-invoicing posts
  ↓
Save to Supabase/localStorage

⏱️ TIME: ~24-26 HOURS
📊 PAGES: 6600 checked
📄 POSTS: ~150 e-invoicing posts found
```

### Scenario 2: After Importing Excel (Recommended!)
**Import Excel → Then "Scrape Now"**

```
Import Excel (150 posts)
  ↓
Click "Scrape Now"
  ↓
Already have 150 post URLs in database
  ↓
Crawl all ~6600 pages (depth 5)
  ↓
Analyze each page for e-invoicing keywords
  ↓
Find posts, but filter out duplicates
  ↓
Find ~5-10 NEW posts since last time

⏱️ TIME: Still ~24-26 HOURS
📊 PAGES: 6600 checked (same as before)
� POSTS: ~5-10 NEW posts (duplicates filtered)
💡 NOTE: Must check all pages to find new posts
```

**Why still 26 hours?**
- New e-invoicing posts can appear on ANY page
- Can't know which pages have new content without checking
- Must crawl entire site to ensure we don't miss anything
- But duplicate **posts** are filtered efficiently

### Scenario 3: Auto-Refresh Mode (Background Monitoring)
**Settings tab → Enable Auto-Refresh**

```
Auto-refresh runs every X hours
  ↓
Incremental mode activated
  ↓
Crawl only depth 2 (shallow, recent pages)
  ↓
Check only first 20 pages
  ↓
Find ~0-5 new posts
  ↓
Send email if new posts found

⏱️ TIME: 2-5 MINUTES ⚡
📊 PAGES: 20 checked (recent only)
📄 POSTS: ~0-5 new posts
💡 BEST FOR: Daily/weekly monitoring
```

---

## 📊 Comparison Table

| Mode | When | Pages Checked | Time | Best For |
|------|------|--------------|------|----------|
| **Full Crawl** | Manual "Scrape Now" | 6600 | 24-26 hrs | Weekly/monthly deep check |
| **Incremental** | Auto-refresh | 20 | 2-5 min | Daily monitoring |
| **After Import** | With Excel data | 6600 | 24-26 hrs | Filters duplicates efficiently |

---

## 🧠 How Duplicate Filtering Works

### What Gets Stored in Your Excel/Database?
**Post URLs** (article links), not page URLs:
```
✓ https://bosa.belgium.be/en/news/belgium-adopts-peppol
✓ https://bosa.belgium.be/en/press/new-einvoicing-regulation
✓ https://bosa.belgium.be/en/updates/digital-invoicing-mandate
```

### How Scraper Checks for Duplicates:

```javascript
// Step 1: Load your existing post URLs
visitedUrls = { 
  "https://bosa.belgium.be/en/news/belgium-adopts-peppol",
  "https://bosa.belgium.be/en/press/new-einvoicing-regulation",
  ... (150 URLs)
}

// Step 2: Crawl ALL pages (still needs to check all 6600)
for each page in website:
  scrape page for e-invoicing content
  
  for each post found on page:
    if (visitedUrls.has(post.url)):
      ⊘ Skip duplicate
    else:
      ✓ Add as NEW post
```

### Why Can't It Skip Pages?

❌ **Can't do this:**
```
if (page URL is in visited list):
  skip this page  // ← Won't work!
```

✅ **Must do this:**
```
Check EVERY page:
  Find e-invoicing posts
  Then check if POST URLs are duplicates
```

**Reason:** Your Excel has **post URLs**, but scraper needs to check **all pages** to find posts.

---

## 💡 Recommended Workflow

### Best Practice: Import + Auto-Refresh

**One-Time Setup (~30 seconds):**
1. Import your Excel (150 e-invoicing posts)
2. Enable auto-refresh in Settings tab
3. Set interval: Every 6-12 hours
4. Add your email address

**Daily Operation:**
- Auto-refresh runs in background (2-5 min every 6 hrs)
- Checks only recent 20 pages
- Finds new posts automatically
- Sends you email when found
- No manual intervention needed!

**Weekly/Monthly Deep Check:**
- Manually click "Scrape Now" (once a week/month)
- Full crawl: 26 hours
- Catches any posts auto-refresh might have missed
- Run overnight or over weekend

---

## ⚡ Performance Tips

### ✅ DO:
- **Import Excel first** - Prevents re-adding old posts
- **Use auto-refresh** - Quick daily checks (2-5 min)
