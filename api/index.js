const express = require("express");
const axios = require("axios");
const Jimp = require("jimp");
const GIFEncoder = require("gif-encoder-2");

const app = express();

// Multiple background styles
const bgStyles = [
  { type: "gradient", colors: [0xFF0000FF, 0x0000FFFF] },  // Red to Blue
  { type: "gradient", colors: [0x00FF00FF, 0xFFFF00FF] },  // Green to Yellow
  { type: "gradient", colors: [0xFF00FFFF, 0xFF0000FF] },  // Cyan to Red
  { type: "solid", color: 0xFF0000FF },                     // Solid Red
  { type: "solid", color: 0x0000FFFF },                     // Solid Blue
  { type: "solid", color: 0x00FF00FF },                     // Solid Green
  { type: "solid", color: 0xFFFF00FF },                     // Solid Yellow
  { type: "solid", color: 0xFF00FFFF },                     // Solid Magenta
  { type: "solid", color: 0x00FFFFFF },                     // Solid Cyan
  { type: "solid", color: 0x800080FF },                     // Purple
  { type: "solid", color: 0xFFA500FF },                     // Orange
  { type: "solid", color: 0xFFC0CBFF },                     // Pink
];

// Facebook Graph API token
const fbToken = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

function createBackground(width, height, style, frame) {
  const bg = new Jimp(width, height);
  
  if (style.type === "solid") {
    bg.fill(style.color);
  } else if (style.type === "gradient") {
    const [color1, color2] = style.colors;
    for (let y = 0; y < height; y++) {
      const ratio = y / height;
      const r = Math.floor(((color1 >> 24) & 0xFF) * (1 - ratio) + ((color2 >> 24) & 0xFF) * ratio);
      const g = Math.floor(((color1 >> 16) & 0xFF) * (1 - ratio) + ((color2 >> 16) & 0xFF) * ratio);
      const b = Math.floor(((color1 >> 8) & 0xFF) * (1 - ratio) + ((color2 >> 8) & 0xFF) * ratio);
      const a = 255;
      const color = Jimp.rgbaToInt(r, g, b, a);
      for (let x = 0; x < width; x++) {
        bg.setPixelColor(color, x, y);
      }
    }
  }
  
  return bg;
}

app.get("/api/rankup", async (req, res) => {
  try {
    const { uid } = req.query;
    const { style } = req.query; // Optional: ?style=0 to select specific style
    
    if (!uid) {
      return res.status(400).json({ error: "Missing uid parameter" });
    }

    // Fetch Facebook profile picture
    let profileImg;
    try {
      const profileResponse = await axios.get(
        `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${fbToken}`,
        { responseType: "arraybuffer", timeout: 15000 }
      );
      profileImg = await Jimp.read(Buffer.from(profileResponse.data));
    } catch {
      profileImg = new Jimp(200, 200, 0xFFFFFFFF);
    }
    
    profileImg.resize(108, 108);

    // Select background style
    let bgStyle;
    if (style !== undefined) {
      const index = parseInt(style);
      bgStyle = bgStyles[index % bgStyles.length];
    } else {
      bgStyle = bgStyles[Math.floor(Math.random() * bgStyles.length)];
    }

    const width = 512;
    const height = 512;

    // Create GIF encoder
    const encoder = new GIFEncoder(width, height, "neuquant", true);
    encoder.setDelay(100);
    encoder.setRepeat(0);
    encoder.start();

    const numFrames = 15;
    
    for (let frame = 0; frame < numFrames; frame++) {
      const frameImg = createBackground(width, height, bgStyle, frame);
      
      // Scale animation
      const scale = 1 + Math.sin(frame / numFrames * Math.PI * 2) * 0.2;
      const scaledProfile = profileImg.clone();
      scaledProfile.resize(Math.floor(108 * scale), Math.floor(108 * scale));
      
      // Position with movement
      const xPos = 27 + Math.floor(Math.sin(frame / numFrames * Math.PI * 2) * 10);
      const yPos = 103 + Math.floor(Math.cos(frame / numFrames * Math.PI * 2) * 5);
      
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

// Different endpoints for different rankup styles
app.get("/api/rankup1", async (req, res) => {
  req.query.style = "0";
  return app._router.matchRequest(req, res, { method: 'GET', path: '/api/rankup' });
});

module.exports = app;
