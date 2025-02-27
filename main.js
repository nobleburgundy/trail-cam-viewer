const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const chokidar = require("chokidar");
const { classifyImage } = require("./src/main/ml/imageClassifier");
const { getImagesFromSDCard } = require("./src/main/fileManager");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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
    console.log(`SD card mounted: ${filePath}`);
    if (mainWindow) {
      console.log("mainwindow send sdCardPath", sdCardPath);

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
ipcMain.handle("get-images", async (event, folderPath) => {
  console.log("get-images handler folderPath", folderPath);

  try {
    const fullPath = path.join(folderPath, "DCIM/100EK113");
    const imageFiles = await getImagesFromSDCard(fullPath);
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
