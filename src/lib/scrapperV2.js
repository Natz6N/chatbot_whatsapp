const axios = require("axios");
const cheerio = require("cheerio");
const ytdl = require("ytdl-core");
const FormData = require("form-data");
const readfile = require("../../config/memoryAsync/readfile.js");
// Helper function untuk format durasi (dari kode asli)
function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs > 0 ? hrs + ":" : ""}${mins < 10 ? "0" + mins : mins}:${
    secs < 10 ? "0" + secs : secs
  }`;
}

// Helper function untuk format bytes (dari kode asli)
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/** internet **/
async function cekKhodam(nama) {
  return new Promise(async (resolve, reject) => {
    await axios
      .get(`https://khodam.vercel.app/v2?nama=${nama}`)
      .then(({ data }) => {
        const $ = cheerio.load(data);
        const khodam = $(".__className_cad559").text().split("Cek Khodam")[1];
        const result = {
          nama,
          khodam,
          share: `https://khodam.vercel.app/vy2?nama=${nama}&share`,
        };
        resolve(result);
      })
      .catch(reject);
  });
}

/** download **/
async function tiktokDl(url) {
  try {
    let response = await axios.post(
      "https://www.tikwm.com/api",
      {},
      {
        params: {
          url: url,
          count: 12,
          cursor: 0,
          web: 1,
          hd: 1,
        },
      }
    );
    
    // Pastikan kita hanya mengembalikan data yang diperlukan tanpa manipulasi jalur
    return response.data;
  } catch (error) {
    console.error("TikTok Download Error:", error);
    return {
      code: -1,
      msg: error.message || "Terjadi kesalahan saat download video TikTok"
    };
  }
}

async function tiktokDlV2(urls) {
  const url = "https://tiktokio.com/api/v1/tk-htmx";
  const data = new URLSearchParams({
    prefix: "dtGslxrcdcG9raW8uY29t",
    vid: urls,
  });

  const config = {
    headers: {
      "HX-Request": "true",
      "HX-Trigger": "search-btn",
      "HX-Target": "tiktok-parse-result",
      "HX-Current-URL": "https://tiktokio.com/id/",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  try {
    let { data: res } = await axios.post(url, data, config);
    let $ = cheerio.load(res);
    const urls = [];
    let media;

    const links = {
      creator: "@Im-Dims",
      status: 200,
      isSlide: false,
      title: $("h2").text(),
      media: media,
    };

    $(".download-item img").each((index, element) => {
      const url = $(element).attr("src");
      urls.push(url);
      links.isSlide = true;
    });

    if (urls.length === 0) {
      media = {};
      $("div.tk-down-link").each(function (index, element) {
        const linkType = $(this).find("a").text().trim();
        const url = $(this).find("a").attr("href");

        if (linkType === "Download watermark") {
          media["watermark"] = url;
        } else if (linkType === "Download Mp3") {
          media["mp3"] = url;
        } else if (linkType === "Download without watermark") {
          media["no_wm"] = url;
        } else if (linkType === "Download without watermark (HD)") {
          media["hd"] = url;
        }
      });
    } else {
      media = urls;
    }
    links.media = media;

    return links;
  } catch (e) {
    return {
      status: 404,
      msg: e.message || e,
    };
  }
}

async function tiktokSearch(query) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios({
        method: "POST",
        url: "https://tikwm.com/api/feed/search",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: "current_language=en",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        },
        data: {
          keywords: query,
          count: 10,
          cursor: 0,
          HD: 1,
        },
      });
      const videos = response.data.data.videos;
      if (videos.length === 0) {
        reject("Tidak ada video ditemukan.");
      } else {
        const gywee = Math.floor(Math.random() * videos.length);
        const videorndm = videos[gywee];

        const result = {
          title: videorndm.title,
          cover: videorndm.cover,
          origin_cover: videorndm.origin_cover,
          no_watermark: videorndm.play,
          watermark: videorndm.wmplay,
          music: videorndm.music,
        };
        resolve(result);
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function search(objName) {
  try {
    const url = "https://www.seaart.ai/api/v1/square/search";
    const payload = {
      obj_name: objName,
      obj_type: 1,
      page: 1,
      page_size: 35,
      offset: 0,
    };
    const headers = {
      "Content-Type": "application/json",
      "x-app-id": "web_global_seaart",
      "x-browser-id": "015015cb47ce4f6062bc7a6a1f304d5a",
      "x-device-id": "d6768dee-a70b-4ec2-9ed4-1adedb2bed22",
      "x-page-id": "8eaaa062-a334-437a-bc7b-4cd210363e9b",
      "x-platform": "web",
      token:
        "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzZWEtYXJ0IiwiYXVkIjpbImxvZ2luIl0sImV4cCI6MTczODMxMjA2NSwiaWF0IjoxNzMzMTI4MDY1LCJqdGkiOiI1NzQzODY1NTE5ODgwMzk3MyIsInBheWxvYWQiOnsiaWQiOiI2NDc3NWNlMmNjZTE2MDI4NjQxMTllMmUxZTMxYWY1NSIsImVtYWlsIjoic2h5cm8uc3lyQGdtYWlsLmNvbSIsImNyZWF0ZV9hdCI6MTczMzEyMTMzMzkyNSwidG9rZW5fc3RhdHVzIjowLCJzdGF0dXMiOjF9fQ.HQgqboU_zVeP3Py2YjYdkTbaPGSf1cSIRLgHaaZFxhucnx-n1058CzZ6dJWeevQvNyWrWs8PCN7Ej8dYreGgxZadfIn9-6fmNeYkXi5EwnZOQKQuD5NWR-SEvowzwIMPKp-BEPLrw0tv3t9dSzOIObdkZDaDBxDOXY-8535tIZYBIJpfH6Q2ZlAftjNPR6-g72laCMHFHw57ZRaoVtXwE8gHYChH18LTofJtO08-c6EKBv2-2631VdN4WGOw5YRSwGVrIZVMHp-pJYzulSmGMEhjgvRPOQ7PvcH8hqsd1DKsXk0ipq8sqDJskxdf7cwbYhrypjDc27qdu5dn_7vi-g",
    };
    const response = await axios.post(url, payload, { headers });
    const items = response.data.data.items || [];
    const top5Items = items.slice(0, 5);
    return top5Items.map((item) => ({
      id: item.id,
      cover: item.cover || "",
      author: item.author?.name || "Unknown",
      prompt: item.prompt || "",
      stats: {
        likes: item.stat?.num_of_like || 0,
        views: item.stat?.num_of_view || 0,
        collections: item.stat?.num_of_collection || 0,
      },
    }));
  } catch (error) {
    console.error("Error fetching data:", error.message);
    return [];
  }
}

async function igDl(url) {
  return new Promise(async (resolve) => {
    try {
      if (
        !url.match(
          /(?:https?:\/\/(web\.|www\.|m\.)?(facebook|fb)\.(com|watch)\S+)?$/
        ) &&
        !url.match(/(https|http):\/\/www.instagram.com\/(p|reel|tv|stories)/gi)
      ) {
        return resolve({
          developer: "@Alia Uhuy",
          status: false,
          msg: `Link Url not valid`,
        });
      }

      function decodeSnapApp(args) {
        let [h, u, n, t, e, r] = args;
        function decode(d, e, f) {
          const g =
            "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/".split(
              ""
            );
          let h = g.slice(0, e);
          let i = g.slice(0, f);
          let j = d
            .split("")
            .reverse()
            .reduce(function (a, b, c) {
              if (h.indexOf(b) !== -1)
                return (a += h.indexOf(b) * Math.pow(e, c));
            }, 0);
          let k = "";
          while (j > 0) {
            k = i[j % f] + k;
            j = (j - (j % f)) / f;
          }
          return k || "0";
        }
        r = "";
        for (let i = 0, len = h.length; i < len; i++) {
          let s = "";
          while (h[i] !== n[e]) {
            s += h[i];
            i++;
          }
          for (let j = 0; j < n.length; j++)
            s = s.replace(new RegExp(n[j], "g"), j.toString());
          r += String.fromCharCode(decode(s, e, 10) - t);
        }
        return decodeURIComponent(encodeURIComponent(r));
      }

      function getEncodedSnapApp(data) {
        return data
          .split("decodeURIComponent(escape(r))}(")[1]
          .split("))")[0]
          .split(",")
          .map((v) => v.replace(/"/g, "").trim());
      }

      function getDecodedSnapSave(data) {
        return data
          .split('getElementById("download-section").innerHTML = "')[1]
          .split('"; document.getElementById("inputData").remove(); ')[0]
          .replace(/\\(\\)?/g, "");
      }

      function decryptSnapSave(data) {
        return getDecodedSnapSave(decodeSnapApp(getEncodedSnapApp(data)));
      }

      const html = await axios
        .post(
          "https://snapsave.app/action.php?lang=id",
          new URLSearchParams({ url }).toString(),
          {
            headers: {
              accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
              "content-type": "application/x-www-form-urlencoded",
              origin: "https://snapsave.app",
              referer: "https://snapsave.app/id",
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
            },
          }
        )
        .then((res) => res.data);

      const decode = decryptSnapSave(html);
      const $ = cheerio.load(decode);
      const results = [];

      if ($("table.table").length || $("article.media > figure").length) {
        const thumbnail = $("article.media > figure").find("img").attr("src");
        $("tbody > tr").each((_, el) => {
          const $el = $(el);
          const $td = $el.find("td");
          const resolution = $td.eq(0).text();
          let _url =
            $td.eq(2).find("a").attr("href") ||
            $td.eq(2).find("button").attr("onclick");
          const shouldRender = /get_progressApi/gi.test(_url || "");
          if (shouldRender) {
            _url = /get_progressApi\('(.*?)'\)/.exec(_url || "")?.[1] || _url;
          }
          results.push({
            resolution,
            thumbnail,
            url: _url,
            shouldRender,
          });
        });
      } else {
        $("div.download-items__thumb").each((_, tod) => {
          const thumbnail = $(tod).find("img").attr("src");
          $("div.download-items__btn").each((_, ol) => {
            let _url = $(ol).find("a").attr("href");
            if (!/https?:\/\//.test(_url || ""))
              _url = `https://snapsave.app${_url}`;
            results.push({
              thumbnail,
              url: _url,
            });
          });
        });
      }

      if (!results.length) {
        return resolve({
          developer: "@dims.js - Im-Dims",
          status: false,
          msg: `Error`,
        });
      }
      const filePath = await readfile.saveFile(decode, "snapsave_image", 'images');
      return resolve({
        developer: "@dims.js - Im-Dims",
        status: true,
        data: results,
        filePath,
      });
    } catch (e) {
      return resolve({
        developer: "@dims.js - Im-Dims",
        status: false,
        msg: e.message,
      });
    }
  });
}

async function ytv(query, quality = 134) {
  try {
    const videoInfo = await ytdl.getInfo(query, { lang: "id" });
    const format = ytdl.chooseFormat(videoInfo.formats, {
      format: quality,
      filter: "videoandaudio",
    });
    let response = await axios.head(format.url);
    let contentLength = response.headers["content-length"];
    let fileSizeInBytes = parseInt(contentLength);
    return {
      title: videoInfo.videoDetails.title,
      thumb: videoInfo.videoDetails.thumbnails.slice(-1)[0],
      date: videoInfo.videoDetails.publishDate,
      duration: formatDuration(videoInfo.videoDetails.lengthSeconds),
      channel: videoInfo.videoDetails.ownerChannelName,
      quality: format.qualityLabel,
      contentLength: formatBytes(fileSizeInBytes),
      description: videoInfo.videoDetails.description,
      videoUrl: format.url,
    };
  } catch (error) {
    throw error;
  }
}

async function githubStalk(user) {
  return new Promise((resolve, reject) => {
    axios
      .get("https://api.github.com/users/" + user)
      .then(({ data }) => {
        let hasil = {
          username: data.login,
          nickname: data.name,
          bio: data.bio,
          id: data.id,
          nodeId: data.node_id,
          profile_pic: data.avatar_url,
          url: data.html_url,
          type: data.type,
          admin: data.site_admin,
          company: data.company,
          blog: data.blog,
          location: data.location,
          email: data.email,
          public_repo: data.public_repos,
          public_gists: data.public_gists,
          followers: data.followers,
          following: data.following,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        resolve(hasil);
      })
      .catch(reject);
  });
}

async function yta(videoUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append("query", videoUrl);
      searchParams.append("vt", "mp3");
      const searchResponse = await axios.post(
        "https://tomp3.cc/api/ajax/search",
        searchParams.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Accept: "*/*",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );
      if (searchResponse.data.status !== "ok") {
        throw new Error("Failed to search for the video.");
      }
      const videoId = searchResponse.data.vid;
      const videoTitle = searchResponse.data.title;
      const mp4Options = searchResponse.data.links.mp4;
      const mp3Options = searchResponse.data.links.mp3;
      const mediumQualityMp4Option = mp4Options[136];
      const mp3Option = mp3Options["mp3128"];
      const mp4ConvertParams = new URLSearchParams();
      mp4ConvertParams.append("vid", videoId);
      mp4ConvertParams.append("k", mediumQualityMp4Option.k);
      const mp4ConvertResponse = await axios.post(
        "https://tomp3.cc/api/ajax/convert",
        mp4ConvertParams.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Accept: "*/*",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );
      if (mp4ConvertResponse.data.status !== "ok") {
        throw new Error("Failed to convert the video to MP4.");
      }
      const mp4DownloadLink = mp4ConvertResponse.data.dlink;
      const mp3ConvertParams = new URLSearchParams();
      mp3ConvertParams.append("vid", videoId);
      mp3ConvertParams.append("k", mp3Option.k);
      const mp3ConvertResponse = await axios.post(
        "https://tomp3.cc/api/ajax/convert",
        mp3ConvertParams.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Accept: "*/*",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );
      if (mp3ConvertResponse.data.status !== "ok") {
        throw new Error("Failed to convert the video to MP3.");
      }
      const mp3DownloadLink = mp3ConvertResponse.data.dlink;

      resolve({
        title: videoTitle,
        mp4DownloadLink,
        mp3DownloadLink,
      });
    } catch (error) {
      reject("Error: " + error.message);
    }
  });
}

/** ai **/
async function remini(urlPath, method) {
  return new Promise(async (resolve, reject) => {
    let Methods = ["enhance", "recolor", "dehaze"];
    method = Methods.includes(method) ? method : Methods[0];
    let buffer,
      Form = new FormData(),
      scheme = "https://inferenceengine.vyro.ai/" + method;
    Form.append("model_version", 1, {
      "Content-Transfer-Encoding": "binary",
      contentType: "multipart/form-data; charset=utf-8",
    });
    Form.append("image", Buffer.from(urlPath), {
      filename: "enhance_image_body.jpg",
      contentType: "image/jpeg",
    });
    Form.submit(
      {
        url: scheme,
        host: "inferenceengine.vyro.ai",
        path: "/" + method,
        protocol: "https:",
        headers: {
          "User-Agent": "okhttp/4.9.3",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
        },
      },
      function (err, res) {
        if (err) reject(err);
        let data = [];
        res
          .on("data", function (chunk) {
            data.push(chunk);
          })
          .on("end", () => {
            resolve(Buffer.concat(data));
          })
          .on("error", (e) => {
            reject(e);
          });
      }
    );
  });
}

// pixiv by shyro
async function pix(query) {
  try {
    let response = await axios.get(
      `https://www.pixiv.net/ajax/search/artworks/${query}?word=${query}&order=date_d&mode=all&p=1&csw=0&s_mode=s_tag&type=all&lang=en&version=2fd5f9318232eb45acf471bbc88aa82cbf0054f8`
    );
    let results = response.data.body.illustManga.data;
    let top5Results = results.slice(0, 5);
    return top5Results.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      userName: item.userName,
      tags: item.tags,
    }));
  } catch (error) {
    console.error("Error fetching data:", error.message);
    return [];
  }
}

/** search **/
async function npmSearch(query) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axios.get(
        "https://www.npmjs.com/search/suggestions?" +
          new URLSearchParams({ q: query })
      ).then((v) => v.data);
      if (!res.length) return reject("Packages Not Found");
      return resolve(res);
    } catch (e) {
      reject(e);
    }
  });
}

async function npmSearch2(query) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axios.get(
        "https://www.npmjs.com/search?" + new URLSearchParams({ q: query }),
        {
          headers: {
            Referer: "https://www.npmjs.com/",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "X-Spiferack": 1,
          },
        }
      ).then((v) => v.data);
      if (!res.total) return reject("Packages Not Found");
      resolve(res);
    } catch (e) {
      reject(e);
    }
  });
}

async function npm(packageName) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axios.get(
        "https://www.npmjs.com/package/" + packageName.replace(" "),
        {
          headers: {
            Referer: "https://www.npmjs.com/",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "X-Spiferack": 1,
          },
        }
      ).then((v) => v.data);
      if (!res.package) return reject("Package Not Found");
      resolve(res);
    } catch (e) {
      reject(e);
    }
  });
}

/** short **/
async function shortlink(apikey, command, out, custom) {
  let anu, url;
  try {
    if (/ulvis/.test(command)) {
      anu = await axios.get(
        `https://ulvis.net/API/write/get?url=${out}&custom=${
          custom || ""
        }&type=json`
      ).then((res) => res.data);
      if (!anu.success) return anu.error.msg;
      anu = anu.data;
      if (anu.status) return anu.status;
      url = anu.url;
    } else if (/shrtco/.test(command)) {
      anu = await axios.get(`https://api.shrtco.de/v2/shorten?url=${out}`).then(
        (res) => res.data
      );
      if (!anu.ok) return anu.error;
      url = anu.result.full_short_link;
    } else if (/owovc/.test(command)) {
      anu = await axios.post("https://owo.vc/api/v2/link", {
        link: out,
        generator: "owo",
        metadata: "OWOIFY",
      }, {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        }
      }).then((res) => res.data);
      if (anu.error) return anu.message;
      url = anu.id;
    } else if (/cuttly/.test(command)) {
      anu = await axios.get(
        `https://cutt.ly/api/api.php?key=${apikey.cuttly}&short=${out}&name=${
          custom || ""
        }`
      ).then((res) => res.data);
      anu = anu.url;
      if (!anu.shortLink)
        return `error code ${
          anu.status == 3 ? " 3 : alias already used" : anu.status
        }`;
      url = anu.shortLink;
    } else if (/tinyurl/.test(command)) {
      anu = await axios.post("https://api.tinyurl.com/create", {
        url: out,
        domain: "tinyurl.com",
        alias: `${custom || ""}`,
      }, {
        headers: {
          Authorization: `Bearer ${apikey.tinyurl}`,
          accept: "application/json",
          "Content-Type": "application/json",
        }
      }).then((res) => res.data);
      url = anu;
      if (anu.errors && anu.errors.length > 0) return anu.errors[0];
      url = anu.data.tiny_url;
    } else if (/tinycc/.test(command)) {
      anu = await axios.post("https://tiny.cc/tiny/api/3/urls/", {
        urls: [
          {
            long_url: out,
            custom_hash: `${custom || ""}`,
          },
        ],
      }, {
        headers: {
          Authorization: `Basic ${apikey.tinycc}`,
          accept: "application/json",
          "Content-Type": "application/json",
        }
      }).then((res) => res.data);
      if (!anu.urls) return anu.error.message;
      if (!anu.urls[0].short_url) return anu.urls[0].error.message;
      url = anu.urls[0].short_url_with_protocol;
    }
  } catch (e) {
    console.log(e);
  }
  return url ? url : "Internal server error.";
}

// Ekspor semua fungsi menggunakan module.exports
module.exports = {
  cekKhodam,
  tiktokDl,
  tiktokDlV2,
  tiktokSearch,
  search,
  igDl,
  ytv,
  githubStalk,
  yta,
  remini,
  pix,
  npmSearch,
  npmSearch2,
  npm,
  shortlink,
};
