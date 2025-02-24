const fs = require("fs");
const path = require("path");

// Supported image formats
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

/**
 * Reads the contents of the SD card directory and returns image files.
 * @param {string} folderPath - The path to the mounted SD card.
 * @returns {Promise<string[]>} - A list of image file names.
 */
function getImagesFromSDCard(folderPath) {
  console.log("getImagesFromSDCard called with path:", folderPath);

  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        console.error("Error reading SD card:", err);
        return reject(err);
      }

      // Filter only image files and get their stats
      const imageFiles = files
        .filter((file) => {
          return IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase());
        })
        .map((file) => {
          const filePath = path.join(folderPath, file);
          const stats = fs.statSync(filePath);
          console.log("stats: ", stats);
          // Check if the file is a file (not a directory)

          return {
            imageName: file,
            dateCreated: stats.mtime, // Use modified time as date created
          };
        });

      resolve(imageFiles);
    });
  });
}

/**
 * Checks if a given path exists (e.g., verifying SD card mount status).
 * @param {string} folderPath - The path to check.
 * @returns {boolean} - True if the path exists, false otherwise.
 */
function checkIfPathExists(folderPath) {
  const pathExists = fs.existsSync(folderPath);
  if (pathExists) {
    console.log(`Path found: ${folderPath}`);
  } else {
    console.log(`Path not found: ${folderPath}`);
  }
  return pathExists;
}

module.exports = {
  getImagesFromSDCard,
  checkIfPathExists,
};
