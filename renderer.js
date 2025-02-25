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

async function populateSidebar(imageFiles) {
  const sidebarContainer = document.getElementById("sidebar-ul");
  const groupedImages = await groupImagesByDate(imageFiles);
  console.log("groupedImages", groupedImages);

  Object.keys(groupedImages).forEach((date) => {
    const li = document.createElement("li");
    li.className = "nav-item";
    const button = document.createElement("button");
    button.className = "btn btn-link";
    button.textContent = date; // Use the date as the button text
    li.appendChild(button);
    sidebarContainer.appendChild(li);
  });
}

// Function to load images from the SD card
async function loadImages(folderPath) {
  console.log("loadImages called with path:", folderPath);
  const imageContainer = document.getElementById("image-container");
  imageContainer.innerHTML = ""; // Clear previous images

  try {
    // Fetch image list from the main process
    const imageFiles = await window.electronAPI.getImages(folderPath);
    console.log("imageFiles: ", imageFiles);
    populateSidebar(imageFiles);

    imageFiles.forEach((file) => {
      const img = document.createElement("img");
      img.src = `${folderPath}/${file.imageName}`;
      img.className = "photo";
      img.onclick = () => classifyAndDisplay(img.src);
      imageContainer.appendChild(img);

      const label = document.createElement("div");
      label.className = "figure-caption";
      const fileDate = new Date(file.dateCreated); // Use the dateCreated from the file object
      label.textContent = fileDate.toLocaleDateString("en-US");
      imageContainer.appendChild(label);
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

// Interface for an array of images grouped by date
async function groupImagesByDate(imageFiles) {
  const groupedImages = {};

  imageFiles.forEach((file) => {
    const date = new Date(file.dateCreated).toLocaleDateString("en-US");
    if (!groupedImages[date]) {
      groupedImages[date] = [];
    }
    groupedImages[date].push(file);
  });

  return groupedImages;
}
