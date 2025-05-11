const axios = require("axios");

global.Oblixn.cmd({
  name: "gpt3",
  alias: ["gpt3.5", "openai", "chatgpt"],
  desc: "Tanya AI gpt3.5",
  category: "ai",
  async exec(msg, { args, text, command }) {
    try {
      const question = text || args.join(" ");
      if (!question) {
        return msg.reply("Masukkan pertanyaan setelah perintah /ai");
      }
      const apiUrl = `https://vapis.my.id/api/openai?q=${encodeURIComponent(
        text
        
      )}`;
      const response = await axios.get(apiUrl);
      const result = response.data.result;
      return msg.reply(result);
    } catch (error) {
      return msg.reply("Terjadi kesalahan: " + error.message);
    }
  },
});
