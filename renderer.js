document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded and parsed");

  const statusDiv = document.getElementById("status");
  const imageContainer = document.getElementById("image-container");

  // Check if running in development mode
  const isDevelopment = window.env.NODE_ENV === "development";

  console.log(
    "Running in development mode:",
    isDevelopment,
    "NODE_ENV:",
    window.env.NODE_ENV
  );

  if (isDevelopment) {
    const testPath = "src/test/SD"; // Replace with your test path
    statusDiv.textContent =
      "Running in development mode. Loading test images...";
    loadImages(testPath);
  }

  // Listen for SD card status updates from `sdCardWatcher.js`
  window.electronAPI.onSDCardMounted((sdCardPath) => {
    statusDiv.textContent = "SD Card Detected! Loading images...";
    loadImages(sdCardPath);
  });

  window.electronAPI.onSDCardRemoved(() => {
    statusDiv.textContent = "Waiting for SD card...";
    imageContainer.innerHTML = ""; // Clear images
  });
});

// Function to load images from the SD card
async function loadImages(folderPath) {
  console.log("loadImages called with path:", folderPath);
  const imageContainer = document.getElementById("image-container");
  imageContainer.innerHTML = ""; // Clear previous images

  try {
    // Fetch image list from the main process
    const imageFiles = await window.electronAPI.getImages(folderPath);

    imageFiles.forEach((imageName) => {
      const img = document.createElement("img");
      img.src = `${folderPath}/${imageName}`;
      img.className = "photo";
      img.onclick = () => classifyAndDisplay(img.src);
      imageContainer.appendChild(img);
    });
  } catch (error) {
    console.error("Error loading images:", error);
  }
}

// Function to classify an image and display results
async function classifyAndDisplay(imagePath) {
  try {
    const predictions = await window.electronAPI.classifyImage(imagePath);
    alert(`Predictions: ${predictions.join(", ")}`);
  } catch (error) {
    console.error("Classification error:", error);
    alert("Error classifying image.");
  }
}
