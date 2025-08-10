import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';

function App() {
  const [windowInfo, setWindowInfo] = useState({});
  const [productiveTime, setProductiveTime] = useState(0);
  const [distractionTime, setDistractionTime] = useState(0);
  const [isDistracting, setIsDistracting] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);

  // Timer and pause refs
  const distractionRef = useRef(0);
  const productiveRef = useRef(0);
  const pausedRef = useRef(false);
  const breakNotificationSentRef = useRef(false);

  // Face detection state and debounce ref
  const [faceDetected, setFaceDetected] = useState(true);
  const faceAbsentSinceRef = useRef(null);

  // Video element ref for face-api
  const videoRef = useRef(null);

  // Start webcam video stream
  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Error accessing camera for face detection:', err);
      });
  };

  // Load face-api models on mount
  useEffect(() => {
    async function loadModels() {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      startVideo();
    }
    loadModels();
  }, []);

  // Face detection loop with 10-second absence debounce
  useEffect(() => {
    let intervalId;
    const detectFace = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;

      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      );

      if (detections.length > 0) {
        setFaceDetected(true);
        faceAbsentSinceRef.current = null;
      } else {
        if (faceAbsentSinceRef.current === null) {
          faceAbsentSinceRef.current = Date.now();
        } else if (Date.now() - faceAbsentSinceRef.current > 10000) {
          setFaceDetected(false);
        }
      }
    };
    intervalId = setInterval(detectFace, 500);

    return () => clearInterval(intervalId);
  }, []);

  // Educational keywords list (clean, whole words)
  const educationalKeywords = [
    'class', 'lecture', 'unit', 'chapter', 'lesson',
    'tutorial', 'course', 'study', 'java', 'programming',
    'dsa', 'concepts', 'python', 'fundamental'
  ];

  // Helper: check if any educational keyword exists as whole word in title
  function hasEducationalKeyword(title) {
    if (!title) return false;
    const words = title.toLowerCase().split(/\W+/);
    return educationalKeywords.some(eduWord => words.includes(eduWord.toLowerCase()));
  }

  // Classification override function for YouTube and Spotify
  function classifyYouTubeSpotifyUsage(processName, windowTitle) {
    const processLower = (processName || '').toLowerCase();
    const titleLower = (windowTitle || '').toLowerCase();
    const combined = processLower + ' ' + titleLower;

    // Spotify anywhere is distracting
    if (combined.includes('spotify')) {
      return 'distracting';
    }

    // YouTube anywhere: check education keywords in title for productive, else distracting
    if (combined.includes('youtube')) {
      if (hasEducationalKeyword(titleLower)) {
        return 'productive';
      }
      return 'distracting';
    }

    // No override
    return null;
  }

  // Listen for active window info and classify
  useEffect(() => {
    const listener = async (data) => {
      setWindowInfo(data);

      const override = classifyYouTubeSpotifyUsage(data.process, data.title);
      if (override !== null) {
        setIsDistracting(override === 'distracting');
        return;
      }

      // ML fallback for all other windows/apps
      try {
        const prediction = await window.focusGuard.predictApp(data.process, data.title);
        setIsDistracting(prediction === 'distracting');
      } catch (err) {
        console.error('Prediction API error:', err);
        setIsDistracting(false); // default productive on error
      }
    };

    window.electron.ipcRenderer.on('active-window-info', listener);

    // Handle system idle
    window.electron.ipcRenderer.on('system-idle-change', ({ isIdle }) => {
      pausedRef.current = isIdle;
      console.log('System idle changed:', isIdle);
    });

    // Restart camera on system wake
    window.electron.ipcRenderer.on('system-sleep-change', ({ isSleeping }) => {
      pausedRef.current = isSleeping;
      console.log('System sleep state changed:', isSleeping);
      if (!isSleeping) {
        startVideo();
      }
    });

    return () => {
      window.electron.ipcRenderer.removeListener('active-window-info', listener);
    };
  }, []);

  // Timer increment logic considering pause and face detection
  useEffect(() => {
    const interval = setInterval(() => {
      if (pausedRef.current || !faceDetected) return;

      if (isDistracting) {
        distractionRef.current += 1;
        setDistractionTime(distractionRef.current);
        if (distractionRef.current === 600) setShowBreakModal(true);
      } else {
        productiveRef.current += 1;
        setProductiveTime(productiveRef.current);
        if (productiveRef.current >= 3300 && !breakNotificationSentRef.current) {
          setShowBreakModal(true);
          breakNotificationSentRef.current = true;
        }
      }

      if (distractionRef.current + productiveRef.current >= 3600) {
        distractionRef.current = 0;
        productiveRef.current = 0;
        setDistractionTime(0);
        setProductiveTime(0);
        setShowBreakModal(false);
        breakNotificationSentRef.current = false;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isDistracting, faceDetected]);

  // Helpers
  const formatTime = (sec) => `${Math.floor(sec / 60)}m ${sec % 60}s`;
  const dismissModal = () => setShowBreakModal(false);

  // --- UI (unchanged) ---
  return (
    <div style={styles.container}>
      <h1 style={styles.header}>
        <img src="./logo.png" alt="Logo" style={styles.logo} /> FocusGuard
      </h1>

      {/* Hidden video element for face detection */}
      <video ref={videoRef} style={{ display: 'none' }} autoPlay muted playsInline />

      {/* Face detection status */}
      <div style={{ marginBottom: 10, fontSize: 18, color: faceDetected ? 'limegreen' : 'crimson' }}>
        Face Detected: {faceDetected ? 'Yes' : 'No'}
      </div>

      {/* Status Indicator */}
      <div style={{ marginBottom: 10, fontSize: 18 }}>
        Status:{' '}
        <span style={{ color: isDistracting ? 'crimson' : 'limegreen', fontWeight: 'bold' }}>
          {isDistracting ? 'Distracting' : 'Productive'}
        </span>
      </div>

      {/* Active Window Info */}
      <div style={styles.box}>
        <h2 style={styles.boxTitle}>Active Window</h2>
        <div style={styles.centeredImage}>
          <img src="./study.png" alt="Study" style={styles.image} />
        </div>
        <p><strong>Title:</strong> {windowInfo.title || '-'}</p>
        <p><strong>App:</strong> {windowInfo.process || '-'}</p>
        <p><strong>Path:</strong> {windowInfo.path || '-'}</p>
      </div>

      {/* Focus Timers */}
      <div style={styles.box}>
        <h2 style={styles.boxTitle}>Focus Timers (Live)</h2>
        <div style={styles.centeredImage}>
          <img src="./clock.png" alt="Clock" style={styles.imageSmall} />
        </div>
        <p style={{ color: 'limegreen' }}>
          🟢 Productive Time: {formatTime(productiveTime)}
        </p>
        <p style={{ color: 'crimson' }}>
          🔴 Distraction Time: {formatTime(distractionTime)}
        </p>
      </div>

      <footer style={styles.footer}>💡 Stay focused. Study smart. Take breaks.</footer>

      {/* Break Reminder Modal */}
      {showBreakModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2>⏰ Time for a break!</h2>
            <p>You’ve either been focused for 55+ mins or distracted for over 10 mins.</p>
            <button onClick={dismissModal} style={styles.dismissBtn}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles unchanged
const styles = {
  container: {
    backgroundImage: 'url(./background.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    textAlign: 'center',
    paddingTop: 30,
    fontFamily: 'Segoe UI, sans-serif',
    color: '#fff',
    textShadow: '0 0 4px rgba(0,0,0,0.7)',
  },
  header: { fontSize: 36, marginBottom: 20 },
  logo: { width: 40, verticalAlign: 'middle', marginRight: 10 },
  image: { width: 100 },
  imageSmall: { width: 60 },
  centeredImage: { display: 'flex', justifyContent: 'center', margin: '10px 0' },
  box: {
    background: 'rgba(255,255,255,0.85)',
    color: '#000',
    width: '60%',
    margin: '20px auto',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    textAlign: 'left',
  },
  boxTitle: { textAlign: 'center', color: '#000' },
  footer: { marginTop: 40, fontStyle: 'italic', fontSize: 16 },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, height: '100vh', width: '100vw',
    background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
    alignItems: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', padding: 30, borderRadius: 10,
    maxWidth: 400, textAlign: 'center', color: '#333',
    boxShadow: '0 0 12px rgba(0,0,0,0.5)',
  },
  dismissBtn: {
    marginTop: 15, padding: '10px 20px', fontSize: 16,
    background: '#0078d4', color: '#fff', border: 'none',
    borderRadius: 6, cursor: 'pointer',
  },
};

export default App;
