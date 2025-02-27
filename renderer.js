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
    // statusDiv.textContent =
    //   "Running in development mode. Loading test images...";
  }
  loadImages();

  // Listen for SD card status updates from `sdCardWatcher.js`
  window.electronAPI.onSDCardMounted((sdCardPath) => {
    console.log("SD Card Detected! Loading images", "sdCardPath", sdCardPath);
    loadImages();
  });

  window.electronAPI.onSDCardRemoved(() => {
    console.log("Waiting for SD card...");
    imageContainer.innerHTML = ""; // Clear images
  });
});

// Function to load images from the SD card
async function loadImages() {
  try {
    const sdCardBasePath = "/Volumes/Untitled/DCIM";

    // Fetch image list from the main process
    var folderPath = sdCardBasePath + "/100EK113/";

    const imageFiles = await window.electronAPI.getImages(folderPath);
    console.log("imageFiles", imageFiles);
    populateImagesOnPage(imageFiles, folderPath);

    return imageFiles;
  } catch (error) {
    console.error("Error loading images:", error);
  }
}

// function populateImagesOnPage(images) {
//   Object.keys(images).forEach(image => {
//     const img = document.createElement('img');
//     img.className = 'img-fluid p-4 m-2'
//     img.src =
//   })
// }

function populateImagesOnPage(images, folderPath) {
  const imageContainer = document.getElementById("image-container");
  imageContainer.innerHTML = ""; // Clear previous images
  groupImagesByDate(images).then((groupedImagesArray) => {
    groupedImagesArray.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
    groupedImagesArray.forEach((group) => {
      const dateHeading = document.createElement("h3");
      dateHeading.textContent = `${group.date} `;

      const badge = document.createElement("span");
      badge.className = "badge badge-primary";
      badge.textContent = group.files.length;
      dateHeading.appendChild(badge);

      imageContainer.appendChild(dateHeading);

      group.files.forEach((image) => {
        const img = document.createElement("img");
        img.className = "img-fluid m-2";
        img.src = `${folderPath}/${image.imageName}`;
        img.style.width = "200px"; // Set thumbnail width
        imageContainer.appendChild(img);
      });
    });
  });
  // images.forEach((image) => {
  //   const img = document.createElement("img");
  //   img.className = "img-fluid m-2";
  //   img.src = `${folderPath}/${image.imageName}`;
  //   img.style.width = "200px"; // Set thumbnail width
  //   imageContainer.appendChild(img);
  // });
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
  console.log("imagefiles", imageFiles);

  imageFiles.forEach((file) => {
    console.log("file", file);

    const date = new Date(file.dateCreated).toLocaleDateString("en-US");
    if (!groupedImages[date]) {
      groupedImages[date] = [];
    }
    groupedImages[date].push(file);
  });

  const groupedImagesArray = Object.keys(groupedImages).map((date) => {
    return {
      date,
      files: groupedImages[date].sort(
        (a, b) => new Date(a.dateCreated) - new Date(b.dateCreated)
      ),
    };
  });

  return groupedImagesArray;
}
