const fs = require("fs");
const path = require("path");
const tf = require("@tensorflow/tfjs-node");
const sharp = require("sharp");

const MODEL_PATH = path.join(__dirname, "model");
const LABELS_PATH = path.join(MODEL_PATH, "labels.txt"); // Path to labels file

let model = null;
let classLabels = [];

// Load labels dynamically from file
function loadLabels() {
  try {
    const data = fs.readFileSync(LABELS_PATH, "utf8");
    classLabels = data.split("\n").map((label) => label.trim());
    console.log("Labels loaded:", classLabels);
  } catch (error) {
    console.error("Error loading labels:", error);
    classLabels = ["Unknown"];
  }
}

// Load model asynchronously
async function loadModel() {
  if (!model) {
    console.log("Loading TensorFlow model...");
    model = await tf.loadLayersModel(`file://${MODEL_PATH}/model.json`);
    console.log("Model loaded successfully!");
    loadLabels(); // Load labels when model is ready
  }
}

// Process image and classify
async function classifyImage(imagePath) {
  if (!model) {
    await loadModel();
  }

  try {
    // Load and preprocess image
    const imageBuffer = fs.readFileSync(imagePath);
    const processedImage = await sharp(imageBuffer)
      .resize(224, 224) // Resize to model's expected input size
      .toFormat("jpeg")
      .toBuffer();

    // Convert image buffer to Tensor
    const tensor = tf.node.decodeImage(processedImage, 3).expandDims();

    // Run classification
    const predictions = model.predict(tensor);
    const scores = await predictions.data();
    tensor.dispose();

    // Get the top label predictions
    return interpretPredictions(scores);
  } catch (error) {
    console.error("Error processing image:", error);
    return ["Error processing image"];
  }
}

// Dynamically interpret predictions based on loaded labels
function interpretPredictions(scores) {
  if (classLabels.length === 0) {
    return ["Labels not loaded"];
  }

  const topIndex = scores.indexOf(Math.max(...scores));
  return [`${classLabels[topIndex]} (${(scores[topIndex] * 100).toFixed(2)}%)`];
}

module.exports = {
  classifyImage,
  loadModel,
};
