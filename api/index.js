const express = require("express");
const axios = require("axios");
const Jimp = require("jimp");
const GIFEncoder = require("gif-encoder-2");

const app = express();

// GIF backgrounds from imgur
const gifUrls = [
  "https://i.imgur.com/h6UbIMO.gif",
  "https://i.imgur.com/vnnyLV8.gif",
  "https://i.imgur.com/9Kq4ySX.gif",
  "https://i.imgur.com/zZxcj9A.gif",
  "https://i.imgur.com/vfNN0wz.gif",
  "https://i.imgur.com/zZM4IHC.gif"
];

// Fallback colors if GIFs fail
const bgColors = [
  0xFF0000FF, 0x0000FFFF, 0x00FF00FF, 
  0xFFFF00FF, 0xFF00FFFF, 0x00FFFFFF
];

// Facebook Graph API token
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
      profileImg = new Jimp(108, 108, 0xFFFFFFFF);
    }
    
    profileImg.resize(108, 108);

    // Try to fetch GIF background
    const randomGif = gifUrls[Math.floor(Math.random() * gifUrls.length)];
    let bgImg;
    let useGifBg = false;
    
    try {
      const gifResponse = await axios.get(randomGif, {
        responseType: "arraybuffer",
        timeout: 15000
      });
      bgImg = await Jimp.read(Buffer.from(gifResponse.data));
      useGifBg = true;
    } catch (err) {
      console.log("GIF fetch failed, using color background");
      const bgColor = bgColors[Math.floor(Math.random() * bgColors.length)];
      bgImg = new Jimp(512, 512, bgColor);
    }

    const width = bgImg.getWidth();
    const height = bgImg.getHeight();

    // Create GIF encoder
    const encoder = new GIFEncoder(width, height, "neuquant", true);
    encoder.setDelay(100);
    encoder.setRepeat(0);
    encoder.start();

    const numFrames = 10;
    
    for (let frame = 0; frame < numFrames; frame++) {
      let frameImg;
      
      if (useGifBg) {
        // Re-parse GIF frame for each iteration
        try {
          const gifResponse = await axios.get(randomGif, {
            responseType: "arraybuffer",
            timeout: 10000
          });
          frameImg = await Jimp.read(Buffer.from(gifResponse.data));
        } catch {
          frameImg = bgImg.clone();
        }
      } else {
        frameImg = bgImg.clone();
      }
      
      // Scale animation
      const scale = 1 + Math.sin(frame / numFrames * Math.PI * 2) * 0.15;
      const scaledProfile = profileImg.clone();
      scaledProfile.resize(Math.floor(108 * scale), Math.floor(108 * scale));
      
      // Position
      const xPos = 27 + Math.floor(Math.sin(frame / numFrames * Math.PI * 2) * 8);
      const yPos = 103 + Math.floor(Math.cos(frame / numFrames * Math.PI * 2) * 3);
      
      frameImg.composite(scaledProfile, xPos, yPos);
      
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

module.exports = app;
