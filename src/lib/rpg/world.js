const { LocationDB, MonsterDB } = require('./gameData');

// Fungsi bantuan untuk weighted random
function weightedRandom(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  
  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return key;
  }
  
  return Object.keys(weights)[0];
}

class World {
  constructor() {
    this.regions = {
      ashenvale: {
        name: 'Hutan Ashenvale',
        type: 'forest',
        levels: [1, 15],
        dungeons: ['Darkroot Cavern'],
        towns: ['Elven Village'],
        factions: ['Elven Alliance']
      },
      stormlands: {
        name: 'Dataran Badai',
        type: 'mountain',
        levels: [15, 30],
        dungeons: ['Thunder Peak'],
        towns: ['Dwarven Fortress'],
        factions: ['Dwarven Clan']
      }
    };
    
    this.currentRegion = 'ashenvale';
    this.currentWeather = 'clear';
    this.timeOfDay = 'day';
    this.currentLocation = null;
    this.visitedLocations = new Set();
  }

  generateLocation(regionId, locationType) {
    const region = this.regions[regionId];
    if (!region) return null;

    const location = LocationDB[locationType];
    if (!location) return null;
    
    return {
      ...location,
      enemies: location.enemies.map(enemyId => {
        const enemy = MonsterDB[enemyId];
        if (!enemy) return null;
        return {
          ...enemy,
          level: Math.floor(Math.random() * (region.levels[1] - region.levels[0] + 1)) + region.levels[0]
        };
      }).filter(Boolean),
      lootTable: location.lootTable
    };
  }

  travel(locationId) {
    if (!LocationDB[locationId]) {
      return 'Lokasi tidak ditemukan!';
    }

    if (this.currentLocation && 
        !this.currentLocation.connections.includes(locationId)) {
      return 'Tidak bisa pergi ke lokasi tersebut!';
    }

    const newLocation = this.generateLocation(this.currentRegion, locationId);
    if (!newLocation) {
      return 'Gagal membuat lokasi baru!';
    }

    this.currentLocation = newLocation;
    this.visitedLocations.add(locationId);
    
    return `Kamu telah tiba di ${this.currentLocation.name}!\n${this.currentLocation.description}`;
  }

  getCurrentLocation() {
    return this.currentLocation;
  }

  getAvailableLocations() {
    if (!this.currentLocation) return Object.keys(LocationDB);
    return this.currentLocation.connections;
  }

  changeTime() {
    const hours = new Date().getHours();
    this.timeOfDay = hours > 18 || hours < 6 ? 'night' : 'day';
    this.currentWeather = this.#calculateWeather();
  }

  #calculateWeather() {
    const weatherChances = {
      clear: 60,
      rain: 25,
      storm: 10,
      fog: 5
    };
    return weightedRandom(weatherChances);
  }

  getWeatherEffects() {
    const effects = {
      clear: { attack: 1.0, defense: 1.0 },
      rain: { attack: 0.9, defense: 1.1 },
      storm: { attack: 0.8, defense: 0.9 },
      fog: { attack: 0.9, defense: 0.9 }
    };
    return effects[this.currentWeather];
  }

  getTimeEffects() {
    const effects = {
      day: { attack: 1.0, defense: 1.0 },
      night: { attack: 1.1, defense: 0.9 }
    };
    return effects[this.timeOfDay];
  }
}

module.exports = World; 