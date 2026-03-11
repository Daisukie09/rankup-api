const express = require("express");
const axios = require("axios");
const Jimp = require("jimp");
const fs = require("fs");
const path = require("path");

const app = express();

// Random GIF backgrounds for rankup (using static images for jimp)
const bgUrls = [
  "https://i.imgur.com/h6UbIMO.png",
  "https://i.imgur.com/vnnyLV8.png",
  "https://i.imgur.com/9Kq4ySX.png",
  "https://i.imgur.com/zZxcj9A.png",
  "https://i.imgur.com/vfNN0wz.png",
  "https://i.imgur.com/zZM4IHC.png"
];

// Facebook Graph API token (public)
const fbToken = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

app.get("/api/rankup", async (req, res) => {
  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: "Missing uid parameter" });
    }

    // Select random background
    const randomBg = bgUrls[Math.floor(Math.random() * bgUrls.length)];

    // Fetch Facebook profile picture
    const fbApiUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${fbToken}`;
    const profileResponse = await axios.get(fbApiUrl, {
      responseType: "arraybuffer"
    });

    // Load profile picture
    const profileImg = await Jimp.read(Buffer.from(profileResponse.data));
    profileImg.resize(108, 108);

    // Load background
    const bgResponse = await axios.get(randomBg, { responseType: "arraybuffer" });
    const bgImg = await Jimp.read(Buffer.from(bgResponse.data));
    bgImg.resize(512, 512);

    // Composite profile picture onto background
    // Position: x=27.3, y=103 (centered at 27.3+54, 103+54 = 81.3, 157)
    bgImg.composite(profileImg, 27, 103, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1,
      opacityDest: 1
    });

    // Get buffer and send
    const buffer = await bgImg.getBufferAsync(Jimp.MIME_PNG);
    
    res.set("Content-Type", "image/png");
    res.send(buffer);

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to generate rankup image" });
  }
});

// Vercel serverless function export
module.exports = app;
