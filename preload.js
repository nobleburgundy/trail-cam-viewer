const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onSDCardMounted: (callback) => ipcRenderer.on("sd-card-mounted", callback),
  onSDCardRemoved: (callback) => ipcRenderer.on("sd-card-removed", callback),
  getImages: () => ipcRenderer.invoke("get-images"),
  classifyImage: (imagePath) => ipcRenderer.invoke("classify-image", imagePath),
  unmountAndQuit: () => ipcRenderer.send("unmount-and-quit"),
});

contextBridge.exposeInMainWorld("env", {
  NODE_ENV: process.env.NODE_ENV,
});
