import React, { useState, useEffect, useCallback } from 'react';
import { scrapeBOSAWebsite } from './utils/scraper';
import { 
  loadExistingData, 
  addNewPosts, 
  getAnalyticsData, 
  downloadExcelFile,
  resetAllData
} from './utils/excelHandler';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

 /**
 * Highlight e-invoicing keywords in text
 */
function highlightEInvoicingKeywords(text) {
  if (!text) return '';
  
  // E-invoicing keywords to highlight (case insensitive)
  const keywords = [
    'e-invoicing', 'e invoicing', 'einvoicing',
    'e-invoice', 'e invoice', 'einvoice',
    'electronic invoicing', 'electronic invoice',
    'digital invoicing', 'digital invoice',
    'e-billing', 'e billing', 'ebilling',
    'e-facturatie', 'e facturatie', 'efacturatie',
    'elektronische facturering', 'elektronische factuur',
    'facturation électronique', 'facture électronique',
    'facturation electronique', 'facture electronique',
    'peppol', 'ubl invoice', 'xml invoice',
    'e-factuur', 'e factuur', 'efactuur',
    'e-facturation', 'e facturation', 'efacturation',
    'elektronische rechnung', 'e-rechnung',
    'factura electrónica', 'facturación electrónica',
    'fattura elettronica', 'e-fattura',
    'nota fiscal eletrônica', 'nfe', 'nf-e',
    'e-fatura', 'irn', 'gst invoice', 'e-way bill'
  ];
  
  let highlightedText = text;
  
  // Sort keywords by length (longest first) to avoid partial matches
  const sortedKeywords = keywords.sort((a, b) => b.length - a.length);
  
  sortedKeywords.forEach(keyword => {
    // Create regex that matches the keyword as whole word (case insensitive)
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    highlightedText = highlightedText.replace(
      regex,
      `<mark class="keyword-highlight">$&</mark>`
    );
  });
  
  return highlightedText;
}

function App() {
  const [data, setData] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState('');
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [scrapeDateRange, setScrapeDateRange] = useState({ from: '', to: '' });
  const [selectedPost, setSelectedPost] = useState(null);
  const [scheduledScrapeEnabled, setScheduledScrapeEnabled] = useState(false);
  const [nextScheduledScrape, setNextScheduledScrape] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Scheduled scrape handler - defined before useEffect that uses it
  const handleScheduledScrape = useCallback(async () => {
    if (isScraping) {
      console.log('Scrape already in progress, skipping scheduled scrape');
      return;
    }

    setIsScraping(true);
    console.log('Starting scheduled scrape...');
    setScrapeStatus('Running scheduled scrape at 10 PM IST...');
    
    try {
      const newPosts = await scrapeBOSAWebsite();

      if (newPosts.length > 0) {
        const result = addNewPosts(newPosts);
        setScrapeStatus(`Scheduled scrape complete: Found ${result.stats.new} new posts`);
        
        // Reload data and update analytics
        await loadData();
        updateAnalytics();
        
        // Show notification if browser supports it
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New E-Invoicing Posts Found', {
            body: `Found ${result.stats.new} new e-invoicing posts`,
            icon: '/favicon.ico'
          });
        }
      } else {
        setScrapeStatus('Scheduled scrape complete: No new posts found');
      }
      
      setTimeout(() => {
        setScrapeStatus('');
      }, 5000);
    } catch (err) {
      console.error('Scheduled scraping error:', err);
      setScrapeStatus(`Scheduled scrape failed: ${err.message}`);
      setTimeout(() => {
        setScrapeStatus('');
      }, 5000);
    } finally {
      setIsScraping(false);
    }
  }, [isScraping]);

  // Scheduled scraping setup - runs at 10 PM IST daily
  useEffect(() => {
    if (!scheduledScrapeEnabled) {
      return;
    }

    const calculateNextScrapeTime = () => {
      const now = new Date();
      
      // IST is UTC+5:30
      // Convert current time to IST
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
      const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
      const istTime = new Date(utcTime + istOffset);
      
      // Set target time to 10 PM IST (22:00)
      const targetHour = 22;
      const targetMinute = 0;
      
      // Create target time for today in IST
      const targetTime = new Date(istTime);
      targetTime.setHours(targetHour, targetMinute, 0, 0);
      
      // If it's already past 10 PM IST today, schedule for tomorrow
      if (istTime >= targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      // Convert IST target time back to local time
      const localTargetTime = new Date(targetTime.getTime() - istOffset);
      return localTargetTime;
    };

    const scheduleNextScrape = () => {
      const nextTime = calculateNextScrapeTime();
      setNextScheduledScrape(nextTime);
      
      const now = new Date();
      const msUntilScrape = nextTime.getTime() - now.getTime();
      
      if (msUntilScrape > 0) {
        const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + (5.5 * 60 * 60 * 1000));
        const nextIstTime = new Date(nextTime.getTime() + (nextTime.getTimezoneOffset() * 60 * 1000) + (5.5 * 60 * 60 * 1000));
        console.log(`Current IST: ${istTime.toLocaleString()}, Next scrape at IST: ${nextIstTime.toLocaleString()}`);
        
        const timeoutId = setTimeout(() => {
          console.log('Running scheduled scrape at 10 PM IST...');
          handleScheduledScrape();
          
          // Schedule the next one (24 hours later)
          scheduleNextScrape();
        }, msUntilScrape);
        
        return () => clearTimeout(timeoutId);
      } else {
        // If time has passed, schedule for tomorrow
        const tomorrow = new Date(nextTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setNextScheduledScrape(tomorrow);
        const msUntilTomorrow = tomorrow.getTime() - now.getTime();
        const timeoutId = setTimeout(() => {
          scheduleNextScrape();
        }, msUntilTomorrow);
        return () => clearTimeout(timeoutId);
      }
    };

    const cleanup = scheduleNextScrape();
    return cleanup;
  }, [scheduledScrapeEnabled, handleScheduledScrape]);

  const loadData = async () => {
    try {
      const existingData = loadExistingData();
      setData([...existingData]); // Force re-render with new array reference
      updateAnalytics();
    } catch (err) {
      setError('Failed to load existing data: ' + err.message);
    }
  };

  const updateAnalytics = () => {
    try {
      const analyticsData = getAnalyticsData();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error updating analytics:', err);
    }
  };

  const handleScrape = async () => {
    setIsScraping(true);
    setError(null);
    setScrapeStatus('Starting scrape...');

    try {
      setScrapeStatus('Scraping website (up to 100 pages)...');
      
      const newPosts = await scrapeBOSAWebsite();

      if (newPosts.length === 0) {
        setScrapeStatus('No e-invoicing posts found. This might be due to CORS restrictions preventing access to the website. Check the browser console for details. You may need to use a backend proxy server.');
        setIsScraping(false);
        return;
      }

      setScrapeStatus(`Found ${newPosts.length} posts. Processing...`);
      
      const result = addNewPosts(newPosts);
      
      setScrapeStatus(`Added ${result.stats.new} new posts. Total: ${result.stats.total}`);
      
      // Reload data and update analytics
      await loadData();
      updateAnalytics();
      
      setTimeout(() => {
        setScrapeStatus('');
      }, 3000);
    } catch (err) {
      console.error('Scraping error:', err);
      setError('Scraping failed: ' + err.message + '. Note: CORS restrictions may prevent direct scraping. Check console for details.');
      setScrapeStatus('');
    } finally {
      setIsScraping(false);
    }
  };

  const handleDownload = () => {
    try {
      downloadExcelFile(data);
    } catch (err) {
      setError('Failed to download file: ' + err.message);
    }
  };

  const handleExportFiltered = () => {
    const filtered = getFilteredData();
    try {
      downloadExcelFile(filtered);
    } catch (err) {
      setError('Failed to export filtered data: ' + err.message);
    }
  };

  const handleReset = async () => {
    // Confirm with user
    const confirmed = window.confirm(
      'Are you sure you want to reset all data? This will:\n' +
      '- Clear all stored posts\n' +
      '- Reset all metrics to 0\n' +
      '- Allow scraping to start from the beginning\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      setScrapeStatus('Resetting data...');
      resetAllData();
      
      // Reset all state
      setData([]);
      setAnalytics(null);
      setError(null);
      setSearchTerm('');
      setDateFilter({ start: '', end: '' });
      setSelectedPost(null);
      
      // Update analytics with empty data
      updateAnalytics();
      
      setScrapeStatus('All data has been reset. You can now start fresh scraping.');
      
      setTimeout(() => {
        setScrapeStatus('');
      }, 3000);
    } catch (err) {
      setError('Failed to reset data: ' + err.message);
      setScrapeStatus('');
    }
  };

  const getFilteredData = () => {
    let filtered = [...data];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item['Post Title'] || '').toLowerCase().includes(term) ||
        (item['Content Summary'] || '').toLowerCase().includes(term) ||
        (item['Post URL'] || '').toLowerCase().includes(term)
      );
    }

    // Date filter
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item['Publication Date']);
        return itemDate >= startDate;
      });
    }

    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item['Publication Date']);
        return itemDate <= endDate;
      });
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  return (
    <div className="app">
      <header className="app-header">
        <h1>E-Invoicing Content Scraper</h1>
        <p className="subtitle">Monitoring BOSA Belgium - E-Invoicing Updates</p>
      </header>

      <main className="app-main">
        {/* Status and Controls */}
        <section className="controls-section">
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-value">{analytics?.stats?.total || 0}</div>
              <div className="stat-label">Total Posts</div>
            </div>
            <div className="stat-card new">
              <div className="stat-value">{analytics?.stats?.new || 0}</div>
              <div className="stat-label">New Posts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics?.stats?.existing || 0}</div>
              <div className="stat-label">Existing Posts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {analytics?.stats?.lastScrape 
                  ? new Date(analytics.stats.lastScrape).toLocaleString()
                  : 'Never'}
              </div>
              <div className="stat-label">Last Scrape</div>
            </div>
          </div>

          <div className="action-buttons">
            <button 
              className="btn btn-primary" 
              onClick={handleScrape}
              disabled={isScraping}
            >
              {isScraping ? 'Scraping...' : 'Scrape Now'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleDownload}
              disabled={data.length === 0}
            >
              Download Excel
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={async () => {
                await loadData();
                updateAnalytics();
              }}
            >
              Refresh
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleReset}
              disabled={data.length === 0}
            >
              Reset All
            </button>
          </div>

          {/* Scrape Date Range Settings */}
          <div className="scrape-settings" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Scraping Date Range</h3>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="filter-group">
                <label>From Date (scrape posts from):</label>
                <input
                  type="date"
                  value={scrapeDateRange.from}
                  onChange={(e) => setScrapeDateRange({...scrapeDateRange, from: e.target.value})}
                  className="filter-input"
                  title="Only scrape posts published on or after this date. Leave empty to scrape from last scrape date (incremental)."
                />
              </div>
              <div className="filter-group">
                <label>To Date (scrape posts until):</label>
                <input
                  type="date"
                  value={scrapeDateRange.to}
                  onChange={(e) => setScrapeDateRange({...scrapeDateRange, to: e.target.value})}
                  className="filter-input"
                  title="Only scrape posts published on or before this date. Leave empty to default to today (avoids future-dated posts)."
                />
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setScrapeDateRange({ from: '', to: '' })}
                style={{ marginTop: '20px' }}
              >
                Clear Dates
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: 0 }}>
              <strong>Incremental Scraping:</strong> If "From Date" is empty, the scraper automatically uses the last scrape date to only fetch new posts since your last scrape. This makes scraping faster and avoids duplicates. <strong>Date Range:</strong> If "To Date" is empty, it defaults to today (end of day) to avoid scraping future-dated posts. Set a "From Date" to scrape from a specific date, or set a "To Date" to change the upper bound.
            </p>
          </div>

          {/* Scheduled Scraping Settings */}
          <div className="scheduled-scrape-settings" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Scheduled Scraping</h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scheduledScrapeEnabled}
                  onChange={(e) => {
                    setScheduledScrapeEnabled(e.target.checked);
                    if (e.target.checked && 'Notification' in window && Notification.permission === 'default') {
                      Notification.requestPermission();
                    }
                  }}
                />
                <span>Enable automatic scraping at 10 PM IST daily</span>
              </label>
            </div>
            {scheduledScrapeEnabled && nextScheduledScrape && (
              <p style={{ fontSize: '14px', color: '#333', marginTop: '10px', marginBottom: 0 }}>
                Next scheduled scrape: <strong>
                  {(() => {
                    const istTime = new Date(nextScheduledScrape.getTime() + (nextScheduledScrape.getTimezoneOffset() * 60 * 1000) + (5.5 * 60 * 60 * 1000));
                    return istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
                  })()}
                </strong> ({nextScheduledScrape.toLocaleString()} local time)
              </p>
            )}
            {!scheduledScrapeEnabled && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: 0 }}>
                When enabled, the scraper will automatically run every day at 10 PM IST. It uses incremental mode (only new posts since last scrape) unless you set a "From Date" above. Make sure to keep this browser tab open for scheduled scraping to work.
              </p>
            )}
          </div>

          {scrapeStatus && (
            <div className="status-message">{scrapeStatus}</div>
          )}

          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)} className="close-error">×</button>
            </div>
          )}
        </section>

        {/* Filters */}
        <section className="filters-section">
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by title, content, or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>End Date:</label>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
              className="filter-input"
            />
          </div>
          <button 
            className="btn btn-secondary"
            onClick={handleExportFiltered}
            disabled={filteredData.length === 0}
          >
            Export Filtered ({filteredData.length})
          </button>
        </section>

        {/* Analytics Charts */}
        {analytics && analytics.monthlyChartData.length > 0 && (
          <section className="charts-section">
            <h2>Publication Frequency</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#4A90E2" name="Posts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Recent Posts List */}
        <section className="posts-section">
          <h2>
            {searchTerm || dateFilter.start || dateFilter.end 
              ? `Filtered Posts (${filteredData.length})` 
              : `Recent Posts (${filteredData.length} total)`}
          </h2>
          
          {filteredData.length === 0 ? (
            <div className="empty-state">
              {data.length === 0 
                ? 'No data yet. Click "Scrape Now" to start collecting e-invoicing content.'
                : 'No posts match your filters.'}
            </div>
          ) : (
            <div className="posts-list">
              {filteredData.slice(0, 50).map((item, index) => (
                <div 
                  key={index} 
                  className={`post-item ${item.Status === 'New' ? 'new-post' : ''}`}
                  onClick={() => setSelectedPost(item)}
                >
                  <div className="post-header">
                    <h3 className="post-title">{item['Post Title'] || 'Untitled'}</h3>
                    {item.Status === 'New' && <span className="new-badge">NEW</span>}
                  </div>
                  <div className="post-meta">
                    <span className="post-date">
                      {item['Publication Date'] || 'Unknown date'}
                    </span>
                    <span className="post-status">{item.Status || 'Existing'}</span>
                  </div>
                  <div className="post-content">
                    {item['Content Summary'] || 'No content available'}
                  </div>
                  <a 
                    href={item['Post URL'] || item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="post-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Original →
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Post Detail Modal */}
        {selectedPost && (
          <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedPost(null)}>×</button>
              <h2>{selectedPost['Post Title'] || 'Untitled'}</h2>
              <div className="modal-meta">
                <p><strong>Publication Date:</strong> {selectedPost['Publication Date'] || 'Unknown'}</p>
                <p><strong>Status:</strong> {selectedPost.Status || 'Existing'}</p>
                <p><strong>Scraped:</strong> {selectedPost['Scrape Timestamp'] || 'Unknown'}</p>
              </div>
              <div className="modal-body">
                <p><strong>Content Summary:</strong></p>
                <div 
                  className="highlighted-content"
                  dangerouslySetInnerHTML={{
                    __html: highlightEInvoicingKeywords(
                      selectedPost['Content Summary'] || selectedPost['Post Title'] || 'No content available'
                    )
                  }}
                />
              </div>
              <a 
                href={selectedPost['Post URL'] || selectedPost.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Open Original Post
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>E-Invoicing Content Scraper - BOSA Belgium Monitor</p>
        <p className="footer-note">
          Note: Due to CORS restrictions, scraping may require a backend proxy. 
          Check browser console for detailed error messages.
        </p>
      </footer>
    </div>
  );
}

export default App;

