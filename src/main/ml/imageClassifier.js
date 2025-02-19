const tf = require("@tensorflow/tfjs-node");
const mobilenet = require("@tensorflow-models/mobilenet");

async function classifyImage(imagePath) {
  const model = await mobilenet.load();
  const image = fs.readFileSync(imagePath);
  const tensor = tf.node.decodeImage(image);
  const predictions = await model.classify(tensor);
  return predictions.map(
    (p) => `${p.className} (${(p.probability * 100).toFixed(2)}%)`
  );
}

module.exports = { classifyImage };
