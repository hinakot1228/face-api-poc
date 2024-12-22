const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const displaySize = { width: 640, height: 480 };

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
    const detections = await faceapi
      .detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416 })
      )
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withAgeAndGender();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

    // 年齢と性別の推定結果を描画
    resizedDetections.forEach((detection) => {
      const { age, gender } = detection;
      const { x, y, width, height } = detection.detection.box;

      // 顔の領域を画像として取得
      const faceImageData = ctx.getImageData(x, y, width, height);

      // 肌の色を推定する（簡単な方法としてRGBの平均色を計算）
      const skinColor = estimateSkinColor(faceImageData.data);

      console.log("skinColor", skinColor);

      // 年齢と性別を描画
      const text = `${Math.round(age)} years old, ${gender}`;
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

// 簡単な肌の色推定関数（RGBの平均色を計算）
function estimateSkinColor(data) {
  let r = 0,
    g = 0,
    b = 0;
  let count = 0;

  // ピクセルデータからRGBの値を取得
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; // Red
    g += data[i + 1]; // Green
    b += data[i + 2]; // Blue
    count++;
  }

  // 平均色を計算
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  console.log("r g b", r, g, b);

  // 簡単な方法で肌の色を推定（実際にはもっと複雑なアルゴリズムを使うことができます）
  if (r > 150 && g > 100 && b < 100) {
    return "Light skin";
  } else if (r > 120 && g > 90 && b < 90) {
    return "Medium skin";
  } else {
    return "Dark skin";
  }
}

main();
