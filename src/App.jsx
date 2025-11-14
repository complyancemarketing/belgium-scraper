import React, { useState, useEffect, useCallback } from 'react';
import { scrapeBOSAWebsite } from './utils/scraper';
import { 
  loadExistingData, 
  addNewPosts, 
  getAnalyticsData, 
  downloadExcelFile,
  resetAllData,
  importExcelFile
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
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [nextAutoRefresh, setNextAutoRefresh] = useState(null);
  const [autoRefreshMode, setAutoRefreshMode] = useState('daily'); // 'daily' or 'interval'
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(60); // Default 1 hour in minutes
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'analytics', 'settings', 'tables'
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState('');
  
  // Tables tab state
  const [pageCache, setPageCache] = useState([]);
  const [cacheStats, setCacheStats] = useState(null);
  const [isLoadingCache, setIsLoadingCache] = useState(false);

    // Load data and analytics on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await loadData();
      await updateAnalytics();
    };
    loadInitialData();

    // Load auto-refresh settings from localStorage
    const savedAutoRefresh = localStorage.getItem('autoRefreshEnabled');
    const savedMode = localStorage.getItem('autoRefreshMode');
    const savedInterval = localStorage.getItem('autoRefreshInterval');
    const savedEmail = localStorage.getItem('emailAddress');
    
    console.log('Loading auto-refresh settings:', {
      savedAutoRefresh,
      savedMode,
      savedInterval,
      savedEmail
    });
    
    if (savedAutoRefresh === 'true') {
      console.log('Auto-refresh was previously enabled, restoring state');
      setAutoRefreshEnabled(true);
    } else {
      console.log('Auto-refresh is disabled');
      setAutoRefreshEnabled(false);
    }
    if (savedMode) {
      setAutoRefreshMode(savedMode);
    }
    if (savedInterval) {
      setAutoRefreshInterval(parseInt(savedInterval));
    }
    if (savedEmail) {
      setEmailAddress(savedEmail);
    }
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
        const result = await addNewPosts(newPosts);
        setScrapeStatus(`Scheduled scrape complete: Found ${result.stats.new} new posts`);
        
        // Reload data and update analytics
        await loadData();
        await updateAnalytics();
        
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

  // Auto-refresh timer - checks for new posts based on selected mode
  useEffect(() => {
    console.log('Auto-refresh effect triggered:', {
      autoRefreshEnabled,
      isScraping,
      autoRefreshMode,
      autoRefreshInterval
    });
    
    if (!autoRefreshEnabled || isScraping) {
      console.log('Auto-refresh NOT active:', !autoRefreshEnabled ? 'toggle is OFF' : 'scraping in progress');
      return;
    }

    console.log('Auto-refresh IS active, setting up timer...');

    const runAutoRefresh = async () => {
      console.log('Running auto-refresh check for new posts...');
      setScrapeStatus('Auto-refresh: Checking for new posts...');
      
      try {
        // Scrape with incremental mode
        const newPosts = await scrapeBOSAWebsite(true);
        
        if (newPosts.length > 0) {
          const result = addNewPosts(newPosts);
          
          if (result.stats.new > 0) {
            setScrapeStatus(`Auto-refresh: Found ${result.stats.new} new posts!`);
            
            // Reload data and update analytics
            await loadData();
            await updateAnalytics();
            
            // Send email if email address is provided
            if (emailAddress && emailAddress.trim()) {
              await sendEmailNotification(newPosts, emailAddress);
            }
            
            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New E-Invoicing Posts Found', {
                body: `Found ${result.stats.new} new e-invoicing posts`,
                icon: '/favicon.ico'
              });
            }
          } else {
            setScrapeStatus('Auto-refresh: No new posts found');
          }
        } else {
          setScrapeStatus('Auto-refresh: No new posts found');
        }
        
        setTimeout(() => setScrapeStatus(''), 5000);
      } catch (err) {
        console.error('Auto-refresh error:', err);
        setScrapeStatus('Auto-refresh failed: ' + err.message);
        setTimeout(() => setScrapeStatus(''), 5000);
      }
    };

    if (autoRefreshMode === 'daily') {
      // Daily mode: Run at 10 PM IST
      const calculateNextScrapeTime = () => {
        const now = new Date();
        
        // IST is UTC+5:30
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(utcTime + istOffset);
        
        // Set target time to 10 PM IST (22:00)
        const targetTime = new Date(istTime);
        targetTime.setHours(22, 0, 0, 0);
        
        // If it's already past 10 PM IST today, schedule for tomorrow
        if (istTime >= targetTime) {
          targetTime.setDate(targetTime.getDate() + 1);
        }
        
        // Convert IST target time back to local time
        const localTargetTime = new Date(targetTime.getTime() - istOffset);
        return localTargetTime;
      };

      const scheduleNextRefresh = () => {
        const nextTime = calculateNextScrapeTime();
        setNextAutoRefresh(nextTime);
        
        const now = new Date();
        const msUntilRefresh = nextTime.getTime() - now.getTime();
        
        console.log(`Next auto-refresh scheduled at: ${nextTime.toLocaleString()}`);
        
        const timeoutId = setTimeout(() => {
          console.log('Running scheduled auto-refresh at 10 PM IST...');
          runAutoRefresh();
          scheduleNextRefresh(); // Schedule next day
        }, msUntilRefresh);
        
        return () => clearTimeout(timeoutId);
      };

      const cleanup = scheduleNextRefresh();
      return cleanup;
      
    } else {
      // Interval mode: Run at regular intervals
      const intervalMinutes = autoRefreshInterval;
      const intervalMs = intervalMinutes * 60 * 1000;
      
      // Calculate and set next refresh time
      const nextTime = new Date(Date.now() + intervalMs);
      setNextAutoRefresh(nextTime);
      
      console.log(`Auto-refresh interval mode: Every ${intervalMinutes} minutes`);
      console.log(`Next auto-refresh at: ${nextTime.toLocaleString()}`);

      // Set up interval - this will run AFTER the first interval, not immediately
      const intervalId = setInterval(() => {
        console.log(`Running interval-based auto-refresh (every ${intervalMinutes} min)...`);
        runAutoRefresh();
        // Update next refresh time after each run
        const newNextTime = new Date(Date.now() + intervalMs);
        setNextAutoRefresh(newNextTime);
      }, intervalMs);

      return () => clearInterval(intervalId);
    }
  }, [autoRefreshEnabled, autoRefreshMode, autoRefreshInterval, isScraping, emailAddress]);

  // Save auto-refresh settings to localStorage
  useEffect(() => {
    localStorage.setItem('autoRefreshEnabled', autoRefreshEnabled.toString());
    localStorage.setItem('autoRefreshMode', autoRefreshMode);
    localStorage.setItem('autoRefreshInterval', autoRefreshInterval.toString());
    localStorage.setItem('emailAddress', emailAddress);
  }, [autoRefreshEnabled, autoRefreshMode, autoRefreshInterval, emailAddress]);

  // Update next refresh time when interval or mode changes (without triggering new timer)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    if (autoRefreshMode === 'daily') {
      // Calculate next 10 PM IST
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(utcTime + istOffset);
      
      const targetTime = new Date(istTime);
      targetTime.setHours(22, 0, 0, 0);
      
      if (istTime >= targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      const localTargetTime = new Date(targetTime.getTime() - istOffset);
      setNextAutoRefresh(localTargetTime);
    } else {
      // Update based on current interval
      const nextTime = new Date(Date.now() + autoRefreshInterval * 60 * 1000);
      setNextAutoRefresh(nextTime);
    }
  }, [autoRefreshMode, autoRefreshInterval, autoRefreshEnabled]);

  const loadData = async () => {
    try {
      const existingData = await loadExistingData();
      setData([...existingData]); // Force re-render with new array reference
      await updateAnalytics();
    } catch (err) {
      setError('Failed to load existing data: ' + err.message);
    }
  };

  const updateAnalytics = async () => {
    try {
      const analyticsData = await getAnalyticsData();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error updating analytics:', err);
    }
  };

  const loadPageCacheData = async () => {
    setIsLoadingCache(true);
    try {
      const pageCacheModule = await import('./utils/pageCache.js');
      const cacheMap = await pageCacheModule.loadPageCache();
      const stats = pageCacheModule.getCacheStats(cacheMap);
      
      // Convert Map to Array for display
      const cacheArray = Array.from(cacheMap.entries()).map(([url, meta]) => ({
        url,
        title: meta.title || '',
        lastScraped: meta.lastScraped,
        hasEInvoicing: meta.hasEInvoicingContent,
        postsCount: meta.postsCount || 0,
        contentHash: meta.contentHash,
        httpStatus: meta.httpStatus || 200
      }));
      
      setPageCache(cacheArray);
      setCacheStats(stats);
    } catch (err) {
      console.error('Error loading page cache:', err);
      setError('Failed to load page cache: ' + err.message);
    } finally {
      setIsLoadingCache(false);
    }
  };

  const handleScrape = async (isAutoRefresh = false) => {
    setIsScraping(true);
    setError(null);
    
    if (isAutoRefresh) {
      setScrapeStatus('Auto-refresh: Checking for new posts...');
    } else {
      setScrapeStatus('Starting scrape...');
    }

    try {
      if (!isAutoRefresh) {
        setScrapeStatus('Scraping entire website (this may take several minutes)...');
      }
      
      const newPosts = await scrapeBOSAWebsite(isAutoRefresh);

      if (newPosts.length === 0) {
        if (isAutoRefresh) {
          setScrapeStatus('Auto-refresh: No new posts found');
        } else {
          setScrapeStatus('No e-invoicing posts found. This might be due to CORS restrictions preventing access to the website. Check the browser console for details. You may need to use a backend proxy server.');
        }
        setIsScraping(false);
        setTimeout(() => setScrapeStatus(''), 3000);
        return;
      }

      if (!isAutoRefresh) {
        setScrapeStatus(`Found ${newPosts.length} posts. Processing...`);
      }
      
      const result = addNewPosts(newPosts);
      
      if (isAutoRefresh && result.stats.new > 0) {
        setScrapeStatus(`Auto-refresh: Found ${result.stats.new} new posts!`);
        
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New E-Invoicing Posts Found', {
            body: `Found ${result.stats.new} new e-invoicing posts`,
            icon: '/favicon.ico'
          });
        }
      } else if (isAutoRefresh) {
        setScrapeStatus(`Auto-refresh: No new posts (checked ${newPosts.length} posts)`);
      } else {
        setScrapeStatus(`Added ${result.stats.new} new posts. Total: ${result.stats.total}`);
      }
      
      // Reload data and update analytics
      await loadData();
      await updateAnalytics();
      
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

  const handleDownload = async () => {
    try {
      await downloadExcelFile(data);
    } catch (err) {
      setError('Failed to download file: ' + err.message);
    }
  };

  const handleExportFiltered = async () => {
    const filtered = getFilteredData();
    try {
      await downloadExcelFile(filtered);
    } catch (err) {
      setError('Failed to export filtered data: ' + err.message);
    }
  };

  const sendEmailNotification = async (newPosts, email) => {
    try {
      console.log(`Sending email notification to ${email} with ${newPosts.length} new posts`);
      
      // Format posts for email
      const emailBody = {
        to: email,
        subject: `New E-Invoicing Posts Found - ${new Date().toLocaleDateString()}`,
        newPostsCount: newPosts.length,
        posts: newPosts.map(post => ({
          title: post['Post Title'] || post.title,
          url: post['Post URL'] || post.url,
          date: post['Publication Date'] || post.date,
          summary: post['Content Summary'] || post.summary || ''
        }))
      };

      // Send to backend server for email delivery
      const response = await fetch('http://localhost:3002/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBody)
      });

      if (response.ok) {
        console.log('Email sent successfully');
      } else {
        const error = await response.text();
        console.error('Failed to send email:', error);
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  };

  const handleSendEmailManually = async () => {
    if (!emailAddress || !emailAddress.trim()) {
      setEmailStatus('Please enter an email address first');
      setTimeout(() => setEmailStatus(''), 3000);
      return;
    }

    if (data.length === 0) {
      setEmailStatus('No data available to send');
      setTimeout(() => setEmailStatus(''), 3000);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      setEmailStatus('Please enter a valid email address');
      setTimeout(() => setEmailStatus(''), 3000);
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus('Preparing email with Excel sheet...');

    try {
      // Get Excel file from localStorage
      const excelFile = localStorage.getItem('excelFile');
      const fileName = localStorage.getItem('fileName') || 'e-invoicing-posts.xlsx';

      if (!excelFile) {
        setEmailStatus('No Excel file found. Please scrape data first.');
        setIsSendingEmail(false);
        setTimeout(() => setEmailStatus(''), 3000);
        return;
      }

      // Format all posts for email
      const emailBody = {
        to: emailAddress,
        subject: `E-Invoicing Posts Report - ${new Date().toLocaleDateString()}`,
        totalPostsCount: data.length,
        posts: data.map(post => ({
          title: post['Post Title'] || '',
          url: post['Post URL'] || '',
          date: post['Publication Date'] || '',
          summary: post['Content Summary'] || ''
        })),
        excelFile: excelFile,
        fileName: fileName,
        isManual: true
      };

      console.log('Sending email to:', emailAddress);
      console.log('Posts count:', data.length);
      console.log('Server URL:', 'http://localhost:3002/send-email-with-excel');

      const response = await fetch('http://localhost:3002/send-email-with-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBody)
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Server response:', result);
        setEmailStatus(`✓ Email sent successfully to ${emailAddress}`);
        console.log('Email with Excel sent successfully');
      } else {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        setEmailStatus(`Failed to send email: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      console.error('Error details:', error.message);
      setEmailStatus(`Error: ${error.message}. Check if server is running on port 3002.`);
    } finally {
      setIsSendingEmail(false);
      setTimeout(() => setEmailStatus(''), 8000);
    }
  };

  const handleSaveEmail = () => {
    if (!emailAddress || !emailAddress.trim()) {
      setEmailStatus('Please enter an email address');
      setTimeout(() => setEmailStatus(''), 3000);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      setEmailStatus('Please enter a valid email address');
      setTimeout(() => setEmailStatus(''), 3000);
      return;
    }

    // Save to localStorage (already done by useEffect, but confirm to user)
    localStorage.setItem('emailAddress', emailAddress);
    setEmailStatus('✓ Email address saved successfully');
    setTimeout(() => setEmailStatus(''), 3000);
  };

  const handleTestEmail = async () => {
    if (!emailAddress || !emailAddress.trim()) {
      setTestEmailStatus('Please enter and save an email address first');
      setTimeout(() => setTestEmailStatus(''), 3000);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      setTestEmailStatus('Please enter a valid email address');
      setTimeout(() => setTestEmailStatus(''), 3000);
      return;
    }

    setIsTestingEmail(true);
    setTestEmailStatus('Sending test email...');

    try {
      const response = await fetch('http://localhost:3002/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: emailAddress
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestEmailStatus(`✓ Test email sent successfully to ${emailAddress}`);
      } else {
        setTestEmailStatus(`✗ Failed to send test email: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestEmailStatus(`✗ Error: ${error.message}. Check if server is running.`);
    } finally {
      setIsTestingEmail(false);
      setTimeout(() => setTestEmailStatus(''), 8000);
    }
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      event.target.value = ''; // Reset file input
      return;
    }
    
    try {
      setScrapeStatus(`Importing ${file.name}...`);
      setError(null);
      
      const result = await importExcelFile(file);
      
      if (result.success) {
        setScrapeStatus(`✓ Successfully imported ${result.stats.total} posts from ${file.name}`);
        
        // Reload data and update analytics
        await loadData();
        await updateAnalytics();
        
        setTimeout(() => setScrapeStatus(''), 5000);
      } else {
        setError(`Import failed: ${result.error}`);
        setScrapeStatus('');
      }
    } catch (err) {
      setError(`Failed to import Excel file: ${err.message}`);
      setScrapeStatus('');
    } finally {
      // Reset file input
      event.target.value = '';
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
      await resetAllData();
      
      // Reset all state
      setData([]);
      setAnalytics(null);
      setError(null);
      setSearchTerm('');
      setDateFilter({ start: '', end: '' });
      setSelectedPost(null);
      
      // Update analytics with empty data
      await updateAnalytics();
      
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
        <div className="header-content">
          <div className="header-left">
            <h1>E-Invoicing Scraper</h1>
            <p className="subtitle">Monitor BOSA Belgium - E-Invoicing Updates</p>
          </div>
          <div className="header-right">
            <button 
              className="btn btn-primary" 
              onClick={handleScrape}
              disabled={isScraping}
            >
              {isScraping ? 'Scraping...' : 'Scrape Now'}
            </button>
          </div>
        </div>
      </header>

      <div className="app-layout">
        {/* Sidebar Navigation */}
        <aside className="app-sidebar">
          <button 
            className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            title="Overview"
          >
            <span className="sidebar-icon">📊</span>
            <span className="sidebar-label">Overview</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
            title="Analytics"
          >
            <span className="sidebar-icon">💰</span>
            <span className="sidebar-label">Analytics</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title="Settings"
          >
            <span className="sidebar-icon">⚙️</span>
            <span className="sidebar-label">Settings</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('tables');
              loadPageCacheData(); // Load cache data when switching to tables tab
            }}
            title="Tables"
          >
            <span className="sidebar-icon">🗂️</span>
            <span className="sidebar-label">Tables</span>
          </button>
        </aside>

      <main className="app-main">

        {/* Status and Error Messages */}
        {scrapeStatus && (
          <div className="status-message">{scrapeStatus}</div>
        )}

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="close-error">×</button>
          </div>
        )}

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <>
        {/* Main Content Section */}
        <section className="content-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Scraping Operations</h2>
              <p className="section-subtitle">E-invoicing content extraction</p>
            </div>
            <div className="section-actions">
              <span className="total-count">{analytics?.stats?.total || 0} total posts</span>
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="stats-grid">
            <div className="stat-card valid">
              <div className="stat-icon">✓</div>
              <div className="stat-content">
                <div className="stat-label">Total Posts</div>
                <div className="stat-value">{analytics?.stats?.total || 0}</div>
                <div className="stat-footer">
                  <span className="stat-percentage success">100%</span>
                  <span className="stat-text">Success Rate</span>
                </div>
              </div>
            </div>

            <div className="stat-card invalid">
              <div className="stat-icon">⚠</div>
              <div className="stat-content">
                <div className="stat-label">Errors</div>
                <div className="stat-value">0</div>
                <div className="stat-footer">
                  <span className="stat-percentage error">0.0%</span>
                  <span className="stat-text">Error Rate</span>
                </div>
              </div>
            </div>

            <div className="stat-card submitted">
              <div className="stat-icon">📤</div>
              <div className="stat-content">
                <div className="stat-label">New Posts</div>
                <div className="stat-value">{analytics?.stats?.new || 0}</div>
                <div className="stat-footer">
                  <span className="stat-percentage pending">
                    {analytics?.stats?.total > 0 
                      ? ((analytics?.stats?.new / analytics?.stats?.total) * 100).toFixed(1)
                      : 0}%
                  </span>
                  <span className="stat-text">New Rate</span>
                </div>
              </div>
            </div>

            <div className="stat-card rejected">
              <div className="stat-icon">🕒</div>
              <div className="stat-content">
                <div className="stat-label">Last Scrape</div>
                <div className="stat-value-small">
                  {analytics?.stats?.lastScrape 
                    ? new Date(analytics.stats.lastScrape).toLocaleDateString()
                    : 'Never'}
                </div>
                <div className="stat-footer">
                  <span className="stat-text">
                    {analytics?.stats?.lastScrape 
                      ? new Date(analytics.stats.lastScrape).toLocaleTimeString()
                      : 'Not scraped yet'}
                  </span>
                </div>
              </div>
            </div>

            <div className="stat-card cancelled">
              <div className="stat-icon">📁</div>
              <div className="stat-content">
                <div className="stat-label">Existing Posts</div>
                <div className="stat-value">{analytics?.stats?.existing || 0}</div>
                <div className="stat-footer">
                  <span className="stat-percentage neutral">
                    {analytics?.stats?.total > 0 
                      ? ((analytics?.stats?.existing / analytics?.stats?.total) * 100).toFixed(1)
                      : 0}%
                  </span>
                  <span className="stat-text">Archive Rate</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons Section */}
        <section className="actions-section">
          <div className="action-buttons">
            <button 
              className="btn btn-secondary" 
              onClick={handleDownload}
              disabled={data.length === 0}
            >
              📥 Download Excel
            </button>
            <button 
              className="btn btn-success" 
              onClick={() => document.getElementById('excel-upload').click()}
              title="Import existing Excel file to avoid re-scraping old posts"
            >
              📤 Import Excel
            </button>
            <input
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleImportExcel}
            />
            <button 
              className="btn btn-secondary" 
              onClick={async () => {
                await loadData();
                await updateAnalytics();
              }}
            >
              🔄 Refresh Data
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSendEmailManually}
              disabled={data.length === 0 || isSendingEmail || !emailAddress || !emailAddress.trim()}
              title={!emailAddress || !emailAddress.trim() ? 'Please enter email address in Settings tab' : 'Send all data via email'}
            >
              {isSendingEmail ? '📧 Sending...' : '📧 Send Email Report'}
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleReset}
              disabled={data.length === 0}
            >
              🗑️ Reset All
            </button>
          </div>
          {emailStatus && (
            <div className={`email-status-message ${emailStatus.includes('✓') ? 'success' : emailStatus.includes('Failed') || emailStatus.includes('Error') ? 'error' : 'info'}`}>
              {emailStatus}
            </div>
          )}
        </section>

        {/* Filters Section */}
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
          </>
        )}

        {/* Settings Tab Content */}
        {activeTab === 'settings' && (
          <section className="settings-content">
            <div className="settings-header">
              <h2>⚙️ Settings</h2>
              <p className="settings-subtitle">Manage your scraper configuration and email notifications</p>
            </div>

            {/* Auto-Refresh Configuration */}
            <div className="settings-group">
              <h3>🔄 Auto-Refresh Configuration</h3>
              <div className="settings-card">
                <div className="settings-row">
                  <label className="settings-label">Auto-Refresh:</label>
                  <div className="settings-value">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={autoRefreshEnabled}
                        onChange={(e) => {
                          setAutoRefreshEnabled(e.target.checked);
                          if (e.target.checked && 'Notification' in window && Notification.permission === 'default') {
                            Notification.requestPermission();
                          }
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                {autoRefreshEnabled && (
                  <>
                    <div className="settings-subsection">
                      <h4>📧 Email Notifications</h4>
                      <div className="email-input-group">
                        <div className="email-input-wrapper">
                          <input
                            type="email"
                            placeholder="your.email@example.com"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            className="email-input"
                          />
                          <button 
                            className="btn btn-save-email"
                            onClick={handleSaveEmail}
                            disabled={!emailAddress || !emailAddress.trim()}
                          >
                            💾 Save Email
                          </button>
                        </div>
                        <small className="email-hint">
                          Receive email alerts when new e-invoicing posts are found
                        </small>
                        {emailStatus && (
                          <div className={`email-status-message ${emailStatus.includes('✓') ? 'success' : emailStatus.includes('Please') ? 'info' : 'error'}`}>
                            {emailStatus}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="settings-subsection">
                      <h4>⏰ Schedule Mode</h4>
                      <div className="mode-options">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="refreshMode"
                            value="daily"
                            checked={autoRefreshMode === 'daily'}
                            onChange={(e) => setAutoRefreshMode(e.target.value)}
                          />
                          <span className="radio-label">
                            <strong>Daily at 10 PM IST</strong>
                            <small>Recommended for regular monitoring</small>
                          </span>
                        </label>
                        
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="refreshMode"
                            value="interval"
                            checked={autoRefreshMode === 'interval'}
                            onChange={(e) => setAutoRefreshMode(e.target.value)}
                          />
                          <span className="radio-label">
                            <strong>Custom Interval</strong>
                            <small>Set your own refresh frequency</small>
                          </span>
                        </label>
                      </div>

                      {autoRefreshMode === 'interval' && (
                        <div className="refresh-interval">
                          <label>Check for new posts every:</label>
                          <select 
                            value={autoRefreshInterval} 
                            onChange={(e) => {
                              const newInterval = parseInt(e.target.value);
                              console.log('Interval changed to:', newInterval, 'minutes');
                              setAutoRefreshInterval(newInterval);
                            }}
                            className="interval-select"
                          >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                            <option value={240}>4 hours</option>
                            <option value={480}>8 hours</option>
                            <option value={1440}>24 hours</option>
                          </select>
                        </div>
                      )}
                      
                      {nextAutoRefresh && (
                        <div className="next-refresh-info">
                          <span className="info-label">
                            {autoRefreshMode === 'daily' ? '🌙 Next check (10 PM IST):' : '⏱️ Next check:'}
                          </span>
                          <span className="info-value">
                            {nextAutoRefresh.toLocaleString()}
                            {autoRefreshMode === 'interval' && (
                              <span style={{marginLeft: '8px', fontSize: '0.9em', opacity: 0.7}}>
                                ({autoRefreshInterval < 60 
                                  ? `${autoRefreshInterval} min` 
                                  : `${Math.floor(autoRefreshInterval / 60)} hr${autoRefreshInterval >= 120 ? 's' : ''}`} from now)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="settings-note">
                      <span className="note-icon">ℹ️</span>
                      <span className="note-text">
                        Auto-refresh only checks recent pages for new posts. It will not delete or re-scrape existing data.
                        {emailAddress && emailAddress.trim() && (
                          <> Email notifications will be sent to <strong>{emailAddress}</strong> when new posts are found.</>
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Email Configuration */}
            <div className="settings-group">
              <h3>📧 Email Testing</h3>
              <div className="settings-card">
                <div className="settings-row">
                  <label className="settings-label">Email Address:</label>
                  <div className="settings-value">
                    {emailAddress ? (
                      <span className="email-display">{emailAddress}</span>
                    ) : (
                      <span className="email-display-empty">No email configured</span>
                    )}
                  </div>
                </div>

                <div className="settings-row">
                  <label className="settings-label">Email Status:</label>
                  <div className="settings-value">
                    {emailAddress ? (
                      <span className="status-badge status-active">✓ Active</span>
                    ) : (
                      <span className="status-badge status-inactive">✗ Not Configured</span>
                    )}
                  </div>
                </div>

                <div className="settings-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleTestEmail}
                    disabled={!emailAddress || isTestingEmail}
                  >
                    {isTestingEmail ? '📤 Sending...' : '📧 Send Test Email'}
                  </button>
                  
                  {testEmailStatus && (
                    <div className={`settings-status-message ${testEmailStatus.includes('✓') ? 'success' : 'error'}`}>
                      {testEmailStatus}
                    </div>
                  )}
                </div>

                <div className="settings-note">
                  <span className="note-icon">ℹ️</span>
                  <span className="note-text">
                    Configure your email address in the Auto-Refresh section above.
                    The test email will be sent to verify your SMTP configuration.
                  </span>
                </div>
              </div>
            </div>

            {/* Auto-Refresh Status */}
            <div className="settings-group">
              <h3>� System Status</h3>
              <div className="settings-card">
                <div className="settings-row">
                  <label className="settings-label">Status:</label>
                  <div className="settings-value">
                    {autoRefreshEnabled ? (
                      <span className="status-badge status-active">✓ Enabled</span>
                    ) : (
                      <span className="status-badge status-inactive">✗ Disabled</span>
                    )}
                  </div>
                </div>

                {autoRefreshEnabled && (
                  <>
                    <div className="settings-row">
                      <label className="settings-label">Mode:</label>
                      <div className="settings-value">
                        {autoRefreshMode === 'daily' ? (
                          <span className="mode-badge">📅 Daily at 10 PM IST</span>
                        ) : (
                          <span className="mode-badge">
                            ⏱️ Every {autoRefreshInterval < 60 
                              ? `${autoRefreshInterval} minutes` 
                              : `${Math.floor(autoRefreshInterval / 60)} hour${autoRefreshInterval >= 120 ? 's' : ''}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="settings-row">
                      <label className="settings-label">Next Check:</label>
                      <div className="settings-value">
                        {nextAutoRefresh ? (
                          <span className="next-check-time">{nextAutoRefresh.toLocaleString()}</span>
                        ) : (
                          <span className="next-check-time">Calculating...</span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="settings-note">
                  <span className="note-icon">ℹ️</span>
                  <span className="note-text">
                    Configure auto-refresh settings in the Overview tab to automatically check for new e-invoicing posts.
                  </span>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="settings-group">
              <h3>🗄️ Data Management</h3>
              <div className="settings-card">
                <div className="settings-row">
                  <label className="settings-label">Total Posts:</label>
                  <div className="settings-value">
                    <span className="data-count">{analytics?.stats?.total || 0} posts</span>
                  </div>
                </div>

                <div className="settings-row">
                  <label className="settings-label">Last Scrape:</label>
                  <div className="settings-value">
                    {analytics?.stats?.lastScrape ? (
                      <span className="last-scrape-time">
                        {new Date(analytics.stats.lastScrape).toLocaleString()}
                      </span>
                    ) : (
                      <span className="last-scrape-time">Never</span>
                    )}
                  </div>
                </div>

                <div className="settings-note danger">
                  <span className="note-icon">⚠️</span>
                  <span className="note-text">
                    Use the Overview tab to manage scraping operations and export data.
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tables Tab Content */}
        {activeTab === 'tables' && (
          <>
            <section className="content-section">
              <div className="section-header">
                <div className="section-title">
                  <h2>Database Tables</h2>
                  <p className="section-subtitle">View cached pages and e-invoicing content</p>
                </div>
                <button 
                  onClick={loadPageCacheData} 
                  className="btn btn-secondary"
                  disabled={isLoadingCache}
                >
                  {isLoadingCache ? '⏳ Loading...' : '🔄 Refresh'}
                </button>
              </div>

              {/* Cache Statistics */}
              {cacheStats && (
                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                  <div className="stat-card">
                    <div className="stat-value">{cacheStats.totalPages}</div>
                    <div className="stat-label">Total Pages Cached</div>
                  </div>
                  <div className="stat-card highlight">
                    <div className="stat-value">{cacheStats.pagesWithEInvoicing}</div>
                    <div className="stat-label">Pages with E-Invoicing</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{cacheStats.pagesWithoutEInvoicing}</div>
                    <div className="stat-label">Pages without E-Invoicing</div>
                  </div>
                  <div className="stat-card highlight">
                    <div className="stat-value">{cacheStats.totalEInvoicingPosts}</div>
                    <div className="stat-label">Total E-Invoicing Posts</div>
                  </div>
                </div>
              )}

              {/* Table 1: Pages with E-Invoicing Content */}
              <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-header">
                  <h3>📄 Pages with E-Invoicing Content</h3>
                  <span className="badge">
                    {pageCache.filter(p => p.hasEInvoicing).length} pages
                  </span>
                </div>
                <div className="card-body">
                  {pageCache.filter(p => p.hasEInvoicing).length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">📭</span>
                      <p>No e-invoicing pages cached yet. Run a scrape to populate this table.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Page URL</th>
                            <th>Page Title</th>
                            <th>Posts Count</th>
                            <th>Last Scraped</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageCache
                            .filter(p => p.hasEInvoicing)
                            .sort((a, b) => b.postsCount - a.postsCount)
                            .map((page, index) => (
                            <tr key={index}>
                              <td>
                                <a 
                                  href={page.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="post-link"
                                >
                                  {page.url.length > 60 
                                    ? '...' + page.url.substring(page.url.length - 60) 
                                    : page.url}
                                </a>
                              </td>
                              <td>{page.title || '-'}</td>
                              <td>
                                <span className="badge badge-success">
                                  {page.postsCount} post{page.postsCount !== 1 ? 's' : ''}
                                </span>
                              </td>
                              <td>
                                {page.lastScraped 
                                  ? new Date(page.lastScraped).toLocaleString() 
                                  : '-'}
                              </td>
                              <td>
                                <span className="status-badge status-active">
                                  ✓ Cached
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Table 2: All Cached Pages */}
              <div className="card">
                <div className="card-header">
                  <h3>🗂️ All Cached Pages</h3>
                  <span className="badge">{pageCache.length} pages</span>
                </div>
                <div className="card-body">
                  {pageCache.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">📭</span>
                      <p>No pages cached yet. Run a scrape to populate the page cache.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Page URL</th>
                            <th>Last Scraped</th>
                            <th>E-Invoicing</th>
                            <th>Posts</th>
                            <th>Content Hash</th>
                            <th>HTTP Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageCache
                            .sort((a, b) => new Date(b.lastScraped) - new Date(a.lastScraped))
                            .slice(0, 100) // Show first 100 for performance
                            .map((page, index) => (
                            <tr key={index} className={page.hasEInvoicing ? 'row-highlight' : ''}>
                              <td>
                                <a 
                                  href={page.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="post-link"
                                >
                                  {page.url.length > 50 
                                    ? '...' + page.url.substring(page.url.length - 50) 
                                    : page.url}
                                </a>
                              </td>
                              <td>
                                {page.lastScraped 
                                  ? new Date(page.lastScraped).toLocaleDateString() 
                                  : '-'}
                              </td>
                              <td>
                                {page.hasEInvoicing ? (
                                  <span className="status-badge status-new">✓ Yes</span>
                                ) : (
                                  <span className="status-badge">− No</span>
                                )}
                              </td>
                              <td>
                                {page.hasEInvoicing ? (
                                  <span className="badge badge-info">{page.postsCount}</span>
                                ) : (
                                  <span className="text-muted">0</span>
                                )}
                              </td>
                              <td>
                                <code style={{ fontSize: '0.85em', color: '#666' }}>
                                  {page.contentHash ? page.contentHash.substring(0, 8) : '-'}
                                </code>
                              </td>
                              <td>
                                <span className={`status-badge ${page.httpStatus === 200 ? 'status-active' : 'status-error'}`}>
                                  {page.httpStatus || 200}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {pageCache.length > 100 && (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                          Showing first 100 of {pageCache.length} cached pages
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

      </main>
      </div>

      <footer className="app-footer">
        <p>E-Invoicing Content Scraper - BOSA Belgium Monitor</p>
      </footer>
    </div>
  );
}

export default App;

