const fs = require('fs');
const path = require('path');

class RPGDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/rpg');
    this.ensureDatabaseExists();
  }

  ensureDatabaseExists() {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  // Menyimpan data karakter
  async saveCharacter(userId, character) {
    try {
      const characterData = {
        name: character.name,
        className: character.className,
        level: character.level,
        exp: character.exp,
        gold: character.gold,
        attributes: character.attributes,
        inventory: character.inventory.items,
        equipment: character.equipment,
        skills: Array.from(character.skillTree.unlockedSkills),
        quests: {
          active: character.quests.activeQuests,
          completed: character.quests.completedQuests,
          eventFlags: character.quests.eventFlags
        }
      };

      const filePath = path.join(this.dbPath, `character_${userId}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(characterData, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving character:', error);
      return false;
    }
  }

  // Memuat data karakter
  async loadCharacter(userId) {
    try {
      const filePath = path.join(this.dbPath, `character_${userId}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = JSON.parse(await fs.promises.readFile(filePath));
      return data;
    } catch (error) {
      console.error('Error loading character:', error);
      return null;
    }
  }

  // Menyimpan data pertarungan aktif
  async saveBattle(userId, battle) {
    try {
      const battleData = {
        party: battle.party.map(char => ({
          name: char.name,
          hp: char.hp,
          mp: char.mp,
          stamina: char.stamina
        })),
        enemies: battle.enemies.map(enemy => ({
          name: enemy.name,
          hp: enemy.hp,
          mp: enemy.mp,
          stamina: enemy.stamina
        })),
        turnOrder: battle.turnOrder.map(char => char.name),
        currentTurn: battle.currentTurn
      };

      const filePath = path.join(this.dbPath, `battle_${userId}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(battleData, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving battle:', error);
      return false;
    }
  }

  // Memuat data pertarungan aktif
  async loadBattle(userId) {
    try {
      const filePath = path.join(this.dbPath, `battle_${userId}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = JSON.parse(await fs.promises.readFile(filePath));
      return data;
    } catch (error) {
      console.error('Error loading battle:', error);
      return null;
    }
  }

  // Menyimpan data dunia
  async saveWorld(world) {
    try {
      const worldData = {
        currentRegion: world.currentRegion,
        currentLocation: world.currentLocation,
        weather: world.currentWeather,
        timeOfDay: world.timeOfDay
      };

      const filePath = path.join(this.dbPath, 'world.json');
      await fs.promises.writeFile(filePath, JSON.stringify(worldData, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving world:', error);
      return false;
    }
  }

  // Memuat data dunia
  async loadWorld() {
    try {
      const filePath = path.join(this.dbPath, 'world.json');
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = JSON.parse(await fs.promises.readFile(filePath));
      return data;
    } catch (error) {
      console.error('Error loading world:', error);
      return null;
    }
  }

  // Menghapus data karakter
  async deleteCharacter(userId) {
    try {
      const filePath = path.join(this.dbPath, `character_${userId}.json`);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting character:', error);
      return false;
    }
  }

  // Menghapus data pertarungan
  async deleteBattle(userId) {
    try {
      const filePath = path.join(this.dbPath, `battle_${userId}.json`);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting battle:', error);
      return false;
    }
  }
}

module.exports = new RPGDatabase(); 