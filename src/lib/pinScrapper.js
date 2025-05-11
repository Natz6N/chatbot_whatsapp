const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { promisify } = require('util');
const sleep = promisify(setTimeout);
const { botLogger } = require('../utils/logger');
const FileManager = require('../../config/memoryAsync/readfile');
const path = require('path');
const fs = require('fs');

class PinterestScraper {
  constructor(options = {}) {
    this.cookiePath = options.cookiePath || 'cookie.json';
    this.outputDir = options.outputDir || 'pinterest_output';
    this.downloadImages = options.downloadImages || false;
    this.outputFormat = options.outputFormat || 'json';
    this.rateLimitDelay = options.rateLimitDelay || 500;
    this.maxRetries = options.maxRetries || 3;
    this.proxyList = options.proxyList || [];
    this.currentProxyIndex = 0;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
    ];
    this.logLevel = options.logLevel || 'info';
    this.headless = options.headless !== undefined ? options.headless : true;
    this.sessionId = uuidv4();
    this.cache = new Map();
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.maxRequestsPerMinute = 60;
    this.minRequestInterval = 1000 / this.maxRequestsPerMinute;
    
    // FileManager menangani pembuatan direktori secara otomatis
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async loadCookies() {
    try {
      // Coba baca file cookie
      let cookieData;
      
      try {
        if (fs.existsSync(this.cookiePath)) {
          cookieData = JSON.parse(fs.readFileSync(this.cookiePath, 'utf8'));
        } else {
          throw new Error('Cookie file tidak ditemukan');
        }
      } catch (fsError) {
        botLogger.warn(`Gagal membaca file cookie langsung: ${fsError.message}`);
        botLogger.info('Mencoba menggunakan FileManager...');
        cookieData = await FileManager.readFile(this.cookiePath);
        
        if (!cookieData) {
          throw new Error('Cookie file tidak ditemukan');
        }
      }

      let cookieArray;
      if (Array.isArray(cookieData)) {
        cookieArray = cookieData.filter(cookie =>
          cookie.name && cookie.value && typeof cookie.name === 'string' && typeof cookie.value === 'string'
        );
      } else if (typeof cookieData === 'object') {
        cookieArray = Object.entries(cookieData)
          .filter(([name, value]) => name && value && typeof name === 'string' && typeof value === 'string')
          .map(([name, value]) => ({ name, value }));
      } else {
        throw new Error('Format cookie tidak valid');
      }

      if (cookieArray.length === 0) {
        throw new Error('Tidak ada cookie yang valid');
      }

      botLogger.debug('Cookie berhasil dimuat:', cookieArray.length);
      return {
        cookieHeader: cookieArray.map(cookie => `${cookie.name}=${cookie.value}`).join('; '),
        cookieArray
      };
    } catch (error) {
      botLogger.error(`Gagal memuat cookie: ${error.message}`);
      throw error;
    }
  }

  async getNextProxy() {
    if (this.proxyList.length === 0) return null;
    const proxy = this.proxyList[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
    return proxy;
  }

  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await sleep(this.minRequestInterval - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    if (this.requestCount >= this.maxRequestsPerMinute) {
      await sleep(60000);
      this.requestCount = 0;
    }
  }

  async makeRequest(url, options = {}) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.rateLimit();
        
        const proxy = await this.getNextProxy();
        const requestOptions = {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Cookie': options.cookieHeader || '',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.pinterest.com/',
            'DNT': '1'
          },
          timeout: 30000,
          ...options
        };

        if (proxy) requestOptions.proxy = proxy;

        botLogger.debug(`Request ke ${url} (Percobaan ${attempt + 1}/${this.maxRetries})`);
        const response = await axios.get(url, requestOptions);
        await sleep(this.rateLimitDelay);
        return response;
      } catch (error) {
        lastError = error;
        botLogger.warn(`Percobaan ${attempt + 1}/${this.maxRetries} gagal:`, error.message);
        const delay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
        botLogger.debug(`Mencoba lagi dalam ${delay}ms...`);
        await sleep(delay);
      }
    }

    throw new Error(`Request gagal setelah ${this.maxRetries} percobaan: ${lastError.message}`);
  }

  async downloadImage(imageUrl, fileName) {
    if (!imageUrl) return null;

    try {
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer'
      });

      const result = await FileManager.saveFile(
        Buffer.from(response.data),
        fileName,
        'images'
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.path;
    } catch (error) {
      botLogger.warn(`Gagal mengunduh gambar ${imageUrl}:`, error.message);
      return null;
    }
  }

  async scrapePinterestWithBrowser(keyword, limit = 10) {
    const browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      let cookieArray = [];

      try {
        const cookies = await this.loadCookies();
        cookieArray = cookies.cookieArray;
        const cookiesToSet = cookieArray.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: '.pinterest.com',
          path: '/'
        }));
        botLogger.debug('Mengatur cookie:', JSON.stringify(cookiesToSet, null, 2));
        await page.setCookie(...cookiesToSet);
      } catch (error) {
        botLogger.warn('Melanjutkan tanpa cookie karena error:', error.message);
      }

      const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`;
      botLogger.info(`Membuka ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      try {
        await page.waitForSelector('[data-test-id="pin"]', { timeout: 10000 });
      } catch (e) {
        botLogger.warn('Elemen pin tidak ditemukan, menyimpan HTML untuk debugging');
        const html = await page.content();
        await FileManager.saveFile(Buffer.from(html), 'debug.html', 'temp');
      }

      botLogger.info(`Scroll untuk memuat lebih banyak pin...`);
      const maxScrolls = Math.ceil(limit / 25) + 2;

      for (let i = 0; i < maxScrolls; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
        await sleep(2000);
        botLogger.debug(`Scroll ${i + 1}/${maxScrolls}`);
      }

      botLogger.info(`Mengekstrak data pin...`);
      const pinData = await page.evaluate(() => {
        const pins = [];
        const pinElements = document.querySelectorAll('[data-test-id="pin"], .pinWrapper, div[data-grid-item]');

        pinElements.forEach(pin => {
          try {
            const pinId = pin.getAttribute('data-pin-id') || pin.querySelector('a')?.href?.match(/pin\/(\d+)/)?.[1];
            if (!pinId) return;

            const imageElement = pin.querySelector('img');
            const linkElement = pin.querySelector('a');
            const descElement = pin.querySelector('[data-test-id="pin-description"], .description');
            const boardElement = pin.querySelector('[data-test-id="board-name"], .boardName');
            const userElement = pin.querySelector('[data-test-id="pinner-name"]');
            const likeElement = pin.querySelector('[data-test-id="like-count"]');
            const saveElement = pin.querySelector('[data-test-id="save-count"]');

            pins.push({
              id: pinId,
              description: descElement ? descElement.textContent.trim() : '',
              imageUrl: imageElement ? imageElement.src.replace(/\/236x\//, '/originals/') : null,
              pinUrl: linkElement ? linkElement.href : null,
              board: boardElement ? boardElement.textContent.trim() : '',
              user: userElement ? userElement.textContent.trim() : '',
              likes: likeElement ? likeElement.textContent.trim() : '0',
              saves: saveElement ? saveElement.textContent.trim() : '0',
              timestamp: new Date().toISOString()
            });
          } catch (e) {
            console.error('Error parsing pin:', e);
          }
        });

        return pins;
      });

      botLogger.info(`Ditemukan ${pinData.length} pin`);
      return pinData.slice(0, limit);
    } catch (error) {
      botLogger.error('Error scraping dengan browser:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async scrapeAdditionalPinDetails(pinData) {
    botLogger.info(`Mengambil detail tambahan untuk ${pinData.length} pin...`);
    const enhancedPins = [];

    for (let i = 0; i < pinData.length; i++) {
      const pin = pinData[i];
      if (!pin.pinUrl) {
        enhancedPins.push(pin);
        continue;
      }

      try {
        botLogger.debug(`Memproses pin ${i + 1}/${pinData.length}: ${pin.id}`);
        const { cookieHeader } = await this.loadCookies();
        const response = await this.makeRequest(pin.pinUrl, { cookieHeader });
        const $ = cheerio.load(response.data);

        const userProfile = $('[data-test-id="pinner-name"]').first().text().trim();
        const likeCount = $('[data-test-id="like-count"]').first().text().trim();
        const saveCount = $('[data-test-id="save-count"]').first().text().trim();
        const hashtags = [];
        $('[data-test-id="pin-description"] a').each((_, el) => {
          const text = $(el).text().trim();
          if (text.startsWith('#')) hashtags.push(text.substring(1));
        });

        let highResImageUrl = pin.imageUrl;
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage) highResImageUrl = ogImage;

        // Cek apakah video
        const isVideo = $('meta[name="twitter:card"]').attr('content') === 'player' || 
                        $('meta[property="og:video"]').length > 0;
        
        let videoUrl = null;
        if (isVideo) {
          videoUrl = $('meta[property="og:video"]').attr('content') || 
                     $('meta[property="og:video:url"]').attr('content') || 
                     $('video source').attr('src');
        }

        enhancedPins.push({
          ...pin,
          imageUrl: highResImageUrl,
          videoUrl: videoUrl,
          isVideo: isVideo,
          user: userProfile || pin.user,
          likes: likeCount || pin.likes,
          saves: saveCount || pin.saves,
          hashtags,
          fetchedAt: new Date().toISOString()
        });

        await sleep(this.rateLimitDelay);
      } catch (error) {
        botLogger.warn(`Gagal mengambil detail untuk pin ${pin.id}:`, error.message);
        enhancedPins.push(pin);
      }
    }

    return enhancedPins;
  }

  async scrapePinterest(keyword, limit = 10, searchOptions = {}) {
    botLogger.info(`Memulai Pinterest scraper untuk kata kunci: "${keyword}" dengan limit: ${limit}`);

    const options = { useBrowser: true, fetchAdditionalDetails: true, ...searchOptions };
    let pinData;

    if (options.useBrowser) {
      pinData = await this.scrapePinterestWithBrowser(keyword, limit);
    } else {
      pinData = await this.scrapePinterestWithHttp(keyword, limit);
    }

    if (options.fetchAdditionalDetails && pinData.length > 0) {
      pinData = await this.scrapeAdditionalPinDetails(pinData);
    }

    botLogger.info(`Scraping selesai: Ditemukan ${pinData.length} hasil`);
    return pinData;
  }

  async scrapePinterestWithHttp(keyword, limit = 10) {
    try {
      const { cookieHeader } = await this.loadCookies();
      const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`;
      botLogger.info(`Membuat request HTTP ke ${searchUrl}`);
      const response = await this.makeRequest(searchUrl, { cookieHeader });
      const $ = cheerio.load(response.data);
      let pinData = [];

      let jsonData;
      $('script').each((i, element) => {
        const scriptContent = $(element).html() || '';
        if (scriptContent.includes('__PWS_DATA__')) {
          try {
            const jsonMatch = scriptContent.match(/\{"__PWS_DATA__".*?}\);/);
            if (jsonMatch) jsonData = JSON.parse(jsonMatch[0].replace(/\);$/, ''));
          } catch (e) {
            botLogger.warn('Gagal parsing JSON dari script tag:', e.message);
          }
        }
      });

      if (jsonData && jsonData.__PWS_DATA__) {
        const pinResource = Object.values(jsonData.__PWS_DATA__.resourceResponses || {})
          .find(res => res.name === 'SearchResource');

        if (pinResource && pinResource.response && pinResource.response.data) {
          const results = pinResource.response.data.results || [];
          pinData = results.slice(0, limit).map(pin => ({
            id: pin.id,
            description: pin.description || '',
            imageUrl: pin.images?.orig?.url || '',
            pinUrl: `https://www.pinterest.com/pin/${pin.id}/`,
            board: pin.board?.name || '',
            timestamp: new Date().toISOString()
          }));
        }
      }

      if (pinData.length === 0) {
        botLogger.info('Menggunakan fallback ke HTML scraping');
        $('[data-test-id="pin"]').each((i, element) => {
          if (pinData.length >= limit) return false;

          const pinId = $(element).attr('data-pin-id');
          if (!pinId) return;

          const imageElement = $(element).find('img').first();
          const imageUrl = imageElement.attr('src');
          const origImageUrl = imageUrl ? imageUrl.replace(/\/236x\//, '/originals/') : null;

          pinData.push({
            id: pinId,
            description: $(element).find('[data-test-id="pin-description"]').text().trim(),
            imageUrl: origImageUrl,
            pinUrl: `https://www.pinterest.com/pin/${pinId}/`,
            timestamp: new Date().toISOString()
          });
        });
      }

      botLogger.info(`Request HTTP menemukan ${pinData.length} pin`);
      return pinData;
    } catch (error) {
      botLogger.error('Error scraping HTTP:', error.message);
      throw error;
    }
  }

  async batchScrape(keywords, limit = 10, options = {}) {
    const results = {};

    for (const keyword of keywords) {
      botLogger.info(`Batch scraping kata kunci: ${keyword}`);
      try {
        results[keyword] = await this.scrapePinterest(keyword, limit, options);
      } catch (error) {
        botLogger.error(`Gagal scraping kata kunci "${keyword}":`, error.message);
        results[keyword] = { error: error.message };
      }
      await sleep(options.batchDelay || 2000);
    }

    return results;
  }

  async downloadVideo(videoUrl, fileName) {
    if (!videoUrl) return null;

    try {
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'arraybuffer'
      });

      const result = await FileManager.saveFile(
        Buffer.from(response.data),
        fileName,
        'video'
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.path;
    } catch (error) {
      botLogger.warn(`Gagal mengunduh video ${videoUrl}:`, error.message);
      return null;
    }
  }

  getImageExtension(url) {
    const regex = /\.(jpe?g|png|gif|webp)(?:\?.*)?$/i;
    const match = url.match(regex);
    return match ? `.${match[1].toLowerCase()}` : '.jpg';
  }

  getVideoExtension(url) {
    const regex = /\.(mp4|webm|mov|avi)(?:\?.*)?$/i;
    const match = url.match(regex);
    return match ? `.${match[1].toLowerCase()}` : '.mp4';
  }

  // Metode baru untuk mendapatkan informasi board
  async getBoardInfo(boardUrl) {
    try {
      const { cookieHeader } = await this.loadCookies();
      const response = await this.makeRequest(boardUrl, { cookieHeader });
      const $ = cheerio.load(response.data);

      const boardName = $('[data-test-id="board-name"]').first().text().trim();
      const pinCount = $('[data-test-id="pin-count"]').first().text().trim();
      const followers = $('[data-test-id="follower-count"]').first().text().trim();
      const description = $('[data-test-id="board-description"]').first().text().trim();

      return {
        name: boardName,
        pinCount,
        followers,
        description,
        url: boardUrl
      };
    } catch (error) {
      botLogger.error(`Error mendapatkan info board: ${error.message}`);
      throw error;
    }
  }

  // Metode baru untuk mendapatkan informasi pengguna
  async getUserInfo(username) {
    try {
      const { cookieHeader } = await this.loadCookies();
      const userUrl = `https://www.pinterest.com/${username}/`;
      const response = await this.makeRequest(userUrl, { cookieHeader });
      const $ = cheerio.load(response.data);

      const fullName = $('[data-test-id="user-name"]').first().text().trim();
      const bio = $('[data-test-id="user-bio"]').first().text().trim();
      const followers = $('[data-test-id="follower-count"]').first().text().trim();
      const following = $('[data-test-id="following-count"]').first().text().trim();
      const boards = $('[data-test-id="board-count"]').first().text().trim();

      return {
        username,
        fullName,
        bio,
        followers,
        following,
        boards,
        url: userUrl
      };
    } catch (error) {
      botLogger.error(`Error mendapatkan info pengguna: ${error.message}`);
      throw error;
    }
  }

  // Metode baru untuk mendapatkan pin terkait
  async getRelatedPins(pinId, limit = 10) {
    try {
      const { cookieHeader } = await this.loadCookies();
      const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;
      const response = await this.makeRequest(pinUrl, { cookieHeader });
      const $ = cheerio.load(response.data);

      const relatedPins = [];
      $('[data-test-id="related-pin"]').each((i, element) => {
        if (relatedPins.length >= limit) return false;

        const pinId = $(element).attr('data-pin-id');
        const imageUrl = $(element).find('img').first().attr('src');
        const description = $(element).find('[data-test-id="pin-description"]').text().trim();

        relatedPins.push({
          id: pinId,
          imageUrl: imageUrl ? imageUrl.replace(/\/236x\//, '/originals/') : null,
          description,
          pinUrl: `https://www.pinterest.com/pin/${pinId}/`
        });
      });

      return relatedPins;
    } catch (error) {
      botLogger.error(`Error mendapatkan pin terkait: ${error.message}`);
      throw error;
    }
  }

  // Metode baru untuk mendapatkan trending pins
  async getTrendingPins(limit = 10) {
    try {
      const { cookieHeader } = await this.loadCookies();
      const response = await this.makeRequest('https://www.pinterest.com/trending/', { cookieHeader });
      const $ = cheerio.load(response.data);

      const trendingPins = [];
      $('[data-test-id="pin"]').each((i, element) => {
        if (trendingPins.length >= limit) return false;

        const pinId = $(element).attr('data-pin-id');
        const imageUrl = $(element).find('img').first().attr('src');
        const description = $(element).find('[data-test-id="pin-description"]').text().trim();

        trendingPins.push({
          id: pinId,
          imageUrl: imageUrl ? imageUrl.replace(/\/236x\//, '/originals/') : null,
          description,
          pinUrl: `https://www.pinterest.com/pin/${pinId}/`
        });
      });

      return trendingPins;
    } catch (error) {
      botLogger.error(`Error mendapatkan trending pins: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PinterestScraper;