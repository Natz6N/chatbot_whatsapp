const { downloadFbVideo, getFbVideoInfo } = require("../lib/fbDownloader");
const { formatBytes } = require("../utils/helper");
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipeline = promisify(pipeline);
const axios = require('axios');

// src/commands/downloader.js
const { botLogger } = require("../utils/logger");
const {
  cekKhodam,
  igDl,
  ytv,
  yta,
} = require("../lib/scrapperV2");
// Ganti dengan modul TikTok downloader baru
const { downloadTikTok, downloadTikTokV2, downloadTikTokV3 } = require('../lib/tiktokDownloader');
const fileManager = require("../../config/memoryAsync/readfile"); // Impor instance langsung dari filemanager.js
const { exec: youtubeDlExec } = require("youtube-dl-exec");

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs > 0 ? hrs + ":" : ""}${mins < 10 ? "0" + mins : mins}:${
    secs < 10 ? "0" + secs : secs
  }`;
}

// Fungsi helper untuk memastikan folder ada
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    botLogger.info(`Direktori ${dirPath} dibuat`);
  }
  return dirPath;
}

// Fungsi untuk download file
async function downloadFile(url, filePath) {
  // Pastikan direktori ada
  ensureDirectoryExists(path.dirname(filePath));
  
  // Download file
  const response = await axios.get(url, {
    responseType: 'stream'
  });
  
  await streamPipeline(response.data, fs.createWriteStream(filePath));
  return filePath;
}

// Command: cekKhodam
global.Oblixn.cmd({
  name: "cekkhodam",
  alias: ["khodam"],
  desc: "Cek khodam berdasarkan nama",
  category: "fun",
  async exec(msg, { args }) {
    try {
      if (!args[0]) {
        return await msg.reply("Masukkan nama! Contoh: !cekkhodam Budi");
      }
      const nama = args.join(" ");
      const result = await cekKhodam(nama);
      const response = `Nama: ${result.nama}\nKhodam: ${result.khodam}\nLink: ${result.share}`;
      await msg.reply(response);
    } catch (error) {
      botLogger.error("Error di command cekkhodam:", error);
      await msg.reply(`Terjadi kesalahan: ${error.message || "Unknown error"}`);
    }
  },
});

// Command untuk download TikTok
Oblixn.cmd({
  name: "tiktok",
  alias: ["tt", "tiktokdl"],
  desc: "Download video TikTok",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      if (!args[0]) {
        return msg.reply("Masukkan URL video TikTok!");
      }

      const url = args[0];
      let result;

      // Coba metode download satu per satu
      try {
        result = await downloadTikTok(url);
      } catch (error) {
        try {
          result = await downloadTikTokV2(url);
        } catch (error) {
          result = await downloadTikTokV3(url);
        }
      }

      if (!result || result.code === -1) {
        return msg.reply("Gagal mendapatkan video TikTok!");
      }

      // Kirim video
      if (result.data && result.data.play) {
        await msg.reply({
          video: { url: result.data.play },
          caption: `*TikTok Downloader*\n\n*Judul:* ${result.data.title || "Tidak ada judul"}\n*Author:* ${result.data.author || "Unknown"}\n*Durasi:* ${result.data.duration || "Unknown"}\n*Ukuran:* ${result.data.size || "Unknown"}`
        });
      } else {
        return msg.reply("Video tidak ditemukan!");
      }
    } catch (error) {
      botLogger.error(`Error saat download TikTok: ${error.message}`);
      return msg.reply("Terjadi kesalahan saat download video TikTok!");
    }
  }
});

// Command: tiktokDlV2
global.Oblixn.cmd({
  name: "tiktokdl2",
  alias: ["ttdl2", "tiktok2"],
  desc: "Download video TikTok (metode 2)",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      if (!args[0]) {
        return await msg.reply("Masukkan URL TikTok! Contoh: !tiktokdl2 <url>");
      }
      
      await msg.reply("⌛ Sedang memproses video menggunakan @tobyg74/tiktok-api-dl (metode alternatif)...");
      const url = args[0];
      
      // Log untuk debugging
      botLogger.info(`Mendownload TikTok (metode v2) dari URL: ${url}`);
      
      // Download TikTok dengan modul baru
      const result = await downloadTikTokV2(url);
      
      if (!result.success) {
        return await msg.reply(`Gagal mendownload: ${result.error || "Unknown error"}`);
      }
      
      try {
        if (result.isSlide) {
          await msg.reply(`Ditemukan ${result.slides.length} slide gambar, mengirim...`);
          // Kirim slide/gambar
          for (const slide of result.slides) {
            if (slide.success) {
              await msg.sock.sendMessage(
                msg.chat,
                {
                  image: fs.readFileSync(slide.imagePath),
                  caption: `Judul: ${result.title} (${slide.index + 1}/${slide.total})`,
                },
                { quoted: msg }
              );
              
              // Hapus file setelah dikirim
              fs.unlinkSync(slide.imagePath);
            } else {
              // Fallback jika satu slide gagal
              await msg.sock.sendMessage(
                msg.chat,
                {
                  image: { url: slide.url },
                  caption: `Judul: ${result.title} (${slide.index + 1}/${slide.total})`,
                },
                { quoted: msg }
              );
            }
          }
        } else {
          // Kirim video
          await msg.sock.sendMessage(
            msg.chat,
            {
              video: fs.readFileSync(result.videoPath),
              caption: `Judul: ${result.title}`,
            },
            { quoted: msg }
          );
          
          // Hapus file setelah dikirim
          fs.unlinkSync(result.videoPath);
        }
        
        botLogger.info(`Media berhasil dikirim dan dihapus dari storage`);
      } catch (sendError) {
        botLogger.error(`Error saat mengirim media: ${sendError.message}`, sendError);
        await msg.reply(`Terjadi kesalahan saat mengirim media: ${sendError.message}`);
      }
    } catch (error) {
      botLogger.error(`Error di command tiktokdl2: ${error.message}`, error);
      await msg.reply(`Terjadi kesalahan: ${error.message || "Unknown error"}`);
    }
  },
});

// Command: tiktokDlV3
global.Oblixn.cmd({
  name: "tiktokdl3",
  alias: ["ttdl3", "tiktok3"],
  desc: "Download video TikTok (metode 3 - MusicalDown)",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      if (!args[0]) {
        return await msg.reply("Masukkan URL TikTok! Contoh: !tiktokdl3 <url>");
      }
      
      await msg.reply("⌛ Sedang memproses video menggunakan metode MusicalDown...");
      const url = args[0];
      
      // Log untuk debugging
      botLogger.info(`Mendownload TikTok (metode v3) dari URL: ${url}`);
      
      // Download TikTok dengan metode v3
      const result = await downloadTikTokV3(url);
      
      if (!result.success) {
        return await msg.reply(`Gagal mendownload: ${result.error || "Unknown error"}`);
      }
      
      try {
        // Kirim video
        await msg.sock.sendMessage(
          msg.chat,
          {
            video: fs.readFileSync(result.videoPath),
            caption: `Judul: ${result.title}`,
          },
          { quoted: msg }
        );
        
        // Hapus file setelah dikirim
        fs.unlinkSync(result.videoPath);
        botLogger.info(`Media berhasil dikirim dan dihapus dari storage`);
      } catch (sendError) {
        botLogger.error(`Error saat mengirim media: ${sendError.message}`, sendError);
        await msg.reply(`Terjadi kesalahan saat mengirim media: ${sendError.message}`);
      }
    } catch (error) {
      botLogger.error(`Error di command tiktokdl3: ${error.message}`, error);
      await msg.reply(`Terjadi kesalahan: ${error.message || "Unknown error"}`);
    }
  },
});

// Command: igDl
global.Oblixn.cmd({
  name: "igdl",
  alias: ["instagramdl", "ig"],
  desc: "Download konten dari Instagram",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      if (!args[0]) {
        return await msg.reply("Masukkan URL Instagram! Contoh: !igdl <url>");
      }
      const url = args[0];
      const result = await igDl(url);
      if (!result.status) {
        return await msg.reply(`Gagal mendownload: ${result.msg}`);
      }
      const media = result.data[0];
      await msg.sock.sendMessage(
        msg.chat,
        {
          video: { url: media.url },
          caption: `Resolusi: ${media.resolution || "Unknown"}`,
        },
        { quoted: msg }
      );
    } catch (error) {
      botLogger.error("Error di command igdl:", error);
      await msg.reply(`Terjadi kesalahan: ${error.message || "Unknown error"}`);
    }
  },
});

// Command: ytv (Menggunakan youtube-dl-exec dan FileManager)
global.Oblixn.cmd({
  name: "ytv",
  alias: ["youtubevideo", "ytvideo"],
  desc: "Download video YouTube",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      if (!args[0]) {
        return await msg.reply("Masukkan URL YouTube! Contoh: !ytv <url>");
      }
      const url = args[0];
      const outputFileName = "youtube_video.mp4";
      const outputPath = fileManager.getFilePath(
        "video",
        fileManager.generateFileName(outputFileName, "video")
      );

      // Download video menggunakan youtube-dl-exec
      await youtubeDlExec(url, {
        format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        output: outputPath,
        mergeOutputFormat: "mp4",
      });

      // Dapatkan info video
      const videoInfo = await youtubeDlExec(url, { dumpSingleJson: true });

      // Verifikasi file exists
      if (!fs.existsSync(outputPath)) {
        botLogger.error(`File not found: ${outputPath}`);
        throw new Error("File not found after download");
      }

      // Format durasi untuk caption
      const duration = videoInfo.duration || 0;
      const formattedDuration = formatDuration(duration);

      // Kirim video
      await msg.sock.sendMessage(
        msg.chat,
        {
          video: { url: outputPath }, // Pass the path directly
          caption: `Judul: ${videoInfo.title || "Untitled"}\nKualitas: ${
            videoInfo.format_note || "Unknown"
          }\nDurasi: ${formattedDuration}`,
        },
        { quoted: msg }
      );

      // Hapus file sementara
      await fileManager.deleteFile(outputPath);
    } catch (error) {
      botLogger.error("Error di command ytv:", error);
      await msg.reply(`Terjadi kesalahan: ${error.message || "Unknown error"}`);
    }
  },
});

// Command: yta (Menggunakan youtube-dl-exec dan FileManager)
global.Oblixn.cmd({
  name: "yta",
  alias: ["youtubeaudio", "ytaudio"],
  desc: "Download audio dari YouTube",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      if (!args[0]) {
        return await msg.reply("Masukkan URL YouTube! Contoh: !yta <url>");
      }
      const url = args[0];
      const outputFileName = "youtube_audio.mp3";
      const outputPath = fileManager.getFilePath(
        "audio",
        fileManager.generateFileName(outputFileName, "audio")
      );

      // Download audio menggunakan youtube-dl-exec
      await youtubeDlExec(url, {
        extractAudio: true,
        audioFormat: "mp3",
        output: outputPath,
      });

      // Dapatkan info video
      const videoInfo = await youtubeDlExec(url, { dumpSingleJson: true });

      // Verifikasi file exists
      if (!fs.existsSync(outputPath)) {
        botLogger.error(`File not found: ${outputPath}`);
        throw new Error("File not found after download");
      }

      // Kirim audio
      await msg.sock.sendMessage(
        msg.chat,
        {
          audio: { url: outputPath }, // Pass the path directly
          mimetype: "audio/mp4",
          caption: `Judul: ${videoInfo.title || "Untitled"}`,
        },
        { quoted: msg }
      );

      // Hapus file sementara
      await fileManager.deleteFile(outputPath);
    } catch (error) {
      botLogger.error("Error di command yta:", error);
      await msg.reply(`Terjadi kesalahan: ${error.message || "Unknown error"}`);
    }
  },
});
global.Oblixn.cmd({
  name: "fb",
  alias: ["fbdownloader"],
  desc: "Download video dari Facebook",
  category: "tools",
  async exec(msg, { args }) {
    
    try {
      // Check if user is banned
      const { isBanned } = await Oblixn.db.checkUserStatus(msg.sender);
      if (isBanned) return;

      // Get URL from args or quoted message
      const url = args[0] || msg.quoted?.text?.match(/(https?:\/\/[^\s]+)/gi)?.[0];
      if (!url) return msg.reply("Silakan berikan URL Facebook");

      // Set typing indicator
      await Oblixn.sock.sendPresenceUpdate("composing", msg.chat);

      // Parse options
      const quality = args.includes("--hd") || args.includes("-h") ? "hd" : "sd";
      const audioOnly = args.includes("--mp3") || args.includes("-a");
      const format = audioOnly ? "mp3" : "mp4";
      const filename = `fb_${Date.now()}_${quality}`;

      // Get video info
      const info = await getFbVideoInfo(url);
      
      // Create caption
      const caption = `📌 *Judul:* ${info.title || "-"}
👤 *Uploader:* ${info.uploader}
⏳ *Durasi:* ${formatDuration(info.duration_ms)}
📅 *Upload:* ${new Date(info.uploadDate).toLocaleDateString("id-ID")}
🔗 *Kualitas:* ${quality.toUpperCase()}`;

      // Send info and thumbnail
      await msg.reply(caption);
      if (info.thumbnail) await msg.reply({ image: { url: info.thumbnail } });

      // Download progress
      const progressMsg = await msg.reply("⏳ _Mengunduh video..._");
      
      // Download video - pastikan path yang dihasilkan adalah path absolut tanpa prefix file://
      const { path: filePath } = await downloadFbVideo(url, {
        quality, 
        format, 
        filename, 
        audioOnly
      });
      
      // Tampilkan pesan upload
      await msg.reply("📤 _Mengunggah video..._");
      
      // Delete progress message jika memungkinkan (gunakan pendekatan yang sama dengan kode asli)
      try {
        await msg.sock.sendMessage(msg.chat, { delete: progressMsg.key });
      } catch (e) {
        console.log("Gagal menghapus pesan progress:", e);
      }
      
      // Check file type for sending
      const fileSize = fs.statSync(filePath).size;
      const fileExt = path.extname(filePath);
      const sendAsDocument = fileExt !== ".mp4" || audioOnly;

      // Send file tanpa menggunakan prefix file://
      await msg.reply({
        [sendAsDocument ? "document" : "video"]: {
          url: filePath, // Gunakan direct path
          mimetype: sendAsDocument ? undefined : "video/mp4",
        },
        fileName: `${info.title?.substring(0, 50) || filename}${fileExt}`,
        caption: `📁 *File:* ${formatBytes(fileSize)} ${format.toUpperCase()}`
      });

      // Clean up
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.log("Gagal menghapus file:", unlinkError);
      }
    } catch (error) {
      console.error("FB Download Error:", error);
      msg.reply(`❌ Gagal mengunduh: ${error.message.includes("melebihi batas") ? 
        "Ukuran video terlalu besar" : error.message}`);
    }
  },
});