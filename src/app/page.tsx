"use client";

import { useState, useRef, useEffect } from "react";
import { DrawingCanvas } from "../components/DrawingCanvas";

const customColors = [
  { name: "Ocean Blue", value: "#0077BE" },
  { name: "Forest Green", value: "#228B22" },
  { name: "Sunset Orange", value: "#FF6B35" },
  { name: "Royal Purple", value: "#663399" },
  { name: "Hot Pink", value: "#FF69B4" },
  { name: "Golden Yellow", value: "#FFD700" },
];

export default function Home() {
  const getBestMimeType = () => {
    // Detect Edge browser
    const isEdge = /Edg/.test(navigator.userAgent);
    
    const candidates = isEdge 
      ? [
          // Edge-specific order - try simpler formats first
          "video/webm",
          "video/webm;codecs=vp8",
          "video/webm;codecs=vp8,opus",
          "video/webm;codecs=vp9,opus",
        ]
      : [
          "video/webm",
          "video/webm;codecs=vp8,opus",
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=h264,opus",
        ];
        
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log("Supported mime type:", type);
        return type;
      }
    }
    return "";
  };

  const [activeExample, setActiveExample] = useState<
    "basic" | "custom" | "recording" | "streaming"
  >("recording");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordMimeType, setRecordMimeType] = useState<string>("");

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (activeExample === "recording") {
      setRecordedVideoUrl(null);
      setIsRecording(false);
    }
  }, [activeExample]);

  // 📌 Basic example stream handler
  const handleBasicStreamReady = (stream: MediaStream) => {
    console.log("Basic stream ready:", stream);
  };

  // 📌 Streaming example handler
  const handleStreamingReady = (stream: MediaStream) => {
    setLocalStream(stream);
    console.log("Streaming ready with tracks:", {
      video: stream.getVideoTracks()[0]?.getSettings(),
      audio: stream.getAudioTracks()[0]
        ? "Silent audio track included"
        : "No audio",
    });
  };

  // 📌 Recording example handler
  const handleRecordingStreamReady = (stream: MediaStream) => {
    const mimeType = getBestMimeType();
    setRecordMimeType(mimeType || "video/webm");
    
    mediaRecorder.current = new MediaRecorder(stream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 2_000_000,
      audioBitsPerSecond: 128_000,
    });

    mediaRecorder.current.onstart = () => {
      chunks.current = [];
      setRecordedVideoUrl(null);
      console.log("Recording started");
    };

    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.current.push(e.data);
        console.log("Data chunk received:", e.data.size, "bytes");
      }
    };

    mediaRecorder.current.onstop = () => {
      console.log("Recording stopped, chunks:", chunks.current.length);
      
      if (chunks.current.length === 0) {
        console.error("No data chunks received");
        return;
      }
      
      createVideoFromChunks();
    };

    const createVideoFromChunks = () => {
      const blob = new Blob(chunks.current, { type: recordMimeType || "video/webm" });
      console.log("Blob created:", blob.size, "bytes, type:", blob.type);
      
      if (blob.size === 0) {
        console.error("Empty blob created");
        return;
      }
      
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      chunks.current = [];
    };

    mediaRecorder.current.onerror = (e) => {
      console.error("MediaRecorder error:", e);
    };
  };

  // 📌 Toggle Recording
  const toggleRecording = () => {
    if (!mediaRecorder.current) return;

    if (isRecording) {
      // Add a small delay for Edge to finalize recording
      setTimeout(() => {
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
          mediaRecorder.current.stop();
        }
      }, 100);
    } else {
      // Edge needs different timeslice approach
      const isEdge = /Edg/.test(navigator.userAgent);
      if (isEdge) {
        // Edge works better with no timeslice or very small one
        mediaRecorder.current.start(100);
      } else {
        // Small timeslice prompts Chrome/Edge to flush data periodically
        mediaRecorder.current.start(250);
      }
    }
    setIsRecording(!isRecording);
  };

  // 📌 Download Recording
  const downloadRecording = () => {
    if (!recordedVideoUrl) return;

    const a = document.createElement("a");
    a.href = recordedVideoUrl;
    a.download = `drawing-${new Date().toISOString()}.webm`;
    a.click();
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Drawing Canvas Examples</h1>
        <p>Explore different features of the DrawingCanvas component</p>
      </header>

      <nav className="example-nav">
        <button
          className={`nav-button ${activeExample === "basic" ? "active" : ""}`}
          onClick={() => setActiveExample("basic")}
        >
          Basic Canvas
        </button>
        <button
          className={`nav-button ${activeExample === "custom" ? "active" : ""}`}
          onClick={() => setActiveExample("custom")}
        >
          Custom Colors
        </button>
        <button
          className={`nav-button ${
            activeExample === "recording" ? "active" : ""
          }`}
          onClick={() => setActiveExample("recording")}
        >
          Recording
        </button>
        <button
          className={`nav-button ${
            activeExample === "streaming" ? "active" : ""
          }`}
          onClick={() => setActiveExample("streaming")}
        >
          Live Stream
        </button>
      </nav>

      <main className="example-content">
        {/* ✅ Basic Example */}
        {activeExample === "basic" && (
          <div className="example-section">
            <h2>Basic Drawing Canvas</h2>
            <div className="canvas-wrapper">
              <DrawingCanvas
                onStreamReady={handleBasicStreamReady}
                initialColor="#000000"
                initialBrushSize={15}
                className="drawing-canvas-container"
                canvasClassName="custom-canvas"
              />
            </div>
          </div>
        )}

        {/* ✅ Custom Colors */}
        {activeExample === "custom" && (
          <div className="example-section">
            <h2>Custom Color Palette</h2>
            <div className="canvas-wrapper">
              <DrawingCanvas
                customColors={customColors}
                initialColor="#0077BE"
                initialBrushSize={20}
                width={600}
                height={400}
                className="drawing-canvas-container"
                canvasClassName="custom-canvas"
              />
            </div>
          </div>
        )}

        {/* ✅ Recording */}
        {activeExample === "recording" && (
          <div className="example-section">
            <h2>Canvas Recording</h2>
            <div className="recording-controls">
              <button
                onClick={toggleRecording}
                className={`record-button ${isRecording ? "recording" : ""}`}
                disabled={!mediaRecorder.current}
              >
                {isRecording ? "⏹ Stop Recording" : "⏺ Start Recording"}
              </button>
              {isRecording && <span className="recording-indicator">Recording...</span>}
              {!isRecording && recordedVideoUrl && (<span className="video-ready">✅ Video Ready!</span>)}
            </div>

            <div className="recording-layout">
              <div className="canvas-wrapper">
                <DrawingCanvas
                  onStreamReady={handleRecordingStreamReady}
                  fps={60}
                  initialColor="#FF0000"
                  className="drawing-canvas-container"
                  canvasClassName="custom-canvas"
                />
              </div>

              {!isRecording && recordedVideoUrl && (
                <div className="video-preview-section">
                  <h3>Video Preview</h3>
                  <video
                    controls                    
                    ref={(video) => {
                      if (video && recordedVideoUrl) {
                        video.src = recordedVideoUrl;
                      }
                    }}
                    className="recorded-video"
                  />
                  <button onClick={downloadRecording} className="download-button">
                    📥 Download Video
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ Streaming */}
        {activeExample === "streaming" && (
          <div className="example-section">
            <h2>Live Stream Preview</h2>
            <div className="streaming-layout">
              <div className="canvas-wrapper">
                <DrawingCanvas
                  onStreamReady={handleStreamingReady}
                  fps={30}
                  enableStreaming={true}
                  enableBackgroundStreaming={true}
                  initialColor="#663399"
                  className="drawing-canvas-container"
                  canvasClassName="custom-canvas"
                />
              </div>

              {localStream && (
                <div className="stream-preview">
                  <h3>Live Stream Preview</h3>
                  <video
                    autoPlay
                    muted
                    ref={(video) => {
                      if (video && localStream) {
                        video.srcObject = localStream;
                      }
                    }}
                    className="preview-video"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
