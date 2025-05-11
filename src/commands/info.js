const { logAlways } = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { config } = require('../../config/config');

// Perintah untuk menampilkan informasi bot
global.Oblixn.cmd({
  name: 'botinfo',
  alias: ['about', 'info', 'infobot'],
  desc: 'Menampilkan informasi tentang bot',
  category: 'info',
  exec: async (msg, { args, sock }) => {
    try {
      // Path ke file ASCII
      const asciiFilePath = path.join(process.cwd(), 'database', 'ascii.txt');
      
      // Baca file ASCII jika ada
      let asciiBanner = "=== Oblivinx Bot ===\n";
      if (fs.existsSync(asciiFilePath)) {
        asciiBanner = fs.readFileSync(asciiFilePath, 'utf8');
      }
      
      // Kumpulkan informasi sistem
      const uptime = formatUptime(process.uptime());
      const memoryUsage = formatBytes(process.memoryUsage().heapUsed);
      const totalMemory = formatBytes(os.totalmem());
      const freeMemory = formatBytes(os.freemem());
      const cpuModel = os.cpus()[0].model;
      const platform = os.platform();
      
      // Susun pesan informasi bot
      const infoMessage = `${asciiBanner}

📊 *INFORMASI BOT* 📊

*Nama Bot:* ${config.botName}
*Versi:* 1.0.0
*Prefix:* ${config.prefix}
*Uptime:* ${uptime}
*Memory:* ${memoryUsage} / ${totalMemory}
*Platform:* ${platform}
*CPU:* ${cpuModel}

👨‍💻 *DEVELOPER* 👨‍💻
*Nama:* ${process.env.OWNER1_NAME || 'Natz'}
*Email:* ${process.env.OWNER1_EMAIL || 'riobelly@gmail.com'}
*GitHub:* ${process.env.OWNER1_GITHUB || 'https://github.com/RioBelly'}
*Kontak:* ${process.env.OWNER_NUMBER_ONE || '081910058235'}
*Instagram:* patch.cpp

🔗 *FITUR UTAMA* 🔗
• Chat dengan AI
• Tools & Utility
• Game Interaktif
• Pencarian Media
• Dan masih banyak lagi!

Gunakan *${config.prefix}menu* untuk melihat daftar perintah.
`;
      
      // Kirim pesan informasi bot
      await msg.reply(infoMessage);
      
      // Tampilkan juga di konsol dengan logAlways
      logAlways('Perintah botinfo dijalankan oleh ' + msg.pushName, 'info');
      
    } catch (error) {
      console.error('Error menampilkan info bot:', error);
      await msg.reply('Terjadi kesalahan saat menampilkan informasi bot.');
    }
  }
});

// Fungsi pembantu untuk memformat uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (days > 0) result += `${days} hari `;
  if (hours > 0) result += `${hours} jam `;
  if (minutes > 0) result += `${minutes} menit `;
  if (secs > 0) result += `${secs} detik`;
  
  return result.trim();
}

// Fungsi pembantu untuk memformat ukuran byte
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 