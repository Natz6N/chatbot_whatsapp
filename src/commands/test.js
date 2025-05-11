const { botLogger } = require('../utils/logger');

// Perintah test sederhana
global.Oblixn.cmd({
  name: "test",
  alias: ["tes", "ping"],
  desc: "Perintah untuk mengecek apakah bot aktif",
  category: "utility",
  exec: async (msg, { args }) => {
    try {
      botLogger.info("Menjalankan perintah test");
      
      // Hitung waktu respons
      const start = Date.now();
      const reply = await msg.reply("⏱️ Menghitung ping...");
      const end = Date.now();
      
      // Kirim respons dengan ping
      await msg.reply(`🤖 *Bot Aktif!*\n\n⏱️ Ping: ${end - start}ms\n📅 ${new Date().toLocaleString('id-ID')}`);
      
      return true;
    } catch (error) {
      botLogger.error(`Error dalam perintah test: ${error.message}`);
      await msg.reply("Terjadi kesalahan saat menjalankan perintah test.");
      return false;
    }
  }
}); 