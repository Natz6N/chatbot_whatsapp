const { botLogger } = require("../utils/logger");
const { getRandomEmoji, formatNumber } = require("../utils/helper");
const db = require("../../database/confLowDb/lowdb");
const canvas = require("canvas");
const fs = require("fs").promises;
const path = require("path");

// Menggunakan node-fetch untuk Node.js < 18 atau fallback ke global fetch
let fetch;
try {
  fetch = global.fetch || require('node-fetch');
} catch (e) {
  try {
    // Jika tidak tersedia, coba impor secara dinamis
    fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  } catch (err) {
    botLogger.error("Failed to import fetch, profile pictures may not load correctly:", err.message);
    // Fallback sederhana jika keduanya gagal
    fetch = async () => {
      throw new Error("fetch not available");
    };
  }
}

// Fungsi bantuan untuk memformat user ID WhatsApp
function formatUserID(userId) {
  if (!userId) return null;
  
  // Memastikan format ID adalah phone@s.whatsapp.net
  if (userId.includes('@s.whatsapp.net')) {
    return userId;
  } else if (userId.includes('@')) {
    // Jika sudah ada format lain (misal @g.us)
    const phone = userId.split('@')[0];
    return `${phone}@s.whatsapp.net`;
  } else {
    // Jika hanya nomor telepon
    return `${userId}@s.whatsapp.net`;
  }
}

// Fungsi untuk membuat progress bar
function createProgressBar(percentage) {
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  return "▰".repeat(filled) + "▱".repeat(empty);
}

// Fungsi untuk membuat template level up standar (opsional, jika ingin teks saja)
function createLevelUpText(type, data) {
  const emojis = {
    user: ["🎮", "🏆", "⭐", "🌟", "✨", "🔥", "💯", "🚀"],
    group: ["🌐", "🏰", "🔮", "💎", "👥", "🌈", "✅", "🎯"],
  };
  
  const emoji1 = getRandomEmoji(emojis[type]);
  const emoji2 = getRandomEmoji(emojis[type]);
  
  if (type === "user") {
    return `
${emoji1} *LEVEL UP!* ${emoji2}

🎊 Selamat! Kamu naik ke level ${data.newLevel}!
👤 *${data.username || 'User'}*
📊 *Level Baru:* ${data.newLevel}
💫 *XP:* ${formatNumber(data.experience)}/${formatNumber(data.requiredXP)}
📈 *Progress:* ${createProgressBar(data.progress)} ${Math.round(data.progress)}%

${data.rewards ? `🎁 *Reward:* ${data.rewards}\n` : ''}
Lanjutkan aktivitas untuk terus naik level!
    `;
  } else {
    return `
${emoji1} *GROUP LEVEL UP!* ${emoji2}

🎊 Selamat! Grup ini naik ke level ${data.newLevel}!
👥 *${data.groupName || 'Group'}*
📊 *Level Baru:* ${data.newLevel}
💫 *XP:* ${formatNumber(data.experience)}/${formatNumber(data.requiredXP)}
📈 *Progress:* ${createProgressBar(data.progress)} ${Math.round(data.progress)}%

${data.rewards ? `🎁 *Reward:* ${data.rewards}\n` : ''}
Lanjutkan aktivitas untuk terus naik level grup!
    `;
  }
}

// Fungsi untuk membuat avatar default
async function createDefaultAvatar(username) {
  const size = 200;
  const Canvas = canvas.createCanvas(size, size);
  const ctx = Canvas.getContext("2d");
  
  // Warna background acak
  const colors = [
    "#3498DB", // Biru
    "#2ECC71", // Hijau
    "#E74C3C", // Merah
    "#F39C12", // Jingga
    "#9B59B6", // Ungu
    "#1ABC9C", // Hijau kebiruan
    "#D35400", // Oranye kemerahan
    "#34495E"  // Biru gelap
  ];
  
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // Buat lingkaran dengan warna tersebut
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
  
  // Tambahkan inisial di tengah
  if (username) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 100px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Mengambil inisial
    const initial = username.charAt(0).toUpperCase();
    ctx.fillText(initial, size/2, size/2);
  }
  
  return Canvas.toBuffer("image/png");
}

// Fungsi untuk membuat gambar level up dengan canvas
async function createLevelUpImage(type, data, profilePicUrl) {
  const width = 800;
  const height = 400;
  const Canvas = canvas.createCanvas(width, height);
  const ctx = Canvas.getContext("2d");

  // Load background image
  const backgroundPath = path.join(__dirname, "../../assets/background.jpg");
  let background;
  try {
    background = await canvas.loadImage(backgroundPath);
    ctx.drawImage(background, 0, 0, width, height);
  } catch (error) {
    botLogger.warn("Background image not found, using plain background");
    ctx.fillStyle = "#2C3E50"; // Warna default jika gambar tidak ada
    ctx.fillRect(0, 0, width, height);
  }

  // Style untuk teks
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)"; // Bayangan untuk teks
  ctx.shadowBlur = 5;

  // Judul
  ctx.font = "bold 40px Arial";
  ctx.fillText(
    type === "user" ? "LEVEL UP!" : "GROUP LEVEL UP!",
    width / 2,
    50
  );

  // Load profile picture (hanya untuk user)
  if (type === "user") {
    try {
      if (profilePicUrl) {
        try {
          // Coba load image dengan timeout dan validasi
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 detik timeout
          
          const response = await fetch(profilePicUrl, { signal: controller.signal })
            .catch(err => {
              botLogger.warn(`Error fetching profile picture: ${err.message}`);
              throw new Error("Failed to fetch profile picture");
            });
            
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const buffer = await response.arrayBuffer();
          const profilePic = await canvas.loadImage(Buffer.from(buffer));
          
          const picSize = 100;
          ctx.save();
          ctx.beginPath();
          ctx.arc(width / 2, 120, picSize / 2, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(profilePic, width / 2 - picSize / 2, 70, picSize, picSize);
          ctx.restore();
        } catch (imgError) {
          botLogger.warn(`Error processing profile image: ${imgError.message}`);
          throw new Error("Image processing failed");
        }
      } else {
        throw new Error("Profile picture URL is null");
      }
    } catch (error) {
      botLogger.warn(`Using default avatar: ${error.message}`);
      
      try {
        // Buat avatar default
        const avatarBuffer = await createDefaultAvatar(data.username);
        const defaultAvatar = await canvas.loadImage(avatarBuffer);
        
        const picSize = 100;
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, 120, picSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(defaultAvatar, width / 2 - picSize / 2, 70, picSize, picSize);
        ctx.restore();
      } catch (avatarError) {
        botLogger.warn(`Error creating default avatar: ${avatarError.message}`);
        // Gambar alternatif sebagai ganti foto profil jika default avatar juga gagal
        ctx.fillStyle = "#3498DB";
        ctx.beginPath();
        ctx.arc(width / 2, 120, 50, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        
        // Inisial user
        if (data.username) {
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 40px Arial";
          ctx.fillText(data.username.charAt(0).toUpperCase(), width / 2, 120);
        }
      }
    }
  }

  // Nama pengguna atau grup
  ctx.font = "bold 30px Arial";
  ctx.fillText(data.username || data.groupName || "Unknown", width / 2, 200);

  // Level dan XP
  ctx.font = "24px Arial";
  ctx.fillText(`Level: ${data.newLevel}`, width / 2, 250);
  ctx.fillText(
    `XP: ${formatNumber(data.experience)}/${formatNumber(data.requiredXP)}`,
    width / 2,
    280
  );

  // Progress bar
  const progressBar = createProgressBar(data.progress);
  ctx.font = "20px Arial";
  ctx.fillText(
    `${progressBar} (${Math.round(data.progress)}%)`,
    width / 2,
    320
  );

  // Rewards (jika ada)
  if (data.rewards) {
    ctx.font = "18px Arial";
    ctx.fillText(`Reward: ${data.rewards}`, width / 2, 360);
  }

  // Konversi ke buffer
  return Canvas.toBuffer("image/png");
}

// Fungsi untuk menghitung XP yang dibutuhkan untuk level berikutnya
function getRequiredXP(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Fungsi untuk memvalidasi URL gambar
async function isValidImageUrl(url) {
  if (!url) return false;
  
  try {
    // Periksa apakah URL valid dengan format yang benar
    const urlPattern = /^(https?:\/\/)[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\/\s]+)*\/?(\?[^\s]*)?$/i;
    if (!urlPattern.test(url)) {
      botLogger.warn(`Invalid URL format: ${url}`);
      return false;
    }
    
    // Mencoba melakukan HEAD request untuk periksa tipe konten
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    }).catch(err => {
      botLogger.warn(`Failed to validate image URL: ${err.message}`);
      return { ok: false };
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return false;
    
    // Periksa Content-Type header
    const contentType = response.headers.get('content-type');
    return contentType && contentType.startsWith('image/');
  } catch (error) {
    botLogger.warn(`Error validating image URL: ${error.message}`);
    return false;
  }
}

// Fungsi untuk mengirim notifikasi level up user
async function sendUserLevelUpNotification(sock, userId, oldLevel, newLevel, groupId = null) {
  try {
    const userData = await db.getUser(userId);
    if (!userData) {
      botLogger.warn(`User ${userId} tidak ditemukan untuk notifikasi level up`);
      return false;
    }

    // Dapatkan nama pengguna dan foto profil
    let username = userData.username || userId.split('@')[0];
    let profilePicUrl = null;
    if (sock) {
      try {
        const contact = await sock.onWhatsApp(userId);
        username = contact[0]?.name || contact[0]?.pushName || username;
        
        try {
          // Memastikan format userId valid untuk WhatsApp API
          const formattedUserId = formatUserID(userId);
          
          // Mencoba cara alternatif untuk mendapatkan foto profil
          try {
            profilePicUrl = await sock.profilePictureUrl(formattedUserId, "image")
              .catch(err => {
                botLogger.warn(`Metode 1 gagal mendapatkan foto profil: ${err.message}`);
                return null;
              });
              
            // Jika metode pertama gagal, coba metode kedua
            if (!profilePicUrl && sock.getProfilePicture) {
              botLogger.info(`Mencoba metode alternatif untuk mendapatkan foto profil...`);
              profilePicUrl = await sock.getProfilePicture(formattedUserId)
                .catch(() => null);
            }
            
            // Validasi URL gambar
            if (profilePicUrl) {
              const isValid = await isValidImageUrl(profilePicUrl);
              if (!isValid) {
                botLogger.warn(`URL gambar profil tidak valid: ${profilePicUrl}`);
                profilePicUrl = null;
              }
            }
            
            // Jika kedua metode gagal, gunakan avatar default
            if (!profilePicUrl) {
              botLogger.info(`Menggunakan avatar default untuk ${formattedUserId}`);
              profilePicUrl = null;
            }
          } catch (err) {
            botLogger.warn(`Gagal mengambil foto profil: ${err.message}`);
            profilePicUrl = null;
          }
        } catch (ppError) {
          botLogger.warn(`Tidak dapat mengambil foto profil untuk ${userId}: ${ppError.message}`);
          profilePicUrl = null;
        }
      } catch (error) {
        botLogger.error(`Error getting user info for ${userId}:`, error);
      }
    }

    // Kalkulasi data level
    const requiredXP = getRequiredXP(newLevel);
    const experience = userData.experience || 0;
    const progress = Math.min((experience / requiredXP) * 100, 100); // Batasi progress ke 100%

    // Dapatkan rewards jika ada
    const LEVEL_ROLES = [
      { level: 1, role: "Pemula", emoji: "🌱", bonus: 0 },
      { level: 5, role: "Petualang", emoji: "🗺️", bonus: 5 },
      { level: 10, role: "Veteran", emoji: "⚔️", bonus: 10 },
      { level: 15, role: "Master", emoji: "🎯", bonus: 15 },
      { level: 20, role: "Grand Master", emoji: "👑", bonus: 20 },
      { level: 25, role: "Legend", emoji: "🏆", bonus: 25 },
      { level: 30, role: "Mythical", emoji: "🌟", bonus: 30 },
      { level: 40, role: "Immortal", emoji: "⚡", bonus: 40 },
      { level: 50, role: "Divine", emoji: "🔱", bonus: 50 },
    ];

    let newRole = LEVEL_ROLES.find(role => newLevel >= role.level && oldLevel < role.level);
    let rewards = newRole ? `Role Baru: ${newRole.emoji} ${newRole.role} (+${newRole.bonus}% XP Bonus)` : null;

    // Buat data untuk gambar
    const levelUpData = {
      username,
      oldLevel,
      newLevel,
      experience,
      requiredXP,
      progress,
      rewards
    };

    // Buat gambar level up
    let imageBuffer;
    try {
      imageBuffer = await createLevelUpImage("user", levelUpData, profilePicUrl);
    } catch (imageError) {
      botLogger.error(`Error creating level up image: ${imageError.message}`);
      // Fallback ke pesan teks biasa jika gambar gagal dibuat
      const target = groupId || userId;
      await sock.sendMessage(target, {
        text: createLevelUpText("user", levelUpData)
      });
      return true;
    }

    // Kirim pesan dengan gambar
    const target = groupId || userId;
    await sock.sendMessage(target, {
      image: imageBuffer,
      caption: `🎉 Selamat ${username}, kamu naik dari level ${oldLevel} ke level ${newLevel}!`
    });

    botLogger.info(`Level up notification sent to ${username} (${userId}), Level: ${oldLevel} -> ${newLevel}`);
    return true;
  } catch (error) {
    botLogger.error("Error sending user level up notification:", error);
    return false;
  }
}

// Fungsi untuk mengirim notifikasi level up grup
async function sendGroupLevelUpNotification(sock, groupId, oldLevel, newLevel) {
  try {
    const groupData = await db.getGroup(groupId);
    if (!groupData) {
      botLogger.warn(`Group ${groupId} tidak ditemukan untuk notifikasi level up`);
      return false;
    }

    // Dapatkan nama grup
    let groupName = groupData.group_name || groupId.split('@')[0];
    if (sock) {
      try {
        const metadata = await sock.groupMetadata(groupId);
        groupName = metadata.subject || groupName;
      } catch (error) {
        botLogger.error(`Error getting group name for ${groupId}:`, error);
      }
    }

    // Kalkulasi data level
    const requiredXP = getRequiredXP(newLevel);
    const experience = groupData.current_xp || 0;
    const progress = Math.min((experience / requiredXP) * 100, 100); // Batasi progress ke 100%

    // Dapatkan rewards jika ada
    const groupRewards = {
      5: "Akses ke perintah game tambahan",
      10: "Bonus XP group +5%",
      15: "Akses ke sistem ranking khusus",
      20: "Bonus XP group +10%",
      25: "Fitur moderasi lanjutan"
    };
    let rewards = groupRewards[newLevel] || null;

    // Buat data untuk gambar
    const levelUpData = {
      groupName,
      oldLevel,
      newLevel,
      experience,
      requiredXP,
      progress,
      rewards
    };

    // Buat gambar level up dengan error handling
    let imageBuffer;
    try {
      imageBuffer = await createLevelUpImage("group", levelUpData, null);
    } catch (imageError) {
      botLogger.error(`Error creating group level up image: ${imageError.message}`);
      // Fallback ke pesan teks biasa jika gambar gagal dibuat
      await sock.sendMessage(groupId, {
        text: createLevelUpText("group", levelUpData)
      });
      return true;
    }

    // Kirim pesan dengan gambar
    await sock.sendMessage(groupId, {
      image: imageBuffer,
      caption: `🎉 Selamat ${groupName}, grup ini naik dari level ${oldLevel} ke level ${newLevel}!`
    });

    botLogger.info(`Group level up notification sent to ${groupName} (${groupId}), Level: ${oldLevel} -> ${newLevel}`);
    return true;
  } catch (error) {
    botLogger.error("Error sending group level up notification:", error);
    return false;
  }
}

// Fungsi untuk melacak XP dan level up otomatis
async function trackActivity(userId, groupId, activityType, amount = 1) {
  try {
    // Normalisasi user ID
    const normalizedId = userId.includes('@') ? userId.split('@')[0] : userId;
    
    // Update aktivitas user (jika ada fungsi global)
    if (global.Oblixn && global.Oblixn.trackUserActivity) {
      await global.Oblixn.trackUserActivity(userId, activityType, amount);
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
      default:
        xpAmount = 2; // XP default untuk aktivitas lain
    }
    
    // Update XP untuk user
    const userData = await db.getUser(normalizedId) || {};
    const currentXP = userData.experience || 0;
    const totalXP = userData.total_xp || 0;
    const level = userData.level || 1;
    let newXP = currentXP + xpAmount;
    let newLevel = level;
    let leveledUp = false;

    const xpRequired = getRequiredXP(newLevel);
    while (newXP >= xpRequired) {
      newXP -= xpRequired;
      newLevel += 1;
      leveledUp = true;
    }

    await db.updateUser(normalizedId, {
      experience: newXP,
      total_xp: totalXP + xpAmount,
      level: newLevel,
      updated_at: new Date().toISOString()
    });

    const userXpResult = { leveledUp, oldLevel: level, newLevel };

    // Update XP untuk grup jika ada
    let groupXpResult = null;
    if (groupId) {
      let group = await db.getGroup(groupId);
      if (!group) {
        await db.addGroup({
          group_id: groupId,
          owner_id: "system",
          group_name: null
        });
        group = await db.getGroup(groupId);
      }

      if (group) {
        const groupCurrentXP = group.current_xp || 0;
        const groupTotalXP = group.total_xp || 0;
        const groupLevel = group.level || 1;
        let newGroupXP = groupCurrentXP + Math.floor(xpAmount / 2);
        let newGroupLevel = groupLevel;
        let groupLeveledUp = false;

        const groupXpRequired = getRequiredXP(newGroupLevel);
        while (newGroupXP >= groupXpRequired) {
          newGroupXP -= groupXpRequired;
          newGroupLevel += 1;
          groupLeveledUp = true;
        }

        await db.updateGroup(groupId, {
          current_xp: newGroupXP,
          total_xp: groupTotalXP + Math.floor(xpAmount / 2),
          level: newGroupLevel,
          xp_to_next_level: getRequiredXP(newGroupLevel)
        });

        groupXpResult = { leveledUp: groupLeveledUp, oldLevel: groupLevel, newLevel: newGroupLevel };
      }
    }

    return {
      userXpResult,
      groupXpResult
    };
  } catch (error) {
    botLogger.error("Error tracking activity:", error);
    return { userXpResult: null, groupXpResult: null };
  }
}

module.exports = {
  sendUserLevelUpNotification,
  sendGroupLevelUpNotification,
  trackActivity,
  getRequiredXP,
  createProgressBar,
  createLevelUpText,
  formatUserID,
  isValidImageUrl,
  createDefaultAvatar
};