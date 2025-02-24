const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { classifyImage } = require("./src/main/ml/imageClassifier");
const { getImagesFromSDCard } = require("./src/main/fileManager");

function createWindow() {
  const mainWindow = new BrowserWindow({
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

// IPC handler to get images from a folder
ipcMain.handle("get-images", async (event, folderPath) => {
  try {
    const imageFiles = await getImagesFromSDCard(folderPath);
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
