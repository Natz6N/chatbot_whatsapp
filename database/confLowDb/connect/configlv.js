const Ajv = require("ajv");
const fs = require("fs").promises;
const path = require("path");
const { log } = require("../../../src/utils/logger");

// Tentukan path folder database dan file
const dbFolder = path.resolve(process.cwd(), `Oblivinx_bot_Db_1`);
const dbFile = path.join(dbFolder, `level.json`);

// Inisialisasi AJV
const ajv = new Ajv({ allErrors: true });

// Fungsi untuk memastikan folder dan file database ada
async function initializeDatabase() {
  try {
    await fs.mkdir(dbFolder, { recursive: true });
    if (!(await fs.stat(dbFile).catch(() => false))) {
      const initialData = {
        level_config: [
          { level: 1, xp_required: 0, reward_coins: 0, badge: "🥉" },
          { level: 2, xp_required: 100, reward_coins: 50, badge: "🥉" },
          { level: 3, xp_required: 300, reward_coins: 100, badge: "🥉" },
          { level: 4, xp_required: 600, reward_coins: 150, badge: "🥈" },
          { level: 5, xp_required: 1000, reward_coins: 200, badge: "🥈" },
          { level: 6, xp_required: 1500, reward_coins: 250, badge: "🥈" },
          { level: 7, xp_required: 2100, reward_coins: 300, badge: "🥇" },
          { level: 8, xp_required: 2800, reward_coins: 350, badge: "🥇" },
          { level: 9, xp_required: 3600, reward_coins: 400, badge: "🥇" },
          { level: 10, xp_required: 4500, reward_coins: 500, badge: "💎" },
        ],
      };
      await fs.writeFile(dbFile, JSON.stringify(initialData, null, 2));
      log("Level config database initialized successfully", "info");
    }
  } catch (error) {
    log(`Error initializing level config database: ${error.message}`, "error");
  }
}

// Fungsi untuk membaca data dari file JSON
async function readDatabase() {
  try {
    const data = await fs.readFile(dbFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    log(`Error reading level config database: ${error.message}`, "error");
    return null;
  }
}

// Fungsi untuk menulis data ke file JSON
async function writeDatabase(data) {
  try {
    await fs.writeFile(dbFile, JSON.stringify(data, null, 2));
    log("Successfully wrote to level config database", "debug");
    return true;
  } catch (error) {
    log(`Error writing to level config database: ${error.message}`, "error");
    return false;
  }
}

// Skema untuk validasi data level config
const levelConfigSchema = {
  type: "object",
  properties: {
    level: { type: "integer", minimum: 1 },
    xp_required: { type: "integer", minimum: 0 },
    reward_coins: { type: "integer", minimum: 0 },
    badge: { type: "string", minLength: 1 },
  },
  required: ["level", "xp_required", "reward_coins", "badge"],
  additionalProperties: false,
};

// Kompilasi skema
const validateLevelConfig = ajv.compile(levelConfigSchema);

// Fungsi untuk mendapatkan semua level config
async function getAllLevelConfig() {
  const data = await readDatabase();
  log("Retrieved all level configs", "debug");
  return data.level_config;
}

// Fungsi untuk mendapatkan config berdasarkan level
async function getLevelConfig(level) {
  if (typeof level !== "number" || level < 1) {
    log("Invalid level requested", "warn");
    throw new Error("Invalid level: must be a positive integer");
  }
  const data = await readDatabase();
  const config = data.level_config.find((config) => config.level === level);
  log(`Retrieved config for level ${level}`, "debug");
  return config;
}

// Fungsi untuk menambah level config baru dengan validasi AJV
async function addLevelConfig(levelData) {
  try {
    if (!validateLevelConfig(levelData)) {
      const errorMsg = ajv.errorsText(validateLevelConfig.errors);
      log(`Validation failed for new level config: ${errorMsg}`, "warn");
      throw new Error("Invalid level config data: " + errorMsg);
    }

    const data = await readDatabase();
    const exists = data.level_config.find(
      (config) => config.level === levelData.level
    );
    if (exists) {
      log(`Attempted to add duplicate level ${levelData.level}`, "warn");
      return { success: false, message: "Level already exists" };
    }

    const newLevel = {
      level: levelData.level,
      xp_required: levelData.xp_required,
      reward_coins: levelData.reward_coins,
      badge: levelData.badge,
    };

    data.level_config.push(newLevel);
    await writeDatabase(data);
    log(`Added new level config for level ${levelData.level}`, "info");
    return { success: true, data: newLevel };
  } catch (error) {
    log(`Error adding level config: ${error.message}`, "error");
    return { success: false, message: error.message };
  }
}

// Fungsi untuk mengupdate level config dengan validasi AJV
async function updateLevelConfig(level, levelData) {
  try {
    if (typeof level !== "number" || level < 1) {
      log("Invalid level for update", "warn");
      throw new Error("Invalid level: must be a positive integer");
    }
    if (!validateLevelConfig(levelData)) {
      const errorMsg = ajv.errorsText(validateLevelConfig.errors);
      log(`Validation failed for level update: ${errorMsg}`, "warn");
      throw new Error("Invalid level config data: " + errorMsg);
    }

    const data = await readDatabase();
    const config = data.level_config.find((c) => c.level === level);
    if (!config) {
      log(`Attempted to update non-existent level ${level}`, "warn");
      return { success: false, message: "Level not found" };
    }

    Object.assign(config, levelData);
    await writeDatabase(data);
    log(`Updated config for level ${level}`, "info");
    return { success: true, data: config };
  } catch (error) {
    log(`Error updating level config: ${error.message}`, "error");
    return { success: false, message: error.message };
  }
}

// Fungsi untuk menghapus level config
async function deleteLevelConfig(level) {
  try {
    if (typeof level !== "number" || level < 1) {
      log("Invalid level for deletion", "warn");
      throw new Error("Invalid level: must be a positive integer");
    }

    const data = await readDatabase();
    const initialLength = data.level_config.length;
    data.level_config = data.level_config.filter((c) => c.level !== level);
    if (data.level_config.length === initialLength) {
      log(`Attempted to delete non-existent level ${level}`, "warn");
      return { success: false, message: "Level not found" };
    }
    await writeDatabase(data);
    log(`Deleted config for level ${level}`, "info");
    return { success: true, message: "Level config deleted" };
  } catch (error) {
    log(`Error deleting level config: ${error.message}`, "error");
    return { success: false, message: error.message };
  }
}

// Inisialisasi database saat modul dimuat
initializeDatabase();

module.exports = {
  getAllLevelConfig,
  getLevelConfig,
  addLevelConfig,
  updateLevelConfig,
  deleteLevelConfig,
};