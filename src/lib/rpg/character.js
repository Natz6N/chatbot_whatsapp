const Inventory = require('./inventory');
const QuestJournal = require('./quest');
const SkillTree = require('./skill');

class Character {
  constructor(name, className) {
    this.name = name;
    this.className = className;
    this.level = 1;
    this.exp = 0;
    this.gold = 500;
    this.attributes = {
      strength: 10,
      agility: 10,
      intelligence: 10,
      luck: 5
    };
    this.inventory = new Inventory(50); // Kapasitas berat
    this.quests = new QuestJournal();
    this.equipment = {
      weapon: null,
      armor: null,
      accessory: null
    };
    this.statusEffects = [];
    this.skillTree = new SkillTree();
    this.party = []; // Untuk sistem party
    
    // Inisialisasi kelas
    this.initClass(className);
    this.calculateStats();
  }

  initClass(className) {
    const classConfigs = {
      Warrior: { 
        hp: 200, mp: 50, stamina: 100,
        primaryAttr: 'strength',
        skills: ['Power Strike', 'Shield Bash', 'War Cry'],
        growth: { hp: 20, mp: 5, stamina: 15 }
      },
      Mage: {
        hp: 120, mp: 200, stamina: 60,
        primaryAttr: 'intelligence',
        skills: ['Fireball', 'Ice Shield', 'Chain Lightning'],
        growth: { hp: 10, mp: 25, stamina: 5 }
      },
      Assassin: {
        hp: 150, mp: 80, stamina: 120,
        primaryAttr: 'agility',
        skills: ['Backstab', 'Poison Blade', 'Shadow Step'],
        growth: { hp: 15, mp: 10, stamina: 20 }
      },
      Archer: {
        hp: 130, mp: 100, stamina: 100,
        primaryAttr: 'agility',
        skills: ['Precise Shot', 'Rain of Arrows', 'Eagle Eye'],
        growth: { hp: 12, mp: 15, stamina: 18 }
      }
    };

    const config = classConfigs[className];
    Object.assign(this, {
      maxHp: config.hp,
      hp: config.hp,
      maxMp: config.mp,
      mp: config.mp,
      maxStamina: config.stamina,
      stamina: config.stamina,
      skills: config.skills,
      classGrowth: config.growth
    });
    
    this.attributes[config.primaryAttr] += 5;
    
    // Unlock skills awal
    config.skills.forEach(skill => {
      this.skillTree.unlockSkill(skill);
    });
  }

  calculateStats() {
    // Update stats berdasarkan equipment dan attributes
    this.attack = Math.floor(
      this.attributes.strength * 2 +
      (this.equipment.weapon ? this.equipment.weapon.attack : 0)
    );
    
    this.defense = Math.floor(
      this.attributes.agility +
      (this.equipment.armor ? this.equipment.armor.defense : 0)
    );
    
    this.magicAttack = Math.floor(
      this.attributes.intelligence * 2 +
      (this.equipment.weapon ? this.equipment.weapon.magicAttack : 0)
    );
  }

  levelUp() {
    this.level++;
    this.maxHp += this.classGrowth.hp;
    this.maxMp += this.classGrowth.mp;
    this.maxStamina += this.classGrowth.stamina;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.stamina = this.maxStamina;
    
    // Naikkan atribut utama
    const primaryAttr = classConfigs[this.className].primaryAttr;
    this.attributes[primaryAttr] += 3;
    this.attributes.luck += 1;
    
    this.calculateStats();
    return `Level up! Now level ${this.level}`;
  }

  useSkill(skillName, target) {
    const skill = this.skillTree.getSkill(skillName);
    if (!skill || !this.skillTree.isSkillUnlocked(skillName)) return "Skill tidak tersedia!";
    
    if (this.mp < skill.mpCost || this.stamina < skill.staminaCost) 
      return "Resource tidak cukup!";
    
    this.mp -= skill.mpCost;
    this.stamina -= skill.staminaCost;
    
    // Implementasi efek skill
    let result = skill.execute(this, target);
    return result;
  }
}

module.exports = Character; 