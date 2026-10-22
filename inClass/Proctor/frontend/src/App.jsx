// App.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import './App.css'
import PermissionsScreen from './components/PermissionsScreen'
import ExamScreen from './components/ExamScreen'
import SubmissionScreen from './components/SubmissionScreen'
import { startExam } from './api/examApi'
import { useProctorLog } from './hooks/useProctorLog'

const USER_ID_STORAGE_KEY = 'athena-user-id'

function getOrCreateUserId() {
  try {
    const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY)
    if (existing) return existing
    const id = `student-${crypto.randomUUID()}`
    window.localStorage.setItem(USER_ID_STORAGE_KEY, id)
    return id
  } catch {
    return `student-${Date.now()}`
  }
}

function App() {
  // Screen flow: 'setup' -> 'exam' -> 'submitted'
  const [screen, setScreen] = useState('setup');

  const [userId] = useState(getOrCreateUserId);
  const [candidateName, setCandidateName] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [results, setResults] = useState(null);

  const { events, addProctorEvent } = useProctorLog();

  // State variables
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [timer, setTimer] = useState('');

  // Storage & Dialog State variables
  const [cameraFolder, setCameraFolder] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [dialogResult, setDialogResult] = useState(null);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Ref variables
  const videoRef = useRef(null);

  // Load configured camera folder on mount
  useEffect(() => {
    if (window.athena?.getCameraFolder) {
      window.athena.getCameraFolder().then((folder) => {
        if (folder) setCameraFolder(folder);
      }).catch((err) => {
        console.error("Could not fetch camera folder:", err);
      });
    }
  }, []);

  const saveVideoScreenShots = useCallback(async () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      return null;
    }

    try {
      setIsCapturing(true);
      const track = videoRef.current.srcObject.getVideoTracks()[0];
      if (!track) {
        setIsCapturing(false);
        return null;
      }

      // Use ImageCapture API
      const imageCapture = new ImageCapture(track);
      const blob = await imageCapture.takePhoto();
      const arrayBuffer = await blob.arrayBuffer();

      // Send raw binary buffer to main process to save into configured folder
      const result = await window.athena?.storeCameraSnapImageOnDisk(arrayBuffer);
      if (result && result.success) {
        setLastSnapshot({
          path: result.filePath,
          name: result.fileName,
          time: new Date().toLocaleTimeString()
        });
        addProctorEvent(sessionId, 'camera-snapshot', `Snapshot saved: ${result.fileName}`, {
          fileName: result.fileName,
        });
      }
      setIsCapturing(false);
      return result;
    } catch (error) {
      console.error("Failed to capture image via ImageCapture:", error);
      setIsCapturing(false);
      return null;
    }
  }, [sessionId, addProctorEvent]);

  useEffect(() => {
    // Register Listener for handling Timer Tick from Main
    const removeTimerTickListener = window.athena?.registerListenerForTimerTickFromMain
      ? window.athena.registerListenerForTimerTickFromMain((time) => {
          setTimer(time);
        })
      : () => {};

    // Register Listener for handling Camera Snap Request from Main
    const removeCameraSnapListener = window.athena?.registerListenerForCameraSnapFromMain
      ? window.athena.registerListenerForCameraSnapFromMain(saveVideoScreenShots)
      : () => {};

    return () => {
      removeTimerTickListener();
      removeCameraSnapListener();
    };
  }, [saveVideoScreenShots]);

  async function getCameraAccess() {
    try {
      const videoData = await navigator.mediaDevices.getUserMedia({
        video: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = videoData;
      }
      setCameraEnabled(true);
    } catch (error) {
      console.error("Camera access error:", error);
      alert('Cannot access Camera. Please grant permission.');
    }
  }

  async function enableFullScreen() {
    try {
      await document.documentElement.requestFullscreen();
      setFullScreen(true);
    } catch (error) {
      console.error("Full screen error:", error);
      alert('Cannot access full screen mode.');
    }
  }

  // Requirement 2 & 4: User selects folder where he/she wants to store camera shots
  async function handleSelectCameraFolder() {
    try {
      if (!window.athena?.selectCameraFolder) {
        alert("Electron API not available");
        return;
      }
      const res = await window.athena.selectCameraFolder();
      if (!res.canceled && res.folderPath) {
        setCameraFolder(res.folderPath);
      }
    } catch (err) {
      console.error("Error selecting camera folder:", err);
    }
  }

  // Requirement 3: Select file using dialog box and get its path
  async function handleSelectFile() {
    try {
      if (!window.athena?.selectFile) {
        alert("Electron API not available");
        return;
      }
      const res = await window.athena.selectFile();
      if (!res.canceled && res.filePath) {
        setSelectedFilePath(res.filePath);
      }
    } catch (err) {
      console.error("Error selecting file:", err);
    }
  }

  // Client-side callback handlers executed based on button clicked & checkbox state
  function onClientAccept(checkboxChecked) {
    return {
      status: 'accepted',
      title: 'Callback executed: onAcceptRules()',
      desc: `User accepted exam rules. [Checkbox state: ${checkboxChecked ? 'Checked - preference saved' : 'Unchecked'}]`
    };
  }

  function onClientReview(checkboxChecked) {
    return {
      status: 'review',
      title: 'Callback executed: onReviewGuidelines()',
      desc: `User requested exam guidelines review. [Checkbox state: ${checkboxChecked ? 'Checked' : 'Unchecked'}]`
    };
  }

  function onClientCancel(checkboxChecked) {
    return {
      status: 'cancelled',
      title: 'Callback executed: onCancelExam()',
      desc: `User cancelled the exam session. [Checkbox state: ${checkboxChecked ? 'Checked' : 'Unchecked'}]`
    };
  }

  // Requirement 1: Show dialog with checkbox and multiple buttons, executing callback functions
  async function handleShowRulesDialog() {
    try {
      if (!window.athena?.showRulesDialog) {
        alert("Electron API not available");
        return;
      }
      const res = await window.athena.showRulesDialog();
      let clientCallbackInfo = null;
      if (res.response === 0) {
        clientCallbackInfo = onClientAccept(res.checkboxChecked);
      } else if (res.response === 1) {
        clientCallbackInfo = onClientReview(res.checkboxChecked);
      } else if (res.response === 2) {
        clientCallbackInfo = onClientCancel(res.checkboxChecked);
      }

      setDialogResult({
        ...res,
        clientCallbackInfo,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error("Error opening rules dialog:", err);
    }
  }

  async function handleStartExam() {
    if (!candidateName.trim()) {
      setStartError('Please enter your name before starting the exam.');
      return;
    }

    setStarting(true);
    setStartError('');

    try {
      const response = await startExam({ userId, name: candidateName.trim() });
      addProctorEvent(response.sessionId, 'exam-started', `Exam session started for ${candidateName.trim()}`);
      await window.athena?.startTimerOnMain?.();
      setSessionId(response.sessionId);
      setScreen('exam');
    } catch (error) {
      console.error("Failed to start exam:", error);
      setStartError(error.message || 'Could not start the exam. Please try again.');
    } finally {
      setStarting(false);
    }
  }

  async function handleExamSubmitted(result) {
    setResults(result);
    setScreen('submitted');

    // Stop proctoring: halt the timer/snapshot intervals and release the camera
    try {
      await window.athena?.stopTimerOnMain?.();
    } catch (error) {
      console.error("Failed to stop proctoring timer:", error);
    }

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
  }

  return (
    <>
      {/* Kept mounted (hidden via CSS) so the camera MediaStream survives the setup -> exam transition */}
      <div hidden={screen !== 'setup'}>
        <PermissionsScreen
          candidateName={candidateName}
          onCandidateNameChange={setCandidateName}
          cameraEnabled={cameraEnabled}
          videoRef={videoRef}
          onConnectCamera={getCameraAccess}
          fullScreen={fullScreen}
          onEnableFullScreen={enableFullScreen}
          cameraFolder={cameraFolder}
          onSelectCameraFolder={handleSelectCameraFolder}
          isCapturing={isCapturing}
          onCaptureSnapshot={saveVideoScreenShots}
          lastSnapshot={lastSnapshot}
          selectedFilePath={selectedFilePath}
          onSelectFile={handleSelectFile}
          dialogResult={dialogResult}
          onShowRulesDialog={handleShowRulesDialog}
          onStartExam={handleStartExam}
          starting={starting}
          startError={startError}
        />
      </div>

      {screen === 'exam' && (
        <ExamScreen
          sessionId={sessionId}
          timer={timer}
          events={events}
          addProctorEvent={addProctorEvent}
          onExamSubmitted={handleExamSubmitted}
        />
      )}

      {screen === 'submitted' && results && (
        <SubmissionScreen candidateName={candidateName} results={results} events={events} />
      )}
    </>
  );
}

export default App;
