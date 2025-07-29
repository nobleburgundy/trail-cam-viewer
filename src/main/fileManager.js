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
const sdCardFolderName = "DCIM";

/**
 * Finds the path that contains the "DCIM" folder starting with "Volumes" but excludes "Macintosh HD".
 * @returns {string|null} - The path to the "DCIM" folder or null if not found.
 */
function findSDCardPath() {
  const volumesPath = "/Volumes";
  const directories = fs.readdirSync(volumesPath);

  for (const dir of directories) {
    if (dir !== "Macintosh HD") {
      const potentialPath = path.join(volumesPath, dir, sdCardFolderName);
      if (fs.existsSync(potentialPath)) {
        return potentialPath;
      }
    }
  }

  return null;
}

/**
 * Reads the contents of the SD card directory and returns image files.
 * @param {string} folderPath - The path to the mounted SD card.
 * @returns {Promise<string[]>} - A list of image file names, path, and date modified.
 */
function getImagesFromSDCard() {
  // console.log("getImagesFromSDCard called with path:", folderPath);
  const folderPath = findSDCardPath();
  // console.log(
  //   "getImagesFromSDCard folderPath",
  //   folderPath,
  //   "(from find sd card path function)"
  // );

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
                  IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()) &&
                  // exclude files that start with "._" that can be temps after copied
                  file.substring(0, 1) !== "."
                ) {
                  imageFiles.push({
                    imageName: file,
                    imagePath: filePath,
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

/**
 * Reads the contents of any folder and returns image files (same format as SD card).
 * @param {string} folderPath - The path to the folder.
 * @returns {Promise<Array>} - List of image file objects.
 */
function getImagesFromFolder(folderPath) {
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
                  IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()) &&
                  file.substring(0, 1) !== "."
                ) {
                  imageFiles.push({
                    imageName: file,
                    imagePath: filePath,
                    dateCreated: stats.mtime,
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

module.exports = {
  getImagesFromSDCard,
  getImagesFromFolder,
  checkIfPathExists,
};
