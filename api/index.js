const express = require("express");
const axios = require("axios");
const Jimp = require("jimp");
const GIFEncoder = require("gif-encoder-2");

const app = express();

// GIF backgrounds for rankup
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

    // Select random GIF
    const randomGif = gifUrls[Math.floor(Math.random() * gifUrls.length)];

    // Fetch Facebook profile picture
    const fbApiUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${fbToken}`;
    const profileResponse = await axios.get(fbApiUrl, {
      responseType: "arraybuffer"
    });

    // Load profile picture
    const profileImg = await Jimp.read(Buffer.from(profileResponse.data));
    profileImg.resize(108, 108);

    // Fetch and parse GIF background (using first frame)
    const gifResponse = await axios.get(randomGif, { responseType: "arraybuffer" });
    const gifBuffer = Buffer.from(gifResponse.data);
    
    // Parse GIF to get dimensions and frames
    const gif = await Jimp.read(gifBuffer);
    const width = gif.getWidth();
    const height = gif.getHeight();

    // Create GIF encoder
    const encoder = new GIFEncoder(width, height, "neuquant", true);
    encoder.setDelay(100); // 100ms per frame
    encoder.setRepeat(0); // Loop forever
    encoder.start();

    // For GIF processing, we'll create a simple animated effect
    // Get raw pixel data from profile and composite onto background frames
    // Using a simple approach: create animated profile overlay
    
    const numFrames = 10;
    
    for (let frame = 0; frame < numFrames; frame++) {
      // Create a fresh copy of background for each frame
      const frameImg = await Jimp.read(gifBuffer);
      
      // Simple scale animation for profile picture
      const scale = 1 + Math.sin(frame / numFrames * Math.PI * 2) * 0.1;
      const scaledProfile = profileImg.clone();
      scaledProfile.resize(Math.floor(108 * scale), Math.floor(108 * scale));
      
      // Position: center with slight movement
      const xPos = 27 + Math.floor(Math.sin(frame / numFrames * Math.PI * 2) * 5);
      const yPos = 103;
      
      // Composite profile onto background
      frameImg.composite(scaledProfile, xPos, yPos, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacitySource: 1,
        opacityDest: 1
      });
      
      // Add frame to GIF
      const frameBuffer = await frameImg.getBufferAsync(Jimp.MIME_PNG);
      encoder.addFrame(frameBuffer);
    }

    encoder.finish();
    const gifOutput = encoder.out.getData();

    res.set("Content-Type", "image/gif");
    res.send(gifOutput);

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to generate rankup GIF" });
  }
});

// Vercel serverless function export
module.exports = app;
