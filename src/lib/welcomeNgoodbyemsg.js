const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fileManager = require('../../config/memoryAsync/readfile');
const fs = require('fs');
const fsPromises = fs.promises;
const { botLogger } = require('../utils/logger');

// Fungsi wrapper untuk existsSync yang lebih handal
function safeExistsSync(filePath) {
  try {
    // Coba gunakan fs.existsSync dulu
    return fs.existsSync(filePath);
  } catch (error) {
    botLogger.warn(`Error using fs.existsSync: ${error.message}, trying path.existsSync`);
    try {
      // Kalau gagal, coba gunakan path.existsSync
      return path.existsSync(filePath);
    } catch (err) {
      // Jika keduanya gagal, return false saja untuk menghindari error
      botLogger.error(`Error using path.existsSync: ${err.message}`);
      return false;
    }
  }
}

// Daftarkan font kustom dengan penanganan error
try {
  registerFont(path.join(__dirname, '../assets/fonts/Montserrat-Black.ttf'), {
    family: 'Montserrat-Black'
  });
  registerFont(path.join(__dirname, '../assets/fonts/Montserrat-Bold.ttf'), {
    family: 'Montserrat-Bold'
  });
  registerFont(path.join(__dirname, '../assets/fonts/Montserrat-Medium.ttf'), {
    family: 'Montserrat-Medium'
  });
  registerFont(path.join(__dirname, '../assets/fonts/Montserrat-Regular.ttf'), {
    family: 'Montserrat'
  });
} catch (error) {
  console.error('Error registering font:', error);
}

// Tambahkan fungsi retry dengan delay eksponensial
async function retryWithBackoff(fn, retries = 3, delay = 2000, factor = 2) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    if (error.message.includes('rate-overlimit')) {
      botLogger.warn(`Rate limit exceeded, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * factor, factor);
    }
    
    throw error;
  }
}

/**
 * Menggambar bunga untuk background gambar
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Posisi x
 * @param {number} y - Posisi y
 * @param {number} radius - Radius bunga
 * @param {string} color - Warna bunga
 * @param {number} petalCount - Jumlah kelopak
 */
function drawFlower(ctx, x, y, radius, color, petalCount) {
  // Gambar kelopak
  ctx.save();
  ctx.fillStyle = color;
  
  for (let i = 0; i < petalCount; i++) {
    ctx.beginPath();
    const angle = (i * 2 * Math.PI) / petalCount;
    const petalRadius = radius * 0.7;
    ctx.ellipse(
      x + Math.cos(angle) * radius * 0.5,
      y + Math.sin(angle) * radius * 0.5,
      petalRadius,
      petalRadius / 2,
      angle,
      0,
      2 * Math.PI
    );
    ctx.fill();
  }
  
  // Gambar pusat bunga
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.3, 0, 2 * Math.PI);
  ctx.fillStyle = '#1e3799';
  ctx.fill();
  
  // Gambar detail pusat bunga
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < 12; i++) {
    const angle = (i * 2 * Math.PI) / 12;
    const startX = x + Math.cos(angle) * radius * 0.3;
    const startY = y + Math.sin(angle) * radius * 0.3;
    const endX = x + Math.cos(angle) * radius * 0.5;
    const endY = y + Math.sin(angle) * radius * 0.5;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Buat titik di ujung
    ctx.beginPath();
    ctx.arc(endX, endY, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Menggambar daun
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Posisi x
 * @param {number} y - Posisi y
 * @param {number} size - Ukuran daun
 * @param {string} color - Warna daun
 * @param {number} angle - Sudut rotasi
 */
function drawLeaf(ctx, x, y, size, color, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    size * 0.4, -size * 0.5,
    size * 0.8, -size * 0.3,
    size, 0
  );
  ctx.bezierCurveTo(
    size * 0.8, size * 0.3,
    size * 0.4, size * 0.5,
    0, 0
  );
  
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/**
 * Menggambar ikon media sosial
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} centerX - Posisi x tengah
 * @param {number} y - Posisi y
 * @param {number} size - Ukuran ikon
 */
function drawSocialIcons(ctx, centerX, y, size) {
  const gap = size * 1.5;
  const startX = centerX - gap;
  
  // Facebook
  ctx.beginPath();
  ctx.arc(startX, y, size/2, 0, 2 * Math.PI);
  ctx.fillStyle = '#1877f2';
  ctx.fill();
  
  // Simbol F
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.6}px "Montserrat-Bold", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('f', startX, y);
  
  // Twitter
  ctx.beginPath();
  ctx.arc(centerX, y, size/2, 0, 2 * Math.PI);
  ctx.fillStyle = '#1da1f2';
  ctx.fill();
  
  // Simbol Twitter
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.6}px "Montserrat-Bold", sans-serif`;
  ctx.fillText('t', centerX, y);
  
  // YouTube
  ctx.beginPath();
  ctx.arc(centerX + gap, y, size/2, 0, 2 * Math.PI);
  ctx.fillStyle = '#ff0000';
  ctx.fill();
  
  // Simbol YouTube
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.6}px "Montserrat-Bold", sans-serif`;
  ctx.fillText('YT', centerX + gap, y);
}

/**
 * Membuat gambar welcome dengan informasi user dan grup
 * @param {string} backgroundPath - Path ke gambar background
 * @param {object} userInfo - Informasi user yang join
 * @param {string} userInfo.name - Nama user
 * @param {string} userInfo.jid - JID user
 * @param {string} userInfo.ppUrl - URL foto profil user (opsional)
 * @param {object} groupInfo - Informasi grup
 * @param {string} groupInfo.name - Nama grup
 * @param {number} groupInfo.memberCount - Jumlah anggota grup
 * @returns {Promise<string>} - Path ke gambar hasil
 */
async function createWelcomeImage(backgroundPath, userInfo, groupInfo) {
  try {
    // Tambahkan definisi now
    const now = new Date();
    
    // Gunakan background.jpg sebagai background
    if (!backgroundPath) {
      backgroundPath = path.join(__dirname, '../assets/background/background.jpg');
    }
    
    // Cek apakah background ada
    try {
      await fsPromises.access(backgroundPath);
    } catch (error) {
      botLogger.warn(`Background image not found at ${backgroundPath}, creating floral template`);
      // Buat background custom dengan bunga jika tidak ada file
      const canvas = createCanvas(1920, 600);
      const ctx = canvas.getContext('2d');
      
      // Background putih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Gambar bunga di sebelah kiri
      drawFlower(ctx, 120, 150, 70, '#ffd32a', 8); // Bunga kuning
      drawFlower(ctx, 210, 240, 80, '#ff793f', 8); // Bunga oranye
      drawFlower(ctx, 100, 300, 60, '#ff4757', 8); // Bunga merah
      drawFlower(ctx, 220, 120, 50, '#ff6b81', 8); // Bunga pink
      
      // Gambar daun kiri
      drawLeaf(ctx, 50, 150, 120, '#1e3799', -0.5);
      drawLeaf(ctx, 30, 250, 100, '#1e3799', -0.2);
      drawLeaf(ctx, 100, 350, 80, '#1e3799', 0.3);
      
      // Gambar bunga kanan
      drawFlower(ctx, canvas.width - 120, 150, 70, '#ffd32a', 8);
      drawFlower(ctx, canvas.width - 210, 240, 80, '#ff793f', 8);
      drawFlower(ctx, canvas.width - 100, 300, 60, '#ff4757', 8);
      drawFlower(ctx, canvas.width - 220, 120, 50, '#ff6b81', 8);
      
      // Gambar daun kanan
      drawLeaf(ctx, canvas.width - 50, 150, 120, '#1e3799', 0.5);
      drawLeaf(ctx, canvas.width - 30, 250, 100, '#1e3799', 0.2);
      drawLeaf(ctx, canvas.width - 100, 350, 80, '#1e3799', -0.3);
      
      // Simpan background custom
      const buffer = canvas.toBuffer('image/jpeg');
      backgroundPath = path.join(__dirname, '../assets/background/background.jpg');
      await fsPromises.mkdir(path.dirname(backgroundPath), { recursive: true });
      await fsPromises.writeFile(backgroundPath, buffer);
    }

    // Load background image
    const backgroundImage = await loadImage(backgroundPath);
    
    // Buat canvas dengan ukuran yang sama dengan background
    const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
    const ctx = canvas.getContext('2d');
    
    // Gambar background
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    
    // Teks "WELCOME" dengan warna kuning - ukuran font dikurangi
    ctx.font = `bold ${canvas.height / 7}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc312'; // Warna kuning untuk "WELCOME"
    ctx.fillText('WELCOME', canvas.width / 2, canvas.height / 3);
    
    // Atur style untuk nama user - ukuran font dikurangi
    ctx.font = `bold ${canvas.height / 4}px Arial, sans-serif`;
    ctx.fillStyle = '#273c75'; // Warna biru untuk nama user
    ctx.fillText(userInfo.name || 'User', canvas.width / 2, canvas.height / 1.5);
    
    // Menghilangkan ikon sosial media
    
    // Coba load foto profil user jika ada dan gambar kecil di pojok
    let profileImage;
    try {
      if (userInfo.ppUrl) {
        profileImage = await loadImage(userInfo.ppUrl);
        
        // Gambar foto profil kecil di pojok kiri atas sejajar dengan bunga
        const profileSize = canvas.height / 8;
        ctx.save();
        ctx.beginPath();
        ctx.arc(profileSize, profileSize, profileSize / 2, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(profileImage, profileSize * 0.5, profileSize / 2, profileSize, profileSize);
        ctx.restore();
      }
    } catch (error) {
      botLogger.error('Error loading profile image:', error);
      // Lanjutkan tanpa foto profil
    }
    
    // Simpan hasil menggunakan FileManager
    const buffer = canvas.toBuffer('image/png');
    const fileName = `welcome_${Date.now()}.png`;
    const result = await fileManager.saveFile(buffer, fileName, 'temp');
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.path;
  } catch (error) {
    botLogger.error('Error creating welcome image:', error);
    throw error;
  }
}

/**
 * Membuat gambar goodbye dengan informasi user dan grup
 * @param {string} backgroundPath - Path ke gambar background
 * @param {object} userInfo - Informasi user yang keluar
 * @param {string} userInfo.name - Nama user
 * @param {string} userInfo.jid - JID user
 * @param {string} userInfo.ppUrl - URL foto profil user (opsional)
 * @param {object} groupInfo - Informasi grup
 * @param {string} groupInfo.name - Nama grup
 * @param {number} groupInfo.memberCount - Jumlah anggota grup
 * @returns {Promise<string>} - Path ke gambar hasil
 */
async function createGoodbyeImage(backgroundPath, userInfo, groupInfo) {
  try {
    // Tambahkan definisi now
    const now = new Date();
    
    // Gunakan background.jpg sebagai background
    if (!backgroundPath) {
      backgroundPath = path.join(__dirname, '../assets/background/background.jpg');
    }
    
    // Cek apakah background ada
    try {
      await fsPromises.access(backgroundPath);
    } catch (error) {
      botLogger.warn(`Background image not found at ${backgroundPath}, creating floral template`);
      // Gunakan fungsi yang sama dengan welcome untuk membuat background
      return createWelcomeImage(null, userInfo, groupInfo);
    }

    // Load background image
    const backgroundImage = await loadImage(backgroundPath);
    
    // Buat canvas dengan ukuran yang sama dengan background
    const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
    const ctx = canvas.getContext('2d');
    
    // Gambar background
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    
    // Tambahkan overlay semi-transparan untuk membedakan goodbye
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Teks "GOODBYE" dengan warna kuning - ukuran font dikurangi
    ctx.font = `bold ${canvas.height / 7}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc312'; // Ubah warna menjadi kuning
    ctx.fillText('GOODBYE', canvas.width / 2, canvas.height / 3);
    
    // Atur style untuk nama user - ukuran font dikurangi
    ctx.font = `bold ${canvas.height / 4}px Arial, sans-serif`;
    ctx.fillStyle = '#273c75'; // Warna biru untuk nama user
    ctx.fillText(userInfo.name || 'User', canvas.width / 2, canvas.height / 1.6);
    
    // Menghilangkan ikon sosial media
    
    // Coba load foto profil user jika ada
    let profileImage;
    try {
      if (userInfo.ppUrl) {
        profileImage = await loadImage(userInfo.ppUrl);
        
        // Gambar foto profil kecil di pojok kiri atas sejajar dengan bunga
        const profileSize = canvas.height / 8;
        ctx.save();
        ctx.beginPath();
        ctx.arc(profileSize, profileSize, profileSize / 2, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(profileImage, profileSize * 0.5, profileSize / 2, profileSize, profileSize);
        
        // Tambahkan filter abu-abu
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(profileSize * 0.5, profileSize / 2, profileSize, profileSize);
        ctx.restore();
      }
    } catch (error) {
      botLogger.error('Error loading profile image:', error);
      // Lanjutkan tanpa foto profil
    }
    
    // Simpan hasil menggunakan FileManager
    const buffer = canvas.toBuffer('image/png');
    const fileName = `goodbye_${Date.now()}.png`;
    const result = await fileManager.saveFile(buffer, fileName, 'temp');
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.path;
  } catch (error) {
    botLogger.error('Error creating goodbye image:', error);
    throw error;
  }
}

/**
 * Menangani event ketika user bergabung ke grup
 * @param {object} sock - Socket WhatsApp
 * @param {object} msg - Pesan group update
 * @returns {Promise<void>}
 */
async function handleGroupJoin(sock, msg) {
  try {
    // Extrak informasi grup
    const groupJid = msg.key.remoteJid;
    
    // Periksa status welcome_message di database
    const db = require('../../database/confLowDb/lowdb');
    const group = await db.getGroup(groupJid);
    
    // Jika grup tidak ada di database atau welcome_message tidak aktif, keluar
    if (!group) {
      botLogger.info(`Grup ${groupJid} tidak ditemukan di database, tidak mengirim welcome message`);
      return;
    }
    
    if (group.welcome_message !== 1) {
      botLogger.info(`Welcome message tidak aktif untuk grup ${groupJid}`);
      return;
    }
    
    botLogger.info(`Mengirim welcome message untuk grup ${groupJid}`);
    
    // Gunakan retry untuk mendapatkan metadata grup
    const groupMetadata = await retryWithBackoff(() => sock.groupMetadata(groupJid));
    const groupName = groupMetadata.subject;
    const memberCount = groupMetadata.participants.length;
    
    // Dapatkan informasi siapa yang join
    if (!msg.messageStubParameters) {
      return; // Bukan notifikasi member join
    }
    
    // Dapatkan participant yang join
    const addedParticipants = msg.messageStubParameters || [];
    
    for (const participantJid of addedParticipants) {
      try {
        // Coba dapatkan foto profil
        let ppUrl = null;
        try {
          ppUrl = await sock.profilePictureUrl(participantJid, 'image');
        } catch (ppError) {
          botLogger.warn(`Tidak dapat mendapatkan foto profil untuk ${participantJid}:`, ppError);
        }
        
        // Dapatkan nama participant
        let participantName = participantJid.split('@')[0];
        try {
          const contact = await sock.getContact(participantJid);
          if (contact && contact.notify) {
            participantName = contact.notify;
          }
        } catch (contactError) {
          botLogger.warn(`Tidak dapat mendapatkan nama kontak untuk ${participantJid}:`, contactError);
        }
        
        // Buat gambar welcome
        let welcomeImagePath;
        try {
          welcomeImagePath = await createWelcomeImage(
            null, // Gunakan background default
            {
              name: participantName,
              jid: participantJid,
              ppUrl: ppUrl
            },
            {
              name: groupName,
              memberCount: memberCount
            }
          );
        } catch (imageError) {
          botLogger.error(`Error membuat gambar welcome untuk ${participantJid}:`, imageError);
          // Kirim pesan teks saja jika gagal membuat gambar
          await sock.sendMessage(
            groupJid,
            {
              text: `Selamat datang @${participantJid.split('@')[0]} di grup ${groupName}! 👋`,
              mentions: [participantJid]
            }
          );
          continue;
        }
        
        // Validasi file gambar dengan fungsi yang aman
        if (!welcomeImagePath || !safeExistsSync(welcomeImagePath)) {
          botLogger.warn(`File gambar welcome tidak ditemukan: ${welcomeImagePath}`);
          // Kirim pesan teks sebagai fallback
          await sock.sendMessage(
            groupJid,
            {
              text: `Selamat datang @${participantJid.split('@')[0]} di grup ${groupName}! 👋`,
              mentions: [participantJid]
            }
          );
          continue;
        }
        
        // Kirim gambar welcome dengan retry mechanism
        try {
          await retryWithBackoff(() => sock.sendMessage(
            groupJid,
            {
              image: { url: welcomeImagePath },
              caption: `Selamat datang @${participantJid.split('@')[0]} di grup ${groupName}! 👋`,
              mentions: [participantJid]
            }
          ));
        } catch (sendError) {
          botLogger.error(`Error mengirim gambar welcome untuk ${participantJid}:`, sendError);
          // Coba kirim pesan teks saja jika gagal mengirim gambar
          await sock.sendMessage(
            groupJid,
            {
              text: `Selamat datang @${participantJid.split('@')[0]} di grup ${groupName}! 👋`,
              mentions: [participantJid]
            }
          );
        }
        
        // Hapus file temporary
        try {
          await fsPromises.unlink(welcomeImagePath);
        } catch (unlinkError) {
          botLogger.error('Error menghapus file gambar welcome:', unlinkError);
        }
      } catch (participantError) {
        botLogger.error(`Error menangani join untuk participant ${participantJid}:`, participantError);
      }
    }
  } catch (error) {
    botLogger.error('Error menangani group join:', error);
  }
}

/**
 * Menangani event ketika user meninggalkan grup
 * @param {object} sock - Socket WhatsApp
 * @param {object} msg - Pesan group update
 * @returns {Promise<void>}
 */
async function handleGroupLeave(sock, msg) {
  try {
    // Extrak informasi grup
    const groupJid = msg.key.remoteJid;
    
    // Periksa status goodbye_message di database
    const db = require('../../database/confLowDb/lowdb');
    const group = await db.getGroup(groupJid);
    
    // Jika grup tidak ada di database atau goodbye_message tidak aktif, keluar
    if (!group) {
      botLogger.info(`Grup ${groupJid} tidak ditemukan di database, tidak mengirim goodbye message`);
      return;
    }
    
    if (group.goodbye_message !== 1) {
      botLogger.info(`Goodbye message tidak aktif untuk grup ${groupJid}`);
      return;
    }
    
    botLogger.info(`Mengirim goodbye message untuk grup ${groupJid}`);
    
    // Gunakan retry untuk mendapatkan metadata grup
    const groupMetadata = await retryWithBackoff(() => sock.groupMetadata(groupJid));
    const groupName = groupMetadata.subject;
    const memberCount = groupMetadata.participants.length;
    
    // Dapatkan informasi siapa yang keluar
    if (!msg.messageStubParameters) {
      return; // Bukan notifikasi member keluar
    }
    
    // Dapatkan participant yang keluar
    const removedParticipants = msg.messageStubParameters || [];
    
    for (const participantJid of removedParticipants) {
      try {
        // Coba dapatkan foto profil
        let ppUrl = null;
        try {
          ppUrl = await sock.profilePictureUrl(participantJid, 'image');
        } catch {
          // Lanjutkan tanpa foto profil
        }
        
        // Dapatkan nama participant
        let participantName = participantJid.split('@')[0];
        try {
          const contact = await sock.getContact(participantJid);
          if (contact && contact.notify) {
            participantName = contact.notify;
          }
        } catch {
          // Lanjutkan dengan nomor sebagai nama
        }
        
        // Buat gambar goodbye
        const goodbyeImagePath = await createGoodbyeImage(
          null, // Gunakan background default
          {
            name: participantName,
            jid: participantJid,
            ppUrl: ppUrl
          },
          {
            name: groupName,
            memberCount: memberCount
          }
        );
        
        // Kirim gambar goodbye
        await sock.sendMessage(
          groupJid,
          {
            image: { url: goodbyeImagePath },
            caption: `Selamat tinggal @${participantJid.split('@')[0]}! 👋`,
            mentions: [participantJid]
          }
        );
        
        // Hapus file temporary
        try {
          await fsPromises.unlink(goodbyeImagePath);
        } catch (unlinkError) {
          botLogger.error('Error deleting temporary goodbye image:', unlinkError);
        }
      } catch (participantError) {
        botLogger.error(`Error handling leave for participant ${participantJid}:`, participantError);
      }
    }
  } catch (error) {
    botLogger.error('Error handling group leave:', error);
  }
}

// Export fungsi untuk digunakan di file lain
module.exports = {
  createWelcomeImage,
  createGoodbyeImage,
  handleGroupJoin,
  handleGroupLeave
};

