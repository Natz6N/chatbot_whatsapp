class SkillTree {
  constructor() {
    this.skills = new Map();
    this.unlockedSkills = new Set();
    this.setupSkillTree();
  }

  setupSkillTree() {
    // Warrior Skills
    this.skills.set('Power Strike', {
      name: 'Power Strike',
      level: 1,
      mpCost: 20,
      damage: 50,
      description: 'Serangan kuat yang memberikan damage tinggi'
    });

    this.skills.set('Shield Bash', {
      name: 'Shield Bash',
      level: 5,
      mpCost: 30,
      damage: 40,
      stun: 1,
      description: 'Serangan dengan perisai yang dapat membuat musuh pingsan'
    });

    this.skills.set('War Cry', {
      name: 'War Cry',
      level: 10,
      mpCost: 40,
      damage: 30,
      aoe: true,
      description: 'Teriakan perang yang memberikan damage area'
    });

    // Mage Skills
    this.skills.set('Fireball', {
      name: 'Fireball',
      level: 1,
      mpCost: 25,
      damage: 45,
      element: 'fire',
      description: 'Bola api yang memberikan damage api'
    });

    this.skills.set('Ice Shield', {
      name: 'Ice Shield',
      level: 5,
      mpCost: 35,
      defense: 20,
      duration: 3,
      description: 'Perisai es yang memberikan pertahanan tambahan'
    });

    this.skills.set('Chain Lightning', {
      name: 'Chain Lightning',
      level: 10,
      mpCost: 45,
      damage: 35,
      chain: 3,
      element: 'lightning',
      description: 'Petir yang dapat melompat ke beberapa musuh'
    });

    // Assassin Skills
    this.skills.set('Backstab', {
      name: 'Backstab',
      level: 1,
      mpCost: 20,
      damage: 60,
      critChance: 0.3,
      description: 'Serangan dari belakang dengan chance critical tinggi'
    });

    this.skills.set('Poison Blade', {
      name: 'Poison Blade',
      level: 5,
      mpCost: 30,
      damage: 30,
      poison: 3,
      description: 'Serangan beracun yang memberikan damage over time'
    });

    this.skills.set('Shadow Step', {
      name: 'Shadow Step',
      level: 10,
      mpCost: 40,
      damage: 40,
      teleport: true,
      description: 'Teleportasi ke belakang musuh dan memberikan serangan'
    });

    // Archer Skills
    this.skills.set('Precise Shot', {
      name: 'Precise Shot',
      level: 1,
      mpCost: 20,
      damage: 55,
      accuracy: 1.2,
      description: 'Tembakan tepat yang memberikan damage tinggi'
    });

    this.skills.set('Rain of Arrows', {
      name: 'Rain of Arrows',
      level: 5,
      mpCost: 35,
      damage: 30,
      aoe: true,
      description: 'Hujan panah yang memberikan damage area'
    });

    this.skills.set('Eagle Eye', {
      name: 'Eagle Eye',
      level: 10,
      mpCost: 40,
      damage: 45,
      critChance: 0.5,
      description: 'Tembakan dengan chance critical sangat tinggi'
    });
  }

  unlockSkill(skillName) {
    if (this.skills.has(skillName)) {
      this.unlockedSkills.add(skillName);
      return true;
    }
    return false;
  }

  getSkill(skillName) {
    return this.skills.get(skillName);
  }

  isSkillUnlocked(skillName) {
    return this.unlockedSkills.has(skillName);
  }

  getUnlockedSkills() {
    return Array.from(this.unlockedSkills).map(name => this.skills.get(name));
  }
}

module.exports = SkillTree; 