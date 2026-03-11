const express = require("express");
const axios = require("axios");
const Jimp = require("jimp");
const GIFEncoder = require("gif-encoder-2");

const app = express();

// Static backgrounds (more reliable than GIFs from external URLs)
const bgColors = [
  0xFF0000FF, // Red
  0x0000FFFF, // Blue
  0x00FF00FF, // Green
  0xFFFF00FF, // Yellow
  0xFF00FFFF, // Magenta
  0x00FFFFFF  // Cyan
];

// Facebook Graph API token (public)
const fbToken = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

app.get("/api/rankup", async (req, res) => {
  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: "Missing uid parameter" });
    }

    // Fetch Facebook profile picture
    const fbApiUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${fbToken}`;
    
    let profileImg;
    try {
      const profileResponse = await axios.get(fbApiUrl, {
        responseType: "arraybuffer",
        timeout: 10000
      });
      profileImg = await Jimp.read(Buffer.from(profileResponse.data));
    } catch (err) {
      console.error("Profile fetch error:", err.message);
      // Use default avatar
      profileImg = new Jimp(108, 108, 0xFFFFFFFF);
    }
    
    profileImg.resize(108, 108);

    // Select random background color
    const bgColor = bgColors[Math.floor(Math.random() * bgColors.length)];
    const width = 512;
    const height = 512;

    // Create GIF encoder
    const encoder = new GIFEncoder(width, height, "neuquant", true);
    encoder.setDelay(100);
    encoder.setRepeat(0);
    encoder.start();

    // Create animated frames
    const numFrames = 10;
    
    for (let frame = 0; frame < numFrames; frame++) {
      // Create background with color
      const frameImg = new Jimp(width, height, bgColor);
      
      // Add some gradient effect
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const brightness = Math.floor((x + y) / (width + height) * 50);
          const color = Jimp.rgbaToInt(
            Math.min(255, ((bgColor >> 24) & 0xFF) + brightness),
            Math.min(255, ((bgColor >> 16) & 0xFF) + brightness),
            Math.min(255, ((bgColor >> 8) & 0xFF) + brightness),
            255
          );
          frameImg.setPixelColor(color, x, y);
        }
      }
      
      // Scale animation for profile picture
      const scale = 1 + Math.sin(frame / numFrames * Math.PI * 2) * 0.15;
      const scaledProfile = profileImg.clone();
      scaledProfile.resize(Math.floor(108 * scale), Math.floor(108 * scale));
      
      // Position with movement
      const xPos = 27 + Math.floor(Math.sin(frame / numFrames * Math.PI * 2) * 8);
      const yPos = 103 + Math.floor(Math.cos(frame / numFrames * Math.PI * 2) * 3);
      
      // Composite
      frameImg.composite(scaledProfile, xPos, yPos);
      
      // Add frame to GIF
      const frameBuffer = await frameImg.getBufferAsync(Jimp.MIME_PNG);
      encoder.addFrame(frameBuffer);
    }

    encoder.finish();
    const gifOutput = encoder.out.getData();

    res.set("Content-Type", "image/gif");
    res.send(gifOutput);

  } catch (error) {
    console.error("Error:", error.message, error.stack);
    res.status(500).json({ error: "Failed to generate rankup GIF: " + error.message });
  }
});

// Vercel serverless function export
module.exports = app;
