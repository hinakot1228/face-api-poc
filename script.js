const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const displaySize = { width: 640, height: 480 };
const canvasOverlay = document.getElementById("snapshot-overlay");

const captureButton = document.getElementById("capture");

let isRunning = false;

async function startVideo() {
  try {
    // Webカメラのストリーミングを開始
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
    console.log("Webcam streaming started");
  } catch (err) {
    console.error("Error accessing webcam:", err);
  }
}

async function loadModels() {
  try {
    const MODEL_URL = "./weights";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
    console.log("Models loaded successfully");
  } catch (error) {
    console.error("Error loading models:", error);
  }
}

async function onPlay() {
  if (!isRunning) return;

  // ビデオが再生中の場合
  if (!video.paused && !video.ended) {
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const detections = await faceapi
      .detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416 })
      )
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withAgeAndGender();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // ctx.clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

    // 年齢と性別の推定結果を描画
    resizedDetections.forEach((detection) => {
      const { age, gender } = detection;
      const { x, y, width, height } = detection.detection.box;

      const nosePoints = detection.landmarks.getNose();
      const noseTip = nosePoints[3];

      const boxSize = 10;
      const startX = Math.max(0, Math.round(noseTip.x - boxSize / 2));
      const startY = Math.max(0, Math.round(noseTip.y - boxSize / 2));

      const noseData = ctx.getImageData(startX, startY, boxSize, boxSize);
      console.log("noseData", noseData);
      const { r, g, b } = calculateAverageColor(noseData.data);

      const colorCode = rgbToHex(r, g, b);
      console.log("colorCode", colorCode);

      // 年齢と性別を描画
      const text = `${Math.round(age)} years old, ${gender} average color`;
      ctx.fillStyle = "red";
      ctx.fillText(text, x, y - 30); // 顔の上部に表示
    });
  }
  requestAnimationFrame(onPlay);
}

function calculateAverageColor(data) {
  let r = 0,
    g = 0,
    b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function rgbToHex(r, g, b) {
  const toHex = (component) => component.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function main() {
  await loadModels();
  await startVideo();

  // ビデオがメタデータを読み込んだ後に幅と高さを取得
  video.addEventListener("loadedmetadata", () => {
    const displaySize = { width: video.videoWidth, height: video.videoHeight };

    // キャンバスのサイズをビデオに合わせる
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    // ボタンを取得
    const button = document.getElementById("capture");

    // ボタンで制御
    button.addEventListener("click", () => {
      if (!isRunning) {
        isRunning = true; // フラグをオン
        onPlay(); // 処理を開始
      } else {
        isRunning = false; // フラグをオフ
        console.log("Stopped processing");
      }
    });
  });
}

captureButton.addEventListener("click", () => {
  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const canvasData = context.getImageData(
    0,
    0,
    displaySize.width,
    displaySize.height
  );
  console.log("canvasData", canvasData);
});

main();
