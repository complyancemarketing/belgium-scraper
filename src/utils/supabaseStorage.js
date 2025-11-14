/**
 * Supabase Storage Handler
 * Handles cloud storage of e-invoicing posts with localStorage fallback
 */

import { supabase, isSupabaseEnabled, POSTS_TABLE } from '../config/supabase.js';
import * as XLSX from 'xlsx';

// Fallback to localStorage if Supabase not configured
const STORAGE_KEY = 'bosa_einvoicing_data_json';

/**
 * Load all posts from Supabase or localStorage
 */
export async function loadAllPosts() {
  if (isSupabaseEnabled()) {
    try {
      console.log('📡 Loading posts from Supabase...');
      const { data, error } = await supabase
        .from(POSTS_TABLE)
        .select('*')
        .order('scrape_timestamp', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        console.log('⚠️ Falling back to localStorage');
        return loadFromLocalStorage();
      }

      console.log(`✅ Loaded ${data.length} posts from Supabase`);
      
      // Convert Supabase format to app format
      return data.map(row => ({
        'Publication Date': row.publication_date || new Date(row.created_at).toLocaleDateString(),
        'Post URL': row.post_url,
        'Post Title': row.post_title,
        'Content Summary': row.content_summary || '',
        'Scrape Timestamp': row.scrape_timestamp,
        'Status': row.status || 'Existing'
      }));
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      return loadFromLocalStorage();
    }
  } else {
    return loadFromLocalStorage();
  }
}

/**
 * Save posts to Supabase or localStorage
 */
export async function savePosts(posts) {
  if (isSupabaseEnabled()) {
    try {
      console.log(`💾 Saving ${posts.length} posts to Supabase...`);
      
      // Convert app format to Supabase format
      const supabaseRows = posts.map(post => ({
        post_url: post['Post URL'],
        post_title: post['Post Title'],
        publication_date: post['Publication Date'],
        content_summary: post['Content Summary'] || '',
        scrape_timestamp: post['Scrape Timestamp'] || new Date().toISOString(),
        status: post['Status'] || 'Existing'
      }));

      // Use upsert to handle duplicates (update if exists, insert if new)
      const { data, error } = await supabase
        .from(POSTS_TABLE)
        .upsert(supabaseRows, { 
          onConflict: 'post_url',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Supabase save error:', error);
        console.log('⚠️ Falling back to localStorage');
        saveToLocalStorage(posts);
        return { success: false, error: error.message };
      }

      console.log('✅ Posts saved to Supabase successfully');
      
      // Also save to localStorage as backup
      saveToLocalStorage(posts);
      
      return { success: true };
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      saveToLocalStorage(posts);
      return { success: false, error: error.message };
    }
  } else {
    saveToLocalStorage(posts);
    return { success: true, fallback: true };
  }
}

/**
 * Add new posts (avoiding duplicates)
 */
export async function addNewPosts(newPosts) {
  const existingPosts = await loadAllPosts();
  const existingUrls = new Set(existingPosts.map(p => p['Post URL']));
  
  const now = new Date().toISOString();
  const newEntries = [];
  let newCount = 0;

  for (const post of newPosts) {
    const url = post.url;
    
    if (!existingUrls.has(url)) {
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
    }
  }

  // Combine existing and new data
  const updatedData = [...existingPosts, ...newEntries];
  
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
  await savePosts(updatedData);

  return {
    newPosts: newEntries,
    updatedData: updatedData,
    stats: {
      total: updatedData.length,
      new: newCount,
      existing: existingPosts.length
    }
  };
}

/**
 * Get all visited URLs (for duplicate checking)
 */
export async function getVisitedUrls() {
  const posts = await loadAllPosts();
  const urlSet = new Set();
  
  posts.forEach(post => {
    const url = post['Post URL'];
    if (url) {
      urlSet.add(url);
    }
  });
  
  console.log(`Loaded ${urlSet.size} existing post URLs for duplicate detection`);
  return urlSet;
}

/**
 * Reset all data
 */
export async function resetAllData() {
  if (isSupabaseEnabled()) {
    try {
      console.log('🗑️ Deleting all posts from Supabase...');
      const { error } = await supabase
        .from(POSTS_TABLE)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) {
        console.error('Supabase delete error:', error);
      } else {
        console.log('✅ All posts deleted from Supabase');
      }
    } catch (error) {
      console.error('Error resetting Supabase:', error);
    }
  }
  
  // Also clear localStorage
  localStorage.removeItem(STORAGE_KEY);
  return true;
}

/**
 * Import Excel file
 */
export async function importExcelFile(file) {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const importedData = XLSX.utils.sheet_to_json(worksheet);
          
          if (importedData.length === 0) {
            resolve({ success: false, error: 'The Excel file is empty' });
            return;
          }
          
          // Validate required columns
          const firstRow = importedData[0];
          const requiredColumns = ['Post URL', 'Post Title'];
          const hasRequiredColumns = requiredColumns.every(col => col in firstRow);
          
          if (!hasRequiredColumns) {
            resolve({ success: false, error: 'Excel file must contain "Post URL" and "Post Title" columns' });
            return;
          }
          
          // Normalize data structure
          const normalizedData = importedData.map(row => ({
            'Publication Date': row['Publication Date'] || new Date().toLocaleDateString(),
            'Post URL': row['Post URL'],
            'Post Title': row['Post Title'],
            'Content Summary': row['Content Summary'] || row['Content'] || '',
            'Scrape Timestamp': row['Scrape Timestamp'] || new Date().toISOString(),
            'Status': row['Status'] || 'Existing'
          }));
          
          // Save to Supabase/localStorage
          await savePosts(normalizedData);
          
          console.log(`✅ Successfully imported ${normalizedData.length} posts`);
          
          resolve({
            success: true,
            data: normalizedData,
            stats: {
              total: normalizedData.length,
              imported: normalizedData.length
            }
          });
          
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          resolve({ success: false, error: `Failed to parse Excel file: ${error.message}` });
        }
      };
      
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read the file' });
      };
      
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Download Excel file
 */
export async function downloadExcelFile() {
  const data = await loadAllPosts();
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'E-Invoicing Data');
  XLSX.writeFile(workbook, 'bosa_einvoicing_data.xlsx');
  return true;
}

// ============ LocalStorage Fallback Functions ============

function loadFromLocalStorage() {
  try {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (!dataStr) return [];
    return JSON.parse(dataStr);
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return [];
  }
}

function saveToLocalStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}
