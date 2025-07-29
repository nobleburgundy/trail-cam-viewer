const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const chokidar = require("chokidar");
const { classifyImage } = require("./src/main/ml/imageClassifier");
const {
  getImagesFromSDCard,
  getImagesFromFolder,
} = require("./src/main/fileManager");

// IPC handler to get the favorites directory path
ipcMain.handle("get-favorites-path", () => {
  return path.join(app.getPath("userData"), "favorites");
});

// IPC handler to get images from a specified folder (for testing)
ipcMain.handle("get-images-from-folder", async (event, folderPath) => {
  try {
    const imageFiles = await getImagesFromFolder(folderPath);
    return imageFiles;
  } catch (error) {
    console.error("Error reading images from folder:", error);
    throw error;
  }
});
const { screen } = require("electron");
const { exec } = require("child_process");
const sqlite3 = require("better-sqlite3");
const fs = require("fs");
const nodemailer = require("nodemailer");

let mainWindow;

// Initialize SQLite database
const db = sqlite3(path.join(app.getPath("userData"), "favorites.db"));

// Create the favorites table if it doesn't exist
const createTableQuery = `CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  imageSrc TEXT UNIQUE NOT NULL
)`;
db.prepare(createTableQuery).run();

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.9),
    height: Math.floor(height * 0.9),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Watch for SD card mount/unmount events
const sdCardPath = "/Volumes/Untitled"; // Replace with the actual path to the SD card mount point
const watcher = chokidar.watch(sdCardPath, {
  persistent: true,
  ignored: /(^|[\/\\])\../, // Ignore dotfiles and system files
});

watcher
  .on("add", (filePath) => {
    // console.log(`SD card mounted: ${filePath}`);
    if (mainWindow) {
      mainWindow.webContents.send("sd-card-mounted", String(sdCardPath));
    }
  })
  .on("unlink", (filePath) => {
    console.log(`SD card removed: ${filePath}`);
    if (mainWindow) {
      mainWindow.webContents.send("sd-card-removed");
    }
  });

// IPC handler to get images from a folder
ipcMain.handle("get-images", async (event) => {
  try {
    const imageFiles = await getImagesFromSDCard();
    return imageFiles; // Return the full image file objects
  } catch (error) {
    console.error("Error reading images:", error);
    throw error;
  }
});

// IPC handler to classify an image
ipcMain.handle("classify-image", async (event, imagePath) => {
  try {
    const predictions = await classifyImage(imagePath);
    return predictions;
  } catch (error) {
    console.error("Error classifying image:", error);
    throw error;
  }
});

// IPC handler to unmount the SD card and quit the application
ipcMain.on("unmount-and-quit", () => {
  console.log("unmount called on path: ", sdCardPath);

  // Check if the SD card is mounted
  exec(`diskutil info ${sdCardPath}`, (error, stdout, stderr) => {
    if (error) {
      console.log(`SD card not mounted: ${error.message}`);
      app.quit();
      return;
    }

    // If the SD card is mounted, unmount it forcefully
    exec(
      `diskutil unmountDisk force ${sdCardPath}`,
      (unmountError, unmountStdout, unmountStderr) => {
        if (unmountError) {
          console.error(`Error unmounting SD card: ${unmountError.message}`);
          app.quit();
          return;
        }
        console.log(`SD card unmounted: ${unmountStdout}`);
        app.quit();
      }
    );
  });
});

// IPC handler to add an image to favorites
ipcMain.handle("add-to-favorites", (event, imageSrc) => {
  try {
    // Get userData/favorites path
    const favoritesDir = path.join(app.getPath("userData"), "favorites");
    if (!fs.existsSync(favoritesDir)) {
      fs.mkdirSync(favoritesDir, { recursive: true });
    }
    // Remove file:// prefix if present
    let srcPath = imageSrc;
    if (srcPath.startsWith("file://")) {
      srcPath = srcPath.replace("file://", "");
    }
    // Copy image to favorites dir
    const ext = path.extname(srcPath);
    const baseName = path.basename(srcPath, ext);
    const destName = baseName + ext;
    const destPath = path.join(favoritesDir, destName);
    console.log("favpath", favoritesDir, "destPath", destPath);

    if (!fs.existsSync(favoritesDir)) {
      fs.mkdirSync(favoritesDir, { recursive: true });
      console.log("favdir created", favoritesDir);
    }

    if (fs.existsSync(destPath)) {
      return {
        success: false,
        message: "A file with this name is already in favorites.",
      };
    }

    fs.copyFileSync(srcPath, destPath);
    console.log("Image added to favorites. src", srcPath, "destPath", destPath);

    // Save local path in DB
    const insertQuery = `INSERT OR IGNORE INTO favorites (imageSrc) VALUES (?)`;
    db.prepare(insertQuery).run(destPath);
    return { success: true, message: "Image added to favorites." };
  } catch (error) {
    console.error("Error adding to favorites:", error);
    return { success: false, message: "Failed to add image to favorites." };
  }
});

// IPC handler to remove an image from favorites
ipcMain.handle("remove-from-favorites", (event, imageSrc) => {
  try {
    // Ensure favorites directory exists before removing
    const favoritesDir = path.join(app.getPath("userData"), "favorites");
    if (!fs.existsSync(favoritesDir)) {
      fs.mkdirSync(favoritesDir, { recursive: true });
    }
    // Only remove file from favorites directory
    const fileName = path.basename(imageSrc);
    const favPath = path.join(favoritesDir, fileName);
    if (fs.existsSync(favPath)) {
      try {
        fs.unlinkSync(favPath);
      } catch (err) {
        console.error("Error deleting favorite image file:", err);
      }
    }
    // Remove from DB
    const deleteQuery = `DELETE FROM favorites WHERE imageSrc = ?`;
    db.prepare(deleteQuery).run(imageSrc);
    return { success: true, message: "Image removed from favorites." };
  } catch (error) {
    console.error("Error removing from favorites:", error);
    return {
      success: false,
      message: "Failed to remove image from favorites.",
    };
  }
});

// IPC handler to retrieve all favorite images
ipcMain.handle("get-favorites", () => {
  try {
    const selectQuery = `SELECT imageSrc FROM favorites`;
    const favorites = db.prepare(selectQuery).all();
    return favorites.map((row) => row.imageSrc);
  } catch (error) {
    console.error("Error retrieving favorites:", error);
    return [];
  }
});

// IPC handler to send an email with image attachment
ipcMain.handle("send-email", async (event, emailOptions) => {
  try {
    // Read SMTP config
    const configPath = path.join(__dirname, "email-config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: config.server,
      port: config.port,
      secure: config.port === 465, // true for 465, false for other ports
      auth: {
        user: config.username,
        pass: config.password,
      },
    });

    // Send mail
    const mailOptions = {
      from: config.username,
      to: emailOptions.to,
      subject: emailOptions.subject,
      text: emailOptions.text,
      attachments: [
        {
          path: emailOptions.imagePath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: "Email sent successfully." };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: "Failed to send email: " + error.message,
    };
  }
});
