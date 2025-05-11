const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

// Fungsi untuk memastikan direktori ada
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    // Direktori tidak ada, buat
    await fs.mkdir(dirPath, { recursive: true });
  }
}

Oblixn.cmd({
  name: "spotify",
  alias: ["spotify", "spotifind"],
  desc: "🎵 Mencari lagu di Spotify",
  category: "search",
  async exec(msg, { args, sock }) {
    const logDetails = {
      timestamp: new Date().toISOString(),
      user: msg.from,
      command: "spotify",
      args: args,
    };

    try {
      if (!sock) {
        throw new Error("Client is not initialized.");
      }

      if (!args || !Array.isArray(args)) {
        const errorMessage =
          "❌ Silakan masukkan judul lagu atau artis yang ingin dicari!";
        await sock.sendMessage(
          msg.from,
          { text: errorMessage },
          { quoted: msg }
        );
        return;
      }

      const text = args.join(" ");
      if (!text) {
        const errorMessage =
          "❌ Silakan masukkan judul lagu atau artis yang ingin dicari!";
        await sock.sendMessage(
          msg.from,
          { text: errorMessage },
          { quoted: msg }
        );
        return;
      }

      // Kirim pesan bahwa sedang mencari
      await sock.sendMessage(
        msg.from,
        { text: `🔍 Mencari "${text}" di Spotify...` },
        { quoted: msg }
      );

      try {
        // Fetch data dari API Spotify menggunakan axios dengan timeout
        const apiUrl = `https://delirius-apiofc.vercel.app/search/spotify?q=${encodeURIComponent(
          text
        )}`;
        console.log(`Fetching Spotify data from: ${apiUrl}`);

        const response = await axios.get(apiUrl, {
          timeout: 10000, // 10 detik timeout
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });

        // Verifikasi respons dan data
        if (!response.data) {
          throw new Error("API mengembalikan respons kosong");
        }

        const json = response.data;
        console.log(
          "API Response:",
          JSON.stringify(json).substring(0, 200) + "..."
        );

        if (
          !json.status ||
          !json.data ||
          !Array.isArray(json.data) ||
          json.data.length === 0
        ) {
          throw new Error("Tidak ada hasil yang ditemukan!");
        }

        // Format hasil pencarian
        let resultMessage = `🎵 *Hasil Pencarian Spotify untuk "${text}"* 🎵\n\n`;

        // Format semua hasil (maksimal 5)
        const maxResults = Math.min(json.data.length, 5);
        for (let i = 0; i < maxResults; i++) {
          const result = json.data[i];
          // Verifikasi data hasil
          const title = result.title || "Tidak diketahui";
          const artist = result.artist || "Tidak diketahui";
          const url = result.url || "#";

          // Log format durasi untuk debugging
          console.log(
            `Data durasi untuk ${title}:`,
            typeof result.duration,
            result.duration
          );

          const duration = formatDuration(result.duration);

          resultMessage += `*${i + 1}. ${title}*\n`;
          resultMessage += `   Artis: ${artist}\n`;
          resultMessage += `   Durasi: ${duration}\n`;
          resultMessage += `   URL: ${url}\n\n`;
        }

        // Ambil data pertama untuk thumbnail
        const firstResult = json.data[0];
        const outputPath = `./media/img/spotify_${Date.now()}_${Math.floor(
          Math.random() * 1000
        )}.jpg`;

        try {
          // Pastikan direktori ada
          const mediaDir = path.join(process.cwd(), "media");
          const imgDir = path.join(mediaDir, "img");
          await ensureDirectoryExists(mediaDir);
          await ensureDirectoryExists(imgDir);

          // Pastikan URL cover valid
          if (
            firstResult.cover &&
            typeof firstResult.cover === "string" &&
            firstResult.cover.startsWith("http")
          ) {
            console.log(`Downloading cover image from: ${firstResult.cover}`);

            try {
              // Download gambar dari URL cover dengan timeout
              const imageResponse = await axios({
                method: "get",
                url: firstResult.cover,
                responseType: "arraybuffer",
                timeout: 8000, // 8 detik timeout
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                },
              });

              // Verifikasi data gambar
              if (!imageResponse.data || imageResponse.data.length === 0) {
                throw new Error("Data gambar kosong");
              }

              await fs.writeFile(outputPath, imageResponse.data);

              // Verifikasi file berhasil dibuat
              const stats = await fs.stat(outputPath);
              if (stats.size === 0) {
                throw new Error("File gambar kosong");
              }

              // Kirim gambar dengan caption
              await sock.sendMessage(
                msg.from,
                {
                  image: { url: outputPath },
                  caption: resultMessage,
                },
                { quoted: msg }
              );

              // Bersihkan file sementara
              fs.unlink(outputPath).catch((err) =>
                console.error("Error deleting file:", err)
              );
            } catch (downloadError) {
              console.error(`Error processing image: ${downloadError.message}`);
              throw new Error(
                `Gagal mengunduh gambar: ${downloadError.message}`
              );
            }
          } else {
            throw new Error("URL cover tidak valid");
          }
        } catch (imageError) {
          console.error(`Error dengan gambar: ${imageError.message}`);

          // Kirim pesan text saja jika gambar gagal diunduh
          await sock.sendMessage(
            msg.from,
            {
              text:
                resultMessage + "\n_(Gambar cover tidak dapat ditampilkan)_",
            },
            { quoted: msg }
          );
        }
      } catch (apiError) {
        console.error(`API Error: ${apiError.message}`);
        throw new Error(`Error API: ${apiError.message}`);
      }

      logDetails.success = `Spotify search completed for "${text}"`;
      console.log(logDetails);
    } catch (error) {
      logDetails.error = error.message;
      console.error(`Spotify Error: ${error.message}`);
      console.error(`Error stack:`, error.stack);

      const errorMessage = `❌ Gagal mencari di Spotify: ${error.message}`;
      if (sock && sock.sendMessage) {
        await sock.sendMessage(
          msg.from,
          { text: errorMessage },
          { quoted: msg }
        );
      }
    }
  },
});

// Helper function untuk format durasi
function formatDuration(duration) {
  // Handle jika duration adalah NaN, null/undefined, atau string kosong
  if (!duration) {
    return "0:00";
  }

  let minutes, seconds;

  // Cek tipe data duration
  if (typeof duration === "string") {
    // Jika format API mengembalikan string, coba konversi ke angka
    if (duration.includes(":")) {
      // Format "mm:ss" langsung dikembalikan
      return duration;
    } else {
      // Coba konversi string ke angka
      const durationNum = parseInt(duration, 10);
      if (isNaN(durationNum)) {
        return "0:00";
      }

      if (durationNum < 60) {
        // Jika kurang dari 60, anggap sebagai detik
        minutes = 0;
        seconds = durationNum;
      } else if (durationNum < 24000) {
        // Jika angka kecil, kemungkinan dalam detik
        minutes = Math.floor(durationNum / 60);
        seconds = durationNum % 60;
      } else {
        // Jika angka besar, kemungkinan dalam milidetik
        minutes = Math.floor(durationNum / 60000);
        seconds = Math.floor((durationNum % 60000) / 1000);
      }
    }
  } else if (typeof duration === "number") {
    if (duration < 60) {
      // Jika kurang dari 60, anggap sebagai detik
      minutes = 0;
      seconds = duration;
    } else if (duration < 24000) {
      // Jika angka kecil, kemungkinan dalam detik
      minutes = Math.floor(duration / 60);
      seconds = duration % 60;
    } else {
      // Jika angka besar, kemungkinan dalam milidetik
      minutes = Math.floor(duration / 60000);
      seconds = Math.floor((duration % 60000) / 1000);
    }
  } else {
    return "0:00";
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
