const { botLogger } = require("../utils/logger");
const db = require("../../database/confLowDb/lowdb"); // Impor dari lowdb.js yang menggunakan AJV
const { groupCache } = require("../../config/config");
const { createWelcomeImage, createGoodbyeImage, handleGroupJoin, handleGroupLeave } = require("../lib/welcomeNgoodbyemsg");
const path = require("path");
const fileManager = require("../../config/memoryAsync/readfile");

// Objek untuk melacak pesan error yang sudah dikirim
const errorSentTracker = new Map();

async function handleGroupMessage(sock, msg) {
  let chat; // Definisikan chat di luar try agar tersedia di catch
  try {
    const { sender, chat: chatId, messageText, pushName, reply } = msg;
    chat = chatId; // Simpan chatId ke variabel chat untuk digunakan di catch

    // Normalisasi userId untuk pengecekan status ban
    const userId = sender.split("@")[0];
    const normalizedUserId = userId.startsWith("08")
      ? "62" + userId.slice(1)
      : userId.replace("+62", "62");

    // Cek status ban pengguna menggunakan fungsi dari lowdb.js
    const status = await db.checkUserStatus(normalizedUserId);
    if (status.isBanned) {
      const banDate = new Date().toLocaleDateString("id-ID"); // Gunakan tanggal saat ini jika tidak ada data ban spesifik
      const banMessage = `❌ *Akses Ditolak*\n\nMaaf, Anda telah dibanned dari menggunakan bot!\n\n*Detail Ban:*\n📝 Alasan: ${
        status.banReason || "Tidak diketahui"
      }\n📅 Tanggal: ${banDate}\n\nSilakan hubungi owner untuk unbanned.`;
      await reply(banMessage);
      return;
    }

    // Ambil metadata grup dari cache atau langsung dari WhatsApp
    let groupMetadata = groupCache.get(chat);
    if (!groupMetadata) {
      try {
        groupMetadata = await sock.groupMetadata(chat);
        groupCache.set(chat, groupMetadata);
      } catch (error) {
        const errorMsg = `Gagal mengambil metadata grup: ${error.message}`;
        botLogger.error(errorMsg);
        throw new Error(errorMsg);
      }
    }

    // Siapkan data grup
    const group = await db.getGroup(chat);
    if (!group) {
      try {
        // Jika grup tidak ada di database, tambahkan
        const groupData = {
          group_id: chat,
          group_name: groupMetadata.subject,
          is_active: true,
          welcome_message: 1, // Aktifkan welcome message secara default
          features: {
            antilink: false,
            antispam: false,
            autokick: false,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.addGroup(groupData);
        botLogger.info(`Grup ${groupMetadata.subject} (${chat}) ditambahkan ke database`);
      } catch (error) {
        botLogger.error(`Gagal menambahkan grup ke database: ${error.message}`);
      }
    }

    // Periksa apakah pesan ini adalah notifikasi admin (promosi/demosi)
    if (msg.messageStubType === 29 || msg.messageStubType === 30) {
      // 29 = PROMOTE, 30 = DEMOTE
      const action = msg.messageStubType === 29 ? "menjadi admin" : "dihapus sebagai admin";
      const targetUser = msg.messageStubParameters[0];
      const userName = targetUser.split("@")[0];
      await reply(`@${userName} telah ${action} 🎭`, {
        mentions: [targetUser],
      });
      return;
    }

    // Log pesan grup
    const logMessage = {
      level: "info",
      message: `Pesan grup dari ${pushName} (${sender}) di ${groupMetadata.subject}`,
      details: {
        messageText: messageText,
        chatId: chat,
        userId: normalizedUserId,
      },
    };
    botLogger.info(JSON.stringify(logMessage));

    // Contoh logika khusus grup
    if (messageText.toLowerCase() === "hai bot") {
      await reply(
        `Hai ${pushName}! Saya bot di grup ${groupMetadata.subject}. Ada yang bisa saya bantu?`
      );
      return;
    }

    // Logika untuk admin grup
    const isAdmin = groupMetadata.participants.some(
      (p) =>
        p.id === sender && (p.admin === "admin" || p.admin === "superadmin")
    );
    if (isAdmin) {
      botLogger.info(
        `Admin terdeteksi: ${sender} di grup ${groupMetadata.subject}`
      );
      if (messageText.toLowerCase() === "!info") {
        const totalMembers = groupMetadata.participants.length;
        const admins = groupMetadata.participants
          .filter((p) => p.admin)
          .map((p) => p.id.split("@")[0]);
        const infoMessage = `📋 *Info Grup*\n\nNama: ${
          groupMetadata.subject
        }\nID: ${chat}\nTotal Anggota: ${totalMembers}\nAdmin: ${admins.join(
          ", "
        )}\nDibuat: ${new Date(groupMetadata.creation * 1000).toLocaleString(
          "id-ID"
        )}`;
        await reply(infoMessage);
        return;
      }
    }

    // Handle group participant updates (join/leave)
    if (msg.messageStubType) {
      const group = await db.getGroup(chat);
      
      // Keluar jika grup tidak ada di database
      if (!group) return;
      
      switch (msg.messageStubType) {
        case 27:
        case 28: // GROUP_PARTICIPANT_ADD
          try {
            if (msg.messageStubType === 28) {
              // Handle join/welcome - cek welcome_message
              if (group.welcome_message !== 1) return;
              await handleGroupJoin(sock, msg);
            } else if (msg.messageStubType === 27) {
              // Handle leave/goodbye - cek goodbye_message
              if (group.goodbye_message !== 1) return;
              await handleGroupLeave(sock, msg);
            }
          } catch (error) {
            botLogger.error(`Error handling group ${msg.messageStubType === 28 ? 'join' : 'leave'} event:`, error);
            
            // Fallback ke pesan teks jika gagal membuat gambar
            const targetUser = msg.messageStubParameters[0];
            const userName = targetUser.split("@")[0];
            const action = msg.messageStubType === 28 ? "bergabung" : "keluar";
            
            await reply(
              `@${userName} telah ${action} dari grup ${groupMetadata.subject}!`,
              { mentions: [targetUser] }
            );
          }
          return;
      }
    }
  } catch (error) {
    const errorLog = {
      level: "error",
      message: "Terjadi kesalahan di handleGroupMessage",
      error: error.message,
      stack: error.stack,
      chat: chat || "tidak terdefinisi",
    };
    botLogger.error(JSON.stringify(errorLog));
    if (chat) {
      const lastSent = errorSentTracker.get(chat);
      if (!lastSent || Date.now() - lastSent > 5 * 60 * 1000) {
        // 5 menit cooldown
        await msg.reply(
          "Terjadi kesalahan saat memproses pesan grup. Silakan coba lagi nanti."
        );
        errorSentTracker.set(chat, Date.now());
      }
    } else {
      botLogger.warn(
        "Chat tidak terdefinisi dalam blok catch, skipping reply."
      );
    }
  }
}

async function checkBanStatus(userId) {
  try {
    const status = await db.checkUserStatus(userId); // Gunakan fungsi dari lowdb.js
    botLogger.info(`Memeriksa status ban untuk user: ${userId}`);
    return {
      isBanned: status.isBanned,
      banInfo: status.isBanned
        ? {
            reason: status.banReason || "Tidak ada alasan spesifik",
            banned_at: status.created_at || new Date(), // Gunakan created_at dari database jika ada
          }
        : null,
    };
  } catch (error) {
    botLogger.error(`Error memeriksa status ban: ${error.message}`);
    return { isBanned: false, banInfo: null };
  }
}

module.exports = {
  handleGroupMessage,
};