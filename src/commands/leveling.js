const { getLeaderboard, getUserData, getRequiredXP, addXP, normalizeUserId } = require('../leveling');
const { botLogger } = require('../utils/logger');
const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const db = require("../../database/confLowDb/lowdb"); // Path database yang benar

// Command untuk melihat rank user
global.Oblixn.cmd({
  name: 'rank',
  alias: ['level', 'xp', 'lvl'],
  desc: 'Melihat level dan XP kamu atau pengguna lain',
  category: 'leveling',
  usage: '@user (opsional)',
  exec: async (msg, { args, sock }) => {
    try {
      // Tentukan ID target (pengirim pesan atau user yang di-tag)
      let targetId = msg.sender;
      if (msg.mentions && msg.mentions.length > 0) {
        targetId = msg.mentions[0];
      }
      
      // Dapatkan data user
      const userData = await getUserData(targetId);
      if (!userData) {
        return await msg.reply('Data pengguna tidak ditemukan.');
      }
      
      // Buat rank card dengan Canvas
      const rankCard = await createRankCard(userData, targetId, msg.pushName);
      if (!rankCard) {
        return await msg.reply('Gagal membuat kartu rank.');
      }
      
      // Kirim sebagai gambar
      await sock.sendMessage(msg.from, {
        image: rankCard,
        caption: `🎮 *Rank Card* 🎮\n\nLevel: ${userData.level}\nXP: ${userData.experience}/${getRequiredXP(userData.level)}\nTotal XP: ${userData.total_xp}`,
      }, { quoted: msg });
      
      // Log aktivitas
      botLogger.info(`Command rank dijalankan oleh ${msg.pushName || msg.sender}`);
    } catch (error) {
      botLogger.error(`Error pada command rank: ${error.message}`);
      await msg.reply('Terjadi kesalahan saat menjalankan command rank.');
    }
  }
});

// Command untuk melihat leaderboard
global.Oblixn.cmd({
  name: 'leaderboard',
  alias: ['lb', 'top', 'topxp', 'toplevel'],
  desc: 'Melihat daftar pengguna dengan XP tertinggi',
  category: 'leveling',
  usage: '[jumlah=10]',
  exec: async (msg, { args, sock }) => {
    try {
      // Tentukan jumlah user yang ditampilkan (default 10)
      const limit = parseInt(args[0]) || 10;
      if (limit < 1 || limit > 50) {
        return await msg.reply('Jumlah harus antara 1-50.');
      }
      
      // Dapatkan data leaderboard
      const leaderboard = await getLeaderboard(limit);
      if (!leaderboard || leaderboard.length === 0) {
        return await msg.reply('Belum ada data leaderboard.');
      }
      
      // Format pesan leaderboard
      let leaderboardMsg = `🏆 *TOP ${limit} LEADERBOARD* 🏆\n\n`;
      
      leaderboard.forEach((user, index) => {
        // Tambahkan emoji berdasarkan posisi
        let position;
        if (index === 0) position = '🥇';
        else if (index === 1) position = '🥈';
        else if (index === 2) position = '🥉';
        else position = `${index + 1}.`;
        
        leaderboardMsg += `${position} ${user.username || `@${user.user_id}`}\n`;
        leaderboardMsg += `   Level: ${user.level} | XP: ${user.total_xp}\n\n`;
      });
      
      // Tambahkan posisi pengirim pesan
      const senderPosition = await getUserPosition(msg.sender);
      if (senderPosition) {
        leaderboardMsg += `\n📊 Posisi kamu: #${senderPosition.position} dari ${senderPosition.total} pengguna`;
      }
      
      await msg.reply(leaderboardMsg);
      
      // Log aktivitas
      botLogger.info(`Command leaderboard dijalankan oleh ${msg.pushName || msg.sender}`);
    } catch (error) {
      botLogger.error(`Error pada command leaderboard: ${error.message}`);
      await msg.reply('Terjadi kesalahan saat menjalankan command leaderboard.');
    }
  }
});

// Command untuk memberikan XP kepada pengguna lain (khusus admin/owner)
global.Oblixn.cmd({
  name: 'givexp',
  alias: ['addxp'],
  desc: 'Memberikan XP kepada pengguna (khusus admin/owner)',
  category: 'leveling',
  usage: '@user jumlah_xp',
  isAdmin: true,
  isOwner: true,
  exec: async (msg, { args, sock }) => {
    try {
      // Validasi input
      if (!msg.mentions || msg.mentions.length === 0) {
        return await msg.reply('Tag pengguna yang ingin diberi XP.');
      }
      
      const targetId = msg.mentions[0];
      const xpToAdd = parseInt(args[1]);
      
      if (isNaN(xpToAdd) || xpToAdd < 1) {
        return await msg.reply('Jumlah XP harus berupa angka positif.');
      }
      
      // Tambahkan XP langsung dari modul leveling
      const result = await addXP(targetId, xpToAdd, sock, msg.from);
      
      // Kirim pesan konfirmasi
      await msg.reply(`Berhasil menambahkan ${xpToAdd} XP kepada @${targetId.split('@')[0]}.${result.leveledUp ? `\n\nUser naik level dari ${result.oldLevel} ke ${result.newLevel}! 🎉` : ''}`);
      
      // Log aktivitas
      botLogger.info(`${msg.pushName || msg.sender} memberikan ${xpToAdd} XP kepada ${targetId}`);
    } catch (error) {
      botLogger.error(`Error pada command givexp: ${error.message}`);
      await msg.reply('Terjadi kesalahan saat menjalankan command givexp.');
    }
  }
});

// Command untuk mengatur ulang XP/level pengguna (khusus owner)
global.Oblixn.cmd({
  name: 'resetrank',
  alias: ['resetlevel', 'resetxp'],
  desc: 'Mengatur ulang level dan XP pengguna (khusus owner)',
  category: 'leveling',
  usage: '@user',
  isOwner: true,
  exec: async (msg, { args, sock }) => {
    try {
      // Validasi input
      if (!msg.mentions || msg.mentions.length === 0) {
        return await msg.reply('Tag pengguna yang ingin direset levelnya.');
      }
      
      const targetId = msg.mentions[0];
      const normalizedId = normalizeUserId(targetId);
      
      // Reset level dan XP
      await db.updateUser(normalizedId, {
        level: 1,
        experience: 0,
        total_xp: 0,
        daily_xp: 0,
        weekly_xp: 0,
        updated_at: new Date().toISOString()
      });
      
      // Kirim pesan konfirmasi
      await msg.reply(`Level dan XP @${normalizedId} telah direset ke level 1.`);
      
      // Log aktivitas
      botLogger.info(`${msg.pushName || msg.sender} mereset level ${targetId}`);
    } catch (error) {
      botLogger.error(`Error pada command resetrank: ${error.message}`);
      await msg.reply('Terjadi kesalahan saat menjalankan command resetrank.');
    }
  }
});

// Command untuk melihat informasi sistem leveling
global.Oblixn.cmd({
  name: 'levelinfo',
  alias: ['xpinfo', 'levelhelp'],
  desc: 'Melihat informasi tentang sistem leveling',
  category: 'leveling',
  exec: async (msg, { args, sock }) => {
    try {
      const levelInfo = `📊 *SISTEM LEVELING BOT* 📊

🔹 *Cara Mendapatkan XP:*
- Mengirim pesan: +5 XP
- Menggunakan command: +10 XP
- Bermain game: +20 XP
- Memenangkan game: +50 XP
- Daily claim: +20 XP

🔹 *Perintah Leveling:*
- *!rank* - Melihat level & XP kamu
- *!rank @user* - Melihat level pengguna lain
- *!leaderboard* - Top 10 user dengan XP tertinggi
- *!leaderboard 20* - Top 20 user dengan XP tertinggi
- *!daily* - Klaim XP harian
- *!levelinfo* - Informasi tentang sistem leveling

🔸 *Benefit Level Tinggi:*
- Lebih banyak limit command per hari
- Akses ke fitur khusus
- Status di leaderboard global

Level up akan diumumkan secara otomatis saat kamu mencapai XP yang cukup.`;

      await msg.reply(levelInfo);
      
      // Log aktivitas
      botLogger.info(`Command levelinfo dijalankan oleh ${msg.pushName || msg.sender}`);
    } catch (error) {
      botLogger.error(`Error pada command levelinfo: ${error.message}`);
      await msg.reply('Terjadi kesalahan saat menjalankan command levelinfo.');
    }
  }
});

// Command untuk klaim XP harian
global.Oblixn.cmd({
  name: 'daily',
  alias: ['dailyxp', 'claimxp'],
  desc: 'Klaim XP harian kamu',
  category: 'leveling',
  exec: async (msg, { args, sock }) => {
    try {
      const userId = msg.sender;
      const normalizedId = normalizeUserId(userId);
      
      // Cek apakah sudah klaim hari ini
      const userData = await getUserData(userId);
      const lastClaim = userData.last_daily_claim;
      
      // Periksa cooldown (24 jam)
      const now = new Date();
      if (lastClaim) {
        const lastClaimDate = new Date(lastClaim);
        const timeDiff = now - lastClaimDate;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          const remaining = 24 - hoursDiff;
          const hours = Math.floor(remaining);
          const minutes = Math.floor((remaining - hours) * 60);
          
          return await msg.reply(`⏰ Kamu sudah klaim XP harian hari ini!\nTunggu ${hours} jam ${minutes} menit lagi.`);
        }
      }
      
      // Tambahkan daily XP (20 XP)
      const result = await addXP(userId, 20, sock, msg.from);
      
      // Update tanggal claim
      await db.updateUser(normalizedId, {
        last_daily_claim: now.toISOString()
      });
      
      // Kirim pesan berhasil
      await msg.reply(`✅ Kamu telah menerima 20 XP harian!

Level: ${result.level}
XP: ${result.experience}/${getRequiredXP(result.level)}
Total XP: ${result.total_xp}

Kembali lagi besok untuk mendapatkan XP harian lagi!`);
      
      // Log aktivitas
      botLogger.info(`${msg.pushName || userId} klaim daily XP`);
    } catch (error) {
      botLogger.error(`Error pada command daily: ${error.message}`);
      await msg.reply('Terjadi kesalahan saat menjalankan command daily.');
    }
  }
});

// Fungsi untuk mendapatkan posisi user dalam leaderboard
async function getUserPosition(userId) {
  try {
    const normalizedId = normalizeUserId(userId);
    const data = await db.readDatabase();
    const users = data.users || [];
    
    // Sortir users berdasarkan total XP
    const sortedUsers = users
      .filter(user => user.total_xp != null)
      .sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));
    
    // Cari posisi pengguna
    const userIndex = sortedUsers.findIndex(user => user.user_id === normalizedId);
    
    if (userIndex !== -1) {
      return {
        position: userIndex + 1,
        total: sortedUsers.length
      };
    }
    
    return null;
  } catch (error) {
    botLogger.error(`Error mencari posisi user: ${error.message}`);
    return null;
  }
}

// Fungsi untuk membuat rank card dengan Canvas
async function createRankCard(userData, userId, pushName) {
  try {
    // Set up Canvas
    const canvas = Canvas.createCanvas(800, 300);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#1f1f1f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    ctx.strokeStyle = '#4f4f4f';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Username
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pushName || `@${normalizeUserId(userId)}`, 250, 80);
    
    // Level
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#7289DA';
    ctx.fillText(`Lv.${userData.level}`, 250, 160);
    
    // XP
    const requiredXP = getRequiredXP(userData.level);
    ctx.font = '24px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`XP: ${userData.experience}/${requiredXP}`, 250, 200);
    
    // XP Progress Bar
    const barX = 250;
    const barY = 220;
    const barWidth = 500;
    const barHeight = 30;
    
    // Background bar
    ctx.fillStyle = '#4f4f4f';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress
    const progress = Math.min(userData.experience / requiredXP, 1);
    ctx.fillStyle = '#7289DA';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    
    // Total XP
    ctx.font = '20px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`Total XP: ${userData.total_xp}`, 250, 280);
    
    // Profil Image (lingkaran)
    try {
      // Cek apakah file gambar default ada
      const defaultProfilePath = path.join(process.cwd(), 'src', 'assets', 'default_profile.png');
      
      // Gunakan gambar default
      let profilePic;
      try {
        profilePic = await Canvas.loadImage(defaultProfilePath);
      } catch {
        // Jika file tidak ditemukan, buat lingkaran berwarna sebagai pengganti
        ctx.fillStyle = '#7289DA';
        ctx.beginPath();
        ctx.arc(125, 150, 100, 0, Math.PI * 2, true);
        ctx.fill();
      }
      
      if (profilePic) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(125, 150, 100, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(profilePic, 25, 50, 200, 200);
        ctx.restore();
      }
    } catch (error) {
      botLogger.error(`Error saat memuat gambar profil: ${error.message}`);
      // Fallback: buat lingkaran berwarna
      ctx.fillStyle = '#7289DA';
      ctx.beginPath();
      ctx.arc(125, 150, 100, 0, Math.PI * 2, true);
      ctx.fill();
    }
    
    // Convert to buffer
    return canvas.toBuffer();
  } catch (error) {
    botLogger.error(`Error membuat rank card: ${error.message}`);
    return null;
  }
}

module.exports = {
  getUserPosition,
  createRankCard
};
