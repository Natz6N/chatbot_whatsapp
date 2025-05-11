const { botLogger, toggleDebug, getDebugStatus } = require("../utils/logger");
const { config, categoryEmojis } = require("../../config/config");
const os = require("os");
const packageJson = require("../../package.json");
const fs = require("fs");
const path = require("path");
const { permissionHandler } = require("../../src/handler/permission");

// Command: !botinfo
Oblixn.cmd({
  name: "botinfo",
  alias: ["info", "status"],
  desc: "Menampilkan informasi bot",
  category: "info",
  async exec(msg) {
    try {
      // Pastikan msg.reply ada
      if (typeof msg.reply !== 'function') {
        msg.reply = (text) => { console.log('Reply:', text); };
      }

      const { botName, owner } = config;
      // Pastikan owner berupa array
      const ownerArray = Array.isArray(owner) ? owner : [owner];

      const uptime = process.uptime();
      const uptimeStr = formatUptime(uptime);

      const infoText =
        `🤖 *${botName || 'Bot'} BOT INFO* 🤖\n\n` +
        `👾 *Version:* v${packageJson.version}\n` +
        `🧠 *Processor:* ${os.cpus()[0].model}\n` +
        `⏰ *Uptime:* ${uptimeStr}\n` +
        `💾 *Memory:* ${formatBytes(process.memoryUsage().heapUsed)}\n` +
        `👑 *Owner:* ${ownerArray.join(", ")}\n\n` +
        `Gunakan *!help* untuk melihat daftar perintah.`;

      await msg.reply(infoText);
    } catch (error) {
      botLogger.error("Error dalam command botinfo:", error);
      await msg.reply("❌ Terjadi kesalahan saat mengambil informasi bot");
    }
  },
});

global.Oblixn.cmd({
  name: "help",
  alias: ["menu", "?"],
  desc: "Menampilkan daftar perintah yang tersedia",
  category: "general",
  async exec(msg, { args }) {
    try {
      const commands = new Map();
      const isOwner = global.Oblixn.isOwner(msg.sender);

      // Log isi global.Oblixn.commands dengan struktur lengkap
      const allCommands = Array.from(global.Oblixn.commands.entries()).map(
        ([key, val]) => ({
          key,
          config: val.config || "missing",
          hasExec: !!val.exec,
        })
      );

      for (const [key, cmd] of global.Oblixn.commands) {
        if (!cmd) {
          botLogger.warn(`Entry ${key} kosong`);
          continue;
        }
        if (!cmd.config) {
          botLogger.warn(`Command ${key} tidak memiliki config`, cmd);
          continue;
        }
        if (!cmd.config.name || !cmd.config.category) {
          botLogger.warn(`Command ${key} config tidak lengkap`, cmd.config);
          continue;
        }

        // Hanya ambil command utama (bukan alias)
        if (
          isOwner ||
          (
            cmd.config.category !== "owner" &&
            cmd.config.category !== "ownercommand")
        ) {
          commands.set(cmd.config.name, {
            name: cmd.config.name,
            category: cmd.config.category,
          });
          botLogger.info(`Command ${cmd.config.name} ditambahkan ke daftar`);
        } else {
          botLogger.info(
            `Command ${cmd.config.name} skipped: not owner dan category ${cmd.config.category}`
          );
        }
        
      }

      botLogger.info(
        "Commands yang dikumpulkan:",
        Array.from(commands.values())
      );

      if (commands.size === 0) {
        botLogger.warn("Tidak ada command yang dikumpulkan setelah filter.");
        return await msg.reply("Belum ada command yang terdaftar.");
      }

      const username = msg.pushName || msg.sender.split("@")[0];
      let helpMessage = `Halo kak ${username}, berikut adalah daftar perintah yang tersedia:\n\n*DAFTAR PERINTAH*\n\n`;

      const categories = Array.from(commands.values()).reduce((acc, cmd) => {
        if (!acc[cmd.category]) {
          acc[cmd.category] = [];
        }
        acc[cmd.category].push(cmd);
        return acc;
      }, {});

      Object.entries(categories).forEach(([category, cmds]) => {
        if (cmds.length > 0) {
          const emoji = categoryEmojis[category.toLowerCase()] || "❓";
          helpMessage += `${emoji} *${category.toUpperCase()}*\n`;
          cmds.forEach((cmd) => {
            helpMessage += `> ${process.env.PREFIX || "!"}${cmd.name}\n`;
          });
          helpMessage += "\n";
        }
      });

      helpMessage += `\nGunakan ${
        process.env.PREFIX || "!"
      }help <command> untuk info lebih detail`;
      await msg.reply(helpMessage);
    } catch (error) {
      botLogger.error("Error dalam command help:", error);
      await msg.reply("Terjadi kesalahan saat menampilkan menu bantuan.");
    }
  },
});
// Command: !changelog
Oblixn.cmd({
  name: "changelog",
  alias: ["update"],
  desc: "Menampilkan changelog bot",
  category: "info",
  async exec(msg) {
    try {
      const changelog = path.join(__dirname, "../../changelog.txt");
      if (!fs.existsSync(changelog)) {
        return msg.reply("❌ Changelog belum tersedia");
      }

      const read = fs.readFileSync(changelog, "utf8");
      const formattedChangelog = "📝 *CHANGELOG BOT*\n\n" + read;

      await msg.reply(formattedChangelog);
    } catch (error) {
      botLogger.error("Error dalam command changelog:", error);
      await msg.reply("❌ Terjadi kesalahan saat menampilkan changelog.");
    }
  },
});

// Command: !debug
Oblixn.cmd({
  name: "debug",
  alias: ["debugmode"],
  desc: "Mengaktifkan atau menonaktifkan mode debug",
  category: "owner",
  isOwner: true,
  async exec(msg, { args }) {
    try {
      // Hanya owner yang bisa menggunakan command ini
      if (!global.Oblixn.isOwner(msg.sender)) {
        return msg.reply("❌ Command ini hanya untuk owner bot!");
      }

      const subCommand = args[0]?.toLowerCase();
      const currentStatus = getDebugStatus();

      if (subCommand === "on" || subCommand === "aktif") {
        // Aktifkan debug mode
        if (currentStatus) {
          return msg.reply("Mode debug sudah aktif!");
        }
        
        toggleDebug(true);
        return msg.reply("Mode debug berhasil diaktifkan!");
      } 
      else if (subCommand === "off" || subCommand === "nonaktif") {
        // Nonaktifkan debug mode
        if (!currentStatus) {
          return msg.reply("Mode debug sudah nonaktif!");
        }
        
        toggleDebug(false);
        return msg.reply("Mode debug berhasil dinonaktifkan!");
      }
      else {
        // Tampilkan status dan bantuan
        const status = currentStatus ? "aktif" : "nonaktif";
        return msg.reply(`DEBUG MODE
        
Status: ${status}

Penggunaan:
!debug on - Mengaktifkan mode debug
!debug off - Menonaktifkan mode debug`);
      }
    } catch (error) {
      botLogger.error("Error dalam command debug: " + error.message);
      await msg.reply("Terjadi kesalahan saat mengubah mode debug.");
    }
  },
});

// Fungsi helper untuk format bytes
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Fungsi helper untuk format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

async function checkUpdate() {
  try {
    // ... kode yang ada ...
  } catch (error) {
    botLogger.warn(`Gagal memeriksa update: ${error.message}`);
  }
}

Oblixn.cmd({
  name: "top",
  desc: "Leaderboard level",
  category: "info",
  async exec(msg) {
    const [topUsers] = await pool.execute(`
      SELECT user_id, level, experience 
      FROM users 
      ORDER BY experience DESC 
      LIMIT 10`
    );

    let leaderboard = "🏆 *TOP 10 PLAYERS* 🏆\n\n";
    topUsers.forEach((user, index) => {
      leaderboard += `${index+1}. ${user.user_id} - Level ${user.level} (${user.experience} XP)\n`;
    });

    await msg.reply(leaderboard);
  }
});

global.Oblixn.cmd({
  name: "ownerhelp",
  alias: ["helpOw", "helpowner"],
  desc: "Help khusus untuk owner",
  category: "owner",
  isOwner: true,
  async exec(msg) {
    try {
      // Cek apakah pengguna adalah owner
      if (!global.Oblixn.isOwner(msg.sender)) {
        return await msg.reply("❌ Perintah ini hanya bisa digunakan oleh owner bot!");
      }

      const { botName, owner } = config;
      const ownerArray = Array.isArray(owner) ? owner : [owner];
      
      let ownerHelpText = `👑 *OWNER HELP MENU* 👑\n\n`;
      ownerHelpText += `*Bot Information:*\n`;
      ownerHelpText += `• Nama Bot: ${botName || 'Bot'}\n`;
      ownerHelpText += `• Owner: ${ownerArray.join(", ")}\n`;
      ownerHelpText += `• Version: v${packageJson.version}\n\n`;
      
      // Mengelompokkan perintah berdasarkan kategori
      const commandsByCategory = new Map();
      
      // Mengumpulkan semua perintah owner
      for (const [key, cmd] of global.Oblixn.commands) {
        if (cmd.config && cmd.config.category === "owner") {
          if (!commandsByCategory.has(cmd.config.category)) {
            commandsByCategory.set(cmd.config.category, []);
          }
          commandsByCategory.get(cmd.config.category).push({
            name: cmd.config.name,
            alias: cmd.config.alias || [],
            desc: cmd.config.desc || "Tidak ada deskripsi"
          });
        }
      }

      // Menampilkan perintah berdasarkan kategori
      ownerHelpText += `*PERINTAH OWNER BERDASARKAN KATEGORI:*\n\n`;
      
      // Kategori: Pengaturan Bot
      ownerHelpText += `⚙️ *PENGATURAN BOT:*\n`;
      ownerHelpText += `• !debug [on/off] - Mengaktifkan/menonaktifkan mode debug\n`;
      ownerHelpText += `• !restart - Me-restart bot\n`;
      ownerHelpText += `• !update - Memperbarui bot\n\n`;

      // Kategori: Manajemen Owner
      ownerHelpText += `👑 *MANAJEMEN OWNER:*\n`;
      ownerHelpText += `• !setowner <nomor> - Menambah owner baru\n`;
      ownerHelpText += `• !delowner <nomor> - Menghapus owner\n\n`;

      // Kategori: Manajemen User
      ownerHelpText += `👥 *MANAJEMEN USER:*\n`;
      ownerHelpText += `• !ban <nomor> - Membanned user\n`;
      ownerHelpText += `• !unban <nomor> - Membuka banned user\n\n`;

      // Kategori: Broadcast & Komunikasi
      ownerHelpText += `📢 *BROADCAST & KOMUNIKASI:*\n`;
      ownerHelpText += `• !broadcast <pesan> - Mengirim pesan ke semua grup\n\n`;
      
      // Kategori: Monitoring & Status
      ownerHelpText += `📊 *MONITORING & STATUS:*\n`;
      ownerHelpText += `• !botinfo - Menampilkan informasi bot\n`;
      ownerHelpText += `• !changelog - Menampilkan perubahan terbaru\n\n`;
      
      ownerHelpText += `*Status Bot:*\n`;
      ownerHelpText += `• Uptime: ${formatUptime(process.uptime())}\n`;
      ownerHelpText += `• Memory: ${formatBytes(process.memoryUsage().heapUsed)}\n`;
      ownerHelpText += `• CPU: ${os.cpus()[0].model}\n\n`;
      
      ownerHelpText += `*Catatan:*\n`;
      ownerHelpText += `• Gunakan perintah dengan bijak! 🚀\n`;
      ownerHelpText += `• Format: !<perintah> [parameter]\n`;
      ownerHelpText += `• Contoh: !broadcast Halo semua\n`;
      ownerHelpText += `• Gunakan !help <perintah> untuk info detail`;

      await msg.reply(ownerHelpText);
    } catch (error) {
      botLogger.error("Error dalam command ownerhelp:", error);
      await msg.reply("❌ Terjadi kesalahan saat menampilkan menu owner help.");
    }
  }
});