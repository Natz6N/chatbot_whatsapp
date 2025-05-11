const fs = require('fs').promises;
const path = require('path');
const { log } = require('./logger');

// Konfigurasi
const TEMP_DIR = path.join(__dirname, '../storage/temp');
const MAX_AGE_HOURS = 24; // File yang lebih lama dari 24 jam akan dihapus
const CLEANUP_INTERVAL = 30 * 60 * 1000; // Pembersihan setiap 30 menit

/**
 * Fungsi untuk menghapus file yang lebih tua dari batas waktu yang ditentukan
 * @param {string} filePath - Path file yang akan diperiksa
 * @param {number} maxAgeHours - Maksimum usia file dalam jam
 * @returns {Promise<boolean>} - True jika file dihapus, false jika tidak
 */
async function deleteOldFile(filePath, maxAgeHours) {
  try {
    const stats = await fs.stat(filePath);
    const now = new Date();
    const fileAge = now - stats.mtime;
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Konversi jam ke milidetik

    if (fileAge > maxAge) {
      await fs.unlink(filePath);
      log(`File lama dihapus: ${path.basename(filePath)}`, 'info');
      return true;
    }
    return false;
  } catch (error) {
    log(`Error saat menghapus file ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Fungsi untuk membersihkan folder temporary
 * @returns {Promise<{deleted: number, total: number}>} - Jumlah file yang dihapus dan total file
 */
async function cleanTempFolder() {
  try {
    const files = await fs.readdir(TEMP_DIR);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const wasDeleted = await deleteOldFile(filePath, MAX_AGE_HOURS);
      if (wasDeleted) deletedCount++;
    }

    log(`Pembersihan selesai. ${deletedCount} dari ${files.length} file diperiksa.`, 'info');
    return { deleted: deletedCount, total: files.length };
  } catch (error) {
    log(`Error saat membersihkan folder temp: ${error.message}`, 'error');
    return { deleted: 0, total: 0 };
  }
}

/**
 * Fungsi untuk memulai pembersihan berkala
 */
function startPeriodicCleanup() {
  // Jalankan pembersihan pertama kali
  cleanTempFolder();

  // Set interval untuk pembersihan berkala
  const cleanupInterval = setInterval(cleanTempFolder, CLEANUP_INTERVAL);
  
  // Simpan interval ID untuk referensi
  global.cleanupInterval = cleanupInterval;
  
  log(`Pembersihan berkala dimulai. Interval: ${CLEANUP_INTERVAL/1000} detik (30 menit)`, 'info');
}

module.exports = {
  cleanTempFolder,
  startPeriodicCleanup
}; 