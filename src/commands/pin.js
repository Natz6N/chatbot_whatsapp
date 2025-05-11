const PinterestScraper = require('../lib/pinScrapper');
const { botLogger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const FileManager = require('../../config/memoryAsync/readfile');
const cheerio = require('cheerio');

const scraper = new PinterestScraper({
  cookiePath: 'cookie.json',
  outputDir: 'scraper_output',
  downloadImages: true,
  outputFormat: 'json',
  rateLimitDelay: 1000,
  maxRetries: 3,
  logLevel: 'info',
  headless: true,
});

// Perintah untuk scraping data
global.Oblixn.cmd({
  name: 'pinscrape',
  alias: ['pinterest'],
  desc: 'Mencari data dari Pinterest berdasarkan kata kunci.',
  category: 'utility',
  use: '!pinscrape <keyword> [limit]',
  exec: async (msg, { args, sock }) => {
    const keyword = args.join(' ').split(/\s+(\d+)$/);
    let searchTerm = keyword[0].trim();
    let limit = parseInt(keyword[1]) || 5;

    if (!searchTerm) {
      return await msg.reply('Masukkan kata kunci!\nContoh: !pinscrape wallpaper aesthetic 10');
    }
    
    if (isNaN(limit) || limit < 1 || limit > 20) {
      limit = 5;
    }

    await msg.reply(`Mencari ${limit} pin untuk "${searchTerm}"...`);

    try {
      const results = await scraper.scrapePinterest(searchTerm, limit, { 
        useBrowser: true, 
        fetchAdditionalDetails: true 
      });
      
      if (!results || results.length === 0) {
        return await msg.reply(`Tidak ada hasil untuk "${searchTerm}".`);
      }

      let response = `Hasil pencarian Pinterest untuk "${searchTerm}" (${results.length} pin):\n\n`;
      
      // Kirim ringkasan hasil yang lebih lengkap
      for (let i = 0; i < Math.min(5, results.length); i++) {
        const pin = results[i];
        const title = pin.description?.substring(0, 40).trim() || 'Tanpa deskripsi';
        
        response += `${i + 1}. *${title}*${pin.description?.length > 40 ? '...' : ''}`;
        
        // Tambahkan info user jika ada
        if (pin.user) {
          response += `\n   👤 ${pin.user}`;
        }
        
        // Tambahkan board jika ada
        if (pin.board) {
          response += `\n   📂 ${pin.board}`;
        }
        
        // Tambahkan likes dan saves jika ada
        const stats = [];
        if (pin.likes && pin.likes !== '0') stats.push(`❤️ ${pin.likes}`);
        if (pin.saves && pin.saves !== '0') stats.push(`🔖 ${pin.saves}`);
        
        if (stats.length > 0) {
          response += `\n   ${stats.join(' · ')}`;
        }
        
        // Menambahkan URL pin
        if (pin.pinUrl) {
          response += `\n   🔗 ${pin.pinUrl}`;
        }
        
        // Tanda video jika konten video
        if (pin.isVideo) response += `\n   🎥 Video`;
        
        response += `\n\n`;
      }
      
      response += `Gunakan !pindownload <nomor> untuk mengunduh pin.`;
      
      // Simpan hasil pencarian terakhir untuk pengguna ini
      if (!global.pinSearchResults) global.pinSearchResults = {};
      global.pinSearchResults[msg.sender] = results;
      
      await msg.reply(response);
    } catch (error) {
      botLogger.error(`Error scraping Pinterest: ${error.message}`);
      await msg.reply(`Error: ${error.message}`);
    }
  },
});

// Perintah untuk mengunduh gambar berdasarkan nomor hasil pencarian
global.Oblixn.cmd({
  name: 'pindownload',
  alias: ['pindl'],
  desc: 'Mengunduh gambar dari hasil pencarian Pinterest.',
  category: 'utility',
  use: '!pindownload <nomor>',
  exec: async (msg, { args, sock }) => {
    const index = parseInt(args[0]) - 1;
    
    if (isNaN(index) || index < 0) {
      return await msg.reply('Masukkan nomor pin yang valid!\nContoh: !pindownload 1');
    }
    
    if (!global.pinSearchResults || !global.pinSearchResults[msg.sender]) {
      return await msg.reply('Anda belum melakukan pencarian. Gunakan !pinscrape <keyword> terlebih dahulu.');
    }
    
    const results = global.pinSearchResults[msg.sender];
    
    if (index >= results.length) {
      return await msg.reply(`Nomor pin tidak valid. Tersedia ${results.length} hasil.`);
    }
    
    const pin = results[index];
    
    await msg.reply(`Sedang memproses pin ${index + 1}...`);
    
    try {
      // Coba ambil detail tambahan jika belum lengkap
      let pinDetail = pin;
      
      if (!pin.isVideo && pin.pinUrl && (!pin.likes || !pin.hashtags)) {
        try {
          botLogger.info(`Mengambil detail tambahan untuk pin ${pin.id}`);
          
          const pins = await scraper.scrapeAdditionalPinDetails([pin]);
          if (pins && pins.length > 0) {
            pinDetail = pins[0];
          }
        } catch (error) {
          botLogger.warn(`Gagal mengambil detail tambahan: ${error.message}`);
        }
      }
      
      // Siapkan caption dengan detail
      let caption = `📌 *Pinterest Pin*\n\n`;
      
      if (pinDetail.description) caption += `📝 *Deskripsi:* ${pinDetail.description}\n\n`;
      if (pinDetail.user) caption += `👤 *Pengguna:* ${pinDetail.user}\n`;
      if (pinDetail.board) caption += `📂 *Board:* ${pinDetail.board}\n`;
      if (pinDetail.likes) caption += `❤️ *Suka:* ${pinDetail.likes}\n`;
      if (pinDetail.saves) caption += `🔖 *Simpan:* ${pinDetail.saves}\n`;
      
      if (pinDetail.hashtags && pinDetail.hashtags.length > 0) {
        caption += `\n🏷️ *Hashtags:* ${pinDetail.hashtags.map(tag => `#${tag}`).join(' ')}\n`;
      }
      
      caption += `\n🔗 *URL:* ${pinDetail.pinUrl}`;
      
      // Cek apakah pin adalah video
      if (pinDetail.isVideo && pinDetail.videoUrl) {
        await msg.reply('Pin ini adalah video. Sedang mengunduh video...');
        
        const fileName = `pin_${pinDetail.id}${scraper.getVideoExtension(pinDetail.videoUrl)}`;
        const filePath = await scraper.downloadVideo(pinDetail.videoUrl, fileName);
        
        if (!filePath) {
          // Jika gagal unduh video, kirim gambar thumbnail sebagai gantinya
          await msg.reply('Gagal mengunduh video. Mengirimkan thumbnail sebagai gantinya.');
          
          if (pinDetail.imageUrl) {
            const imageFileName = `pin_${pinDetail.id}${scraper.getImageExtension(pinDetail.imageUrl)}`;
            const imageFilePath = await scraper.downloadImage(pinDetail.imageUrl, imageFileName);
            
            if (imageFilePath) {
              caption += `\n\n⚠️ *Video tidak dapat diunduh. Ini adalah thumbnail.*`;
              
              await sock.sendMessage(msg.chat, {
                image: { url: imageFilePath },
                caption: caption,
              });
            } else {
              await msg.reply('Tidak dapat mengunduh gambar atau video dari pin ini.');
            }
          } else {
            await msg.reply('Tidak dapat mengunduh gambar atau video dari pin ini.');
          }
        } else {
          // Kirim video jika berhasil diunduh
          await sock.sendMessage(msg.chat, {
            video: { url: filePath },
            caption: caption,
          });
        }
      } else if (pinDetail.imageUrl) {
        // Jika pin adalah gambar
        const fileName = `pin_${pinDetail.id}${scraper.getImageExtension(pinDetail.imageUrl)}`;
        const filePath = await scraper.downloadImage(pinDetail.imageUrl, fileName);
        
        if (!filePath) {
          await msg.reply('Gagal mengunduh gambar.');
          return;
        }
        
        await sock.sendMessage(msg.chat, {
          image: { url: filePath },
          caption: caption,
        });
      } else {
        await msg.reply('Tidak ada gambar atau video yang dapat diunduh dari pin ini.');
      }
    } catch (error) {
      botLogger.error(`Error downloading from Pinterest: ${error.message}`);
      await msg.reply(`Error: ${error.message}`);
    }
  },
});

// Perintah untuk mengunduh gambar langsung dari URL Pinterest
global.Oblixn.cmd({
  name: 'pinurl',
  alias: ['pinlink'],
  desc: 'Mengunduh gambar atau video dari URL Pinterest.',
  category: 'utility',
  use: '!pinurl <url>',
  exec: async (msg, { args, sock }) => {
    const url = args[0];

    if (!url || !url.includes('pinterest.com/pin/')) {
      return await msg.reply('Masukkan URL Pinterest yang valid!\nContoh: !pinurl https://www.pinterest.com/pin/123456789/');
    }

    await msg.reply('Sedang memproses URL Pinterest, mohon tunggu...');

    try {
      // Ekstrak ID pin dari URL
      const pinIdMatch = url.match(/pinterest\.com\/pin\/([0-9]+)/);
      if (!pinIdMatch || !pinIdMatch[1]) {
        return await msg.reply('Format URL Pinterest tidak valid.');
      }
      
      const pinId = pinIdMatch[1];
      const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;
      
      // Scrape detail pin
      const { cookieHeader } = await scraper.loadCookies();
      const response = await scraper.makeRequest(pinUrl, { cookieHeader });
      const $ = cheerio.load(response.data);
      
      // Ambil informasi dasar
      const description = $('meta[property="og:description"]').attr('content') || '';
      const userProfile = $('[data-test-id="pinner-name"]').first().text().trim() || $('meta[name="og:site_name"]').attr('content') || 'Unknown';
      const boardName = $('[data-test-id="board-name"]').first().text().trim() || '';
      
      // Cek apakah video
      const isVideo = $('meta[name="twitter:card"]').attr('content') === 'player' || 
                      $('meta[property="og:video"]').length > 0;
      
      // Siapkan caption
      let caption = `📌 *Pinterest Pin*\n\n`;
      if (description) caption += `📝 *Deskripsi:* ${description}\n\n`;
      if (userProfile) caption += `👤 *Pengguna:* ${userProfile}\n`;
      if (boardName) caption += `📂 *Board:* ${boardName}\n`;
      caption += `\n🔗 *URL:* ${pinUrl}`;
      
      if (isVideo) {
        // Cari URL video
        const videoUrl = $('meta[property="og:video"]').attr('content') || 
                         $('meta[property="og:video:url"]').attr('content') || 
                         $('video source').attr('src');
        
        if (videoUrl) {
          await msg.reply('Pin ini adalah video. Sedang mengunduh...');
          
          // Unduh video
          const fileName = `pin_${pinId}${scraper.getVideoExtension(videoUrl)}`;
          const filePath = await scraper.downloadVideo(videoUrl, fileName);
          
          if (filePath) {
            await sock.sendMessage(msg.chat, {
              video: { url: filePath },
              caption: caption,
            });
          } else {
            // Jika gagal unduh video, kirim gambar thumbnail
            const imageUrl = $('meta[property="og:image"]').attr('content');
            if (imageUrl) {
              await msg.reply('Gagal mengunduh video. Mengirimkan thumbnail sebagai gantinya.');
              
              const imageFileName = `pin_${pinId}${scraper.getImageExtension(imageUrl)}`;
              const imageFilePath = await scraper.downloadImage(imageUrl, imageFileName);
              
              if (imageFilePath) {
                caption += `\n\n⚠️ *Video tidak dapat diunduh. Ini adalah thumbnail.*`;
                await sock.sendMessage(msg.chat, {
                  image: { url: imageFilePath },
                  caption: caption,
                });
              } else {
                await msg.reply('Tidak dapat mengunduh video atau gambar dari pin ini.');
              }
            } else {
              await msg.reply('Tidak dapat mengunduh video dari pin ini.');
            }
          }
        } else {
          await msg.reply('Terdeteksi sebagai video, tetapi URL video tidak ditemukan.');
        }
      } else {
        // Cari URL gambar resolusi tinggi
        let imageUrl = $('meta[property="og:image"]').attr('content');
        if (!imageUrl) {
          return await msg.reply('Tidak dapat menemukan gambar pada URL tersebut.');
        }
        
        // Unduh gambar
        const fileName = `pin_${pinId}${scraper.getImageExtension(imageUrl)}`;
        const filePath = await scraper.downloadImage(imageUrl, fileName);
        
        if (filePath) {
          await sock.sendMessage(msg.chat, {
            image: { url: filePath },
            caption: caption,
          });
        } else {
          await msg.reply('Gagal mengunduh gambar.');
        }
      }
    } catch (error) {
      botLogger.error(`Error downloading from Pinterest URL: ${error.message}`);
      await msg.reply(`Error: ${error.message}`);
    }
  },
});

// Perintah untuk mendapatkan trending Pinterest
global.Oblixn.cmd({
  name: 'pintrending',
  alias: ['pintrend'],
  desc: 'Menampilkan pin trending di Pinterest.',
  category: 'utility',
  use: '!pintrending [limit]',
  exec: async (msg, { args, sock }) => {
    let limit = parseInt(args[0]) || 5;
    
    if (isNaN(limit) || limit < 1 || limit > 10) {
      limit = 5;
    }
    
    await msg.reply(`Mencari ${limit} pin trending...`);
    
    try {
      const results = await scraper.getTrendingPins(limit);
      
      if (!results || results.length === 0) {
        return await msg.reply('Tidak dapat menemukan pin trending saat ini.');
      }
      
      let response = `📊 *Pin Trending di Pinterest* (${results.length})\n\n`;
      
      for (let i = 0; i < results.length; i++) {
        const pin = results[i];
        const title = pin.description?.substring(0, 40).trim() || 'Tanpa deskripsi';
        
        response += `${i + 1}. *${title}*${pin.description?.length > 40 ? '...' : ''}`;
        
        // Tambahkan URL pin
        if (pin.pinUrl) {
          response += `\n   🔗 ${pin.pinUrl}`;
        }
        
        response += `\n\n`;
      }
      
      response += `Gunakan !pinurl <url> untuk mengunduh pin tertentu.`;
      
      // Simpan hasil trending untuk pengguna ini
      if (!global.pinTrendingResults) global.pinTrendingResults = {};
      global.pinTrendingResults[msg.sender] = results;
      
      // Kirim contoh gambar dari pin trending pertama
      if (results[0]?.imageUrl) {
        const fileName = `pin_trending_${results[0].id}${scraper.getImageExtension(results[0].imageUrl)}`;
        const filePath = await scraper.downloadImage(results[0].imageUrl, fileName);
        
        if (filePath) {
          await sock.sendMessage(msg.chat, {
            image: { url: filePath },
            caption: response,
          });
          return;
        }
      }
      
      // Jika tidak bisa kirim gambar, kirim teks saja
      await msg.reply(response);
    } catch (error) {
      botLogger.error(`Error fetching trending pins: ${error.message}`);
      await msg.reply(`Error: ${error.message}`);
    }
  }
});

// Perintah untuk memberikan informasi pin
global.Oblixn.cmd({
  name: 'pininfo',
  desc: 'Menampilkan informasi detail tentang pin dari pencarian terakhir.',
  category: 'utility',
  use: '!pininfo <nomor>',
  exec: async (msg, { args }) => {
    const index = parseInt(args[0]) - 1;
    
    if (isNaN(index) || index < 0) {
      return await msg.reply('Masukkan nomor pin yang valid!\nContoh: !pininfo 1');
    }
    
    // Cek apakah ada hasil pencarian atau trending
    const source = global.pinSearchResults?.[msg.sender] || global.pinTrendingResults?.[msg.sender];
    
    if (!source) {
      return await msg.reply('Anda belum melakukan pencarian. Gunakan !pinscrape <keyword> atau !pintrending terlebih dahulu.');
    }
    
    if (index >= source.length) {
      return await msg.reply(`Nomor pin tidak valid. Tersedia ${source.length} hasil.`);
    }
    
    const pin = source[index];
    
    let info = `📌 *Detail Pinterest Pin*\n\n`;
    
    if (pin.description) info += `📝 *Deskripsi:* ${pin.description}\n\n`;
    if (pin.user) info += `👤 *Pengguna:* ${pin.user}\n`;
    if (pin.board) info += `📂 *Board:* ${pin.board}\n`;
    if (pin.likes) info += `❤️ *Suka:* ${pin.likes}\n`;
    if (pin.saves) info += `🔖 *Simpan:* ${pin.saves}\n`;
    
    if (pin.hashtags && pin.hashtags.length > 0) {
      info += `\n🏷️ *Hashtags:* ${pin.hashtags.map(tag => `#${tag}`).join(' ')}\n`;
    }
    
    if (pin.isVideo) info += `\n🎥 *Tipe Konten:* Video\n`;
    else info += `\n🖼️ *Tipe Konten:* Gambar\n`;
    
    info += `\n🔗 *URL:* ${pin.pinUrl}\n`;
    
    if (pin.imageUrl) info += `\n🖼️ *URL Gambar:* ${pin.imageUrl}\n`;
    if (pin.videoUrl) info += `\n🎬 *URL Video:* ${pin.videoUrl}\n`;
    
    if (pin.fetchedAt) info += `\n⏰ *Diambil pada:* ${new Date(pin.fetchedAt).toLocaleString()}\n`;
    
    await msg.reply(info);
  }
});