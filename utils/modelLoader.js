const ort = require('onnxruntime-node');

async function classifyApp(appName) {
  const session = await ort.InferenceSession.create('./model/distraction_model.onnx');
  const tensor = new ort.Tensor('string', [appName], [1, 1]);
  const results = await session.run({ input: tensor });
  return results.label.data[0]; // 0: productive, 1: distracting
}
module.exports = classifyApp;
