const { botLogger } = require("../utils/logger");
let sock = null;

/**
 * Memeriksa apakah pengguna adalah admin dalam grup
 * @param {string} groupId - ID grup
 * @param {string} userId - ID pengguna yang akan diperiksa
 * @param {boolean} verbose - Apakah perlu menampilkan log detail
 * @returns {Promise<boolean>} - true jika pengguna adalah admin
 */
async function isAdmin(groupId, userId, verbose = false) {
  try {
    if (!sock) {
      botLogger.error("Socket belum diinisialisasi");
      return false;
    }

    // Dapatkan metadata grup
    const metadata = await sock.groupMetadata(groupId);

    if (!metadata) {
      botLogger.error("Metadata grup tidak ditemukan");
      return false;
    }

    if (verbose) {
      botLogger.info("Informasi Grup:", {
        groupId,
        userId,
        jumlahPeserta: metadata.participants.length,
      });
    }

    // Normalisasi ID pengguna
    const normalizedUserId = userId.toLowerCase().replace(/[^0-9]/g, "");

    // Cari peserta dengan perbandingan ID yang dinormalisasi
    const participant = metadata.participants.find((p) => {
      const participantId = p.id.toLowerCase().replace(/[^0-9]/g, "");
      return participantId === normalizedUserId;
    });

    if (verbose) {
      botLogger.info("Peserta ditemukan:", {
        ditemukan: !!participant,
        admin: participant?.admin,
      });
    }

    return (
      participant &&
      (participant.admin === "admin" || participant.admin === "superadmin")
    );
  } catch (error) {
    botLogger.error("Pesan atau properti chat tidak valid:", error);
    return false;
  }
}

/**
 * Memeriksa apakah bot adalah admin dalam grup
 * @param {string} groupId - ID grup
 * @returns {Promise<boolean>} - true jika bot adalah admin
 */
async function isBotAdmin(groupId) {
  try {
    if (!sock) {
      botLogger.error("Socket belum diinisialisasi");
      return false;
    }

    // Dapatkan ID bot
    const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";

    // Dapatkan metadata grup
    const metadata = await sock.groupMetadata(groupId);

    if (!metadata) {
      botLogger.error("Metadata grup tidak ditemukan");
      return false;
    }

    // Cari bot dalam daftar peserta
    const botParticipant = metadata.participants.find(
      (p) => p.id.toLowerCase() === botId.toLowerCase()
    );

    const isAdmin =
      botParticipant &&
      (botParticipant.admin === "admin" ||
        botParticipant.admin === "superadmin");

    botLogger.info("Status admin bot:", {
      groupId,
      botId,
      isAdmin,
    });

    return isAdmin;
  } catch (error) {
    botLogger.error("Pesan atau properti chat tidak valid:", error);
    return false;
  }
}

/**
 * Memeriksa status admin untuk bot dan pengguna sekaligus
 * @param {string} groupId - ID grup
 * @param {string} userId - ID pengguna
 * @returns {Promise<{isUserAdmin: boolean, isBotAdmin: boolean}>}
 */
async function checkAdminStatus(groupId, userId) {
  try {
    const [userAdmin, botAdmin] = await Promise.all([
      isAdmin(groupId, userId),
      isBotAdmin(groupId),
    ]);

    return {
      isUserAdmin: userAdmin,
      isBotAdmin: botAdmin,
    };
  } catch (error) {
    botLogger.error("Pesan atau properti chat tidak valid:", error);
    return {
      isUserAdmin: false,
      isBotAdmin: false,
    };
  }
}

// Fungsi untuk mengatur instance sock
function setup(sockInstance) {
  sock = sockInstance;
}

async function checkStalkUsage(userId) {
  // Fungsi stub: izinkan semua penggunaan
  return true;
}

async function checkAIUsage(userId) {
  // Fungsi stub: izinkan semua penggunaan
  return true;
}

const normalizeJid = (jid) => {
  if (!jid || typeof jid !== 'string') return "";
  
  // Bersihkan dari bagian device, server, dan pastikan hanya angka
  const cleanNumber = jid.split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
  
  // Jika setelah dibersihkan masih kosong, return string kosong
  if (!cleanNumber || cleanNumber.length < 5) return "";
  
  // Kembalikan format lengkap untuk konsistensi
  return cleanNumber;
};

const getGroupAdminInfo = async (sock, groupId) => {
  try {
    const metadata = await sock.groupMetadata(groupId);
    const participants = metadata.participants;

    const admins = participants.filter(
      (p) => p.admin === "admin" || p.admin === "superadmin"
    );
    const botId = normalizeJid(sock.user.id);
    const isBotAdmin = admins.some((admin) => {
      const adminId = normalizeJid(admin.id);
      const match = adminId === botId;
      return match;
    });

    return {
      totalAdmins: admins.length,
      adminList: admins,
      isBotAdmin,
      totalParticipants: participants.length,
    };
  } catch (error) {
    botLogger.error(`Error getting group admin info: ${error.message}`);
    throw error;
  }
};

// Definisikan permissionHandler sebagai sebuah objek yang berisi semua fungsi
const permissionHandler = {
  isAdmin,
  setup,
  checkStalkUsage,
  checkAIUsage,
  checkAdminStatus,
  isBotAdmin,
  getGroupAdminInfo,
  normalizeJid,
};

// Ubah module.exports untuk mendukung impor langsung dan terdestrukturisasi
module.exports = Object.assign({}, permissionHandler, { permissionHandler });
