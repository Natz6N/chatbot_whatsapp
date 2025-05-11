    const axios = require("axios");
    const { config } = require("../../config/config");
    const { permissionHandler } = require("../../src/handler/permission");
    const { botLogger } = require("../utils/logger");

    global.Oblixn.cmd({
    name: "igstalk",
    alias: ["instastalk", "igprofile"],
    desc: "Cari profil Instagram",
    category: "stalk",
    usage: "<username>",
    async exec(msg, { args, text }) {
        try {
        // Cek banned user
        const { isBanned } = await Oblixn.db.checkUserStatus(msg.sender);
        if (isBanned) return;

        // Cek limit stalk
        const allowed = await permissionHandler.checkStalkUsage(msg.sender);
        if (!allowed) return msg.reply("❌ Limit stalk harian habis");

        const username = args[0] || text;
        if (!username) return msg.reply("❌ Masukkan username Instagram");

        const response = await axios.get(
            `${config.stalkApi.igUrl}?username=${username}`,
            {
            headers: { Authorization: config.stalkApi.key },
            }
        );

        const data = response.data;
        if (!data.success) return msg.reply("❌ Profil tidak ditemukan");

        const profile = data.data;
        const caption = `📷 *Profil Instagram*\n\n👤 Nama: ${
            profile.full_name || "-"
        }\n📌 Username: ${profile.username}\n✅ Verified: ${
            profile.is_verified ? "Ya" : "Tidak"
        }\n🔒 Private: ${profile.is_private ? "Ya" : "Tidak"}\n📊 Postingan: ${
            profile.media_count
        }\n👥 Pengikut: ${profile.follower_count}\n🫂 Mengikuti: ${
            profile.following_count
        }\n📝 Bio: ${profile.biography || "-"}\n${profile.external_url || ""}`;

        await Oblixn.sendFileFromUrl(
            msg.chat,
            profile.profile_pic_url,
            "profile.jpg",
            { caption }
        );
        } catch (error) {
        botLogger.error("IG Stalk Error:", error);
        msg.reply("❌ Gagal mengambil profil, coba username lain");
        }
    },
    });

    // Command stalk TikTok
    global.Oblixn.cmd({
    name: "tiktokstalk",
    alias: ["ttstalk", "ttprofile"],
    desc: "Cari profil TikTok",
    category: "stalk",
    usage: "<username>",
    async exec(msg, { args, text }) {
        try {
        // Cek banned user
        const { isBanned } = await Oblixn.db.checkUserStatus(msg.sender);
        if (isBanned) return;

        // Cek limit stalk
        const allowed = await permissionHandler.checkStalkUsage(msg.sender);
        if (!allowed) return msg.reply("❌ Limit stalk harian habis");

        const username = args[0] || text;
        if (!username) return msg.reply("❌ Masukkan username TikTok");

        const response = await axios.get(
            `${config.stalkApi.tiktokUrl}?username=${username}`,
            {
            headers: { Authorization: config.stalkApi.key },
            }
        );

        const data = response.data;
        if (!data.success) return msg.reply("❌ Profil tidak ditemukan");

        const profile = data.data;
        const caption = `🎵 *Profil TikTok*\n\n👤 Nama: ${
            profile.nickname
        }\n📌 Username: @${profile.unique_id}\n✅ Verified: ${
            profile.verified ? "Ya" : "Tidak"
        }\n🔒 Private: ${
            profile.private_account ? "Ya" : "Tidak"
        }\n❤️ Total Like: ${profile.heart_count}\n📈 Followers: ${
            profile.follower_count
        }\n🫂 Following: ${profile.following_count}\n🎥 Video: ${
            profile.video_count
        }\n📝 Bio: ${profile.signature || "-"}`;

        await Oblixn.sendFileFromUrl(
            msg.chat,
            profile.avatar_larger,
            "avatar.jpg",
            { caption }
        );
        } catch (error) {
        botLogger.error("TikTok Stalk Error:", error);
        msg.reply("❌ Gagal mengambil profil, username mungkin salah");
        }
    },
    });

    // Command stalk GitHub
    global.Oblixn.cmd({
    name: "ghstalk",
    alias: ["gitstalk", "githubprofile"],
    desc: "Cari profil GitHub",
    category: "stalk",
    usage: "<username>",
    async exec(msg, { args, text }) {
        try {
        // Cek banned user
        const { isBanned } = await Oblixn.db.checkUserStatus(msg.sender);
        if (isBanned) return;

        // Cek limit stalk
        const allowed = await permissionHandler.checkStalkUsage(msg.sender);
        if (!allowed) return msg.reply("❌ Limit stalk harian habis");

        const username = args[0] || text;
        if (!username) return msg.reply("❌ Masukkan username GitHub");

        const response = await axios.get(
            `${config.stalkApi.githubUrl}?username=${username}`,
            {
            headers: { Authorization: config.stalkApi.key },
            }
        );

        const data = response.data;
        if (!data.success) return msg.reply("❌ User GitHub tidak ditemukan");

        const profile = data.data;
        const caption = `🐱 *Profil GitHub*\n\n👤 Nama: ${
            profile.name || "-"
        }\n📌 Username: ${profile.login}\n📊 Repo Publik: ${
            profile.public_repos
        }\n📂 Gists: ${profile.public_gists}\n👥 Followers: ${
            profile.followers
        }\n🫂 Following: ${profile.following}\n🏢 Perusahaan: ${
            profile.company || "-"
        }\n🌐 Website: ${profile.blog || "-"}\n📍 Lokasi: ${
            profile.location || "-"
        }\n📝 Bio: ${profile.bio || "-"}`;

        await Oblixn.sendFileFromUrl(msg.chat, profile.avatar_url, "avatar.jpg", {
            caption,
        });
        } catch (error) {
        botLogger.error("GitHub Stalk Error:", error);
        msg.reply("❌ Gagal mengambil profil GitHub");
        }
    },
    });
