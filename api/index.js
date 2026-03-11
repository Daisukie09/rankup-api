const express = require("express");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const app = express();

// Random GIF backgrounds for rankup
const gifUrls = [
  "https://i.imgur.com/h6UbIMO.gif",
  "https://i.imgur.com/vnnyLV8.gif",
  "https://i.imgur.com/9Kq4ySX.gif",
  "https://i.imgur.com/zZxcj9A.gif",
  "https://i.imgur.com/vfNN0wz.gif",
  "https://i.imgur.com/zZM4IHC.gif"
];

// Facebook Graph API token (public)
const fbToken = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

app.get("/api/rankup", async (req, res) => {
  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: "Missing uid parameter" });
    }

    // Select random GIF background
    const randomGif = gifUrls[Math.floor(Math.random() * gifUrls.length)];

    // Fetch Facebook profile picture
    const fbApiUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${fbToken}`;
    const profileResponse = await axios.get(fbApiUrl, {
      responseType: "arraybuffer"
    });

    // Save profile picture temporarily
    const profilePath = path.join(__dirname, "temp_profile.png");
    fs.writeFileSync(profilePath, Buffer.from(profileResponse.data, "utf-8"));

    // Load images
    const profileImg = await loadImage(profilePath);
    const bgImg = await loadImage(randomGif);

    // Create canvas
    const canvas = createCanvas(bgImg.width, bgImg.height);
    const ctx = canvas.getContext("2d");

    // Draw background
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    // Draw profile picture with rotation
    ctx.save();
    ctx.translate(27.3 + 54, 103 + 54); // Center of profile area
    ctx.rotate(Math.PI * -25 / 180);
    ctx.drawImage(profileImg, -54, -54, 108, 108);
    ctx.restore();

    // Save the result
    const outputPath = path.join(__dirname, "rankup_output.png");
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outputPath, buffer);

    // Send the image
    res.sendFile(outputPath, {}, (err) => {
      // Cleanup temp files
      try {
        fs.unlinkSync(profilePath);
        fs.unlinkSync(outputPath);
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    });

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to generate rankup image" });
  }
});

// Vercel serverless function export
module.exports = app;
