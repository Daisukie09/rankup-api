const express = require("express");
const app = express();
const port = 8080;
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const https = require("https");
const { loadImage, createCanvas } = require("canvas");
const { writeFile } = require("fs").promises;
const os = require("os");

app.get("/api/rankup", async function (req, res) {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ error: "Missing 'uid' query parameter" });
    }

    const gifList = [
      "https://i.imgur.com/h6UbIMO.gif",
      "https://i.imgur.com/vnnyLV8.gif",
      "https://i.imgur.com/9Kq4ySX.gif",
      "https://i.imgur.com/zZxcj9A.gif",
      "https://i.imgur.com/vfNN0wz.gif",
      "https://i.imgur.com/zZM4IHC.gif",
    ];

    const randomGif = gifList[Math.floor(Math.random() * gifList.length)];

    const overlayPath = path.join(os.tmpdir(), `overlay_${uid}.png`);
    const gifPath = path.join(os.tmpdir(), `base_${uid}.gif`);
    const outputPath = path.join(os.tmpdir(), `output_${uid}.gif`);

    // Fetch Facebook profile picture
    const profileResponse = await axios.get(
      `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`,
      { responseType: "arraybuffer" }
    );
    fs.writeFileSync(overlayPath, Buffer.from(profileResponse.data));

    // Download the GIF to a local file (avoids imgur redirect/rate-limit issues with canvagif's URL fetcher)
    // Download the GIF to a local file using native https to bypass axios blocking by Imgur
    const gifBuffer = await new Promise((resolve, reject) => {
      https.get(randomGif, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Handle redirect
          https.get(response.headers.location, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
          }).on("error", reject);
        } else {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => resolve(Buffer.concat(chunks)));
        }
      }).on("error", reject);
    });
    
    fs.writeFileSync(gifPath, gifBuffer);

    // Load the profile overlay image
    const overlayImage = await loadImage(overlayPath);

    // Process GIF with canvagif — use local file path instead of URL
    const { Encoder, Decoder } = require("canvagif");

    const frames = await new Decoder()
      .setUrl(gifPath)
      .start();

    const { width, height } = frames[0].details;

    // Create composite overlay: draw rotated profile pic onto a transparent canvas
    const compositeCanvas = createCanvas(width, height);
    const compositeCtx = compositeCanvas.getContext("2d");
    compositeCtx.save();
    compositeCtx.rotate((Math.PI * -25) / 180);
    compositeCtx.drawImage(overlayImage, 27.3, 103, 108, 108);
    compositeCtx.restore();

    const compositeImage = await loadImage(compositeCanvas.toBuffer("image/png"));

    // Encode the new GIF with profile overlay on each frame
    const encoder = new Encoder(width, height)
      .setDelay(0)
      .setQuality(100)
      .start();

    const gifCtx = encoder.getContext();

    for (let i = 0; i < frames.length; i++) {
      gifCtx.drawImage(frames[i].getImage(), 0, 0, width, height);
      gifCtx.drawImage(compositeImage, 0, 0, compositeImage.width, compositeImage.height);
      encoder.updateFrame();
    }

    const outGifBuffer = encoder.finish();
    await writeFile(outputPath, outGifBuffer);

    console.log("Encode ended!");
    res.sendFile(outputPath);
  } catch (error) {
    console.error("Error in /api/rankup:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
