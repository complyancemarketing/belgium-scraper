/**
 * Excel File Handler using SheetJS (xlsx)
 * Manages reading, writing, and updating Excel files for e-invoicing data
 */

import * as XLSX from 'xlsx';

const STORAGE_KEY = 'bosa_einvoicing_data';
const FILE_NAME = 'bosa_einvoicing_data.xlsx';

/**
 * Get data from window.storage (fallback to in-memory if not available)
 */
function getStorage() {
  if (typeof window !== 'undefined' && window.storage) {
    return window.storage;
  }
  // Fallback to localStorage for development
  return {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key)
  };
}

/**
 * Load existing data from storage
 */
export function loadExistingData() {
  try {
    const storage = getStorage();
    const dataStr = storage.getItem(STORAGE_KEY);
    
    if (!dataStr) {
      return [];
    }

    // Parse Excel data from base64 or JSON
    if (dataStr.startsWith('data:')) {
      // Base64 encoded Excel file
      const base64Data = dataStr.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet);
    } else {
      // JSON format
      return JSON.parse(dataStr);
    }
  } catch (error) {
    console.error('Error loading existing data:', error);
    return [];
  }
}

/**
 * Save data to storage
 */
export function saveData(data) {
  try {
    const storage = getStorage();
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'E-Invoicing Data');

    // Convert to base64
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    // Convert Uint8Array to string properly
    let binaryString = '';
    const bytes = new Uint8Array(excelBuffer);
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const base64String = btoa(binaryString);
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64String}`;

    // Save to storage
    storage.setItem(STORAGE_KEY, dataUrl);
    
    // Also save as JSON for easier access
    storage.setItem(STORAGE_KEY + '_json', JSON.stringify(data));
    
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
}

/**
 * Download Excel file
 */
export function downloadExcelFile(data) {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'E-Invoicing Data');

    // Generate file and download
    XLSX.writeFile(workbook, FILE_NAME);
    return true;
  } catch (error) {
    console.error('Error downloading Excel file:', error);
    return false;
  }
}

/**
 * Add new posts to existing data
 * Returns: { newPosts, updatedData, stats }
 */
export function addNewPosts(newPosts) {
  const existingData = loadExistingData();
  const existingUrls = new Set(existingData.map(item => item['Post URL'] || item.url));
  
  const now = new Date().toISOString();
  const newEntries = [];
  let newCount = 0;

  for (const post of newPosts) {
    const url = post.url;
    
    if (!existingUrls.has(url)) {
      // New post
      const entry = {
        'Publication Date': post.publicationDate ? 
          new Date(post.publicationDate).toLocaleDateString() : 
          new Date().toLocaleDateString(),
        'Post URL': url,
        'Post Title': post.title,
        'Content Summary': post.content || '',
        'Scrape Timestamp': now,
        'Status': 'New'
      };
      
      newEntries.push(entry);
      newCount++;
    } else {
      // Update existing entry status if needed
      const existingIndex = existingData.findIndex(item => 
        (item['Post URL'] || item.url) === url
      );
      if (existingIndex >= 0 && existingData[existingIndex].Status !== 'New') {
        existingData[existingIndex].Status = 'Existing';
      }
    }
  }

  // Combine existing and new data
  const updatedData = [...existingData, ...newEntries];
  
  // Update status of old "New" entries to "Existing"
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  updatedData.forEach(entry => {
    if (entry.Status === 'New') {
      const scrapeDate = new Date(entry['Scrape Timestamp']);
      if (scrapeDate < oneDayAgo) {
        entry.Status = 'Existing';
      }
    }
  });

  // Save updated data
  saveData(updatedData);

  return {
    newPosts: newEntries,
    updatedData: updatedData,
    stats: {
      total: updatedData.length,
      new: newCount,
      existing: existingData.length
    }
  };
}

/**
 * Get visited URLs from stored data
 */
export function getVisitedUrls() {
  const data = loadExistingData();
  const urlSet = new Set();
  
  data.forEach(item => {
    const url = item['Post URL'] || item.url;
    if (url) {
      urlSet.add(url);
    }
  });
  
  return urlSet;
}

/**
 * Get last scrape date
 */
export function getLastScrapeDate() {
  const data = loadExistingData();
  
  if (data.length === 0) {
    return null;
  }
  
  const timestamps = data.map(item => item['Scrape Timestamp'])
    .filter(ts => ts)
    .map(ts => new Date(ts))
    .sort((a, b) => b - a);
  
  return timestamps.length > 0 ? timestamps[0] : null;
}

/**
 * Get analytics data
 */
export function getAnalyticsData() {
  const data = loadExistingData();
  
  const stats = {
    total: data.length,
    new: data.filter(item => item.Status === 'New').length,
    existing: data.filter(item => item.Status === 'Existing').length,
    lastScrape: null
  };

  // Get last scrape timestamp
  if (data.length > 0) {
    const timestamps = data.map(item => item['Scrape Timestamp'])
      .filter(ts => ts)
      .map(ts => new Date(ts))
      .sort((a, b) => b - a);
    
    if (timestamps.length > 0) {
      stats.lastScrape = timestamps[0];
    }
  }

  // Get publication frequency by month
  const monthlyData = {};
  data.forEach(item => {
    try {
      const date = new Date(item['Publication Date']);
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      }
    } catch (e) {
      // Skip invalid dates
    }
  });

  // Convert to array for charting
  const monthlyChartData = Object.entries(monthlyData)
    .map(([month, count]) => ({
      month,
      count
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Get recent posts (last 15)
  const recentPosts = [...data]
    .sort((a, b) => {
      const dateA = new Date(a['Scrape Timestamp'] || a['Publication Date']);
      const dateB = new Date(b['Scrape Timestamp'] || b['Publication Date']);
      return dateB - dateA;
    })
    .slice(0, 15);

  return {
    stats,
    monthlyChartData,
    recentPosts
  };
}

/**
 * Reset all data - clears all stored posts and metrics
 */
export function resetAllData() {
  try {
    const storage = getStorage();
    
    // Clear all stored data
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(STORAGE_KEY + '_json');
    
    // Save empty array to ensure clean state
    saveData([]);
    
    return true;
  } catch (error) {
    console.error('Error resetting data:', error);
    throw error;
  }
}

