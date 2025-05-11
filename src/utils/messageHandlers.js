const { botLogger } = require('./logger');
const { PREFIX } = require('../../config/config');
const { handleGroupMessage } = require('../handler/groupHandler');

/**
 * Handler untuk pesan dalam antrian
 */
class MessageHandlers {
  constructor() {
    this.commandHandler = null;
    this.executeCommand = null;
  }
  
  /**
   * Mengatur handler untuk memproses command
   * @param {Function} commandHandler - Fungsi untuk mengurai command
   * @param {Function} executeCommand - Fungsi untuk menjalankan command
   */
  setupCommandHandlers(commandHandler, executeCommand) {
    this.commandHandler = commandHandler;
    this.executeCommand = executeCommand;
    botLogger.info('Command handlers have been set up');
  }
  
  /**
   * Handler utama untuk pesan teks
   * @param {Object} msg - Pesan yang telah diproses
   * @param {Object} metadata - Metadata tambahan
   */
  async handleTextMessage(msg, metadata) {
    try {
      if (!this.commandHandler || !this.executeCommand) {
        botLogger.error('Command handlers not set up');
        return;
      }
      
      const { messageText, isGroup, sender } = msg;
      const effectiveSock = msg.sock;
      
      // Proses pesan berdasarkan apakah ini pesan grup atau pribadi
      if (isGroup) {
        if (messageText.startsWith(PREFIX)) {
          const parsedCommand = this.commandHandler(messageText);
          if (parsedCommand) {
            const { command, args } = parsedCommand;
            botLogger.info(`Memproses command di grup: ${command}`);
            try {
              await this.executeCommand(
                effectiveSock,
                msg,
                sender,
                command,
                args
              );
            } catch (error) {
              botLogger.error(
                `Error executing command ${command}: ${error.message}`
              );
              await msg.reply(
                "Terjadi kesalahan saat memproses perintah."
              );
            }
          }
        } else if (msg.key.participant && msg.messageStubType) {
          botLogger.info(
            `Memproses event grup: ${messageText || "event"}`
          );
          await handleGroupMessage(effectiveSock, msg);
        } else {
          botLogger.info(`Pesan grup biasa: ${messageText.substring(0, 30)}${messageText.length > 30 ? '...' : ''}`);
        }
      } else {
        // Pesan pribadi
        if (messageText.startsWith(PREFIX)) {
          const parsedCommand = this.commandHandler(messageText);
          if (parsedCommand) {
            const { command, args } = parsedCommand;
            botLogger.info(`Memproses command di chat pribadi: ${command}`);
            await this.executeCommand(
              effectiveSock,
              msg,
              sender,
              command,
              args
            );
          } else {
            botLogger.info(`Pesan pribadi bukan command valid: ${messageText}`);
          }
        } else {
          botLogger.info(
            `Pesan pribadi tanpa PREFIX: ${messageText.substring(0, 30)}${messageText.length > 30 ? '...' : ''}`
          );
        }
      }
    } catch (error) {
      botLogger.error(`Error in handleTextMessage: ${error.message}`, error);
      throw error; // Re-throw untuk penanganan retry
    }
  }
  
  /**
   * Handler untuk pesan gambar
   * @param {Object} msg - Pesan yang telah diproses
   * @param {Object} metadata - Metadata tambahan
   */
  async handleImageMessage(msg, metadata) {
    try {
      const { messageText, isGroup, sender } = msg;
      
      // Gambar dengan caption yang berisi command
      if (messageText && messageText.startsWith(PREFIX)) {
        await this.handleTextMessage(msg, metadata);
        return;
      }
      
      // Proses gambar tanpa command
      botLogger.info(`Menerima pesan gambar dari ${sender} ${isGroup ? 'di grup' : ''}`);
      
      // Tambahkan logika pemrosesan gambar di sini jika diperlukan
      
    } catch (error) {
      botLogger.error(`Error in handleImageMessage: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handler untuk pesan stiker
   * @param {Object} msg - Pesan yang telah diproses
   * @param {Object} metadata - Metadata tambahan
   */
  async handleStickerMessage(msg, metadata) {
    try {
      const { sender, isGroup } = msg;
      botLogger.info(`Menerima stiker dari ${sender} ${isGroup ? 'di grup' : ''}`);
      
      // Tambahkan logika pemrosesan stiker di sini jika diperlukan
      
    } catch (error) {
      botLogger.error(`Error in handleStickerMessage: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handler default untuk tipe pesan yang belum memiliki handler khusus
   * @param {Object} msg - Pesan yang telah diproses
   * @param {Object} metadata - Metadata tambahan
   */
  async handleDefaultMessage(msg, metadata) {
    try {
      const { messageType } = metadata;
      const { sender, isGroup } = msg;
      
      botLogger.info(`Menerima pesan tipe ${messageType} dari ${sender} ${isGroup ? 'di grup' : ''}`);
      
      // Jika pesan memiliki teks/caption dengan command, alihkan ke handler teks
      if (msg.messageText && msg.messageText.startsWith(PREFIX)) {
        await this.handleTextMessage(msg, metadata);
      }
      
    } catch (error) {
      botLogger.error(`Error in handleDefaultMessage: ${error.message}`, error);
      throw error;
    }
  }
}

const messageHandlers = new MessageHandlers();

module.exports = messageHandlers; 