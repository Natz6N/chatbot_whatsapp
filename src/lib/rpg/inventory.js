class Inventory {
  constructor(maxWeight) {
    this.items = [];
    this.maxWeight = maxWeight;
    this.equipped = {
      weapon: null,
      armor: null,
      accessory: null
    };
  }

  get currentWeight() {
    return this.items.reduce((sum, item) => sum + item.weight, 0);
  }

  addItem(item) {
    if (this.currentWeight + item.weight > this.maxWeight) return false;
    this.items.push(item);
    return true;
  }

  removeItem(itemName) {
    const index = this.items.findIndex(item => item.name === itemName);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }

  equipItem(itemName) {
    const item = this.items.find(item => item.name === itemName);
    if (!item) return 'Item tidak ditemukan!';
    
    if (!['weapon', 'armor', 'accessory'].includes(item.type)) {
      return 'Item tidak bisa di-equip!';
    }
    
    // Unequip item lama jika ada
    if (this.equipped[item.type]) {
      this.items.push(this.equipped[item.type]);
    }
    
    // Equip item baru
    this.equipped[item.type] = item;
    this.removeItem(itemName);
    
    return `Berhasil equip ${item.name}!`;
  }

  unequipItem(slot) {
    if (!this.equipped[slot]) return 'Tidak ada item yang di-equip!';
    
    const item = this.equipped[slot];
    if (this.currentWeight + item.weight > this.maxWeight) {
      return 'Inventory penuh!';
    }
    
    this.equipped[slot] = null;
    this.items.push(item);
    
    return `Berhasil unequip ${item.name}!`;
  }

  useItem(itemName) {
    const item = this.items.find(item => item.name === itemName);
    if (!item) return 'Item tidak ditemukan!';
    
    if (item.type !== 'consumable') {
      return 'Item tidak bisa digunakan!';
    }
    
    this.removeItem(itemName);
    return item.effect;
  }

  craftItem(recipe) {
    if (!recipe.materials.every(m => 
      this.items.filter(i => i.name === m.name).length >= m.quantity
    )) return "Material tidak cukup";
    
    recipe.materials.forEach(m => {
      for (let i = 0; i < m.quantity; i++) {
        this.removeItem(m.name);
      }
    });
    
    const newItem = ItemDB[recipe.result];
    this.addItem(newItem);
    return `Berhasil membuat ${newItem.name}!`;
  }
}

module.exports = Inventory; 