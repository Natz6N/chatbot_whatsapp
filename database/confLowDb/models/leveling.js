// Model data untuk sistem leveling
const LevelingModel = {
  // Struktur database untuk menyimpan data level pengguna
  createUserLevel: (userId, groupId) => {
    return {
      userId,
      groupId,
      xp: 0,
      level: 1,
      messages: 0,
      lastMessageTime: null,
      achievements: [],
      activeDays: {},
      streak: 0,
      lastUpdated: new Date().toISOString()
    };
  },

  // Fungsi untuk menghitung XP yang dibutuhkan untuk mencapai level berikutnya
  xpNeededForLevel: (level) => {
    // Rumus: 100 + (level * 50)
    return 100 + (level * 50);
  },
  
  // Fungsi untuk menghitung total XP pada level tertentu
  totalXpForLevel: (level) => {
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += LevelingModel.xpNeededForLevel(i);
    }
    return total;
  },
  
  // Struktur data untuk reward berdasarkan level
  levelRewards: {
    5: {
      title: "Chat Enthusiast",
      description: "Aktif berpartisipasi dalam percakapan grup",
      bonusXp: 100
    },
    10: {
      title: "Komunikator Handal",
      description: "Konsisten dalam berkomunikasi dengan grup",
      bonusXp: 250
    },
    15: {
      title: "Social Star", 
      description: "Menjadi bintang sosial di grup",
      bonusXp: 500
    },
    20: {
      title: "Grup Veteran",
      description: "Anggota setia grup ini",
      bonusXp: 1000
    },
    30: {
      title: "Legenda Grup",
      description: "Mencapai status legendaris dalam grup",
      bonusXp: 2000
    },
    50: {
      title: "Ultimate Chatter",
      description: "Mencapai tingkat tertinggi dalam grup",
      bonusXp: 5000
    }
  },
  
  // Mendapatkan reward untuk level tertentu
  getRewardForLevel: (level) => {
    return LevelingModel.levelRewards[level] || null;
  }
};

module.exports = LevelingModel; 