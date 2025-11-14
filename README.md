# E-Invoicing Web Scraper Dashboard

A fully functional web scraping dashboard that monitors and extracts e-invoicing related content from [BOSA Belgium](https://bosa.belgium.be/en), stores data in **Supabase cloud storage**, tracks new publications, and provides analytics visualization.

## ✨ What's New!

### 🚀 Intelligent Page Cache (NEW!)
**50-80x faster scraping after first run!**
- 🧠 **Smart caching** - Remembers all checked pages
- ⚡ **Skip unchanged pages** - Only checks new/updated content
- ⏱️ **Minutes not hours** - 30 min vs 26 hours for re-scrapes
- 💾 **Automatic** - No configuration needed

**👉 [Learn About Intelligent Cache](INTELLIGENT_CACHE.md)**

### ☁️ Cloud Storage
Your scraped data is stored in **Supabase PostgreSQL database**:
- ☁️ **Access from anywhere** - Your data syncs across all devices
- 🔒 **Never lose data** - Survives browser cache clearing
- 📦 **No storage limits** - Handle thousands of posts effortlessly
- 🔄 **Automatic backups** - Supabase backs up your database
- 📡 **Offline support** - Falls back to localStorage when offline

**👉 [5-Minute Setup Guide](QUICKSTART.md)** | **📚 [Full Documentation](SUPABASE_SETUP.md)**

## Features

### 🔍 Web Scraping
- Automatically scrapes e-invoicing content from BOSA Belgium website
- **Intelligent page cache** - Skips unchanged pages (98% faster!)
- Searches for keywords: e-invoicing, electronic invoicing, e-billing, digital invoicing, PEPPOL
- Handles pagination and multiple pages
- Extracts publication dates, URLs, titles, and content summaries

### 📊 Data Management
- **☁️ Cloud storage** with Supabase PostgreSQL (2 tables: posts + page cache)
- **🧠 Smart caching** - Only re-checks new/changed pages
- Stores data in Excel format (.xlsx) for export
- Automatic duplicate detection based on URL
- Tracks new vs existing posts
- Maintains scrape timestamps
- Data accessible from any device
- Automatic fallback to localStorage if offline

### 📈 Analytics Dashboard
- Total posts counter
- New posts indicator
- Publication frequency charts (monthly)
- Recent posts list with search and filtering
- Date range filtering
- Export functionality

### 🎨 User Interface
- Clean, modern, responsive design
- Vertical sidebar navigation
- Real-time status updates
- Interactive post details modal
- Direct links to original posts
- Error handling with user-friendly messages

## Installation

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip3 install -r requirements.txt
```

### 2. Set up API Keys

Create a `.env` file (or copy from `.env.example`):

```bash
     cp .env.example .env
```

Then edit `.env` and configure:

**Required:**
```env
# Mistral AI API key (for content verification)
MISTRAL_API_KEY=your_actual_api_key_here

# Gmail SMTP (for email notifications)
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
```

**For Cloud Storage (Optional but Recommended):**
```env
# Supabase credentials (see QUICKSTART.md for setup)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

📚 **Get API Keys:**
- **Mistral AI**: [console.mistral.ai](https://console.mistral.ai/)
- **Gmail App Password**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- **Supabase**: [QUICKSTART.md](QUICKSTART.md) (5-minute setup)

### 3. Set up Supabase (Optional - for cloud storage)

**Without Supabase**: App works fine, uses browser localStorage
**With Supabase**: Access your data from anywhere!

👉 **[Follow the 5-minute guide](QUICKSTART.md)** to set up cloud storage

### 4. Start the Application

```bash
npm run dev:all
```

Or start servers separately:
```bash
# Terminal 1: Backend proxy server (Python Flask on port 3002)
npm run server
# or: python3 server.py

# Terminal 2: Frontend dev server (port 3000)
npm run dev
```

### 5. Open your browser to `http://localhost:3000`

**Important**: 
- The backend proxy server (Python Flask on port 3002) is required to bypass CORS restrictions. 
- Mistral AI API key is required for LLM-based content verification.
- Supabase is optional but recommended for cloud storage.
- Without the backend/API key, scraping will fail or return no results.

## Usage

1. **Initial Setup**: When you first open the dashboard, click "Scrape Now" to start collecting data.

2. **Scraping**: Click the "Scrape Now" button to fetch new e-invoicing content from the BOSA website.

3. **Viewing Data**: 
   - Browse recent posts in the main list
   - Click on any post to view full details
   - Use search and date filters to find specific content

4. **Exporting**: 
   - Click "Download Excel" to download all data
   - Use "Export Filtered" to download filtered results

5. **Analytics**: View publication frequency charts and statistics in the dashboard.

## Technical Details

### Storage
- Uses `window.storage` API (with localStorage fallback)
- Data stored as base64-encoded Excel files
- Also maintains JSON format for quick access

### CORS Handling
The application includes a **Python Flask backend proxy server** that handles all web scraping requests server-side, completely bypassing CORS restrictions.

**Architecture:**
- Frontend (React) runs on port 3000
- Backend proxy (Python Flask) runs on port 3002
- All scraping requests go through the backend proxy
- No CORS issues since server-to-server requests don't have CORS restrictions

**Python Dependencies:**
- Flask - Web framework
- Flask-CORS - CORS handling
- Requests - HTTP library for making requests

**LLM Verification:**
- Uses **Mistral AI API** (mistral-tiny model) for intelligent content verification
- Two-step verification: keyword matching + LLM validation
- Ensures high accuracy in detecting e-invoicing related content
- Falls back to enhanced keyword analysis if LLM API is unavailable
- flask-cors - CORS handling
- requests - HTTP client for scraping

**Fallback Options:**
- If backend proxy is unavailable, tries direct fetch
- Falls back to external CORS proxies as last resort

### Excel Structure
- Column A: Publication Date
- Column B: Post URL
- Column C: Post Title
- Column D: Content Summary/Excerpt
- Column E: Scrape Timestamp
- Column F: Status (New/Existing)

## Dependencies

- **React** - UI framework
- **SheetJS (xlsx)** - Excel file handling
- **Recharts** - Data visualization
- **Vite** - Build tool and dev server

## Project Structure

```
belgium-scraper/
├── src/
│   ├── App.jsx          # Main dashboard component
│   ├── App.css          # Styles
│   ├── main.jsx         # React entry point
│   └── utils/
│       ├── scraper.js   # Web scraping logic
│       └── excelHandler.js  # Excel file operations
├── server.py            # Python Flask backend proxy server
├── requirements.txt     # Python dependencies
├── index.html
├── package.json
└── README.md
```

## Error Handling

The application handles:
- Website unavailability
- Empty search results
- Network errors
- CORS restrictions
- Storage quota limits
- Malformed HTML

All errors are displayed to users with clear messages.

## Future Enhancements

- Email notifications for new posts
- Scheduled automatic scraping
- Advanced keyword highlighting
- Content categorization
- Multiple export formats
- Backend proxy integration

## License

MIT License

## Support

For issues or questions, please check the browser console for detailed error messages. The scraper logs all activities for debugging purposes.

