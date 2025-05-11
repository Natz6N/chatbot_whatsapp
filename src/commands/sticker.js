const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { botLogger } = require('../utils/logger');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExifWebp } = require('../lib/exec');
const fileManager = require('../../config/memoryAsync/readfile');

// Export command menggunakan format Oblixn.cmd
global.Oblixn.cmd({
    name: "sticker",
    alias: ["s", "stiker"],
    desc: "Membuat sticker dari gambar/video/GIF/WebP. Gunakan !sticker <packname> untuk custom packname.",
    category: "tools",
    async exec(msg, { args }) {
        try {
            // Debug log untuk tipe dan konten pesan
            console.log('Message type (mtype):', msg.mtype);
            console.log('Message content:', JSON.stringify(msg.message || {}, null, 2));

            // Cek direct media dari msg.message
            const msgContent = msg.message || {};
            const isDirectImage = msgContent.imageMessage;
            const isDirectVideo = msgContent.videoMessage;
            const isDirectGif = msgContent.videoMessage?.gifPlayback === true;
            const isDirectWebP = msgContent.documentMessage?.mimetype === 'image/webp';

            // Jika ada caption (extendedTextMessage), cek media di dalamnya
            const extendedMsg = msgContent.extendedTextMessage;
            const extendedMedia = extendedMsg?.contextInfo?.quotedMessage || msgContent;
            const isExtendedImage = extendedMsg && extendedMedia.imageMessage;
            const isExtendedVideo = extendedMsg && extendedMedia.videoMessage;
            const isExtendedGif = extendedMsg && extendedMedia.videoMessage?.gifPlayback === true;
            const isExtendedWebP = extendedMsg && extendedMedia.documentMessage?.mimetype === 'image/webp';

            // Cek quoted media
            const quotedMsg = extendedMsg?.contextInfo?.quotedMessage;
            const isQuotedImage = quotedMsg?.imageMessage;
            const isQuotedVideo = quotedMsg?.videoMessage;
            const isQuotedGif = quotedMsg?.videoMessage?.gifPlayback === true;
            const isQuotedWebP = quotedMsg?.documentMessage?.mimetype === 'image/webp';
            const isQuotedSticker = quotedMsg?.stickerMessage;

            // Gabungkan semua pengecekan media
            const hasValidMedia = isDirectImage || isDirectVideo || isDirectGif || isDirectWebP ||
                                 isExtendedImage || isExtendedVideo || isExtendedGif || isExtendedWebP ||
                                 isQuotedImage || isQuotedVideo || isQuotedGif || isQuotedWebP || isQuotedSticker;

            if (!hasValidMedia) {
                console.log('No valid media found:', JSON.stringify(msgContent, null, 2));
                return msg.reply('❌ Kirim/reply gambar/video/GIF/WebP dengan caption !sticker [packname]');
            }

            await msg.reply('⏳ Sedang membuat sticker...');

            // Tentukan pesan yang berisi media
            let mediaMsg = msg;
            if (isQuotedImage || isQuotedVideo || isQuotedGif || isQuotedWebP || isQuotedSticker) {
                mediaMsg = { message: quotedMsg };
            } else if (isExtendedImage || isExtendedVideo || isExtendedGif || isExtendedWebP) {
                mediaMsg = { message: extendedMedia };
            }

            // Tentukan tipe media
            const isImage = isDirectImage || isExtendedImage || isQuotedImage;
            const isVideo = isDirectVideo || isExtendedVideo || isQuotedVideo;
            const isGif = isDirectGif || isExtendedGif || isQuotedGif;
            const isWebP = isDirectWebP || isExtendedWebP || isQuotedWebP;

            // Ambil packname custom dari args, fallback ke default
            const packname = args.length > 0 ? args.join(" ") : "NatzsixnPacks";

            // Metadata untuk sticker
            const metadata = {
                packname: packname,
                author: "OrbitStudio",
                categories: ["🤖"]
            };

            // Download media
            const buffer = await downloadMediaMessage(
                mediaMsg,
                'buffer',
                {},
                { logger: botLogger }
            );

            // Cek apakah buffer valid
            if (!buffer || !Buffer.isBuffer(buffer)) {
                throw new Error('Gagal mendownload media: buffer tidak valid');
            }

            // Log buffer size
            console.log('Downloaded media buffer size:', buffer.length);

            let stickerBuffer;

            // Jika sudah WebP, langsung tambahkan EXIF
            if (isWebP) {
                stickerBuffer = await writeExifWebp(buffer, metadata);
            } else {
                // Tentukan ekstensi berdasarkan tipe media
                const ext = isImage ? 'jpg' : isGif ? 'gif' : 'mp4';
                const originalName = `sticker_input.${ext}`;

                // Simpan file sementara ke direktori 'stickers'
                const savedFile = await fileManager.saveFile(buffer, originalName, 'stickers');
                if (!savedFile.success) {
                    throw new Error('Gagal menyimpan file: ' + savedFile.error);
                }

                // Log file yang disimpan
                console.log('File saved at:', savedFile.path);

                // Proses media menjadi sticker
                if (isImage) {
                    stickerBuffer = await writeExifImg(buffer, metadata);
                } else if (isGif || isVideo) {
                    stickerBuffer = await writeExifVid(buffer, metadata);
                }

                // Hapus file sementara
                const deleted = await fileManager.deleteFile(savedFile.path);
                if (!deleted) {
                    console.warn('Failed to delete temporary file:', savedFile.path);
                }
            }

            // Cek apakah stickerBuffer valid
            if (!stickerBuffer || !Buffer.isBuffer(stickerBuffer)) {
                throw new Error('Gagal membuat sticker: buffer sticker tidak valid');
            }

            // Log sticker buffer size sebelum dikirim
            console.log('Sticker buffer size:', stickerBuffer.length);

            // Kirim sticker
            await msg.reply({ sticker: stickerBuffer });

        } catch (error) {
            botLogger.error('Error membuat sticker:', error);
            await msg.reply('❌ Gagal membuat sticker: ' + error.message);
        }
    }
});