const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const { promises: fs } = require("fs");
const path = require("path");
const { botLogger } = require("../utils/logger");
const db = require("../../database/confLowDb/lowdb");
const { startChildBot } = require('../../bot');

// Command: jadibot
global.Oblixn.cmd({
  name: "jadibot",
  alias: ["otplogin", "botregister"],
  desc: "Aktifkan bot kedua via QR code atau pairing code",
  category: "owner",
  async exec(msg, { args }) {
    try {
      // Cek izin owner
      if (!global.Oblixn.isOwner(msg.sender)) {
        return await msg.reply("❌ Hanya owner yang bisa menggunakan fitur ini");
      }

      if (!args[0]) {
        return await msg.reply("Masukkan nomor telepon untuk bot anak!\nContoh: !jadibot 6281234567890 [pairing]");
      }

      const targetNumber = args[0];
      const normalizedNumber = targetNumber.startsWith("0")
        ? "62" + targetNumber.slice(1)
        : targetNumber;

      // Cek apakah nomor sudah terdaftar
      const botInstances = await db.getBotInstances();
      const existingBot = botInstances.find((bot) => bot.number === normalizedNumber);
      
      if (existingBot) {
        return await msg.reply(`❌ Nomor ${normalizedNumber} sudah terdaftar sebagai bot anak!`);
      }

      // Buat folder untuk menyimpan kredensial bot anak
      const authFolder = path.join(__dirname, `../../sessions/${normalizedNumber}`);
      await fs.mkdir(authFolder, { recursive: true });

      // Inisialisasi sesi baru untuk bot anak
      const { state, saveCreds } = await useMultiFileAuthState(authFolder);

      let credentials;
      try {
        // Persiapkan credentials untuk bot baru
        credentials = JSON.stringify({
          creds: state.creds,
          keys: state.keys,
        });
      } catch (credError) {
        botLogger.error(`Error menyiapkan credentials untuk ${normalizedNumber}: ${credError.message}`);
        return await msg.reply(`❌ Gagal menyiapkan credentials: ${credError.message}`);
      }

      // Tambahkan bot ke database dengan status "pending"
      const newBot = {
        id: db.getNewId(botInstances),
        number: normalizedNumber,
        credentials,
        status: "pending", // Status sementara sampai QR/pairing discan
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await db.writeDatabase({ bot_instances: [...botInstances, newBot] });
        botLogger.info(`Bot anak ${normalizedNumber} ditambahkan ke database dengan status pending`);
      } catch (dbError) {
        botLogger.error(`Error menyimpan bot ke database: ${dbError.message}`);
        return await msg.reply(`❌ Gagal menyimpan bot ke database: ${dbError.message}`);
      }

      // Cek mode login: pairing atau QR
      const usePairing = args[1] && args[1].toLowerCase() === 'pairing';

      if (usePairing) {
        await msg.reply(`🔄 Meminta pairing code untuk *${normalizedNumber}*... Mohon tunggu.`);
        
        try {
          // Mulai child bot dan minta pairing code
          const parsedCredentials = JSON.parse(credentials);
          if (!parsedCredentials || !parsedCredentials.creds) {
            throw new Error("Credentials tidak valid");
          }
          
          const childSock = await startChildBot(normalizedNumber, parsedCredentials);
          
          if (!childSock || typeof childSock.requestPairingCode !== 'function') {
            throw new Error("Bot tidak mendukung pairing code");
          }
          
          // Minta pairing code
          const code = await childSock.requestPairingCode(normalizedNumber);
          
          if (!code || typeof code !== 'string') {
            throw new Error("Pairing code tidak valid");
          }
          
          // Format pairing code agar lebih mudah dibaca
          const formattedCode = code.split('').join('-');
          
          await msg.reply(`🔗 *Pairing Code Whatsapp*\n\n*Nomor:* ${normalizedNumber}\n*Kode:* \`\`\`${formattedCode}\`\`\`\n\nGunakan kode ini di perangkat lain untuk login sebagai bot anak.`);
        } catch (pairingError) {
          botLogger.error(`Error pairing ${normalizedNumber}: ${pairingError.message}`);
          
          // Hapus bot dari database jika gagal
          try {
            const updatedBots = botInstances.filter(bot => bot.number !== normalizedNumber);
            await db.writeDatabase({ bot_instances: updatedBots });
            botLogger.info(`Bot anak ${normalizedNumber} dihapus dari database karena gagal pairing`);
          } catch (cleanupError) {
            botLogger.error(`Gagal membersihkan database: ${cleanupError.message}`);
          }
          
          return await msg.reply(`❌ Gagal mendapatkan pairing code: ${pairingError.message}`);
        }
      } else {
        // Mode QR code (default)
        try {
          await msg.reply(`📲 Bot anak *${normalizedNumber}* sedang disiapkan. Tunggu QR code untuk login.`);
          const parsedCredentials = JSON.parse(credentials);
          await startChildBot(normalizedNumber, parsedCredentials);
          // Bot akan menangani QR melalui event di bot.js
        } catch (qrError) {
          botLogger.error(`Error QR login ${normalizedNumber}: ${qrError.message}`);
          
          // Hapus bot dari database jika gagal
          try {
            const updatedBots = botInstances.filter(bot => bot.number !== normalizedNumber);
            await db.writeDatabase({ bot_instances: updatedBots });
            botLogger.info(`Bot anak ${normalizedNumber} dihapus dari database karena gagal QR`);
          } catch (cleanupError) {
            botLogger.error(`Gagal membersihkan database: ${cleanupError.message}`);
          }
          
          return await msg.reply(`❌ Gagal memulai sesi QR: ${qrError.message}`);
        }
      }
    } catch (error) {
      botLogger.error("Jadibot Error:", error);
      await msg.reply(`❌ Gagal memproses jadibot: ${error.message}`);
    }
  },
});

// Fungsi startChildBot tetap ada di bot.js, jadi tidak perlu didefinisikan ulang di sini