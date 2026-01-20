// --- MODEL LOADING & PREDICTION ---
let model;
async function loadModel() {
  try {
    model = await tf.loadLayersModel("model/model.json");
    console.log("Model loaded.");
  } catch (e) {
    console.warn("Model not found. Prediction disabled.");
  }
}
loadModel();

let currentWord = "";
let fullSentence = "";
let lastLetter = "";
let lastTime = 0;

function updateText(letter) {
  const now = Date.now();
  if (letter !== lastLetter && now - lastTime > 800) {
    currentWord += letter;
    document.getElementById("word").innerText = currentWord;
    lastLetter = letter;
    lastTime = now;
  }
}

function predictLetter(landmarks) {
  if (!model) return;
  const input = [];
  landmarks.forEach(p => {
    input.push(p.x);
    input.push(p.y);
  });
  const tensor = tf.tensor([input]);
  const prediction = model.predict(tensor);
  const probs = prediction.dataSync();
  const index = prediction.argMax(1).dataSync()[0];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const predictedLetter = letters[index] || "?";
  output.innerText = predictedLetter;
  // Confidence meter
  const maxProb = Math.max(...probs);
  const confidence = (maxProb * 100).toFixed(1);
  document.getElementById("confidence").innerText = confidence + "%";
  updateText(predictedLetter);
  prediction.dispose();
  tensor.dispose();
}
// --- END MODEL LOADING & PREDICTION ---
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const output = document.getElementById("output");

canvas.width = 480;
canvas.height = 360;


const hands = new Hands({
  locateFile: file => 
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    // Draw hand points for all hands
    results.multiHandLandmarks.forEach(landmarks => {
      landmarks.forEach(point => {
        ctx.beginPath();
        ctx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          5,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
      });
    });

    // --- DATA COLLECTION MODE ---
    // Press 'd' to save current hand landmarks with currentLabel
    // Change currentLabel manually in code for each letter
    if (window.dataCollectionMode) {
      // Only collect if one hand (for dataset consistency)
      if (results.multiHandLandmarks.length === 1) {
        saveLandmarks(results.multiHandLandmarks[0]);
        output.innerText = `Collecting: ${currentLabel}`;
      }
    } else {
      // Two-hand support: combine landmarks if two hands
      let inputLandmarks;
      if (results.multiHandLandmarks.length === 2) {
        inputLandmarks = [...results.multiHandLandmarks[0], ...results.multiHandLandmarks[1]];
      } else {
        inputLandmarks = results.multiHandLandmarks[0];
      }
      predictLetter(inputLandmarks);
    }
    // --- END DATA COLLECTION MODE ---
  // --- WORD/SENTENCE CONTROLS ---
  document.getElementById("spaceBtn").onclick = () => {
    fullSentence += currentWord + " ";
    currentWord = "";
    document.getElementById("sentence").innerText = fullSentence;
    document.getElementById("word").innerText = "—";
  };

  document.getElementById("clearBtn").onclick = () => {
    currentWord = "";
    fullSentence = "";
    document.getElementById("word").innerText = "—";
    document.getElementById("sentence").innerText = "—";
  };
  // --- END WORD/SENTENCE CONTROLS ---
  // --- DATA COLLECTION LOGIC ---
  let collectedData = [];
  let currentLabel = "A"; // Change this manually for each letter
  window.dataCollectionMode = false; // Toggle this to true to collect

  function saveLandmarks(landmarks) {
    const row = [];
    landmarks.forEach(p => {
      row.push(p.x);
      row.push(p.y);
    });
    row.push(currentLabel);
    collectedData.push(row);
  }

  window.addEventListener("keydown", e => {
    if (e.key === "s") {
      // Download collected data as CSV
      if (collectedData.length > 0) {
        let csv = collectedData.map(row => row.join(",")).join("\n");
        let blob = new Blob([csv], { type: "text/csv" });
        let a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "dataset.csv";
        a.click();
      } else {
        console.log("No data collected yet.");
      }
    }
    if (e.key === "d") {
      window.dataCollectionMode = !window.dataCollectionMode;
      output.innerText = window.dataCollectionMode ? `Collecting: ${currentLabel}` : "Paused";
    }
  });
  // --- END DATA COLLECTION LOGIC ---
  }
});

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 480,
  height: 360
});

camera.start();
