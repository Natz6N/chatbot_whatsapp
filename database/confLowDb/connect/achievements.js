const Ajv = require("ajv");
const fs = require("fs").promises;
const path = require("path");
const { botLogger: logger } = require("../../../src/utils/logger");

// Inisialisasi AJV
const ajv = new Ajv({ allErrors: true });

// Tentukan path folder dan file
const dbFolder = path.resolve(process.cwd(), `Oblivinx_bot_Db_1`);
const dbFile = path.join(dbFolder, `achievement.json`);

// Fungsi untuk memastikan folder dan file database ada
async function initializeDatabase() {
  try {
    await fs.mkdir(dbFolder, { recursive: true });
    if (!(await fs.stat(dbFile).catch(() => false))) {
      const initialData = {
        achievements: [
          {
            id: 1,
            name: "Pecandu Chat",
            description: "Kirim 1000 pesan",
            reward_xp: 500,
            reward_coins: 100,
            target: 1000,
            type: "message",
            badge: "💬",
          },
          {
            id: 2,
            name: "Gamer Sejati", 
            description: "Menang 50 game",
            reward_xp: 1000,
            reward_coins: 200,
            target: 50,
            type: "game",
            badge: "🎮",
          },
          {
            id: 3,
            name: "Sosialita",
            description: "Bergabung dengan 5 guild",
            reward_xp: 300,
            reward_coins: 50,
            target: 5,
            type: "social",
            badge: "🤝",
          },
          {
            id: 4,
            name: "Kolektor XP",
            description: "Kumpulkan 10,000 XP",
            reward_xp: 2000,
            reward_coins: 500,
            target: 10000,
            type: "message",
            badge: "🏅",
          },
          {
            id: 5,
            name: "Prestige Master",
            description: "Capai prestige level 5",
            reward_xp: 5000,
            reward_coins: 1000,
            target: 5,
            type: "social",
            badge: "🌟",
          },
        ],
      };
      await fs.writeFile(dbFile, JSON.stringify(initialData, null, 2));
      logger.info(`File ${dbFile} dibuat dengan data awal.`);
    }
  } catch (error) {
    logger.error("Error initializing achievements database:", error);
  }
}

// Fungsi untuk membaca data dari file JSON
async function readDatabase() {
  try {
    const data = await fs.readFile(dbFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    logger.error("Error reading achievements database:", error);
    return null;
  }
}

// Fungsi untuk menulis data ke file JSON
async function writeDatabase(data) {
  try {
    await fs.writeFile(dbFile, JSON.stringify(data, null, 2));
    logger.info(`Data saved to ${dbFile}`);
    return true;
  } catch (error) {
    logger.error("Error writing to achievements database:", error);
    return false;
  }
}

// Skema untuk validasi data achievement
const achievementSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    reward_xp: { type: "integer", minimum: 0 },
    reward_coins: { type: "integer", minimum: 0 },
    target: { type: "integer", minimum: 1 },
    type: { type: "string", enum: ["message", "game", "social"] },
    badge: { type: "string", minLength: 1 },
  },
  required: [
    "name",
    "description", 
    "reward_xp",
    "reward_coins",
    "target",
    "type",
    "badge",
  ],
  additionalProperties: false,
};

// Kompilasi skema
const validateAchievement = ajv.compile(achievementSchema);

// Fungsi untuk mendapatkan semua achievements
async function getAllAchievements() {
  const data = await readDatabase();
  return data.achievements;
}

// Fungsi untuk mendapatkan achievement berdasarkan ID
async function getAchievementById(id) {
  if (typeof id !== "number" || id < 1) {
    logger.error("Invalid ID: must be a positive number");
    throw new Error("Invalid ID: must be a positive number");
  }
  const data = await readDatabase();
  return data.achievements.find((achievement) => achievement.id === id);
}

// Fungsi untuk menambah achievement baru dengan validasi AJV
async function addAchievement(achievementData) {
  try {
    if (!validateAchievement(achievementData)) {
      const errorMsg = "Invalid achievement data: " + ajv.errorsText(validateAchievement.errors);
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const data = await readDatabase();
    const newId = data.achievements.length > 0
      ? Math.max(...data.achievements.map((a) => a.id)) + 1
      : 1;

    const newAchievement = {
      id: newId,
      name: achievementData.name,
      description: achievementData.description,
      reward_xp: achievementData.reward_xp,
      reward_coins: achievementData.reward_coins,
      target: achievementData.target,
      type: achievementData.type,
      badge: achievementData.badge,
    };

    data.achievements.push(newAchievement);
    await writeDatabase(data);
    logger.info(`New achievement added: ${newAchievement.name}`);
    return { success: true, data: newAchievement };
  } catch (error) {
    logger.error("Error adding achievement:", error);
    return { success: false, message: error.message };
  }
}

// Fungsi untuk mengupdate achievement dengan validasi AJV
async function updateAchievement(id, achievementData) {
  try {
    if (typeof id !== "number" || id < 1) {
      logger.error("Invalid ID: must be a positive number");
      throw new Error("Invalid ID: must be a positive number");
    }
    if (!validateAchievement(achievementData)) {
      const errorMsg = "Invalid achievement data: " + ajv.errorsText(validateAchievement.errors);
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const data = await readDatabase();
    const achievement = data.achievements.find((a) => a.id === id);
    if (!achievement) {
      logger.warn(`Achievement with ID ${id} not found`);
      return { success: false, message: "Achievement not found" };
    }

    Object.assign(achievement, achievementData);
    await writeDatabase(data);
    logger.info(`Achievement updated: ${achievement.name}`);
    return { success: true, data: achievement };
  } catch (error) {
    logger.error("Error updating achievement:", error);
    return { success: false, message: error.message };
  }
}

// Fungsi untuk menghapus achievement
async function deleteAchievement(id) {
  try {
    if (typeof id !== "number" || id < 1) {
      logger.error("Invalid ID: must be a positive number");
      throw new Error("Invalid ID: must be a positive number");
    }

    const data = await readDatabase();
    const initialLength = data.achievements.length;
    data.achievements = data.achievements.filter((a) => a.id !== id);
    if (data.achievements.length === initialLength) {
      logger.warn(`Achievement with ID ${id} not found for deletion`);
      return { success: false, message: "Achievement not found" };
    }
    await writeDatabase(data);
    logger.info(`Achievement with ID ${id} deleted`);
    return { success: true, message: "Achievement deleted" };
  } catch (error) {
    logger.error("Error deleting achievement:", error);
    return { success: false, message: error.message };
  }
}

// Inisialisasi database saat modul dimuat
initializeDatabase();

module.exports = {
  getAllAchievements,
  getAchievementById,
  addAchievement,
  updateAchievement,
  deleteAchievement,
};