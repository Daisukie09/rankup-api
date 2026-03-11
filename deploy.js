const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const WATCH_DIR = "./";
const IGNORE = ["node_modules", ".vercel", ".git", "deploy.js"];

let deployTimeout = null;
let isDeploying = false;

function deploy() {
  if (isDeploying) return;
  isDeploying = true;

  console.log("\n🚀 Changes detected! Deploying to Vercel...");

  exec("vercel --prod", (error, stdout, stderr) => {
    isDeploying = false;

    if (error) {
      console.error("❌ Deploy failed:", error.message);
      return;
    }

    console.log("✅ Deploy successful!");
    console.log(stdout);
  });
}

function watchDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach((file) => {
      const fullPath = path.join(dir, file);
      
      if (IGNORE.some(i => fullPath.includes(i))) return;

      try {
        if (fs.statSync(fullPath).isDirectory()) {
          watchDir(fullPath);
        }
      } catch (e) {
        // Skip files we can't access
      }
    });
  } catch (e) {
    // Skip directories we can't read
  }

  fs.watch(dir, { recursive: true }, (event, filename) => {
    if (!filename) return;
    if (IGNORE.some(i => filename.includes(i))) return;

    console.log(`📝 File changed: ${filename}`);

    clearTimeout(deployTimeout);
    deployTimeout = setTimeout(deploy, 2000);
  });
}

console.log("👀 Watching for file changes...");
console.log("📁 Directory:", path.resolve(WATCH_DIR));
console.log("⚡ Will auto-deploy to Vercel on save\n");

watchDir(WATCH_DIR);
