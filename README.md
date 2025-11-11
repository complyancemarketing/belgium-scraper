# E-Invoicing Web Scraper Dashboard

A fully functional web scraping dashboard that monitors and extracts e-invoicing related content from [BOSA Belgium](https://bosa.belgium.be/en), stores data in Excel format, tracks new publications, and provides analytics visualization.

## Features

### 🔍 Web Scraping
- Automatically scrapes e-invoicing content from BOSA Belgium website
- Searches for keywords: e-invoicing, electronic invoicing, e-billing, digital invoicing, PEPPOL
- Handles pagination and multiple pages
- Extracts publication dates, URLs, titles, and content summaries

### 📊 Data Management
- Stores data in Excel format (.xlsx)
- Automatic duplicate detection based on URL
- Tracks new vs existing posts
- Maintains scrape timestamps
- Data persists across sessions using window.storage API

### 📈 Analytics Dashboard
- Total posts counter
- New posts indicator
- Publication frequency charts (monthly)
- Recent posts list with search and filtering
- Date range filtering
- Export functionality

### 🎨 User Interface
- Clean, modern, responsive design
- Real-time status updates
- Interactive post details modal
- Direct links to original posts
- Error handling with user-friendly messages

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Python dependencies:
```bash
pip3 install -r requirements.txt
```

3. **Set up Mistral AI API key** (required for LLM verification):
   - Get your API key from [Mistral AI Console](https://console.mistral.ai/)
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your Mistral API key:
     ```
     MISTRAL_API_KEY=your_actual_api_key_here
     ```
   - Or set it as an environment variable:
     ```bash
     export MISTRAL_API_KEY=your_actual_api_key_here
     ```

4. Start both servers (backend proxy + frontend):
```bash
npm run dev:all
```

Or start them separately:
```bash
# Terminal 1: Backend proxy server (Python Flask on port 3002)
npm run server
# or: python3 server.py

# Terminal 2: Frontend dev server (port 3000)
npm run dev
```

5. Open your browser to `http://localhost:3000`

**Important**: 
- The backend proxy server (Python Flask on port 3002) is required to bypass CORS restrictions. 
- Mistral AI API key is required for LLM-based content verification.
- Without these, scraping will fail or return no results.

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

