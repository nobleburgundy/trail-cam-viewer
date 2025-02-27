document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded and parsed");
  const imageContainer = document.getElementById("image-container");

  // Check if running in development mode
  const isDevelopment = window.env.NODE_ENV === "development";

  console.log(
    "Running in development mode:",
    isDevelopment,
    "NODE_ENV:",
    window.env.NODE_ENV
  );

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
    populateImagesOnPage(imageFiles, folderPath);

    return imageFiles;
  } catch (error) {
    console.error("Error loading images:", error);
  }
}

// Function to show image in full view
function showImageInFullView(imageSrc) {
  console.log("showImageinFullView called", imageSrc);

  // Create modal elements
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.tabIndex = -1;
  modal.role = "dialog";

  const modalDialog = document.createElement("div");
  modalDialog.className = "modal-dialog modal-xl";
  modalDialog.role = "document";

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";

  const modalFooter = document.createElement("div");
  modalFooter.className = "modal-footer";

  const closeButton = document.createElement("button");
  closeButton.className = "btn btn-primary close";
  closeButton.type = "button";
  closeButton.setAttribute("data-bs-dismiss", "modal");
  closeButton.ariaLabel = "Close";
  closeButton.innerHTML = '<span aria-hidden="true">Close</span>';

  const modalBody = document.createElement("div");
  modalBody.className = "modal-body";

  const fullViewImage = document.createElement("img");
  fullViewImage.className = "img-fluid";
  fullViewImage.src = imageSrc;

  // Append elements
  modalFooter.appendChild(closeButton);
  modalBody.appendChild(fullViewImage);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  modalDialog.appendChild(modalContent);
  modal.appendChild(modalDialog);
  document.body.appendChild(modal);

  // Show the modal
  $(modal).modal("show");

  // Remove modal from DOM after it is hidden
  $(modal).on("hidden.bs.modal", function () {
    document.body.removeChild(modal);
  });
}

function populateImagesOnPage(images, folderPath) {
  const imageContainer = document.getElementById("image-container");
  imageContainer.innerHTML = ""; // Clear previous images
  groupImagesByDate(images).then((groupedImagesArray) => {
    groupedImagesArray.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
    groupedImagesArray.forEach((group) => {
      const dateHeading = document.createElement("h3");
      dateHeading.textContent = `${group.date} `;

      const badge = document.createElement("span");
      badge.className = "badge text-bg-success";
      badge.textContent = group.files.length;
      dateHeading.appendChild(badge);

      imageContainer.appendChild(dateHeading);

      group.files.forEach((image) => {
        const img = document.createElement("img");
        img.className = "img-fluid m-2";
        img.src = `${folderPath}/${image.imageName}`;
        img.style.width = "200px"; // Set thumbnail width
        img.onclick = () => showImageInFullView(img.src);
        imageContainer.appendChild(img);
      });
    });
  });
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
