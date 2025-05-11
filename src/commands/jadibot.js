const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const { promises: fs } = require("fs");
const path = require("path");
const { botLogger } = require("../utils/logger");
const db = require("../../database/confLowDb/lowdb");

// Command: jadibot
global.Oblixn.cmd({
  name: "jadibot",
  alias: ["otplogin", "botregister"],
  desc: "Aktifkan bot kedua via QR code",
  category: "owner",
  async exec(msg, { args }) {
    try {
      // Cek izin owner
      if (!global.Oblixn.isOwner(msg.sender)) {
        return await msg.reply("❌ Hanya owner yang bisa menggunakan fitur ini");
      }

      if (!args[0]) {
        return await msg.reply("Masukkan nomor telepon untuk bot anak!\nContoh: !jadibot 6281234567890");
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

      // Tambahkan bot ke database terlebih dahulu dengan status "pending"
      const credentials = JSON.stringify({
        creds: state.creds,
        keys: state.keys,
      });
      const newBot = {
        id: db.getNewId(botInstances),
        number: normalizedNumber,
        credentials,
        status: "pending", // Status sementara sampai QR discan
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.writeDatabase({ bot_instances: [...botInstances, newBot] });
      botLogger.info(`Bot anak ${normalizedNumber} ditambahkan ke database dengan status pending`);

      // Kirim pesan untuk meminta scan QR
      await msg.reply(`📲 Bot anak *${normalizedNumber}* sedang disiapkan. Tunggu QR code untuk login.`);

      // Panggil startChildBot yang ada di bot.js
      await startChildBot(normalizedNumber, JSON.parse(credentials));

      // Bot akan menangani QR melalui event di bot.js
    } catch (error) {
      botLogger.error("Jadibot Error:", error);
      await msg.reply(`❌ Gagal memproses jadibot: ${error.message}`);
    }
  },
});

// Fungsi startChildBot tetap ada di bot.js, jadi tidak perlu didefinisikan ulang di sini