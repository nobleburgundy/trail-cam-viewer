const fs = require("fs");
const path = require("path");
const localMode = true;

function watchSDCard(win) {
  const volumesPath = localMode ? path.join(__dirname, "../test") : "/Volumes/";
  console.log("volumesPath", volumesPath);

  fs.readdir(volumesPath, (err, drives) => {
    if (err) return console.error(err);

    let sdCard = drives.find((drive) => drive.includes("DCIM"));
    console.log("sdCard", sdCard);

    if (sdCard) {
      console.log(`SD Card found: ${sdCard}`);
      win.webContents.send("sd-card-detected", path.join(volumesPath, sdCard));
    }
  });
}

module.exports = { watchSDCard };
