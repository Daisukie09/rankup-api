const express = require("express");
const axios = require("axios");
const Jimp = require("jimp");
const GIFEncoder = require("gif-encoder-2");

const app = express();

// Fallback colors
const bgColors = [0xFF0000FF, 0x0000FFFF, 0x00FF00FF, 0xFFFF00FF, 0xFF00FFFF, 0x00FFFFFF];

// Facebook Graph API token
const fbToken = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

app.get("/api/rankup", async (req, res) => {
  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: "Missing uid parameter" });
    }

    console.log("Processing uid:", uid);

    // Fetch Facebook profile picture
    let profileImg;
    try {
      const profileResponse = await axios.get(
        `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${fbToken}`,
        { responseType: "arraybuffer", timeout: 15000 }
      );
      profileImg = await Jimp.read(Buffer.from(profileResponse.data));
      console.log("Profile loaded");
    } catch (err) {
      console.log("Profile fetch error:", err.message);
      profileImg = new Jimp(200, 200, 0xFFFFFFFF);
    }
    
    profileImg.resize(108, 108);

    // Use colored background
    const bgColor = bgColors[Math.floor(Math.random() * bgColors.length)];
    const width = 512;
    const height = 512;
    const bgImg = new Jimp(width, height, bgColor);

    // Create GIF encoder
    const encoder = new GIFEncoder(width, height, "neuquant", true);
    encoder.setDelay(100);
    encoder.setRepeat(0);
    encoder.start();

    const numFrames = 10;
    
    for (let frame = 0; frame < numFrames; frame++) {
      const frameImg = bgImg.clone();
      
      // Scale animation
      const scale = 1 + Math.sin(frame / numFrames * Math.PI * 2) * 0.15;
      const scaledProfile = profileImg.clone();
      scaledProfile.resize(Math.floor(108 * scale), Math.floor(108 * scale));
      
      // Position
      const xPos = 27 + Math.floor(Math.sin(frame / numFrames * Math.PI * 2) * 8);
      const yPos = 103;
      
      frameImg.composite(scaledProfile, xPos, yPos);
      
      const frameBuffer = await frameImg.getBufferAsync(Jimp.MIME_PNG);
      encoder.addFrame(frameBuffer);
    }

    encoder.finish();
    const gifOutput = encoder.out.getData();

    console.log("GIF generated successfully");
    res.set("Content-Type", "image/gif");
    res.send(gifOutput);

  } catch (error) {
    console.error("Error:", error.message, error.stack);
    res.status(500).json({ error: "Failed: " + error.message });
  }
});

module.exports = app;
