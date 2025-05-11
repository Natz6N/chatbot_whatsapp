const { makeInMemoryStore } = require("@whiskeysockets/baileys");
const { botLogger, log, baileysLogger, logAlways } = require("../src/utils/logger");
const path = require("path");
const fs = require("fs");
const os = require("os");
const dotenv = require("dotenv");
dotenv.config();
const { readFileSync } = require("fs");
const { getAchievementById } = require("../database/confLowDb/lowdb");
// Load game data dengan error handling yang lebih baik
const loadGameData = (filename) => {
  try {
    const filePath = path.join(__dirname, "../src/json/games/", filename);

    // Cek apakah file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: Game file ${filename} tidak ditemukan`);
      return { data: [] }; // Return empty data jika file tidak ada
    }

    return JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    console.warn(`Warning: Error loading ${filename}:`, error.message);
    return { data: [] }; // Return empty data jika terjadi error
  }
};
// Load bot configuration dari JSON
const botConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/json/bot.json"))
);

// Definisikan paths
const BASE_PATH = path.resolve(__dirname, "..");
const SESSIONS_PATH = path.join(BASE_PATH, "sessions");
const STORE_PATH = path.join(BASE_PATH, "store");

// Inisialisasi store dengan error handling
const store = makeInMemoryStore({
  logger: baileysLogger.child({ level: "debug", stream: "store" }),
});

const initializeStore = async () => {
  try {
    const baileysFile = path.join(__dirname, "../baileys_store.json");

    // Coba baca dari file
    if (fs.existsSync(baileysFile)) {
      await store.readFromFile(baileysFile);
      botLogger.info("Store loaded from file");
    } else {
      botLogger.info("Creating new store file");
    }

    // Set interval untuk auto-save
    setInterval(async () => {
      try {
        await store.writeToFile(baileysFile);
        botLogger.debug("Store saved successfully");
      } catch (error) {
        botLogger.error("Gagal menyimpan store:", error);
      }
    }, 10000);
  } catch (error) {
    botLogger.error("❌ Failed to initialize store:", error);
    process.exit(1);
  }
};

// Panggil fungsi inisialisasi
initializeStore();

// Perbarui fungsi bindStoreToSocket
const bindStoreToSocket = (sock) => {
  try {
    if (!sock?.ev) {
      throw new Error("Socket tidak valid untuk binding store");
    }

    store.bind(sock.ev);
    sock.ev.on("creds.update", () => {
      store.writeToFile(baileysFile).catch((error) => {
        botLogger.error("Gagal menyimpan store:", error);
      });
    });
    botLogger.info("Store berhasil di-bind ke socket");
  } catch (error) {
    botLogger.error("Gagal binding store:", {
      error: error.message,
      socketStatus: sock ? "Socket exists" : "Socket null",
    });
  }
};

const cpus = os.cpus();
const prosessor = cpus[0].model;
// Set path untuk store
store.path = path.join(STORE_PATH, "oblixn_store.json");
// Emoji untuk setiap kategori
const categoryEmojis = {
  general: "📋",
  utility: "🛠️",
  info: "ℹ️",
  owner: "👑",
  group: "👥",
  fun: "🎮",
  download: "📥",
  search: "🔍",
  uncategorized: "❓",
  crypto: "🪙",
  tools: "🛠️",
  memo: "📝",
  ai: "🤖",
  admin: "🛡️",
};

// Buat cache untuk retry counter
const msgRetryCounterCache = new Map();

// Tambahkan konfigurasi cache
const cacheConfig = {
  enabled: true,
  ttl: 300, // 5 menit
  maxSize: 1000, // Maksimum item dalam cache
};

// Tambahkan memory monitoring
const memoryMonitor = {
  checkInterval: 60000, // Cek setiap 1 menit
  maxMemoryUsage: 0.8, // 80% dari total memory
  gcThreshold: 0.7, // Jalankan GC pada 70% usage
};

// Konfigurasi bot
let config = {
  number: process.env.PHONE_NUMBER || "",
  logging: {
    colors: {
      error: "red bold",
      warn: "yellow bold",
      info: "green bold",
      success: "cyan bold",
      debug: "blue bold",
      trace: "white bold",
    },
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      success: 3,
      debug: 4,
      trace: 5,
    },
  },
  gameData: {
    tebakGambar: loadGameData("tebakGambar.json"),
    tebakKata: loadGameData("tebakKata.json"),
    trivia: loadGameData("trivia.json"),
    puzzleLogika: loadGameData("puzzleLogika.json"),
    tebakLagu: loadGameData("tebakLagu.json"),

    siapaAku: loadGameData("siapaAku.json"),
    tebakEmoji: loadGameData("tebakEmoji.json"),
    duaPuluhPertanyaan: loadGameData("duaPuluhPertanyaan.json"),
    tod: loadGameData("tod.json"),
    hangman: loadGameData("hangman.json"),

    dungeon: loadGameData("dungeon.json"),
    tebakFakta: loadGameData("tebakFakta.json"),
    quizKepribadian: loadGameData("quizKepribadian.json"),
    lelangVirtual: loadGameData("lelangVirtual.json"),
    hartaKarun: loadGameData("hartaKarun.json"),

    tebakHarga: loadGameData("tebakHarga.json"),
    kartuVirtual: loadGameData("kartuVirtual.json"),
    quizHarian: loadGameData("quizHarian.json"),
    tebakFilm: loadGameData("tebakFilm.json"),
    rpg: loadGameData("rpg.json"),

    tebakAngka: loadGameData("tebakAngka.json"),
    gameMemory: loadGameData("gamememory.json"),
    kuisBahasa: loadGameData("kuizbahasa.json"),
    mafia: loadGameData("mafia.json"),
    matematika: loadGameData("matematika.json"),

    petualangan: loadGameData("Petualangan.json"),
    simonSays: loadGameData("simonsays.json"),
    storyBuilder: loadGameData("storyBuilder.json"),
    tebakKarakter: loadGameData("tebakKarakter.json"),
    tebakLokasi: loadGameData("tebakLokasi.json"),

    tebakMeme: loadGameData("tebakMeme.json"),
    tebakWarna: loadGameData("tebakWarna.json"),
    pilihanGanda: loadGameData("pilihanGanda.json"),
    tebaklagu: loadGameData("tebaklagu.json"),
    rpg: loadGameData("rpg.json"),
    dungeon: loadGameData("dungeon.json"),
  },
  coinmarketcap: {
    apiKey: process.env.COINMARKETCAP_API_KEY,
    baseUrl: "https://pro-api.coinmarketcap.com/v1",
  },
  lang: {
    id: JSON.parse(fs.readFileSync("./src/i18n/langId.json", "utf8")),
    en: JSON.parse(fs.readFileSync("./src/i18n/langEn.json", "utf8")),
    // in: JSON.parse(fs.readFileSync("./src/i18n/langIn.json", "utf8")),
    // jp: JSON.parse(fs.readFileSync("./src/i18n/langJp.json", "utf8")),
    // kr: JSON.parse(fs.readFileSync("./src/i18n/langKr.json", "utf8")),
    // cn: JSON.parse(fs.readFileSync("./src/i18n/langCn.json", "utf8")),
    // th: JSON.parse(fs.readFileSync("./src/i18n/langTh.json", "utf8")),
    // vi: JSON.parse(fs.readFileSync("./src/i18n/langVi.json", "utf8")),
  },
  botName: botConfig.bot.botName || "Oblixn Bot",
  owner: [process.env.OWNER_NUMBER_ONE, process.env.OWNER_NUMBER_TWO],
  prefix: botConfig.bot.prefix || "!",
  prosessor: prosessor,
  languages: botConfig.lang,
  basePath: BASE_PATH,
  sessionsPath: SESSIONS_PATH,
  storePath: STORE_PATH,
  sessionName: path.join(SESSIONS_PATH, botConfig.bot.sessionName),
  maxRetries: 3,
  defaultQueryTimeoutMs: 60_000,
  keepAliveIntervalMs: 10_000,
  maxCacheSize: 100,
  clearCacheInterval: 3600000,
  monitorMemoryInterval: 300000,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  options: {
    printQRInTerminal: true,
    msgRetryCounterCache,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 10_000,
    emitOwnEvents: false,
    logger: false,
    getMessage: async (key) => {
      return {
        conversation: "(Pesan tidak tersedia di cache)",
      };
    },
    shouldIgnoreJid: (jid) => isJidBroadcast(jid), // Hanya abaikan broadcast lists
  },
  author: {
    author1: {
      name: process.env.OWNER1_NAME,
      email: process.env.OWNER1_EMAIL,
      github: process.env.OWNER1_GITHUB,
      roles: process.env.OWNER1_ROLES,
    },
    author2: {
      name: process.env.OWNER2_NAME,
      email: process.env.OWNER2_EMAIL,
      github: process.env.OWNER2_GITHUB,
      roles: process.env.OWNER2_ROLES,
    },
  },
  folderdb: "../../database/Oblivinx_bot_Db_1",
  dbjson: "database.json",
  groupjson: "group.json",
  achievementjson: "achievement.json",
  leveljson: "level.json",

  sessionCleanupInterval: 1800000, // 30 menit
  sessionMaxAge: 86400000, // 24 jam
  download: {
    maxSize: 100 * 1024 * 1024, // Maksimal 100MB
    maxDuration: 600, // Maksimal 10 menit (dalam detik)
    timeout: 300000, // Timeout download 5 menit
    ytdlOpts: {
      quality: "highest",
      filter: "audioandvideo",
    },
  },
  logging: {
    level: "debug",
    dir: "logs",
    errorLog: "error.log",
    combinedLog: "combined.log",
  },
  stalkApi: {
    key: process.env.STALK_API_KEY,
    igUrl: "https://api.example.com/instagram",
    tiktokUrl: "https://api.example.com/tiktok",
    githubUrl: "https://api.example.com/github",
  },
  nsfwThreshold: 0.82, // Threshold default
  nsfwActions: {
    deleteMessage: true,
    warnUser: true,
    banThreshold: 3, // 3 pelanggaran otomatis ban
    cooldown: 300, // 5 menit dalam detik
  },
  wsOptions: {
    headers: {
      Origin: "https://web.whatsapp.com",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    },
    timeout: 45000,
    reconnect: true,
    maxRetries: 5,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
  sticker: {
    packname: "NatzBot",
    author: "ORBIT STUDIO",
    quality: 70,
  },
  leveling: {
    xpPerMessage: {
      text: 10,
      image: 15,
      video: 20,
      sticker: 5,
    },
    xpCooldown: 60, // detik
    dailyCap: 500,
    weeklyCap: 3000,
    levelFormula: (level) => Math.floor(100 * Math.pow(1.1, level)),
    roleRewards: {
      5: { badge: "🥉", boost: 1.1 },
      10: { badge: "🥈", boost: 1.2 },
      20: { badge: "🥇", boost: 1.3 },
      30: { badge: "💎", boost: 1.5 },
    },
  },
};

// Validasi nomor wajib
if (!config.number) {
  console.error("❌ ERROR: Nomor bot utama harus diisi di .env (PHONE_NUMBER)");
  process.exit(1);
}

// Buat direktori jika belum ada
[SESSIONS_PATH, STORE_PATH].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
const asciiFilePath = path.join(__dirname, "/../database", "ascii.txt");
// Gunakan logger setelah config sepenuhnya diinisialisasi
if (botLogger) {
  log(
    `Loaded bot configuration: botName=${config.botName}, owner=${config.owner}, prefix=${config.prefix}, sessionName=${config.sessionName}`,
    "info"
  );
}

// Tambahkan fungsi cleanup di bot.js
function cleanupSessions() {
  try {
    const sessionsDir = config.sessionsPath;
    const files = fs.readdirSync(sessionsDir);
    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(sessionsDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > config.sessionMaxAge) {
        fs.unlinkSync(filePath);
        botLogger.info(`Cleaned up old session file: ${file}`);
      }
    });
  } catch (error) {
    botLogger.error("Error cleaning up sessions:", error);
  }
}

// ====== GLOBAL VARIABLES ======
const commands = []; // Array untuk menyimpan semua command
const PREFIX = process.env.PREFIX || "!"; // Prefix command default
const messageQueue = new Map();
const RATE_LIMIT = 2000; // 2 detik antara pesan

// Tambahkan konstanta untuk retry
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 detik
let retryCount = 0;

// Tambahkan variabel untuk tracking panggilan
const callAttempts = new Map();
const MAX_CALL_ATTEMPTS = 3;

// Tambahkan konstanta rate limit
const RATE_LIMIT_DELAY = process.env.RATE_LIMIT_DELAY
  ? parseInt(process.env.RATE_LIMIT_DELAY)
  : 3000; // 3 detik default antara permintaan API

// Tambahkan konstanta untuk status
const BAN_TYPES = {
  CALL: "CALL_BAN", // Ban karena telepon (dengan blokir)
  MANUAL: "MANUAL_BAN", // Ban manual oleh owner (tanpa blokir)
};
// Jalankan cleanup secara berkala
setInterval(cleanupSessions, config.sessionCleanupInterval);

// Konfigurasi reconnect
const RECONNECT_INTERVAL = process.env.RECONNECT_INTERVAL
  ? parseInt(process.env.RECONNECT_INTERVAL)
  : 10000; // 10 detik default
const MAX_RECONNECT_RETRIES = process.env.MAX_RECONNECT_RETRIES
  ? parseInt(process.env.MAX_RECONNECT_RETRIES)
  : 5;
const CONNECTION_TIMEOUT = process.env.CONNECTION_TIMEOUT
  ? parseInt(process.env.CONNECTION_TIMEOUT)
  : 60000; // 60 detik default

// Buat cache grup manual
const groupCache = new Map();

module.exports = {
  config,
  store,
  msgRetryCounterCache,
  categoryEmojis,
  commands,
  PREFIX,
  messageQueue,
  RATE_LIMIT,
  MAX_RETRIES,
  RETRY_INTERVAL,
  callAttempts,
  MAX_CALL_ATTEMPTS,
  BAN_TYPES,
  log,
  retryCount,
  RECONNECT_INTERVAL,
  MAX_RECONNECT_RETRIES,
  CONNECTION_TIMEOUT,
  groupCache,
  RATE_LIMIT_DELAY,
};
