const { Character, BattleSystem, Inventory, QuestJournal, World } = require('../lib/rpg');
const { botLogger } = require('../utils/logger');
const langId = require('../i18n/langId.json');
const db = require('../lib/rpg/database');

// Command untuk memulai game RPG
Oblixn.cmd({
  name: "rpg",
  desc: "Memulai game RPG",
  category: "games",
  async exec(msg, args) {
    try {
      const userId = msg.sender;
      
      // Cek apakah pemain sudah memiliki karakter
      const existingCharacter = await db.loadCharacter(userId);
      if (existingCharacter) {
        return msg.reply(langId.commands.rpg.alreadyHaveCharacter);
      }
      
      // Buat karakter baru
      const character = new Character(args[0] || "Hero", args[1] || "Warrior");
      await db.saveCharacter(userId, character);
      
      return msg.reply(langId.commands.rpg.characterCreated);
    } catch (error) {
      botLogger.error("Error in rpg command:", error);
      return msg.reply(langId.errors.rpg.creationFailed);
    }
  }
});

// Command untuk melihat profil karakter
Oblixn.cmd({
  name: "profile",
  desc: "Melihat profil karakter",
  category: "games",
  async exec(msg) {
    try {
      const userId = msg.sender;
      
      // Cek apakah pemain memiliki karakter
      const characterData = await db.loadCharacter(userId);
      if (!characterData) {
        return msg.reply(langId.errors.rpg.noCharacter);
      }
      
      return msg.reply(langId.info.rpg.profile(characterData));
    } catch (error) {
      botLogger.error("Error in profile command:", error);
      return msg.reply(langId.errors.rpg.profileError);
    }
  }
});

// Command untuk memulai pertarungan
Oblixn.cmd({
  name: "battle",
  desc: "Memulai pertarungan",
  category: "games",
  async exec(msg) {
    try {
      const userId = msg.sender;
      
      // Cek apakah pemain memiliki karakter
      const characterData = await db.loadCharacter(userId);
      if (!characterData) {
        return msg.reply(langId.errors.rpg.noCharacter);
      }
      
      // Cek apakah pemain sedang dalam pertarungan
      const battleData = await db.loadBattle(userId);
      if (battleData) {
        return msg.reply(langId.errors.rpg.inBattle);
      }
      
      // Dapatkan lokasi saat ini
      const worldData = await db.loadWorld();
      if (!worldData || !worldData.currentLocation || worldData.currentLocation.type === 'safe') {
        return msg.reply(langId.errors.rpg.noEnemies);
      }
      
      // Buat pertarungan baru
      const character = new Character(characterData.name, characterData.className);
      Object.assign(character, characterData);
      
      const battle = new BattleSystem([character], worldData.currentLocation.enemies);
      await db.saveBattle(userId, battle);
      
      return msg.reply(langId.commands.rpg.battleStarted);
    } catch (error) {
      botLogger.error("Error in battle command:", error);
      return msg.reply(langId.errors.rpg.battleError);
    }
  }
});

// Command untuk menggunakan skill
Oblixn.cmd({
  name: "skill",
  desc: "Menggunakan skill",
  category: "games",
  async exec(msg, args) {
    try {
      const userId = msg.sender;
      
      // Cek apakah pemain memiliki karakter
      const characterData = await db.loadCharacter(userId);
      if (!characterData) {
        return msg.reply(langId.errors.rpg.noCharacter);
      }
      
      // Cek apakah pemain sedang dalam pertarungan
      const battleData = await db.loadBattle(userId);
      if (!battleData) {
        return msg.reply(langId.errors.rpg.notInBattle);
      }
      
      // Gunakan skill
      const character = new Character(characterData.name, characterData.className);
      Object.assign(character, characterData);
      
      const battle = new BattleSystem([character], battleData.enemies);
      Object.assign(battle, battleData);
      
      const result = battle.executeTurn({
        type: 'skill',
        skillName: args[0]
      });
      
      // Simpan perubahan battle
      await db.saveBattle(userId, battle);
      
      return msg.reply(result);
    } catch (error) {
      botLogger.error("Error in skill command:", error);
      return msg.reply(langId.errors.rpg.skillError);
    }
  }
});

// Command untuk melihat inventory
Oblixn.cmd({
  name: "inventory",
  desc: "Melihat inventory",
  category: "games",
  async exec(msg) {
    try {
      const userId = msg.sender;
      
      // Cek apakah pemain memiliki karakter
      const characterData = await db.loadCharacter(userId);
      if (!characterData) {
        return msg.reply(langId.errors.rpg.noCharacter);
      }
      
      return msg.reply(langId.info.rpg.inventory(characterData.inventory));
    } catch (error) {
      botLogger.error("Error in inventory command:", error);
      return msg.reply(langId.errors.rpg.inventoryError);
    }
  }
});

// Command untuk menghapus karakter
Oblixn.cmd({
  name: "delete_character",
  desc: "Menghapus karakter",
  category: "games",
  async exec(msg) {
    try {
      const userId = msg.sender;
      
      // Cek apakah pemain memiliki karakter
      const characterData = await db.loadCharacter(userId);
      if (!characterData) {
        return msg.reply(langId.errors.rpg.noCharacter);
      }
      
      // Hapus karakter dan battle data
      await db.deleteCharacter(userId);
      await db.deleteBattle(userId);
      
      return msg.reply(langId.commands.rpg.characterDeleted);
    } catch (error) {
      botLogger.error("Error in delete_character command:", error);
      return msg.reply(langId.errors.rpg.deletionError);
    }
  }
});

module.exports = {}; 