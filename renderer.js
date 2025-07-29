document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded and parsed");
  const imageContainer = document.getElementById("image-container");

  // Load test config if present
  let testFolderPath = null;
  let loadImagesFromTestPath = false;
  try {
    const response = await fetch("test-config.json");
    if (response.ok) {
      const config = await response.json();
      if (config.testFolderPath) {
        testFolderPath = config.testFolderPath;
      }
      loadImagesFromTestPath = config.loadImagesFromTestPath;

      console.log("test-config", config);
    }
  } catch (err) {
    console.warn("No test-config.json found or error reading config.");
  }

  // Check if running in development mode
  const isDevelopment = window.env.NODE_ENV === "development";
  // loadImages(testFolderPath, loadImagesFromTestPath);

  // Listen for SD card status updates from `sdCardWatcher.js`
  window.electronAPI.onSDCardMounted((sdCardPath) => {
    console.log("SD Card Detected! Loading images", "sdCardPath", sdCardPath);
    loadImages(testFolderPath, loadImagesFromTestPath);
  });

  window.electronAPI.onSDCardRemoved(() => {
    console.log("Waiting for SD card...");
    imageContainer.innerHTML = ""; // Clear images
  });

  // Add event listener for unmount button
  const unmountButton = document.getElementById("unmount-button");
  unmountButton.addEventListener("click", () => {
    console.log("unmount button clicked");
    window.electronAPI.unmountAndQuit();
  });

  window.showingFavorites = false;
  const favoritesButton = document.getElementById("favorites-button");
  favoritesButton.addEventListener("click", async () => {
    window.showingFavorites = !window.showingFavorites;
    if (window.showingFavorites) {
      favoritesButton.textContent = "Show All";
      // Get userData/favorites path from main process
      const favoritesPath = await window.electronAPI.getFavoritesPath();
      console.log("Favorites directory:", favoritesPath);
      loadFavorites();
    } else {
      favoritesButton.textContent = "Favorites";
      loadImages(testFolderPath, loadImagesFromTestPath);
    }
  });
});

// Function to load images from the SD card or test folder
async function loadImages(
  testFolderPath = null,
  loadImagesFromTestPath = false
) {
  try {
    let imageFiles;
    if (loadImagesFromTestPath && testFolderPath) {
      console.log("loading images from test folder", testFolderPath);
      imageFiles = await window.electronAPI.getImagesFromFolder(testFolderPath);
      console.log("imageFiles", imageFiles);
    } else {
      imageFiles = await window.electronAPI.getImages();
    }
    populateImagesOnPage(imageFiles);
    return imageFiles;
  } catch (error) {
    console.error("Error loading images:", error);
  }
}

// Function to show video in full view
function showVideoInFullView(videoSrc) {
  console.log("showVideoInFullView called", videoSrc);

  // Create modal elements
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.tabIndex = -1;
  modal.role = "dialog";

  const modalDialog = document.createElement("div");
  modalDialog.className = "modal-dialog";
  modalDialog.role = "document";

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";

  const modalFooter = document.createElement("div");
  modalFooter.className = "modal-footer";

  // Favorites button logic for videos
  (async () => {
    const favorites = await window.electronAPI.getFavorites();
    // Compare base filename (without timestamp) for favorites check
    const getBaseName = (filePath) => {
      const fileName = filePath.split("/").pop();
      // Remove timestamp if present (e.g., VID_1234567890123.MOV -> VID.MOV)
      return fileName.replace(/_\d{13}(\.[^.]+)$/i, "$1");
    };
    const videoBase = getBaseName(videoSrc);
    let isFavorite = favorites.some((fav) => getBaseName(fav) === videoBase);

    let favButton;
    if (isFavorite) {
      if (window.showingFavorites) {
        favButton = document.createElement("button");
        favButton.className = "btn btn-danger me-auto";
        favButton.type = "button";
        favButton.textContent = "Remove from Favorites";
        favButton.onclick = async () => {
          try {
            const response = await window.electronAPI.removeFromFavorites(
              videoSrc
            );
            console.log(`Removed from Favorites: ${videoSrc}`);
            alert(response.message);
            $(modal).modal("hide");
            // Refresh favorites after modal is hidden
            $(modal).on("hidden.bs.modal", function () {
              loadFavorites();
            });
          } catch (error) {
            console.error("Error removing from favorites:", error);
            alert("Failed to remove video from favorites.");
          }
        };
      } else {
        favButton = document.createElement("span");
        favButton.className = "text-success me-auto";
        favButton.innerHTML =
          'Added to Favorites. <a href="#" id="goto-favorites">Go to Favorites</a>';
        setTimeout(() => {
          const link = document.getElementById("goto-favorites");
          if (link) {
            link.onclick = (e) => {
              e.preventDefault();
              window.showingFavorites = true;
              document.getElementById("favorites-button").click();
              $(modal).modal("hide");
            };
          }
        }, 0);
      }
    } else {
      favButton = document.createElement("button");
      favButton.className = "btn btn-warning me-auto";
      favButton.type = "button";
      favButton.textContent = "Add to Favorites";
      favButton.onclick = () => {
        saveToFavorites(videoSrc);
      };
    }

    const closeButton = document.createElement("button");
    closeButton.className = "btn btn-primary close";
    closeButton.type = "button";
    closeButton.setAttribute("data-bs-dismiss", "modal");
    closeButton.ariaLabel = "Close";
    closeButton.innerHTML = '<span aria-hidden="true">Close</span>';

    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";

    const fullViewVideo = document.createElement("video");
    fullViewVideo.className = "img-fluid";
    fullViewVideo.src = videoSrc;
    fullViewVideo.controls = true;

    // Append elements
    modalFooter.appendChild(favButton);
    modalFooter.appendChild(closeButton);
    modalBody.appendChild(fullViewVideo);
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
  })();
}

// Function to show image in full view
async function showImageInFullView(imageSrc) {
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

  const favorites = await window.electronAPI.getFavorites();
  // Compare base filename (without timestamp) for favorites check
  const getBaseName = (filePath) => {
    const fileName = filePath.split("/").pop();
    // Remove timestamp if present (e.g., IMG_1234567890123.JPG -> IMG.JPG)
    return fileName.replace(/_\d{13}(\.[^.]+)$/i, "$1");
  };
  const imageBase = getBaseName(imageSrc);
  let isFavorite = favorites.some((fav) => getBaseName(fav) === imageBase);

  let favButton;
  if (isFavorite) {
    if (window.showingFavorites) {
      favButton = document.createElement("button");
      favButton.className = "btn btn-danger me-auto";
      favButton.type = "button";
      favButton.textContent = "Remove from Favorites";
      favButton.onclick = async () => {
        try {
          const response = await window.electronAPI.removeFromFavorites(
            imageSrc
          );
          console.log(`Removed from Favorites: ${imageSrc}`);
          alert(response.message);
          $(modal).modal("hide");
          // Refresh favorites after modal is hidden
          $(modal).on("hidden.bs.modal", function () {
            loadFavorites();
          });
        } catch (error) {
          console.error("Error removing from favorites:", error);
          alert("Failed to remove image from favorites.");
        }
      };
    } else {
      favButton = document.createElement("span");
      favButton.className = "text-success me-auto";
      favButton.innerHTML =
        'Added to Favorites. <a href="#" id="goto-favorites">Go to Favorites</a>';
      setTimeout(() => {
        const link = document.getElementById("goto-favorites");
        if (link) {
          link.onclick = (e) => {
            e.preventDefault();
            window.showingFavorites = true;
            document.getElementById("favorites-button").click();
            $(modal).modal("hide");
          };
        }
      }, 0);
    }
  } else {
    favButton = document.createElement("button");
    favButton.className = "btn btn-warning me-auto";
    favButton.type = "button";
    favButton.textContent = "Add to Favorites";
    favButton.onclick = () => {
      saveToFavorites(imageSrc);
    };
  }

  const closeButton = document.createElement("button");
  closeButton.className = "btn btn-primary close";
  closeButton.type = "button";
  closeButton.setAttribute("data-bs-dismiss", "modal");
  closeButton.ariaLabel = "Close";
  closeButton.innerHTML = '<span aria-hidden="true">Close</span>';

  // Email button hidden for now
  // const emailButton = document.createElement("button");
  // emailButton.className = "btn btn-info";
  // emailButton.type = "button";
  // emailButton.textContent = "Email";
  // emailButton.display = "none";
  // emailButton.onclick = () => {
  //   // Show email modal form
  //   showEmailModal(imageSrc);
  // };

  const modalBody = document.createElement("div");
  modalBody.className = "modal-body";

  const fullViewImage = document.createElement("img");
  fullViewImage.className = "img-fluid";
  fullViewImage.src = imageSrc;

  // Append elements
  modalFooter.appendChild(favButton);
  // modalFooter.appendChild(emailButton); // Email button hidden for now
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

async function saveToFavorites(imageSrc) {
  try {
    const response = await window.electronAPI.addToFavorites(imageSrc);
    alert(response.message);
  } catch (error) {
    console.error("Error saving to favorites:", error);
    alert("Failed to save image to favorites.");
  }
}

async function loadFavorites() {
  try {
    const favorites = await window.electronAPI.getFavorites();
    const imageContainer = document.getElementById("image-container");
    imageContainer.innerHTML = ""; // Clear previous images

    if (favorites.length === 0) {
      imageContainer.innerHTML =
        "<p class='text-center'>No favorite images found.</p>";
      return;
    }

    favorites.forEach((imageSrc) => {
      const img = document.createElement("img");
      img.className = "img-fluid m-2";
      img.src = imageSrc;
      img.style.width = "200px"; // Set thumbnail width
      img.style.cursor = "pointer";
      // Pass the actual file path, not the URL, to the modal
      img.onclick = () => showImageInFullView(imageSrc);
      imageContainer.appendChild(img);
    });
  } catch (error) {
    console.error("Error loading favorites:", error);
    alert("Failed to load favorite images.");
  }
}

function populateImagesOnPage(images) {
  const imageContainer = document.getElementById("image-container");
  imageContainer.innerHTML = ""; // Clear previous images
  groupImagesByDate(images).then((groupedImagesArray) => {
    groupedImagesArray.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
    console.log("gropuedImagesArray", groupedImagesArray);

    groupedImagesArray.forEach((group) => {
      const dateHeading = document.createElement("h3");
      dateHeading.className = "text-center";
      dateHeading.textContent = `${group.date} `;

      const badge = document.createElement("span");
      badge.className = "badge rounded-pill text-bg-success";
      badge.textContent = group.files.length;
      dateHeading.appendChild(badge);

      imageContainer.appendChild(dateHeading);

      group.files.forEach((image) => {
        if (image.imageName.indexOf(".mov") > -1) {
          const videoElement = document.createElement("video");
          videoElement.className = "object-fit-contain";
          videoElement.src = image.imagePath;
          videoElement.style.width = "200px";
          videoElement.style.cursor = "pointer";
          videoElement.onclick = () => {
            showVideoInFullView(videoElement.src);
          };
          imageContainer.appendChild(videoElement);
        } else {
          const img = document.createElement("img");
          img.className = "img-fluid m-2";
          img.src = image.imagePath;
          img.style.width = "200px"; // Set thumbnail width
          img.style.cursor = "pointer";
          img.onclick = () => {
            showImageInFullView(image.imagePath);
          };
          imageContainer.appendChild(img);
        }
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

// Add email modal form functionality
function showEmailModal(imageSrc) {
  // Create modal elements
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.tabIndex = -1;
  modal.role = "dialog";

  const modalDialog = document.createElement("div");
  modalDialog.className = "modal-dialog";
  modalDialog.role = "document";

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";

  const modalHeader = document.createElement("div");
  modalHeader.className = "modal-header";
  modalHeader.innerHTML = '<h5 class="modal-title">Send Image via Email</h5>';

  const modalBody = document.createElement("div");
  modalBody.className = "modal-body";

  // Email form
  const form = document.createElement("form");
  form.innerHTML = `
  <div class="mb-3">
    <label for="recipient" class="form-label">Recipient Email</label>
    <input type="email" class="form-control" id="recipient" required />
  </div>
  <div class="mb-3">
    <label for="subject" class="form-label">Subject</label>
    <input type="text" class="form-control" id="subject" value="Trail Cam Image" required />
  </div>
  <div class="mb-3">
    <label for="message" class="form-label">Message</label>
    <textarea class="form-control" id="message" rows="3">See attached image from Trail Cam Viewer.</textarea>
  </div>
  <button type="submit" class="btn btn-primary">Send Email</button>
`;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const to = form.querySelector("#recipient").value;
    const subject = form.querySelector("#subject").value;
    const text = form.querySelector("#message").value;
    // Send email via IPC
    const result = await window.electronAPI.sendEmail({
      to,
      subject,
      text,
      imagePath: imageSrc,
    });
    alert(result.message);
    $(modal).modal("hide");
  };

  modalBody.appendChild(form);
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
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
// Function to load images from the SD card or test folder
async function loadImages(
  testFolderPath = null,
  loadImagesFromTestPath = false
) {
  try {
    let imageFiles;
    if (loadImagesFromTestPath && testFolderPath) {
      console.log("loading images from test folder", testFolderPath);

      // Use test folder path if specified and enabled
      imageFiles = await window.electronAPI.getImagesFromFolder(testFolderPath);
      console.log("imageFiles", imageFiles);
    } else {
      // Default: Fetch image list from the main process (SD card)
      imageFiles = await window.electronAPI.getImages();
    }
    populateImagesOnPage(imageFiles);
    return imageFiles;
  } catch (error) {
    console.error("Error loading images:", error);
  }
}

// Function to show video in full view
function showVideoInFullView(videoSrc) {
  console.log("showVideoInFullView called", videoSrc);

  // Create modal elements
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.tabIndex = -1;
  modal.role = "dialog";

  const modalDialog = document.createElement("div");
  modalDialog.className = "modal-dialog";
  modalDialog.role = "document";

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";

  const modalFooter = document.createElement("div");
  modalFooter.className = "modal-footer";

  loadImages(testFolderPath, loadImagesFromTestPath);
  closeButton.className = "btn btn-primary close";
  closeButton.type = "button";
  closeButton.setAttribute("data-bs-dismiss", "modal");
  closeButton.ariaLabel = "Close";
  closeButton.innerHTML = '<span aria-hidden="true">Close</span>';

  async function loadImages(
    testFolderPath = null,
    loadImagesFromTestPath = false
  ) {
    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";

    const fullViewVideo = document.createElement("video");
    fullViewVideo.className = "img-fluid";
    fullViewVideo.src = videoSrc;
    fullViewVideo.controls = true;

    // Append elements
    modalFooter.appendChild(closeButton);
    modalBody.appendChild(fullViewVideo);
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

  // Function to show image in full view
  async function showImageInFullView(imageSrc) {
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

    const favorites = await window.electronAPI.getFavorites();
    let isFavorite = favorites.includes(imageSrc);

    let favButton;
    if (isFavorite) {
      favButton = document.createElement("button");
      favButton.className = "btn btn-danger";
      favButton.type = "button";
      favButton.textContent = "Remove from Favorites";
      favButton.onclick = async () => {
        try {
          const response = await window.electronAPI.removeFromFavorites(
            imageSrc
          );
          console.log(`Removed from Favorites: ${imageSrc}`);
          alert(response.message);
          $(modal).modal("hide");
        } catch (error) {
          console.error("Error removing from favorites:", error);
          alert("Failed to remove image from favorites.");
        }
      };
    } else {
      favButton = document.createElement("button");
      favButton.className = "btn btn-warning";
      favButton.type = "button";
      favButton.textContent = "Add to Favorites";
      favButton.onclick = () => {
        saveToFavorites(imageSrc);
      };
    }

    const closeButton = document.createElement("button");
    closeButton.className = "btn btn-primary close";
    closeButton.type = "button";
    closeButton.setAttribute("data-bs-dismiss", "modal");
    closeButton.ariaLabel = "Close";
    closeButton.innerHTML = '<span aria-hidden="true">Close</span>';

    // Email button
    const emailButton = document.createElement("button");
    emailButton.className = "btn btn-info";
    emailButton.type = "button";
    emailButton.textContent = "Email";
    emailButton.display = "none";
    emailButton.onclick = () => {
      // Show email modal form
      showEmailModal(imageSrc);
    };

    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";

    const fullViewImage = document.createElement("img");
    fullViewImage.className = "img-fluid";
    fullViewImage.src = imageSrc;

    // Append elements
    modalFooter.appendChild(favButton);
    modalFooter.appendChild(emailButton);
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

  async function saveToFavorites(imageSrc) {
    try {
      const response = await window.electronAPI.addToFavorites(imageSrc);
      alert(response.message);
    } catch (error) {
      console.error("Error saving to favorites:", error);
      alert("Failed to save image to favorites.");
    }
  }

  async function loadFavorites() {
    try {
      const favorites = await window.electronAPI.getFavorites();
      const imageContainer = document.getElementById("image-container");
      imageContainer.innerHTML = ""; // Clear previous images

      if (favorites.length === 0) {
        imageContainer.innerHTML =
          "<p class='text-center'>No favorite images found.</p>";
        return;
      }

      favorites.forEach((imageSrc) => {
        const img = document.createElement("img");
        img.className = "img-fluid m-2";
        img.src = imageSrc;
        img.style.width = "200px"; // Set thumbnail width
        img.style.cursor = "pointer";
        img.onclick = () => showImageInFullView(img.src);
        imageContainer.appendChild(img);
      });
    } catch (error) {
      console.error("Error loading favorites:", error);
      alert("Failed to load favorite images.");
    }
  }

  function populateImagesOnPage(images) {
    const imageContainer = document.getElementById("image-container");
    imageContainer.innerHTML = ""; // Clear previous images
    groupImagesByDate(images).then((groupedImagesArray) => {
      groupedImagesArray.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
      console.log("gropuedImagesArray", groupedImagesArray);

      groupedImagesArray.forEach((group) => {
        const dateHeading = document.createElement("h3");
        dateHeading.className = "text-center";
        dateHeading.textContent = `${group.date} `;

        const badge = document.createElement("span");
        badge.className = "badge rounded-pill text-bg-success";
        badge.textContent = group.files.length;
        dateHeading.appendChild(badge);

        imageContainer.appendChild(dateHeading);

        group.files.forEach((image) => {
          // console.log(
          //   "populateImagesonPath image name and path",
          //   image.imageName,
          //   image.imagePath
          // );

          if (image.imageName.indexOf(".mov") > -1) {
            // this is a video file
            const videoElement = document.createElement("video");
            videoElement.className = "object-fit-contain";
            videoElement.src = image.imagePath;
            videoElement.style.width = "200px";
            videoElement.style.cursor = "pointer";
            videoElement.onclick = () => {
              showVideoInFullView(videoElement.src);
            };
            imageContainer.appendChild(videoElement);
          } else {
            const img = document.createElement("img");
            img.className = "img-fluid m-2";
            img.src = image.imagePath;
            img.style.width = "200px"; // Set thumbnail width
            img.style.cursor = "pointer";
            img.onclick = () => {
              showImageInFullView(img.src);
            };
            imageContainer.appendChild(img);
          }
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

  // Add email modal form functionality
  function showEmailModal(imageSrc) {
    // Create modal elements
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.role = "dialog";

    const modalDialog = document.createElement("div");
    modalDialog.className = "modal-dialog";
    modalDialog.role = "document";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    const modalHeader = document.createElement("div");
    modalHeader.className = "modal-header";
    modalHeader.innerHTML = '<h5 class="modal-title">Send Image via Email</h5>';

    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";

    // Email form
    const form = document.createElement("form");
    form.innerHTML = `
    <div class="mb-3">
      <label for="recipient" class="form-label">Recipient Email</label>
      <input type="email" class="form-control" id="recipient" required />
    </div>
    <div class="mb-3">
      <label for="subject" class="form-label">Subject</label>
      <input type="text" class="form-control" id="subject" value="Trail Cam Image" required />
    </div>
    <div class="mb-3">
      <label for="message" class="form-label">Message</label>
      <textarea class="form-control" id="message" rows="3">See attached image from Trail Cam Viewer.</textarea>
    </div>
    <button type="submit" class="btn btn-primary">Send Email</button>
  `;

    form.onsubmit = async (e) => {
      e.preventDefault();
      const to = form.querySelector("#recipient").value;
      const subject = form.querySelector("#subject").value;
      const text = form.querySelector("#message").value;
      // Send email via IPC
      const result = await window.electronAPI.sendEmail({
        to,
        subject,
        text,
        imagePath: imageSrc,
      });
      alert(result.message);
      $(modal).modal("hide");
    };

    modalBody.appendChild(form);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
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
}
