const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const fs = require("fs").promises;
const path = require("path");
const achievementsDB = require("./connect/achievements");
const levelConfigDB = require("./connect/configlv");
const { log } = require('../../src/utils/logger');

// Tentukan path folder database
const dbFolder = path.resolve(process.cwd(), "Oblivinx_bot_Db_1");
const dbFile = path.join(dbFolder, "database.json");

// Inisialisasi AJV dengan format tambahan
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Fungsi untuk memastikan folder dan file database ada
async function initializeDatabase() {
  try {
    await fs.mkdir(dbFolder, { recursive: true });
    const fileExists = await fs.stat(dbFile).catch(() => false);
    if (!fileExists) {
      const initialData = {
        users: [],
        groups: [],
        user_activity_logs: [],
        leaderboard: [],
        group_settings: [],
        banned_users: [],
        bot_instances: [],
        bot_qr_codes: [],
        user_leveling: [],
        user_activities: [],
        guilds: [],
        user_achievements: [],
        level_roles: [],
        orders: [],
      };
      await fs.writeFile(dbFile, JSON.stringify(initialData, null, 2), "utf8");
      log(`Database initialized successfully at ${dbFile}`, 'info');
    }
  } catch (error) {
    log("Error initializing database: " + error.message, 'error');
    throw error;
  }
}

// Fungsi internal untuk membaca data dari file JSON
async function readDatabase() {
  try {
    const data = await fs.readFile(dbFile, 'utf8');
    let cleanedData = data;
    try {
      JSON.parse(cleanedData);
    } catch (error) {
      log('Database JSON rusak, mencoba perbaikan otomatis...', 'warn');
      const backupExists = await fs.stat(`${dbFile}.backup`).catch(() => false);
      if (backupExists) {
        log('Menggunakan file backup...', 'info');
        cleanedData = await fs.readFile(`${dbFile}.backup`, 'utf8');
      } else {
        log('Membersihkan karakter tidak valid...', 'info');
        cleanedData = data.replace(/[^\x20-\x7E\s]/g, '');
      }
      try {
        JSON.parse(cleanedData);
        log('Berhasil memperbaiki data JSON', 'info');
      } catch (parseError) {
        log('Gagal memperbaiki data JSON, menggunakan struktur kosong...', 'error');
        cleanedData = JSON.stringify({
          users: [],
          groups: [],
          user_activity_logs: [],
          leaderboard: [],
          group_settings: [],
          banned_users: [],
          bot_instances: [],
          bot_qr_codes: [],
          user_leveling: [],
          user_activities: [],
          guilds: [],
          user_achievements: [],
          level_roles: [],
          orders: [],
        });
      }
    }
    await fs.writeFile(`${dbFile}.backup`, cleanedData, 'utf8');
    const parsed = JSON.parse(cleanedData);
    // PATCH: pastikan struktur utama selalu ada
    if (!parsed.users) parsed.users = [];
    if (!parsed.groups) parsed.groups = [];
    if (!parsed.bot_instances) parsed.bot_instances = [];
    if (!parsed.banned_users) parsed.banned_users = [];
    if (!parsed.orders) parsed.orders = [];
    if (!parsed.user_activity_logs) parsed.user_activity_logs = [];
    if (!parsed.leaderboard) parsed.leaderboard = [];
    if (!parsed.group_settings) parsed.group_settings = [];
    if (!parsed.bot_qr_codes) parsed.bot_qr_codes = [];
    if (!parsed.user_leveling) parsed.user_leveling = [];
    if (!parsed.user_activities) parsed.user_activities = [];
    if (!parsed.guilds) parsed.guilds = [];
    if (!parsed.user_achievements) parsed.user_achievements = [];
    if (!parsed.level_roles) parsed.level_roles = [];
    return parsed;
  } catch (error) {
    log('Error reading database: ' + error.message, 'error');
    return {
      users: [],
      groups: [],
      user_activity_logs: [],
      leaderboard: [],
      group_settings: [],
      banned_users: [],
      bot_instances: [],
      bot_qr_codes: [],
      user_leveling: [],
      user_activities: [],
      guilds: [],
      user_achievements: [],
      level_roles: [],
      orders: [],
    };
  }
}

// Fungsi internal untuk menulis data ke file JSON
async function writeDatabase(data) {
  try {
    if (!data.users) data.users = [];
    if (!data.groups) data.groups = [];
    if (!data.bot_instances) data.bot_instances = [];
    if (!data.banned_users) data.banned_users = [];
    if (!data.orders) data.orders = [];
    if (!data.user_activity_logs) data.user_activity_logs = [];
    if (!data.leaderboard) data.leaderboard = [];
    if (!data.group_settings) data.group_settings = [];
    if (!data.bot_qr_codes) data.bot_qr_codes = [];
    if (!data.user_leveling) data.user_leveling = [];
    if (!data.user_activities) data.user_activities = [];
    if (!data.guilds) data.guilds = [];
    if (!data.user_achievements) data.user_achievements = [];
    if (!data.level_roles) data.level_roles = [];
    await fs.writeFile(dbFile, JSON.stringify(data, null, 2), "utf8");
    log(`Database written successfully to ${dbFile}`, 'info');
    return true;
  } catch (error) {
    log("Error writing to database: " + error.message, 'error');
    throw error;
  }
}

// Skema untuk validasi data user
const userSchema = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
    user_id: { type: "string", minLength: 1 },
    username: { type: ["string", "null"] },
    is_premium: { type: "integer", enum: [0, 1], default: 0 },
    is_banned: { type: "integer", enum: [0, 1], default: 0 },
    is_blocked: { type: "integer", enum: [0, 1], default: 0 },
    coins: { type: "number", minimum: 0, default: 0.0 },
    experience: { type: "integer", minimum: 0, default: 0 },
    level: { type: "integer", minimum: 1, default: 1 },
    ranking: { type: ["integer", "null"], minimum: 1 },
    total_messages: { type: "integer", minimum: 0, default: 0 },
    messages_per_day: { type: "integer", minimum: 0, default: 0 },
    feature_first_used: { type: "string", default: "unknown" },
    feature_last_used: { type: "string", default: "unknown" },
    total_feature_usage: { type: "integer", minimum: 0, default: 0 },
    daily_feature_average: { type: "integer", minimum: 0, default: 0 },
    blocked_status: { type: "integer", enum: [0, 1], default: 0 },
    is_sewa: { type: "integer", enum: [0, 1], default: 0 },
    language: { type: "string", minLength: 1, default: "id" },
    anti_delete_message: { type: "integer", enum: [0, 1], default: 0 },
    anti_hidden_tag: { type: "integer", enum: [0, 1], default: 0 },
    anti_group_link: { type: "integer", enum: [0, 1], default: 0 },
    anti_view_once: { type: "integer", enum: [0, 1], default: 0 },
    auto_sticker: { type: "integer", enum: [0, 1], default: 0 },
    log_detection: { type: "integer", enum: [0, 1], default: 0 },
    auto_level_up: { type: "integer", enum: [0, 1], default: 0 },
    mute_bot: { type: "integer", enum: [0, 1], default: 0 },
    warnings: { type: "integer", minimum: 0, default: 0 },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
    daily_xp: { type: "integer", minimum: 0, default: 0 },
    last_message: { type: "string", format: "date-time" },
    achievements: { type: ["object", "null"] },
    last_message_xp: { type: "string", format: "date-time" },
    weekly_xp: { type: "integer", minimum: 0, default: 0 },
    total_xp: { type: "integer", minimum: 0, default: 0 },
  },
  required: ["id", "user_id"],
  additionalProperties: false,
};

// Skema untuk ban user
const banUserSchema = {
  type: "object",
  properties: {
    userId: { type: "string", minLength: 1 },
    reason: { type: ["string", "null"] },
    bannedBy: { type: "string", minLength: 1 },
  },
  required: ["userId", "bannedBy"],
  additionalProperties: false,
};

// Skema untuk group (tanpa bot_is_admin)
const groupSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    group_id: { type: "string" },
    owner_id: { type: "string" },
    group_name: { type: "string" },
    total_members: { type: "number" },
    welcome_message: { type: "number", enum: [0, 1] },
    goodbye_message: { type: "number", enum: [0, 1] },
    level: { type: "number" },
    total_xp: { type: "number" },
    current_xp: { type: "number" },
    xp_to_next_level: { type: "number" },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    registration_date: { type: "string" },
    description: { type: ["string", "null"] },
    warnings: { type: "number" },
    topUsers: { 
      type: "array",
      items: {
        type: "object",
        properties: {
          userId: { type: "string" },
          level: { type: "number" },
          xp: { type: "number" },
          username: { type: "string" },
          messages: { type: "number" },
          lastUpdated: { type: "string" }
        }
      }
    }
  },
  required: ["group_id", "owner_id", "group_name"]
};

// Skema untuk order
const orderSchema = {
  type: "object",
  properties: {
    user_id: { type: "string", minLength: 1 },
    total_harga: { type: "number", minimum: 0 },
    status: { type: "string", enum: ["pending", "completed", "cancelled"] },
  },
  required: ["user_id"],
  additionalProperties: false,
};

// Skema untuk QR code
const qrCodeSchema = {
  type: "object",
  properties: {
    qrData: { type: "string", minLength: 1 },
    phoneNumber: { type: "string", minLength: 1 },
  },
  required: ["qrData", "phoneNumber"],
  additionalProperties: false,
};

// Kompilasi skema
const validateUser = ajv.compile(userSchema);
const validateBanUser = ajv.compile(banUserSchema);
const validateGroup = ajv.compile(groupSchema);
const validateOrder = ajv.compile(orderSchema);
const validateQrCode = ajv.compile(qrCodeSchema);

// Fungsi untuk mendapatkan ID baru
const getNewId = (items) => {
  return items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
};

// Fungsi untuk mendapatkan data user
async function getUser(userId) {
  try {
    if (typeof userId !== "string" || userId.length === 0) {
      throw new Error("Invalid userId: must be a non-empty string");
    }
    const data = await readDatabase();
    log(`Fetching user with ID: ${userId}`, 'debug');
    const user = data.users.find((user) => user.user_id === userId) || null;
    log(`User found: ${JSON.stringify(user)}`, 'debug');
    return user;
  } catch (error) {
    log("Error getting user: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk memperbarui data user dengan pembuatan otomatis jika tidak ada
async function updateUser(userId, updatedData) {
  try {
    if (typeof userId !== "string" || userId.length === 0) {
      throw new Error("Invalid userId: must be a non-empty string");
    }
    const data = await readDatabase();
    const userIndex = data.users.findIndex((user) => user.user_id === userId);
    
    // Jika user tidak ditemukan, coba buat user baru
    if (userIndex === -1) {
      log(`User not found: ${userId}, attempting to create new user`, 'warn');
      try {
        // Buat user baru dan kemudian update
        await createNewUser(userId);
        // Ambil database yang sudah diupdate
        const refreshedData = await readDatabase();
        const newUserIndex = refreshedData.users.findIndex((user) => user.user_id === userId);
        
        if (newUserIndex === -1) {
          throw new Error(`Failed to create user: ${userId}`);
        }
        
        const updatedUser = { ...refreshedData.users[newUserIndex], ...updatedData };
        if (!validateUser(updatedUser)) {
          throw new Error(
            "Invalid updated user data: " + ajv.errorsText(validateUser.errors)
          );
        }
        
        refreshedData.users[newUserIndex] = updatedUser;
        log(`Updating newly created user ${userId} with data: ${JSON.stringify(updatedUser)}`, 'debug');
        await writeDatabase(refreshedData);
        return { success: true, data: updatedUser, isNewUser: true };
      } catch (createError) {
        log("Error creating and updating user: " + createError.message, 'error');
        throw createError;
      }
    }
    
    // Update user yang sudah ada
    const updatedUser = { ...data.users[userIndex], ...updatedData };
    if (!validateUser(updatedUser)) {
      throw new Error(
        "Invalid updated user data: " + ajv.errorsText(validateUser.errors)
      );
    }
    data.users[userIndex] = updatedUser;
    log(`Updating existing user ${userId} with data: ${JSON.stringify(updatedUser)}`, 'debug');
    await writeDatabase(data);
    return { success: true, data: updatedUser, isNewUser: false };
  } catch (error) {
    log("Error updating user: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk membuat user baru otomatis
async function createNewUser(userId) {
  try {
    if (typeof userId !== "string" || userId.length === 0) {
      throw new Error("Invalid userId: must be a non-empty string");
    }
    
    log(`Creating new user with ID: ${userId}`, 'info');
    
    // Format data user baru dengan nilai default
    const newUser = {
      user_id: userId,
      username: null,
      name: null,
      phone: userId,
      bio: "Hey there! I'm using this bot.",
      is_banned: 0,
      is_blocked: 0,
      last_interaction: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      experience: {
        level: 1,
        xp_current: 0,
        xp_total: 0,
        xp_to_next_level: 100
      },
      achievements: [],
      settings: {
        language: "id",
        notifications: true,
        theme: "default"
      },
      usage: {
        commands_used: 0,
        messages_sent: 0,
        images_processed: 0
      }
    };

    // Validasi user baru
    if (!validateUser(newUser)) {
      throw new Error(
        "Invalid new user data: " + ajv.errorsText(validateUser.errors)
      );
    }

    // Tambahkan user ke database
    const data = await readDatabase();
    data.users.push(newUser);
    await writeDatabase(data);
    log(`User ${userId} created successfully`, 'info');
    return newUser;
  } catch (error) {
    log("Error creating new user: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk menambahkan XP ke user dengan pembuatan otomatis
async function addUserXP(userId, xpAmount, reason = "activity") {
  try {
    if (typeof userId !== "string" || userId.length === 0) {
      throw new Error("Invalid userId: must be a non-empty string");
    }
    
    let user = await getUser(userId);
    
    // Jika user tidak ditemukan, buat user baru
    if (!user) {
      try {
        user = await createNewUser(userId);
        log(`Created new user ${userId} for XP tracking`, 'info');
      } catch (createError) {
        log(`Failed to create user ${userId} for XP tracking: ${createError.message}`, 'error');
        throw new Error(`Failed to add XP: ${createError.message}`);
      }
    }
    
    // Hitung XP baru
    const currentXP = user.experience.xp_current + xpAmount;
    const totalXP = user.experience.xp_total + xpAmount;
    let level = user.experience.level;
    let xpToNextLevel = user.experience.xp_to_next_level;
    
    // Cek apakah user naik level
    while (currentXP >= xpToNextLevel) {
      level++;
      xpToNextLevel = Math.round(xpToNextLevel * 1.5); // XP untuk naik level selanjutnya
    }
    
    // Catat perubahan XP
    const xpLog = {
      user_id: userId,
      amount: xpAmount,
      reason: reason,
      timestamp: new Date().toISOString()
    };
    
    // Update database
    const data = await readDatabase();
    
    // Tambahkan log XP
    if (!data.xp_logs) data.xp_logs = [];
    data.xp_logs.push(xpLog);
    
    // Update user
    const userIndex = data.users.findIndex((u) => u.user_id === userId);
    if (userIndex !== -1) {
      data.users[userIndex].experience = {
        level,
        xp_current: currentXP,
        xp_total: totalXP,
        xp_to_next_level: xpToNextLevel
      };
      
      // Jika naik level, tambahkan achievement
      if (level > user.experience.level) {
        const levelUpAchievement = {
          id: `level_${level}`,
          name: `Level ${level}`,
          description: `Reached level ${level}`,
          unlocked_at: new Date().toISOString()
        };
        
        if (!data.users[userIndex].achievements) {
          data.users[userIndex].achievements = [];
        }
        
        data.users[userIndex].achievements.push(levelUpAchievement);
        log(`User ${userId} leveled up to ${level}`, 'info');
      }
      
      await writeDatabase(data);
      
      return {
        success: true,
        data: {
          previousLevel: user.experience.level,
          currentLevel: level,
          levelUp: level > user.experience.level,
          currentXP,
          totalXP,
          xpToNextLevel
        }
      };
    } else {
      throw new Error(`User not found after creation: ${userId}`);
    }
  } catch (error) {
    log(`Error adding XP to user ${userId}: ${error.message}`, 'error');
    throw error;
  }
}

// Fungsi untuk mendapatkan data group
async function getGroup(groupId) {
  try {
    if (typeof groupId !== "string" || groupId.length === 0) {
      throw new Error("Invalid groupId: must be a non-empty string");
    }
    
    // Pastikan groupId adalah string
    const stringGroupId = String(groupId);
    
    const data = await readDatabase();
    log(`Fetching group with ID: ${stringGroupId}`, 'debug');
    const group = data.groups.find((group) => group.group_id === stringGroupId) || null;
    
    log(`Group found: ${JSON.stringify(group)}`, 'debug');
    return group;
  } catch (error) {
    log("Error getting group: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk memperbarui data group
async function updateGroup(groupId, groupData) {
  try {
    // Pastikan groupId adalah string
    const stringGroupId = String(groupId);
    
    const data = await readDatabase();
    const groupIndex = data.groups.findIndex(
      (group) => group.group_id === stringGroupId
    );
    
    if (groupIndex === -1) {
      if (!groupData.owner_id) {
        log(`Tidak dapat menambahkan grup baru ${stringGroupId} tanpa owner_id`, 'warn');
        return { success: false, message: "Missing owner_id for new group" };
      }
      
      const result = await addGroup({
        group_id: stringGroupId,
        owner_id: String(groupData.owner_id),
        group_name: groupData.group_name || "Unnamed Group",
        ...groupData
      });
      
      return result;
    }
    
    // Buat objek grup yang diperbarui
    const updatedGroup = { 
      ...data.groups[groupIndex], 
      ...groupData,
      group_id: stringGroupId,
      updated_at: new Date().toISOString()
    };
    
    // Pastikan semua ID adalah string
    if (updatedGroup.id) updatedGroup.id = String(updatedGroup.id);
    if (updatedGroup.owner_id) updatedGroup.owner_id = String(updatedGroup.owner_id);
    
    // Validasi data yang diperbarui
    if (!validateGroup(updatedGroup)) {
      log(`Invalid updated group data: ${ajv.errorsText(validateGroup.errors)}`, 'error');
      return { 
        success: false, 
        message: "Invalid updated data: " + ajv.errorsText(validateGroup.errors)
      };
    }
    
    data.groups[groupIndex] = updatedGroup;
    log(`Updating group ${stringGroupId} with data: ${JSON.stringify(updatedGroup)}`, 'debug');
    await writeDatabase(data);
    
    return { success: true, data: updatedGroup };
  } catch (error) {
    log("Error updating group: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk menambah group dengan validasi AJV (tanpa bot_is_admin)
async function addGroup(groupData) {
  try {
    const minimalGroupData = {
      group_id: String(groupData.group_id),
      owner_id: String(groupData.owner_id),
      group_name: groupData.group_name || null,
    };
    
    // Periksa data minimal tanpa validasi id
    if (!validateGroup({ ...minimalGroupData, id: "1" })) {
      throw new Error("Invalid group data: " + ajv.errorsText(validateGroup.errors));
    }

    const data = await readDatabase();
    // Konversi id menjadi string
    const newId = String(getNewId(data.groups));
    
    const defaultGroup = {
      id: newId,
      group_id: String(groupData.group_id),
      group_name: groupData.group_name || null,
      owner_id: String(groupData.owner_id),
      total_members: groupData.total_members || 0,
      created_at: groupData.created_at || new Date().toISOString(),
      updated_at: groupData.updated_at || new Date().toISOString(),
      registration_date: groupData.registration_date || new Date().toISOString(),
      premium_status: groupData.premium_status || 0,
      sewa_status: groupData.sewa_status || 0,
      language: groupData.language || "id",
      leaderboard_rank: groupData.leaderboard_rank || null,
      level: groupData.level || 1,
      total_xp: groupData.total_xp || 0,
      current_xp: groupData.current_xp || 0,
      xp_to_next_level: groupData.xp_to_next_level || (await levelConfigDB.getLevelConfig(1))?.xp_required || 1000,
      anti_bot: groupData.anti_bot || 0,
      anti_delete_message: groupData.anti_delete_message || 0,
      anti_hidden_tag: groupData.anti_hidden_tag || 0,
      anti_group_link: groupData.anti_group_link || 0,
      anti_view_once: groupData.anti_view_once || 0,
      auto_sticker: groupData.auto_sticker || 0,
      log_detection: groupData.log_detection || 0,
      auto_level_up: groupData.auto_level_up || 0,
      mute_bot: groupData.mute_bot || 0,
      anti_country: groupData.anti_country || 0,
      welcome_message: groupData.welcome_message || 0,
      goodbye_message: groupData.goodbye_message || 0,
      warnings: groupData.warnings || 0,
      description: groupData.description || null,
    };

    if (!validateGroup(defaultGroup)) {
      log(`Invalid group data after defaults: ${ajv.errorsText(validateGroup.errors)}`, 'error');
      throw new Error("Invalid group data after defaults: " + ajv.errorsText(validateGroup.errors));
    }

    if (data.groups.some((group) => group.group_id === String(groupData.group_id))) {
      log(`Group with group_id ${groupData.group_id} already exists`, 'warn');
      return { success: false, message: "Group with this group_id already exists" };
    }

    data.groups.push(defaultGroup);
    log(`Adding group: ${JSON.stringify(defaultGroup)}`, 'debug');
    await writeDatabase(data);
    return { success: true, data: defaultGroup };
  } catch (error) {
    log("Error adding group: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk reset database
async function resetDatabase() {
  try {
    const initialData = {
      users: [],
      groups: [],
      user_activity_logs: [],
      leaderboard: [],
      group_settings: [],
      banned_users: [],
      bot_instances: [],
      bot_qr_codes: [],
      user_leveling: [],
      user_activities: [],
      guilds: [],
      user_achievements: [],
      level_roles: [],
      orders: [],
    };
    log("Resetting database to initial state", 'info');
    console.log("Resetting database to initial state");
    await writeDatabase(initialData);
    return { success: true, message: "Main database reset successfully" };
  } catch (error) {
    console.error("Error resetting database:", error.message, error.stack);
    throw error;
  }
}

// Fungsi untuk menambah order dengan validasi AJV
async function addOrder(orderData) {
  try {
    if (!validateOrder(orderData)) {
      throw new Error("Invalid order data: " + ajv.errorsText(validateOrder.errors));
    }

    const data = await readDatabase();
    const newOrder = {
      id: getNewId(data.orders),
      user_id: orderData.user_id,
      tanggal: new Date().toISOString(),
      total_harga: orderData.total_harga || 0.0,
      status: orderData.status || "pending",
    };

    data.orders.push(newOrder);
    console.log(`Adding order: ${JSON.stringify(newOrder)}`);
    await writeDatabase(data);
    return { success: true, data: newOrder };
  } catch (error) {
    console.error("Error adding order:", error.message, error.stack);
    throw error;
  }
}

// Fungsi untuk memeriksa foreign key
async function checkForeignKey(collection, key, value) {
  try {
    if (
      typeof collection !== "string" ||
      typeof key !== "string" ||
      typeof value !== "string" ||
      !["users", "groups"].includes(collection)
    ) {
      throw new Error(
        "Invalid input: collection must be 'users' or 'groups', key and value must be strings"
      );
    }

    const data = await readDatabase();
    if (collection === "users") {
      const exists = !!data.users.find((user) => user.user_id === value);
      console.log(`Checking foreign key ${key}=${value} in ${collection}: ${exists}`);
      return exists;
    }
    if (collection === "groups") {
      const exists = !!data.groups.find((group) => group.group_id === value);
      console.log(`Checking foreign key ${key}=${value} in ${collection}: ${exists}`);
      return exists;
    }
    return false;
  } catch (error) {
    console.error("Error checking foreign key:", error.message, error.stack);
    throw error;
  }
}

// Fungsi untuk menangani QR code dengan validasi AJV
async function handleQrCode(qrData, phoneNumber) {
  try {
    const qrCodeData = { qrData, phoneNumber };
    if (!validateQrCode(qrCodeData)) {
      throw new Error("Invalid QR code data: " + ajv.errorsText(validateQrCode.errors));
    }

    const data = await readDatabase();
    data.bot_qr_codes = data.bot_qr_codes.filter((qr) => qr.number !== phoneNumber);
    const qrEntry = {
      id: getNewId(data.bot_qr_codes),
      number: phoneNumber,
      qr_data: qrData,
      created_at: new Date().toISOString(),
    };
    data.bot_qr_codes.push(qrEntry);
    console.log(`Saving QR code for ${phoneNumber}: ${JSON.stringify(qrEntry)}`);
    await writeDatabase(data);
    return true;
  } catch (error) {
    console.error("Error saving QR code:", error.message, error.stack);
    throw error;
  }
}

// Fungsi untuk mendapatkan bot_instances
async function getBotInstances() {
  try {
    const data = await readDatabase();
    return data.bot_instances;
  } catch (error) {
    console.error("Error getting bot instances:", error.message, error.stack);
    throw error;
  }
}

// Fungsi untuk mendapatkan data level pengguna
async function getUserLevel(userId, groupId) {
  try {
    const db = await readDatabase();
    
    if (!db.leveling) {
      db.leveling = {};
    }
    
    const key = `${groupId}_${userId}`;
    
    if (!db.leveling[key]) {
      const LevelingModel = require('./models/leveling');
      db.leveling[key] = LevelingModel.createUserLevel(userId, groupId);
      await writeDatabase(db);
    }
    
    return db.leveling[key];
  } catch (error) {
    console.error('Error getting user level:', error);
    return null;
  }
}

// Fungsi untuk mengupdate XP dan level pengguna
async function updateUserLevel(userId, groupId, xpToAdd) {
  try {
    const db = await readDatabase();
    const LevelingModel = require('./models/leveling');
    
    if (!db.leveling) {
      db.leveling = {};
    }
    
    if (!db.groups) {
      db.groups = {};
    }
    
    if (!db.groups[groupId]) {
      db.groups[groupId] = {
        id: groupId,
        name: '',
        members: [],
        topUsers: [],
        settings: {
          levelingEnabled: true
        },
        lastUpdate: new Date().toISOString()
      };
    }
    
    const key = `${groupId}_${userId}`;
    
    let userData = db.leveling[key];
    if (!userData) {
      userData = LevelingModel.createUserLevel(userId, groupId);
    }
    
    userData.xp += xpToAdd;
    userData.messages += 1;
    userData.lastMessageTime = new Date().toISOString();
    
    const today = new Date().toISOString().split('T')[0];
    if (!userData.activeDays) userData.activeDays = {};
    userData.activeDays[today] = (userData.activeDays[today] || 0) + 1;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];
    
    if (userData.activeDays[yesterdayKey]) {
      userData.streak += 1;
    } else {
      userData.streak = 1;
    }
    
    const oldLevel = userData.level;
    const xpForNextLevel = LevelingModel.xpNeededForLevel(userData.level);
    
    let leveledUp = false;
    
    while (userData.xp >= xpForNextLevel) {
      userData.level += 1;
      leveledUp = true;
      userData.xp -= xpForNextLevel;
    }
    
    if (leveledUp && db.groups[groupId]) {
      if (!db.groups[groupId].topUsers) db.groups[groupId].topUsers = [];
      
      const userIndex = db.groups[groupId].topUsers.findIndex(u => u.userId === userId);
      
      if (userIndex >= 0) {
        db.groups[groupId].topUsers[userIndex] = {
          userId,
          level: userData.level,
          xp: userData.xp,
          username: userData.username || '',
          messages: userData.messages,
          lastUpdated: new Date().toISOString()
        };
      } else {
        db.groups[groupId].topUsers.push({
          userId,
          level: userData.level,
          xp: userData.xp,
          username: userData.username || '',
          messages: userData.messages,
          lastUpdated: new Date().toISOString()
        });
      }
      
      db.groups[groupId].topUsers.sort((a, b) => {
        if (a.level !== b.level) return b.level - a.level;
        return b.xp - a.xp;
      });
      
      db.groups[groupId].topUsers = db.groups[groupId].topUsers.slice(0, 10);
      db.groups[groupId].lastUpdate = new Date().toISOString();
    }
    
    userData.lastUpdated = new Date().toISOString();
    db.leveling[key] = userData;
    await writeDatabase(db);
    
    return {
      userData,
      leveledUp,
      oldLevel,
      newLevel: userData.level
    };
  } catch (error) {
    console.error('Error updating user level:', error);
    return null;
  }
}

// Fungsi untuk mendapatkan daftar top users di grup
async function getGroupLeaderboard(groupId, limit = 10) {
  try {
    const db = await readDatabase();
    
    if (!db.leveling) {
      return [];
    }
    
    const groupUsers = Object.values(db.leveling)
      .filter(user => user.groupId === groupId)
      .sort((a, b) => {
        if (a.level !== b.level) return b.level - a.level;
        return b.xp - a.xp;
      })
      .slice(0, limit);
    
    return groupUsers;
  } catch (error) {
    console.error('Error getting group leaderboard:', error);
    return [];
  }
}

// Fungsi untuk mendapatkan fitur dan permission grup (tanpa bot_is_admin)
const fiturPermissionGroup = async (groupId) => {
  try {
    const db = await readDatabase();
    if (!db.groups) {
      return { success: false, message: "Tidak ada data grup", activeFeatures: [] };
    }
    
    const group = db.groups.find((group) => group.group_id === groupId);
    if (!group) {
      return { success: false, message: "Grup tidak ditemukan", activeFeatures: [] };
    }
    
    const activeFeatures = {};
    const featureKeys = [
      "anti_bot", "anti_delete_message", "anti_hidden_tag", 
      "anti_group_link", "anti_view_once", "auto_sticker", 
      "log_detection", "auto_level_up", "mute_bot", 
      "anti_country", "welcome_message", "goodbye_message"
    ];
    
    featureKeys.forEach(key => {
      if (group[key] === 1) {
        activeFeatures[key] = true;
      }
    });
    
    return { 
      success: true, 
      groupInfo: {
        id: group.id,
        group_id: group.group_id,
        group_name: group.group_name,
        owner_id: group.owner_id,
        total_members: group.total_members,
        premium_status: group.premium_status === 1,
        sewa_status: group.sewa_status === 1,
        language: group.language,
        level: group.level || 1,
        total_xp: group.total_xp || 0,
        current_xp: group.current_xp || 0,
        xp_to_next_level: group.xp_to_next_level || 1000,
        description: group.description || null,
        created_at: group.created_at,
        updated_at: group.updated_at || group.created_at
      },
      activeFeatures 
    };
  } catch (error) {
    log("Error mengambil data fitur grup: " + error.message, 'error');
    return { success: false, message: "Error mengambil data fitur grup", activeFeatures: [] };
  }
}

// Fungsi untuk memeriksa status user
async function checkUserStatus(userId) {
  try {
    const user = await getUser(userId);
    if (!user) {
      return { exists: false, isBanned: false, isBlocked: false };
    }
    return {
      exists: true,
      isBanned: user.is_banned === 1,
      isBlocked: user.is_blocked === 1
    };
  } catch (error) {
    log("Error checking user status: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk memblokir user oleh sistem
async function blockUserBySystem(userId, reason) {
  try {
    const data = await readDatabase();
    const userIndex = data.users.findIndex((user) => user.user_id === userId);
    
    if (userIndex === -1) {
      throw new Error(`User not found: ${userId}`);
    }
    
    data.users[userIndex].is_blocked = 1;
    data.users[userIndex].blocked_status = 1;
    data.users[userIndex].updated_at = new Date().toISOString();
    
    await writeDatabase(data);
    return { success: true, message: `User ${userId} blocked by system: ${reason}` };
  } catch (error) {
    log("Error blocking user by system: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk mendapatkan daftar user yang dibanned
async function getListBannedUsers() {
  try {
    const data = await readDatabase();
    return data.users.filter(user => user.is_banned === 1);
  } catch (error) {
    log("Error getting banned users list: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk memblokir user
async function banUser(userId, reason, bannedBy) {
  try {
    const data = await readDatabase();
    const userIndex = data.users.findIndex((user) => user.user_id === userId);
    
    if (userIndex === -1) {
      throw new Error(`User not found: ${userId}`);
    }
    
    data.users[userIndex].is_banned = 1;
    data.users[userIndex].updated_at = new Date().toISOString();
    
    // Tambahkan ke daftar banned_users
    const banEntry = {
      userId: userId,
      reason: reason || "No reason provided",
      bannedBy: bannedBy,
      bannedAt: new Date().toISOString()
    };
    
    data.banned_users.push(banEntry);
    
    await writeDatabase(data);
    return { success: true, message: `User ${userId} banned successfully` };
  } catch (error) {
    log("Error banning user: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk membuka blokir user
async function unbanUser(userId) {
  try {
    const data = await readDatabase();
    const userIndex = data.users.findIndex((user) => user.user_id === userId);
    
    if (userIndex === -1) {
      throw new Error(`User not found: ${userId}`);
    }
    
    data.users[userIndex].is_banned = 0;
    data.users[userIndex].updated_at = new Date().toISOString();
    
    // Hapus dari daftar banned_users
    data.banned_users = data.banned_users.filter(ban => ban.userId !== userId);
    
    await writeDatabase(data);
    return { success: true, message: `User ${userId} unbanned successfully` };
  } catch (error) {
    log("Error unbanning user: " + error.message, 'error');
    throw error;
  }
}

// Fungsi untuk menghapus bot anak yang tidak valid (tidak ada credentials atau auth)
async function cleanupInvalidBotInstances() {
  try {
    const data = await readDatabase();
    const before = data.bot_instances.length;
    data.bot_instances = data.bot_instances.filter(bot => {
      if (!bot.credentials) return false;
      try {
        const creds = JSON.parse(bot.credentials);
        return creds && creds.creds && creds.keys;
      } catch (e) {
        return false;
      }
    });
    const after = data.bot_instances.length;
    if (after < before) {
      await writeDatabase(data);
      log(`Cleaned up ${before - after} invalid bot anak from database.`, 'info');
    }
    return { removed: before - after };
  } catch (error) {
    log('Error cleaning up invalid bot anak: ' + error.message, 'error');
    throw error;
  }
}

initializeDatabase().catch((err) => {
  console.error("Failed to initialize database on module load:", err);
  process.exit(1);
});

// Export semua fungsi
module.exports = {
  addUser: createNewUser,
  banUser,
  unbanUser,
  checkUserStatus,
  initializeDatabase,
  blockUserBySystem,
  getListBannedUsers,
  addGroup,
  resetDatabase,
  addOrder,
  checkForeignKey,
  getNewId,
  handleQrCode,
  getBotInstances,
  getUser,
  updateUser,
  getGroup,
  updateGroup,
  ...achievementsDB,
  ...levelConfigDB,
  getUserLevel,
  updateUserLevel,
  getGroupLeaderboard,
  fiturPermissionGroup,
  readDatabase,
  writeDatabase,
  addUserXP,
  cleanupInvalidBotInstances,
};