const { messageQueue } = require('../../src/utils/messageQueue');

// Tambahkan command untuk melihat status antrian pesan (untuk owner)
global.Oblixn.cmd({
  name: 'qstats',
  alias: ['queuestats', 'antrian'],
  desc: 'Menampilkan statistik antrian pesan',
  category: 'owner',
  exec: async (msg, { args, sock }) => {
    try {
      // Dapatkan statistik dari message queue
      const stats = messageQueue.getStatistics();
      
      // Format waktu dalam format yang mudah dibaca
      const uptime = formatTime(stats.uptime);
      
      // Hitung rate pemrosesan
      const processingRate = stats.totalProcessed > 0 && stats.uptime > 0 ? 
        stats.totalProcessed / stats.uptime : 0;
      
      // Buat pesan statistik
      const statsMessage = `📊 *STATISTIK ANTRIAN PESAN*\n\n` +
        `🕒 Uptime: ${uptime}\n` +
        `📥 Total Pesan Diterima: ${stats.totalReceived.toLocaleString()}\n` +
        `✅ Total Pesan Diproses: ${stats.totalProcessed.toLocaleString()}\n` +
        `❌ Total Error: ${stats.totalErrors.toLocaleString()}\n` +
        `⏱️ Rate Pemrosesan: ${processingRate.toFixed(2)} pesan/detik\n` +
        `📋 Panjang Antrian Sekarang: ${stats.currentQueueLength.toLocaleString()}\n` +
        `⚙️ Pesan Sedang Diproses: ${stats.currentlyProcessing.toLocaleString()}\n` +
        `📈 Puncak Panjang Antrian: ${stats.highestQueueLength.toLocaleString()}\n` +
        `\n🔆 Kapasitas: ${messageQueue.maxQueueSize.toLocaleString()} pesan\n` +
        `🔄 Konkurensi: ${messageQueue.maxConcurrentProcessing} pesan`;
      
      // Kirim pesan statistik ke pengguna
      await msg.reply(statsMessage);
      
    } catch (error) {
      console.error('Error menampilkan statistik antrian:', error);
      await msg.reply('Terjadi kesalahan saat menampilkan statistik antrian.');
    }
  }
});

// Fungsi pembantu untuk memformat waktu dalam format yang mudah dibaca
function formatTime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (days > 0) result += `${days}h `;
  if (hours > 0) result += `${hours}j `;
  if (minutes > 0) result += `${minutes}m `;
  if (secs > 0 || result === '') result += `${secs}d`;
  
  return result.trim();
}
