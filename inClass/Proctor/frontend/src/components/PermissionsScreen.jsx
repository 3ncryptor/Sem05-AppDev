/**
 * @param {{
 *   candidateName: string,
 *   onCandidateNameChange: (value: string) => void,
 *   cameraEnabled: boolean,
 *   videoRef: import('react').RefObject<HTMLVideoElement>,
 *   onConnectCamera: () => void,
 *   fullScreen: boolean,
 *   onEnableFullScreen: () => void,
 *   cameraFolder: string,
 *   onSelectCameraFolder: () => void,
 *   isCapturing: boolean,
 *   onCaptureSnapshot: () => void,
 *   lastSnapshot: { path: string, name: string, time: string } | null,
 *   selectedFilePath: string,
 *   onSelectFile: () => void,
 *   dialogResult: object | null,
 *   onShowRulesDialog: () => void,
 *   onStartExam: () => void,
 *   starting: boolean,
 *   startError: string
 * }} props
 */
function PermissionsScreen({
  candidateName,
  onCandidateNameChange,
  cameraEnabled,
  videoRef,
  onConnectCamera,
  fullScreen,
  onEnableFullScreen,
  cameraFolder,
  onSelectCameraFolder,
  isCapturing,
  onCaptureSnapshot,
  lastSnapshot,
  selectedFilePath,
  onSelectFile,
  dialogResult,
  onShowRulesDialog,
  onStartExam,
  starting,
  startError,
}) {
  const readyToStart = cameraEnabled && fullScreen && candidateName.trim().length > 0

  return (
    <div className="page-container">
      {/* Header section matching Athena */}
      <div className="header-section">
        <h1>Hi {candidateName.trim() || 'there'}!</h1>
        <p>Kindly Allow the following Permissions & Settings to Start the test:</p>
      </div>

      {/* Candidate Name */}
      <div className="card-container">
        <div className="permission-item">
          <div className="permission-content full-width">
            <h3>Candidate Name</h3>
            <p>Enter your name as it should appear on the exam record.</p>
            <input
              className="text-input"
              type="text"
              placeholder="Full name"
              value={candidateName}
              onChange={(event) => onCandidateNameChange(event.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Permissions Card */}
      <div className="card-container">
        {/* Section 1: Camera / Heimdall */}
        <div className="permission-item">
          <div className="icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </div>
          <div className="permission-content">
            <h3>Configure Camera</h3>
            <p>Kindly configure Camera to attempt quiz/contests.</p>
            <div className="action-row">
              <button
                className="btn btn-black"
                disabled={cameraEnabled}
                onClick={onConnectCamera}
              >
                {cameraEnabled ? '✓ Camera Connected' : 'Connect Camera'}
              </button>

              {/* Video Preview */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`video-preview ${cameraEnabled ? 'active' : ''}`}
              />
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Section 2: Fullscreen */}
        <div className="permission-item">
          <div className="icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </div>
          <div className="permission-content">
            <h3>Switch to full screen</h3>
            <p>Kindly close all tabs and switch to full screen.</p>
            <button
              className={`btn ${fullScreen ? 'btn-secondary' : 'btn-primary'}`}
              disabled={fullScreen}
              onClick={onEnableFullScreen}
            >
              {fullScreen ? '✓ Full Screen Enabled' : 'Give Full Screen Permissions'}
            </button>
          </div>
        </div>
      </div>

      {/* Requirement 2 & 4: Storage Configuration for Camera Shots */}
      <div className="card-container">
        <div className="permission-item">
          <div className="icon-box folder-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div className="permission-content full-width">
            <div className="header-flex">
              <div>
                <h3>Camera Shots Storage Folder</h3>
                <p>Select the folder on your device where proctoring snapshots will be automatically saved.</p>
              </div>
              <span className="badge-tag">Task 2 & 4</span>
            </div>

            {/* Path display box */}
            <div className="path-display-box">
              <span className="path-label">Destination Folder:</span>
              <span className="path-value" title={cameraFolder}>
                {cameraFolder || 'No folder selected (using default user-camera-snap)'}
              </span>
            </div>

            <div className="action-row" style={{ marginTop: '14px' }}>
              {/* Requirement 4: Button on UI allowing user where he/she wants to store camera shots */}
              <button
                className="btn btn-outline"
                id="btn-select-folder"
                onClick={onSelectCameraFolder}
              >
                📁 Select Folder for Camera Shots
              </button>

              {/* Manual snapshot trigger to test saving to chosen folder */}
              <button
                className="btn btn-black"
                disabled={!cameraEnabled || isCapturing}
                onClick={onCaptureSnapshot}
              >
                {isCapturing ? 'Saving...' : '📸 Capture Test Snapshot Now'}
              </button>
            </div>

            {/* Last snapshot feedback */}
            {lastSnapshot && (
              <div className="snapshot-notice">
                <span className="notice-icon">✓</span>
                <div className="notice-content">
                  <strong>Snapshot saved ({lastSnapshot.time}):</strong>
                  <code>{lastSnapshot.path}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Requirement 3: Select File using Dialog Box & Get Path */}
      <div className="card-container">
        <div className="permission-item">
          <div className="icon-box file-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
          </div>
          <div className="permission-content full-width">
            <div className="header-flex">
              <div>
                <h3>Select File via Dialog Box</h3>
                <p>Open a native file selection dialog to choose any file and retrieve its full absolute path.</p>
              </div>
              <span className="badge-tag">Task 3</span>
            </div>

            {/* Selected File Path Display */}
            <div className="path-display-box">
              <span className="path-label">Selected File:</span>
              <span className={`path-value ${!selectedFilePath ? 'placeholder' : ''}`} title={selectedFilePath}>
                {selectedFilePath || 'No file selected yet. Click button below to pick a file.'}
              </span>
            </div>

            <div className="action-row" style={{ marginTop: '14px' }}>
              <button
                className="btn btn-outline"
                id="btn-select-file"
                onClick={onSelectFile}
              >
                📄 Select File Using Dialog
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Requirement 1: Dialog API with Checkbox & Multiple Buttons */}
      <div className="card-container">
        <div className="permission-item">
          <div className="icon-box dialog-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <polyline points="9 10 11 12 15 8"></polyline>
            </svg>
          </div>
          <div className="permission-content full-width">
            <div className="header-flex">
              <div>
                <h3>Interactive Dialog API (Checkbox & Action Buttons)</h3>
                <p>
                  Demonstrates <code>dialog.showMessageBox</code> with 3 custom buttons and a confirmation checkbox.
                  Specific functions are executed in both main and renderer processes depending on the button and checkbox state.
                </p>
              </div>
              <span className="badge-tag">Task 1</span>
            </div>

            <div className="action-row" style={{ marginTop: '14px' }}>
              <button
                className="btn btn-black"
                id="btn-show-rules-dialog"
                onClick={onShowRulesDialog}
              >
                🔔 Show Dialog (Checkbox & 3 Buttons)
              </button>
            </div>

            {/* Live Dialog Feedback Display */}
            {dialogResult && (
              <div className={`dialog-result-card result-${dialogResult.clientCallbackInfo?.status || 'info'}`}>
                <div className="result-header">
                  <span className="result-badge">Response Received at {dialogResult.timestamp}</span>
                  <span className="result-checkbox-state">
                    Checkbox: {dialogResult.checkboxChecked ? '☑ Checked (True)' : '☐ Unchecked (False)'}
                  </span>
                </div>
                <div className="result-body">
                  <p><strong>Button Clicked:</strong> &quot;{dialogResult.buttonLabel}&quot; (Index {dialogResult.response})</p>
                  <p><strong>Main Process Fn Output:</strong> {dialogResult.actionResult?.message}</p>
                  <p><strong>Renderer Process Fn Output:</strong> {dialogResult.clientCallbackInfo?.desc}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Section: Go To Test */}
      <div className="bottom-bar">
        <div className="bottom-actions">
          <button
            className="btn btn-primary"
            disabled={!readyToStart || starting}
            onClick={onStartExam}
          >
            {starting ? 'Starting Exam...' : 'Go To Test'}
          </button>

          <button
            className="btn btn-outline"
            onClick={onShowRulesDialog}
          >
            Need Help?
          </button>
        </div>
      </div>

      {startError && <p className="form-error start-error">{startError}</p>}
    </div>
  );
}

export default PermissionsScreen
