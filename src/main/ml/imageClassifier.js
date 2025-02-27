// const fs = require("fs");
// const tf = require("@tensorflow/tfjs-node");
// const mobilenet = require("@tensorflow-models/mobilenet");

// async function classifyImage(imagePath) {
//   const model = await mobilenet.load();
//   // Remove 'file://' protocol if present
//   const normalizedPath = imagePath.startsWith("file://")
//     ? imagePath.slice(7)
//     : imagePath;
//   const image = fs.readFileSync(normalizedPath);
//   const tensor = tf.node.decodeImage(image);
//   const predictions = await model.classify(tensor);
//   return predictions.map(
//     (p) => `${p.className} (${(p.probability * 100).toFixed(2)}%)`
//   );
// }

// module.exports = { classifyImage };
