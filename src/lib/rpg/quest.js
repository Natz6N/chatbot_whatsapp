class QuestJournal {
  constructor() {
    this.activeQuests = [];
    this.completedQuests = [];
    this.eventFlags = {};
  }
  
  addQuest(quest) {
    if (this.activeQuests.some(q => q.id === quest.id)) {
      return 'Quest sudah aktif!';
    }
    
    this.activeQuests.push({
      ...quest,
      progress: quest.objectives.map(obj => ({ ...obj, current: 0 }))
    });
    
    return `Quest "${quest.title}" diterima!`;
  }
  
  updateQuestProgress(condition, amount = 1) {
    this.activeQuests.forEach(quest => {
      quest.progress.forEach(obj => {
        if (obj.condition === condition) {
          obj.current = Math.min(obj.current + amount, obj.required);
          if (obj.current >= obj.required) {
            this.completeQuest(quest);
          }
        }
      });
    });
  }
  
  completeQuest(quest) {
    const index = this.activeQuests.findIndex(q => q.id === quest.id);
    if (index === -1) return;
    
    this.activeQuests.splice(index, 1);
    this.completedQuests.push(quest);
    
    return `Quest "${quest.title}" selesai!\nReward: ${quest.reward.gold} gold, ${quest.reward.exp} exp`;
  }
  
  getActiveQuests() {
    return this.activeQuests.map(quest => ({
      ...quest,
      progress: quest.progress.map(obj => ({
        ...obj,
        completed: obj.current >= obj.required
      }))
    }));
  }
  
  getCompletedQuests() {
    return this.completedQuests;
  }
  
  triggerEvent(eventId) {
    const event = EventDB[eventId];
    if (!event || this.eventFlags[eventId]) return null;
    
    // Cek prerequisit
    if (event.requiredFlags?.some(f => !this.eventFlags[f])) return null;
    
    this.eventFlags[eventId] = true;
    return event;
  }
  
  hasFlag(flagId) {
    return this.eventFlags[flagId] || false;
  }
  
  setFlag(flagId) {
    this.eventFlags[flagId] = true;
  }
}

module.exports = QuestJournal; 