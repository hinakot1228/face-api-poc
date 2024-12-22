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
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log("Models loaded successfully");
  } catch (error) {
    console.error("Error loading models:", error);
  }
}

async function onPlay() {
  console.log("!video.paused && !video.ended", !video.paused && !video.ended);
  // ビデオが再生中の場合
  if (!video.paused && !video.ended) {
    const detections = await faceapi
      .detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416 })
      )
      .withFaceLandmarks()
      .withFaceDescriptors();

    console.log(detections);

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
  }
  requestAnimationFrame(onPlay);
}

async function main() {
  console.log("main");
  await loadModels();
  await startVideo();

  // ビデオがメタデータを読み込んだ後に幅と高さを取得
  video.addEventListener("loadedmetadata", () => {
    console.log("Video metadata loaded");

    console.log(video.videoWidth, video.videoHeight); // 正しい幅と高さが表示されるはず

    const displaySize = { width: video.videoWidth, height: video.videoHeight };

    // キャンバスのサイズをビデオに合わせる
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    // 顔認識を開始
    video.addEventListener("play", () => {
      console.log("play");
      onPlay();
    });
  });
}

main();
