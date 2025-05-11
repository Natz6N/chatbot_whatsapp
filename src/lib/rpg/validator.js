const { z } = require('zod');

// Schema untuk data karakter
const characterSchema = z.object({
  name: z.string(),
  className: z.string(),
  level: z.number(),
  exp: z.number(),
  gold: z.number(),
  attributes: z.object({
    strength: z.number(),
    agility: z.number(),
    intelligence: z.number(),
    luck: z.number()
  }),
  inventory: z.array(z.any()),
  equipment: z.object({
    weapon: z.any().nullable(),
    armor: z.any().nullable(),
    accessory: z.any().nullable()
  }),
  skills: z.array(z.string()),
  quests: z.object({
    active: z.array(z.any()),
    completed: z.array(z.any()),
    eventFlags: z.record(z.boolean())
  })
});

// Schema untuk data pertarungan
const battleSchema = z.object({
  party: z.array(z.object({
    name: z.string(),
    hp: z.number(),
    mp: z.number(),
    stamina: z.number()
  })),
  enemies: z.array(z.object({
    name: z.string(),
    hp: z.number(),
    mp: z.number(),
    stamina: z.number()
  })),
  turnOrder: z.array(z.string()),
  currentTurn: z.number()
});

// Schema untuk data dunia
const worldSchema = z.object({
  currentRegion: z.string(),
  currentLocation: z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
    connections: z.array(z.string()),
    enemies: z.array(z.any()),
    lootTable: z.array(z.any())
  }).nullable(),
  weather: z.string(),
  timeOfDay: z.string()
});

// Fungsi untuk memvalidasi data karakter
function validateCharacter(data) {
  try {
    return characterSchema.parse(data);
  } catch (error) {
    console.error('Error validating character data:', error);
    return null;
  }
}

// Fungsi untuk memvalidasi data pertarungan
function validateBattle(data) {
  try {
    return battleSchema.parse(data);
  } catch (error) {
    console.error('Error validating battle data:', error);
    return null;
  }
}

// Fungsi untuk memvalidasi data dunia
function validateWorld(data) {
  try {
    return worldSchema.parse(data);
  } catch (error) {
    console.error('Error validating world data:', error);
    return null;
  }
}

// Fungsi untuk membersihkan data grup WhatsApp
function cleanGroupData(data) {
  if (!data) return null;
  
  // Hapus properti yang tidak diperlukan
  const cleanData = {
    id: data.id,
    name: data.name,
    memberCount: data.memberCount
  };
  
  return cleanData;
}

module.exports = {
  validateCharacter,
  validateBattle,
  validateWorld,
  cleanGroupData
}; 