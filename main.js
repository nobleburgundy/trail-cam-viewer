const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sdCardWatcher = require("./src/main/sdCardWatcher");
const imageClassifier = require("./src/main/ml/imageClassifier");

let mainWindow;

app
  .whenReady()
  .then(() => {
    console.log("App is ready");

    mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        nodeIntegration: false, // Security best practice
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"), // Loads a secure script
      },
    });

    mainWindow
      .loadFile(path.join(__dirname, "index.html"))
      .then(() => {
        console.log("Main window loaded successfully");
      })
      .catch((err) => {
        console.error("Failed to load main window:", err);
      });

    sdCardWatcher.watchSDCard(mainWindow);
  })
  .catch((err) => {
    console.error("App failed to start:", err);
  });

ipcMain.handle("classify-image", async (event, imagePath) => {
  const result = await imageClassifier.classifyImage(imagePath);
  return result;
});
