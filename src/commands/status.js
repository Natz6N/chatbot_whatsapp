const os = require('os');
const fs = require('fs');
const path = require('path');
const { logAlways } = require('../utils/logger');

global.Oblixn.cmd({
  name: 'status',
  alias: ['stats', 'stat', 'server'],
  desc: 'Menampilkan status bot dan server',
  category: 'info',
  exec: async (msg, { args, sock }) => {
    try {
      // Kumpulkan informasi sistem
      const uptime = formatUptime(process.uptime());
      const memUsed = formatBytes(process.memoryUsage().heapUsed);
      const memTotal = formatBytes(os.totalmem());
      const memFree = formatBytes(os.freemem());
      const cpuUsage = os.loadavg()[0].toFixed(2);
      const cpuCores = os.cpus().length;
      const cpuModel = os.cpus()[0].model;
      const platform = os.platform();
      const hostname = os.hostname();
      
      // Hitung jumlah file log
      const logDir = path.join(process.cwd(), 'logs');
      const logFiles = fs.existsSync(logDir) ? fs.readdirSync(logDir) : [];
      const logSize = logFiles.reduce((size, file) => {
        const filePath = path.join(logDir, file);
        return size + (fs.existsSync(filePath) ? fs.statSync(filePath).size : 0);
      }, 0);
      
      const statusMessage = `🖥️ *STATUS SERVER* 🖥️

*Uptime:* ${uptime}
*Memory:* ${memUsed} / ${memTotal} (${Math.round(process.memoryUsage().heapUsed / os.totalmem() * 100)}%)
*Storage Logs:* ${formatBytes(logSize)}
*CPU Load:* ${cpuUsage} (${cpuCores} cores)
*CPU Model:* ${cpuModel}
*Platform:* ${platform} (${os.release()})
*Hostname:* ${hostname}

🤖 *STATUS BOT* 🤖
*Status:* Online
*Mode Debug:* ${process.env.DEBUG_MODE === 'true' ? 'Aktif' : 'Nonaktif'}
*Logging:* ${process.env.LOGGING_ENABLED !== 'false' ? 'Aktif' : 'Nonaktif (hanya error)'}
*Version:* 1.0.0

Gunakan *!botinfo* untuk melihat informasi lengkap tentang bot.`;

      await msg.reply(statusMessage);
      
      // Log aktivitas ke konsol
      logAlways(`Command status dijalankan oleh ${msg.pushName || msg.sender}`, 'info');
      
    } catch (error) {
      console.error('Error menampilkan status:', error);
      await msg.reply('Terjadi kesalahan saat mengambil status server.');
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

// Fungsi pembantu untuk memformat bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 