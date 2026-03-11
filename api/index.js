const express = require("express");
const app = express(); // Fixed: 'comst' → 'const'
const port = 8080;
const fs = require("fs"); // Moved outside route handler
const path = require("path");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const { writeFile } = require("fs").promises;

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

    const overlayPath = path.join("/tmp", `overlay_${uid}.png`);
    const basePath = path.join("/tmp", `base_${uid}.png`);
    const outputPath = path.join("/tmp", `output_${uid}.gif`);

    // Fetch Facebook profile picture
    const profileResponse = await axios.get(
      `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`,
      { responseType: "arraybuffer" }
    );
    fs.writeFileSync(overlayPath, Buffer.from(profileResponse.data));

    // Load images and draw on canvas
    const baseImage = await loadImage(basePath);
    const overlayImage = await loadImage(overlayPath);

    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    ctx.rotate((Math.PI * -25) / 180);
    ctx.drawImage(overlayImage, 27.3, 103, 108, 108);

    const canvasBuffer = canvas.toBuffer();
    fs.writeFileSync(basePath, canvasBuffer);

    const compositeImage = await loadImage(basePath);

    // Process GIF with canvagif
    const { Encoder, w: GifReader } = require("canvagif");

    new GifReader()
      .setUrl(randomGif)
      .start()
      .then(async (frames) => {
        const { width, height } = frames[0].details;
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

        const gifBuffer = encoder.finish();
        await writeFile(outputPath, gifBuffer);

        console.log("Encode ended!");
        res.sendFile(outputPath);
      });
  } catch (error) {
    console.error("Error in /api/rankup:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
