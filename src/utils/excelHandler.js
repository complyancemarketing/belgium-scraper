/**
 * Excel File Handler using SheetJS (xlsx)
 * Manages reading, writing, and updating Excel files for e-invoicing data
 * Now with Supabase cloud storage support!
 */

import * as XLSX from 'xlsx';
import * as SupabaseStorage from './supabaseStorage.js';

const STORAGE_KEY = 'bosa_einvoicing_data';
const FILE_NAME = 'bosa_einvoicing_data.xlsx';

/**
 * Load existing data from Supabase (or localStorage fallback)
 */
export async function loadExistingData() {
  return await SupabaseStorage.loadAllPosts();
}

/**
 * Save data to Supabase (or localStorage fallback)
 */
export async function saveData(data) {
  return await SupabaseStorage.savePosts(data);
}

/**
 * Download Excel file
 */
export async function downloadExcelFile(data) {
  if (data && data.length > 0) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'E-Invoicing Data');
    XLSX.writeFile(workbook, FILE_NAME);
    return true;
  } else {
    // Load from storage if no data provided
    return await SupabaseStorage.downloadExcelFile();
  }
}

/**
 * Add new posts to existing data
 * Returns: { newPosts, updatedData, stats }
 */
export async function addNewPosts(newPosts) {
  return await SupabaseStorage.addNewPosts(newPosts);
}

/**
 * Get visited URLs from stored data
 * Returns a Set (HashMap) of all post URLs for O(1) duplicate checking
 */
export async function getVisitedUrls() {
  return await SupabaseStorage.getVisitedUrls();
}

/**
 * Get last scrape date
 */
export async function getLastScrapeDate() {
  const data = await loadExistingData();
  
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
export async function getAnalyticsData() {
  const data = await loadExistingData();
  
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
export async function resetAllData() {
  return await SupabaseStorage.resetAllData();
}

/**
 * Import Excel file from user's computer
 */
export async function importExcelFile(file) {
  return await SupabaseStorage.importExcelFile(file);
}
