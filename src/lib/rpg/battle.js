class BattleSystem {
  constructor(party, enemies) {
    this.party = party;
    this.enemies = enemies;
    this.turnOrder = [];
    this.currentTurn = 0;
    this.battleLog = [];
    this.isActive = true;
    this.elementalMatrix = {
      fire: { strongAgainst: 'ice', weakAgainst: 'water' },
      water: { strongAgainst: 'fire', weakAgainst: 'earth' },
      earth: { strongAgainst: 'water', weakAgainst: 'wind' },
      wind: { strongAgainst: 'earth', weakAgainst: 'fire' }
    };
    
    this.initBattle();
  }

  initBattle() {
    // Generate turn order berdasarkan agility
    const allCombatants = [...this.party, ...this.enemies];
    this.turnOrder = allCombatants.sort((a,b) => 
      b.attributes.agility - a.attributes.agility
    );
  }

  executeTurn(action) {
    if (!this.isActive) return 'Battle sudah selesai!';
    
    const currentCombatant = this.turnOrder[this.currentTurn];
    let result = '';
    
    if (currentCombatant.hp <= 0) {
      this.nextTurn();
      return `${currentCombatant.name} tidak bisa bertindak!`;
    }

    if (this.party.includes(currentCombatant)) {
      result = this.handlePlayerAction(currentCombatant, action);
    } else {
      result = this.handleEnemyAI(currentCombatant);
    }
    
    const battleEnd = this.checkBattleEnd();
    if (battleEnd) {
      this.isActive = false;
      return result + '\n' + (battleEnd === 'victory' ? 'Kamu menang!' : 'Kamu kalah!');
    }
    
    this.nextTurn();
    return result;
  }

  handlePlayerAction(combatant, action) {
    if (action.type === 'attack') {
      const target = this.enemies[0];
      const { damage, isCrit } = this.calculateDamage(combatant, target);
      target.hp -= damage;
      return `${combatant.name} menyerang ${target.name} dan memberikan ${damage} damage${isCrit ? ' (CRITICAL!)' : ''}!`;
    }
    
    if (action.type === 'skill') {
      const skill = combatant.skillTree.getSkill(action.skillName);
      if (!skill) return 'Skill tidak ditemukan!';
      
      if (combatant.mp < skill.mpCost) return 'MP tidak cukup!';
      
      combatant.mp -= skill.mpCost;
      const target = this.enemies[0];
      const { damage, isCrit } = this.calculateDamage(combatant, target, skill);
      target.hp -= damage;
      
      return `${combatant.name} menggunakan ${skill.name} dan memberikan ${damage} damage${isCrit ? ' (CRITICAL!)' : ''}!`;
    }
    
    return 'Aksi tidak valid!';
  }

  handleEnemyAI(enemy) {
    const skills = enemy.skillTree.getUnlockedSkills().filter(s => 
      enemy.mp >= s.mpCost && 
      enemy.stamina >= s.staminaCost
    );
    
    const action = skills.length > 0 && Math.random() > 0.5
      ? { type: 'skill', skillName: skills[Math.floor(Math.random() * skills.length)].name }
      : { type: 'attack' };

    const target = this.party[0];
    return enemy.useSkill(action.skillName, target);
  }

  calculateDamage(attacker, defender, skill) {
    let baseDamage = attacker.attack;
    if (skill?.element) {
      const elementRelation = this.elementalMatrix[skill.element];
      if (elementRelation.strongAgainst === defender.element) {
        baseDamage *= 1.5;
      } else if (elementRelation.weakAgainst === defender.element) {
        baseDamage *= 0.5;
      }
    }
    
    const critChance = attacker.attributes.luck / 100;
    const isCrit = Math.random() < critChance;
    if (isCrit) baseDamage *= 2;
    
    const finalDamage = Math.max(baseDamage - defender.defense, 1);
    return { damage: finalDamage, isCrit };
  }

  checkBattleEnd() {
    const partyAlive = this.party.some(p => p.hp > 0);
    const enemiesAlive = this.enemies.some(e => e.hp > 0);
    
    if (!partyAlive) return 'defeat';
    if (!enemiesAlive) {
      this.distributeRewards();
      return 'victory';
    }
    return null;
  }

  distributeRewards() {
    const totalExp = this.enemies.reduce((sum, e) => sum + e.exp, 0);
    const totalGold = this.enemies.reduce((sum, e) => sum + e.gold, 0);
    const loot = this.enemies.flatMap(e => e.loot);
    
    this.party.forEach(member => {
      member.exp += totalExp;
      if (member.exp >= member.level * 150) member.levelUp();
    });
    
    this.party[0].gold += totalGold;
    loot.forEach(item => this.party[0].inventory.addItem(item));
  }

  nextTurn() {
    this.currentTurn = (this.currentTurn + 1) % this.turnOrder.length;
  }
}

module.exports = BattleSystem; 