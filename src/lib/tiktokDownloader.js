const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { pipeline } = require("stream");
const streamPipeline = promisify(pipeline);
const { botLogger } = require("../utils/logger");

/**
 * Memastikan direktori penyimpanan ada
 * @param {string} dirPath - Path direktori
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    botLogger.info(`Direktori ${dirPath} dibuat`);
  }
}

/**
 * Normalisasi URL TikTok
 * @param {string} url - URL TikTok
 * @returns {string} URL yang dinormalisasi
 */
function normalizeUrl(url) {
  // Hapus parameter query jika ada
  url = url.split('?')[0];
  
  // Pastikan URL menggunakan format yang benar
  if (!url.includes('tiktok.com')) {
    throw new Error('URL tidak valid');
  }
  
  return url;
}

/**
 * Download file dari URL
 * @param {string} url - URL file
 * @param {string} filePath - Path file tujuan
 * @returns {Promise<void>}
 */
async function downloadFile(url, filePath) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    await streamPipeline(response.data, fs.createWriteStream(filePath));
    botLogger.info(`File berhasil didownload: ${filePath}`);
  } catch (error) {
    botLogger.error(`Error saat download file: ${error.message}`);
    throw error;
  }
}

/**
 * Download video TikTok
 * @param {string} url - URL video TikTok
 * @returns {Promise<Object>} Informasi video
 */
async function downloadTikTok(url) {
  try {
    url = normalizeUrl(url);
    const response = await axios.post(
      "https://www.tikwm.com/api",
      {},
      {
        params: {
          url: url,
          count: 12,
          cursor: 0,
          web: 1,
          hd: 1,
        },
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.msg || 'Gagal mendapatkan info video');
    }

    return response.data;
  } catch (error) {
    botLogger.error(`Error saat download TikTok: ${error.message}`);
    throw error;
  }
}

/**
 * Download video TikTok dengan metode alternatif
 * @param {string} url - URL video TikTok
 * @returns {Promise<Object>} Informasi video
 */
async function downloadTikTokV2(url) {
  try {
    url = normalizeUrl(url);
    const response = await axios.post(
      "https://tiktokio.com/api/v1/tk-htmx",
      new URLSearchParams({
        prefix: "dtGslxrcdcG9raW8uY29t",
        vid: url,
      }),
      {
        headers: {
          "HX-Request": "true",
          "HX-Trigger": "search-btn",
          "HX-Target": "tiktok-parse-result",
          "HX-Current-URL": "https://tiktokio.com/id/",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (error) {
    botLogger.error(`Error saat download TikTok V2: ${error.message}`);
    throw error;
  }
}

/**
 * Download video TikTok dengan metode alternatif
 * @param {string} url - URL video TikTok
 * @returns {Promise<Object>} Informasi video
 */
async function downloadTikTokV3(url) {
  try {
    url = normalizeUrl(url);
    const response = await axios({
      method: "POST",
      url: "https://tikwm.com/api/feed/search",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: "current_language=en",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
      data: {
        keywords: url,
        count: 10,
        cursor: 0,
        HD: 1,
      },
    });

    return response.data;
  } catch (error) {
    botLogger.error(`Error saat download TikTok V3: ${error.message}`);
    throw error;
  }
}

module.exports = {
  downloadTikTok,
  downloadTikTokV2,
  downloadTikTokV3,
  downloadFile,
  ensureDirectoryExists
};

// Command Bot
