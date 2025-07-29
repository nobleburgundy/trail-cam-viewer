const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onSDCardMounted: (callback) => ipcRenderer.on("sd-card-mounted", callback),
  onSDCardRemoved: (callback) => ipcRenderer.on("sd-card-removed", callback),
  getImages: () => ipcRenderer.invoke("get-images"),
  getImagesFromFolder: (folderPath) =>
    ipcRenderer.invoke("get-images-from-folder", folderPath),
  classifyImage: (imagePath) => ipcRenderer.invoke("classify-image", imagePath),
  unmountAndQuit: () => ipcRenderer.send("unmount-and-quit"),
  addToFavorites: (imageSrc) =>
    ipcRenderer.invoke("add-to-favorites", imageSrc),
  removeFromFavorites: (imageSrc) =>
    ipcRenderer.invoke("remove-from-favorites", imageSrc),
  getFavorites: () => ipcRenderer.invoke("get-favorites"),
  sendEmail: (emailOptions) => ipcRenderer.invoke("send-email", emailOptions),
});

contextBridge.exposeInMainWorld("env", {
  NODE_ENV: process.env.NODE_ENV,
});
