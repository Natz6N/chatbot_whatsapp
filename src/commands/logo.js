const fs = require('fs');
const path = require('path');
const { logAlways } = require('../utils/logger');

global.Oblixn.cmd({
  name: 'logo',
  alias: ['banner', 'ascii'],
  desc: 'Menampilkan logo bot dalam format ASCII',
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
      
      // Kirim logo ASCII sebagai pesan monospace
      await msg.reply("```" + asciiBanner + "```");
      
      // Log ke konsol
      logAlways(`Command logo dijalankan oleh ${msg.pushName || msg.sender}`, 'info');
      
    } catch (error) {
      console.error('Error menampilkan logo bot:', error);
      await msg.reply('Terjadi kesalahan saat menampilkan logo bot.');
    }
  }
});

// Versi logo dengan gambar
global.Oblixn.cmd({
  name: 'logoimg',
  alias: ['gambarlogo', 'botlogo'],
  desc: 'Menampilkan logo bot dalam format gambar',
  category: 'info',
  exec: async (msg, { args, sock }) => {
    try {
      // Path ke file gambar logo
      const logoPath = path.join(process.cwd(), 'logo.svg');
      const logoJpgPath = path.join(process.cwd(), 'test.jpg'); // Menggunakan file test.jpg yang sudah ada
      
      let logoFile = null;
      
      // Cek apakah file logo ada
      if (fs.existsSync(logoJpgPath)) {
        logoFile = logoJpgPath;
      } else if (fs.existsSync(logoPath)) {
        logoFile = logoPath;
      }
      
      if (logoFile) {
        // Kirim gambar dengan caption
        await sock.sendMessage(msg.chat, {
          image: { url: logoFile },
          caption: `*Oblivinx Bot*\nBot WhatsApp dengan berbagai fitur menarik.\nGunakan *!menu* untuk melihat daftar perintah.`
        });
      } else {
        // Jika tidak ada file gambar, kirim pesan teks saja
        await msg.reply('Logo gambar tidak tersedia. Gunakan !logo untuk melihat logo ASCII.');
      }
      
      // Log ke konsol
      logAlways(`Command logoimg dijalankan oleh ${msg.pushName || msg.sender}`, 'info');
      
    } catch (error) {
      console.error('Error menampilkan logo gambar:', error);
      await msg.reply('Terjadi kesalahan saat menampilkan logo gambar.');
    }
  }
}); 