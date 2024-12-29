const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const displaySize = { width: 640, height: 480 };
const canvasOverlay = document.getElementById("snapshot-overlay");

const captureButton = document.getElementById("capture");

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
      const noseTip = nosePoints[4];

      const boxSize = 10;
      const startX = Math.max(0, Math.round(noseTip.x - boxSize / 2));
      const startY = Math.max(0, Math.round(noseTip.y - boxSize / 2));

      const noseData = ctx.getImageData(startX, startY, boxSize, boxSize);
      console.log("noseData", noseData);
      // const { r, g, b } = calculateAverageColor(noseData.data);

      // const colorCode = rgbToHex(r, g, b);

      // 年齢と性別を描画
      const text = `${Math.round(age)} years old, ${gender} average color`;
      ctx.fillStyle = "red";
      ctx.fillText(text, x, y - 30); // 顔の上部に表示
    });
  }
  requestAnimationFrame(onPlay);
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

    // 顔認識を開始
    video.addEventListener("play", () => {
      onPlay();
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
