/**
 * Game Helper - Integrasi sistem game dengan leveling
 */

const { botLogger } = require("./logger");

/**
 * Normalisasi ID user (menghilangkan @s.whatsapp.net)
 * @param {string} userId - ID user dengan atau tanpa @s.whatsapp.net
 * @returns {string|null} - ID user yang sudah dinormalisasi
 */
function normalizeUserId(userId) {
  if (!userId) return null;
  return userId.split('@')[0];
}

/**
 * Mencatat aktivitas game dan memberikan reward XP
 * @param {string} userId - ID user yang bermain game
 * @param {boolean} isWin - Apakah user menang dalam game
 * @param {string} gameName - Nama game yang dimainkan
 * @returns {Promise<object>} - Hasil aktivitas
 */
async function recordGameActivity(userId, isWin = false, gameName = "unknown") {
  try {
    // Normalisasi ID
    const normalizedId = normalizeUserId(userId);
    if (!normalizedId) {
      botLogger.warn("Invalid user ID for game activity");
      return { updated: false, error: "Invalid user ID" };
    }
    
    // Pastikan Oblixn dan fungsi trackUserActivity sudah diinisialisasi
    if (!global.Oblixn || !global.Oblixn.trackUserActivity) {
      botLogger.warn("Oblixn atau trackUserActivity tidak tersedia");
      return { updated: false, error: "Sistem leveling tidak tersedia" };
    }

    // Catat aktivitas bermain game
    const activityResult = await global.Oblixn.trackUserActivity(normalizedId, "game");
    
    // Berikan XP berdasarkan hasil permainan
    let xpGained = 0;
    let levelUp = false;
    let newLevel = 0;
    
    if (isWin) {
      // XP untuk kemenangan
      xpGained = 50;
      const updateResult = await global.Oblixn.updateUserXP(normalizedId, xpGained, "game_win");
      if (updateResult.leveledUp) {
        levelUp = true;
        newLevel = updateResult.newLevel;
      }
    } else {
      // XP untuk partisipasi
      xpGained = 10;
      const updateResult = await global.Oblixn.updateUserXP(normalizedId, xpGained, "game_lose");
      if (updateResult.leveledUp) {
        levelUp = true;
        newLevel = updateResult.newLevel;
      }
    }
    
    // Jika level up, periksa achievement level
    if (levelUp && global.Oblixn.checkAchievements) {
      await global.Oblixn.checkAchievements(normalizedId, 'level');
    }
    
    // Catat data permainan (jika diperlukan)
    const logData = {
      user_id: normalizedId,
      game: gameName,
      result: isWin ? "win" : "lose",
      xp_earned: xpGained,
      level_up: levelUp,
      timestamp: new Date().toISOString()
    };
    
    botLogger.info(`Game activity: ${JSON.stringify(logData)}`);
    
    // Buat pesan hasil
    let resultMessage = `${isWin ? "🎮 Menang" : "🎮 Kalah"} - XP +${xpGained}`;
    
    // Gabungkan hasil
    return {
      updated: true,
      xp: xpGained,
      achievements: activityResult.achievements || [],
      leveledUp: levelUp,
      newLevel: newLevel,
      message: resultMessage
    };
  } catch (error) {
    botLogger.error("Error recording game activity:", error);
    return { updated: false, error: error.message };
  }
}

/**
 * Fungsi untuk membuat pesan level up
 * @param {number} level - Level baru user
 * @returns {string} - Pesan level up
 */
function createLevelUpMessage(level) {
  if (!level) {
    return "";
  }
  
  return `🎖️ *LEVEL UP!* 🎖️\n\n` +
    `Selamat! Level kamu naik menjadi *Level ${level}*\n` +
    `Gunakan *!level* untuk melihat status levelmu saat ini.`;
}

/**
 * Tampilkan pesan level up dan achievement jika ada dari hasil game
 * @param {object} gameResult - Hasil dari recordGameActivity
 * @returns {string} - Pesan level up dan achievement
 */
function formatGameResultMessage(gameResult) {
  if (!gameResult || !gameResult.updated) {
    return "";
  }
  
  let message = gameResult.message || "";
  
  // Tambahkan pesan level up jika ada
  if (gameResult.leveledUp) {
    message += "\n\n" + createLevelUpMessage(gameResult.newLevel);
  }
  
  // Tambahkan pesan achievement jika ada
  if (gameResult.achievements && gameResult.achievements.length > 0) {
    message += "\n\n🏆 *Achievement Baru!*\n";
    for (const ach of gameResult.achievements) {
      message += `✨ ${ach.name}: +${ach.reward_xp} XP\n`;
    }
  }
  
  return message;
}

module.exports = {
  recordGameActivity,
  createLevelUpMessage,
  formatGameResultMessage,
  normalizeUserId
}; 