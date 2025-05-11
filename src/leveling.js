const db = require("../database/confLowDb/lowdb"); // Impor database AJV dari lowdb.js
const { botLogger } = require("./utils/logger");
const levelUpgrade = require("./lib/levelUpgrade");

// Fungsi untuk menghitung XP yang dibutuhkan agar user naik level
function getRequiredXP(level) {
  // Formula: level 1 membutuhkan 100 XP, dan setiap level berikutnya naik 1.5x
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Fungsi untuk normalisasi ID (menghilangkan @s.whatsapp.net)
function normalizeUserId(userId) {
  if (!userId || typeof userId !== 'string') return null;
  
  // Jika userId kosong setelah trim, return null
  if (userId.trim() === '') return null;
  
  // Bersihkan dari bagian device, server, dan pastikan hanya angka
  const cleanNumber = userId.split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
  
  // Validasi: minimal panjang 5 digit untuk nomor yang valid
  if (!cleanNumber || cleanNumber.length < 5) return null;
  
  return cleanNumber;
}

// Fungsi untuk mendapatkan data user dari database
async function getUserData(userId) {
  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      botLogger.warn('getUserData: userId kosong atau tidak valid, skip.');
      return null;
    }
    
    const normalizedId = normalizeUserId(userId);
    if (!normalizedId) {
      botLogger.warn('getUserData: userId gagal dinormalisasi.');
      return null; // Return null instead of throwing error
    }
    
    try {
      // Coba ambil data user
      let userData = await db.getUser(normalizedId);
      
      // Jika user belum ada, buat baru
      if (!userData) {
        botLogger.info(`getUserData: Membuat user baru: ${normalizedId}`);
        
        try {
          const newUser = {
            user_id: normalizedId,
            username: null,
            level: 1,
            experience: 0,
            total_messages: 0,
            total_xp: 0,
            daily_xp: 0,
            weekly_xp: 0
          };
          
          const result = await db.addUser(newUser);
          userData = result;
          
          if (!userData) {
            botLogger.warn(`getUserData: Gagal membuat user baru: ${normalizedId}`);
            return null;
          }
        } catch (addError) {
          botLogger.error(`getUserData: Error saat membuat user baru (${normalizedId}): ${addError.message}`);
          return null;
        }
      }
      
      return userData;
    } catch (dbError) {
      botLogger.error(`getUserData: Database error untuk userId ${normalizedId}: ${dbError.message}`);
      return null;
    }
  } catch (error) {
    botLogger.error(`getUserData: Unexpected error: ${error.message}`);
    return null; // Return null instead of throwing to prevent crashes
  }
}

// Fungsi untuk menambah XP user dan menangani proses level up
async function addXP(userId, xpToAdd, sock = null, groupId = null) {
  try {
    // Validasi userId
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      botLogger.warn('addXP: userId kosong atau tidak valid, skip XP.');
      return null;
    }
    
    // Validasi xpToAdd
    if (typeof xpToAdd !== 'number' || isNaN(xpToAdd) || xpToAdd <= 0) {
      botLogger.warn(`addXP: xpToAdd tidak valid (${xpToAdd}), skip XP.`);
      return null;
    }
    
    // Normalisasi ID (seharusnya sudah dinormalisasi dari pemanggilan sebelumnya)
    if (normalizeUserId(userId) !== userId) {
      botLogger.warn(`addXP: userId ${userId} belum dinormalisasi dengan benar, menormalisasi ulang.`);
      userId = normalizeUserId(userId);
      
      // Cek lagi setelah normalisasi
      if (!userId) {
        botLogger.error("Invalid userId for addXP after normalization");
        return null; // Return null daripada throw error untuk mencegah crash
      }
    }
    
    // Dapatkan data user dari database
    const userData = await getUserData(userId);
    if (!userData) {
      botLogger.warn(`addXP: Tidak dapat menemukan data untuk user ${userId}`);
      return null;
    }
    
    // Update nilai XP
    userData.experience = (userData.experience || 0) + xpToAdd;
    userData.total_xp = (userData.total_xp || 0) + xpToAdd;
    userData.daily_xp = (userData.daily_xp || 0) + xpToAdd;
    userData.weekly_xp = (userData.weekly_xp || 0) + xpToAdd;
    
    let requiredXP = getRequiredXP(userData.level || 1);
    let oldLevel = userData.level || 1;
    let newLevel = oldLevel;
    let leveledUp = false;

    // Jika XP cukup untuk naik level, lakukan iterasi level up berulang kali
    while (userData.experience >= requiredXP) {
      userData.experience -= requiredXP;
      newLevel += 1;
      leveledUp = true;
      requiredXP = getRequiredXP(newLevel);
      botLogger.info(`User ${userId} naik ke level ${newLevel}`);
    }

    // Perbarui data user di database
    await db.updateUser(userId, {
      experience: userData.experience,
      level: newLevel,
      total_xp: userData.total_xp,
      daily_xp: userData.daily_xp,
      weekly_xp: userData.weekly_xp,
      last_message_xp: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // Kirim notifikasi level up jika user naik level
    if (leveledUp && sock) {
      await levelUpgrade.sendUserLevelUpNotification(sock, userId, oldLevel, newLevel, groupId);
      
      // Cek achievement setelah level up
      if (global.Oblixn && global.Oblixn.checkAchievements) {
        await global.Oblixn.checkAchievements(userId, 'level');
      }
    }

    return {
      ...userData,
      level: newLevel,
      leveledUp,
      oldLevel,
      newLevel
    };
  } catch (error) {
    botLogger.error(`Gagal menambahkan XP untuk user ${userId}:`, error);
    throw error;
  }
}

// Fungsi untuk menambah XP grup dan menangani level up
async function addGroupXP(groupId, xpToAdd, sock = null) {
  try {
    if (!groupId) {
      botLogger.error("Invalid groupId for addGroupXP");
      throw new Error("Invalid group ID");
    }
    
    // Dapatkan data grup
    let groupData = await db.getGroup(groupId);
    
    // Jika grup tidak ada di database, buat baru
    if (!groupData) {
      try {
        const result = await db.addGroup({
          group_id: groupId,
          owner_id: "system", // Placeholder
          group_name: null,
          level: 1,
          current_xp: 0,
          total_xp: 0,
          xp_to_next_level: getRequiredXP(1),
          created_at: new Date().toISOString()
        });
        groupData = result.data;
      } catch (error) {
        botLogger.error(`Gagal menambahkan grup baru: ${error.message}`);
        return null;
      }
    }
    
    // Update XP
    const currentXP = (groupData.current_xp || 0) + xpToAdd;
    const totalXP = (groupData.total_xp || 0) + xpToAdd;
    const oldLevel = groupData.level || 1;
    let newLevel = oldLevel;
    
    // Periksa level up
    let requiredXP = getRequiredXP(oldLevel);
    let remainingXP = currentXP;
    let leveledUp = false;
    
    while (remainingXP >= requiredXP) {
      remainingXP -= requiredXP;
      newLevel++;
      leveledUp = true;
      requiredXP = getRequiredXP(newLevel);
    }
    
    // Update grup di database
    await db.updateGroup(groupId, {
      level: newLevel,
      current_xp: remainingXP,
      total_xp: totalXP,
      xp_to_next_level: requiredXP
    });
    
    // Kirim notifikasi level up jika grup naik level
    if (leveledUp && sock) {
      await levelUpgrade.sendGroupLevelUpNotification(sock, groupId, oldLevel, newLevel);
    }
    
    return {
      leveledUp,
      oldLevel,
      newLevel,
      currentXP: remainingXP,
      totalXP
    };
  } catch (error) {
    botLogger.error(`Gagal menambahkan XP untuk grup ${groupId}:`, error);
    throw error;
  }
}

// Fungsi untuk melacak aktivitas dan memberikan XP
async function trackActivityXP(userId, groupId, activityType, amount = 1, sock = null) {
  try {
    // Validasi userId dengan ketat
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      botLogger.warn('trackActivityXP: userId kosong atau tidak valid, skip XP.');
      return { user: null, group: null };
    }

    // Normalisasi userId
    const normalizedId = normalizeUserId(userId);
    if (!normalizedId) {
      botLogger.warn(`trackActivityXP: userId tidak valid setelah normalisasi (${userId}), skip XP.`);
      return { user: null, group: null };
    }

    // Validasi groupId jika ada
    let normalizedGroupId = null;
    if (groupId) {
      normalizedGroupId = normalizeUserId(groupId);
      if (!normalizedGroupId) {
        botLogger.warn(`trackActivityXP: groupId tidak valid setelah normalisasi (${groupId}), gunakan null.`);
      }
    }
    
    // Tentukan XP berdasarkan jenis aktivitas
    let xpAmount = 0;
    
    switch (activityType) {
      case 'message':
        xpAmount = 5; // XP dasar untuk pesan
        break;
      case 'command':
        xpAmount = 10; // XP untuk penggunaan command
        break;
      case 'game':
        xpAmount = 20; // XP untuk bermain game
        break;
      case 'win':
        xpAmount = 50; // XP untuk memenangkan game
        break;
      case 'daily':
        xpAmount = 20; // XP untuk daily login
        break;
      default:
        xpAmount = 2; // XP default untuk aktivitas lain
    }
    
    // Lacak aktivitas untuk achievement
    if (global.Oblixn && global.Oblixn.trackUserActivity) {
      await global.Oblixn.trackUserActivity(normalizedId, activityType, amount);
    }
    
    // Tambah XP user
    const userResult = await addXP(normalizedId, xpAmount, sock, normalizedGroupId);
    
    // Tambah XP grup jika dalam grup
    let groupResult = null;
    if (normalizedGroupId) {
      groupResult = await addGroupXP(normalizedGroupId, Math.floor(xpAmount / 2), sock);
    }
    
    return {
      user: userResult,
      group: groupResult
    };
  } catch (error) {
    botLogger.error(`Error tracking activity XP: ${error.message}`);
    return { 
      user: null, 
      group: null 
    };
  }
}

// Fungsi untuk mendapatkan data leaderboard
async function getLeaderboard(limit = 10) {
  try {
    const users = await db.readDatabase().then((data) => data.users || []);
    
    // Sortir berdasarkan total XP
    const sortedUsers = users
      .filter(user => user.total_xp != null)
      .sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0))
      .slice(0, limit);
      
    return sortedUsers.map(user => ({
      user_id: user.user_id,
      username: user.username || 'User',
      level: user.level || 1,
      total_xp: user.total_xp || 0,
      experience: user.experience || 0
    }));
  } catch (error) {
    botLogger.error("Gagal mengambil data leaderboard:", error);
    return [];
  }
}

// Fungsi untuk mengambil semua data leveling (untuk monitoring)
async function getLevelingData() {
  try {
    const users = await db.readDatabase().then((data) => data.users || []);
    const levelingMap = new Map();
    users.forEach((user) => {
      levelingMap.set(user.user_id, {
        level: user.level || 1,
        xp: user.experience || 0,
        total_xp: user.total_xp || 0,
        daily_xp: user.daily_xp || 0,
        weekly_xp: user.weekly_xp || 0
      });
    });
    return levelingMap;
  } catch (error) {
    botLogger.error("Gagal mengambil data leveling:", error);
    throw error;
  }
}

// Tambah fungsi handler untuk integrasi dengan sistem pesan
function setupMessageHandler(sock) {
  // Daftarkan handler untuk pesan
  if (global.Oblixn && global.Oblixn.ev) {
    global.Oblixn.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        // Pastikan ini pesan baru (bukan status/notifikasi)
        if (msg.key.remoteJid && !msg.key.fromMe && msg.message) {
          const sender = msg.key.participant || msg.key.remoteJid;
          const isGroup = msg.key.remoteJid.endsWith('@g.us');
          const groupId = isGroup ? msg.key.remoteJid : null;
          
          // Tambahkan XP untuk aktivitas pesan
          await trackActivityXP(sender, groupId, 'message', 1, sock);
        }
      }
    });
  }
}

// Helper untuk format pesan leaderboard
function formatLeaderboardMessage(leaderboard, senderId = null) {
  let leaderboardMsg = `�� *LEADERBOARD* 🏆\n\n`;
  leaderboard.forEach((user, index) => {
    let position;
    if (index === 0) position = '🥇';
    else if (index === 1) position = '🥈';
    else if (index === 2) position = '🥉';
    else position = `${index + 1}.`;
    leaderboardMsg += `${position} ${user.username || `@${user.user_id}`}\n`;
    leaderboardMsg += `   Level: ${user.level} | XP: ${user.total_xp}\n\n`;
  });
  if (senderId) {
    leaderboardMsg += `\n📊 Posisi kamu: #${leaderboard.findIndex(u => u.user_id === senderId) + 1} dari ${leaderboard.length} pengguna`;
  }
  return leaderboardMsg;
}

// Helper untuk format pesan rank
function formatRankMessage(userData) {
  return `🎮 *Rank Card* 🎮\n\nLevel: ${userData.level}\nXP: ${userData.experience}/${getRequiredXP(userData.level)}\nTotal XP: ${userData.total_xp}`;
}

// Ekspor fungsi utama dan helper
module.exports = {
  getRequiredXP,
  getUserData,
  addXP,
  addGroupXP,
  trackActivityXP,
  getLevelingData,
  getLeaderboard,
  setupMessageHandler,
  normalizeUserId,
  formatLeaderboardMessage,
  formatRankMessage,
};