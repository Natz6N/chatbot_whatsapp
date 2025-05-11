// src/commands/groupInfo.js (tambahkan di bagian bawah)

// Command: broadcast
global.Oblixn.cmd({
  name: "broadcast",
  alias: ["bc", "announce"],
  desc: "Mengirim pesan broadcast ke semua grup atau kontak tertentu",
  category: "utility",
  async exec(msg, { args }) {
    // Hanya owner bot yang bisa menggunakan command ini
    if (!global.Oblixn.isOwner(msg.sender)) {
      return await msg.reply(
        "Hanya owner bot yang bisa menggunakan perintah ini!"
      );
    }

    if (!args.length) {
      return await msg.reply(
        "Masukkan pesan untuk broadcast!\nContoh: !broadcast Halo semua grup!"
      );
    }

    try {
      if (!msg.sock) {
        botLogger.error("Socket tidak tersedia pada msg di broadcast");
        throw new Error("Socket tidak tersedia. Silakan coba lagi nanti.");
      }

      const message = args.join(" ");
      const chats = await msg.sock.groupFetchAllParticipating(); // Ambil semua grup
      const groupIds = Object.keys(chats);

      if (!groupIds.length) {
        return await msg.reply(
          "Bot tidak berada di grup manapun untuk broadcast!"
        );
      }

      let successCount = 0;
      for (const groupId of groupIds) {
        try {
          await msg.sock.sendMessage(groupId, {
            text: `📢 *Broadcast*\n\n${message}`,
          });
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay 1 detik untuk menghindari spam
        } catch (error) {
          botLogger.error(`Gagal mengirim broadcast ke ${groupId}:`, error);
        }
      }

      await msg.reply(
        `Broadcast berhasil dikirim ke ${successCount} dari ${groupIds.length} grup!`
      );
      botLogger.info("Broadcast selesai:", {
        successCount,
        total: groupIds.length,
      });
    } catch (error) {
      botLogger.error("Error in broadcast:", error);
      await msg.reply(`Gagal melakukan broadcast: ${error.message}`);
    }
  },
});

// Command: settings
global.Oblixn.cmd({
  name: "settings",
  alias: ["setbot", "config"],
  desc: "Mengatur pengaturan bot (prefix, status aktif, dll)",
  category: "utility",
  async exec(msg, { args }) {
    // Hanya owner bot yang bisa mengatur settings
    if (!global.Oblixn.isOwner(msg.sender)) {
      return await msg.reply(
        "Hanya owner bot yang bisa mengatur pengaturan bot!"
      );
    }

    if (!args[0]) {
      return await msg.reply(
        "Gunakan: !settings [prefix/status] [nilai]\n" +
          "Contoh: !settings prefix .\n" +
          "        !settings status off"
      );
    }

    try {
      if (!msg.sock) {
        botLogger.error("Socket tidak tersedia pada msg di settings");
        throw new Error("Socket tidak tersedia. Silakan coba lagi nanti.");
      }

      const setting = args[0].toLowerCase();
      const value = args[1];

      switch (setting) {
        case "prefix":
          if (!value)
            return await msg.reply(
              "Masukkan prefix baru!\nContoh: !settings prefix ."
            );
          process.env.PREFIX = value;
          await msg.reply(`Prefix bot berhasil diubah menjadi: ${value}`);
          botLogger.info("Prefix diubah:", value);
          break;

        case "status":
          if (!value || !["on", "off"].includes(value.toLowerCase())) {
            return await msg.reply("Gunakan: !settings status [on/off]");
          }
          const isActive = value.toLowerCase() === "on";
          global.botActive = isActive; // Variabel global untuk status bot
          await msg.reply(
            `Status bot berhasil diubah menjadi: ${
              isActive ? "Aktif" : "Nonaktif"
            }`
          );
          botLogger.info("Status bot diubah:", isActive ? "Aktif" : "Nonaktif");
          break;

        default:
          await msg.reply(
            "Pengaturan tidak dikenali. Gunakan 'prefix' atau 'status'."
          );
      }
    } catch (error) {
      botLogger.error("Error in settings:", error);
      await msg.reply(`Gagal mengatur pengaturan: ${error.message}`);
    }
  },
});
