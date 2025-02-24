const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onSDCardMounted: (callback) => ipcRenderer.on("sd-card-mounted", callback),
  onSDCardRemoved: (callback) => ipcRenderer.on("sd-card-removed", callback),
  getImages: (folderPath) => ipcRenderer.invoke("get-images", folderPath),
  classifyImage: (imagePath) => ipcRenderer.invoke("classify-image", imagePath),
});

contextBridge.exposeInMainWorld("env", {
  NODE_ENV: process.env.NODE_ENV,
});
