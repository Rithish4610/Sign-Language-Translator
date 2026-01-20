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
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiHandLandmarks) {
    const landmarks = results.multiHandLandmarks[0];

    // Draw hand points
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

    // VERY BASIC gesture logic (demo)
    const thumb = landmarks[4];
    const index = landmarks[8];

    if (index.y < thumb.y) {
      output.innerText = "L";
    } else {
      output.innerText = "A";
    }
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
