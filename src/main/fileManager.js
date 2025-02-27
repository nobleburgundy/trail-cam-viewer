const fs = require("fs");
const path = require("path");

// Supported image formats
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".mov",
];
const sdCardBasePath = "/Volumes/Untitled/DCIM";

/**
 * Reads the contents of the SD card directory and returns image files.
 * @param {string} folderPath - The path to the mounted SD card.
 * @returns {Promise<string[]>} - A list of image file names.
 */
function getImagesFromSDCard(folderPath) {
  folderPath = sdCardBasePath;
  console.log("getImagesFromSDCard called with path:", folderPath);

  return new Promise((resolve, reject) => {
    const imageFiles = [];

    function readDirectory(directory) {
      return new Promise((resolve, reject) => {
        fs.readdir(directory, (err, files) => {
          if (err) {
            console.error("Error reading directory:", err);
            return reject(err);
          }

          const promises = files.map((file) => {
            const filePath = path.join(directory, file);
            return new Promise((resolve, reject) => {
              fs.stat(filePath, (err, stats) => {
                if (err) {
                  console.error("Error getting file stats:", err);
                  return reject(err);
                }

                if (stats.isDirectory()) {
                  readDirectory(filePath).then(resolve).catch(reject);
                } else if (
                  IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase())
                ) {
                  imageFiles.push({
                    imageName: file,
                    dateCreated: stats.mtime, // Use modified time as date created
                  });
                  resolve();
                } else {
                  resolve();
                }
              });
            });
          });

          Promise.all(promises).then(resolve).catch(reject);
        });
      });
    }

    readDirectory(folderPath)
      .then(() => resolve(imageFiles))
      .catch(reject);
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
