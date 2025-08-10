# FocusGuard
A smart productivity tracker that combines real-time face detection, distraction monitoring and automatic system sleep/wake handling.

# Features
Face Detection: Uses your webcam and face-api.js to ensure the user is present before time tracking.

### Distraction Detection:

YouTube: Videos are only marked productive if titles match educational keywords (e.g., "lecture", "tutorial", "java", "python", etc). Songs, movies, and non-educational content are counted as distractions—even if watched in Chrome, Edge, or the YouTube app.

Other Apps: Classified by ML model.

#Sleep/Idle Handling: 
Automatically pauses tracking and restarts the camera if your device goes idle or enters/leaves sleep mode.

#Timers & Alerts:
Live counters for productive/distraction time, and break alerts after configurable intervals.

#System Integration:
Tracks the focused window’s name, app, and path.

#Privacy First:
No camera stream is saved or transmitted—used purely for presence detection.

# How It Works
#Face Detection:
Hidden webcam video is analyzed every 0.5s using face-api.js. If you step away (no face found for 10s), timers pause and the app stops tracking.

#Distraction Logic:
The app watches the active window’s process and title:

If it detects YouTube:

Educational keywords in video title ⇒ Productive

Otherwise ⇒ Distracting

All else: ML model predicts “productive” or “distracting”.

#System Sleep/Idle:
When Windows goes idle/sleep, the app pauses everything and restarts the webcam on wake (no manual refresh required).

# ⚡ Quick Start
Clone & Install Dependencies

bash
git clone https://github.com/mohammadhymath7141/focusguard.git
cd focusguard/ui
npm install
Download Face API Models

Download the face-api.js models and put them in the public/models folder.

Run the App

bash
npm start
The app requires permission to use your webcam for detection.

# 🛠 Configuration
#Educational Keywords:
Set in App.jsx.

#Distraction Limit:
By default, show break after 10 minutes distracted or 55+ minutes focused.

#Model Integration:
The ML model is invoked for all non-YouTube apps—see window.focusGuard.predictApp.

# 👁 Screenshots

# 📜 License
MIT License.
Camera usage is entirely local for presence detection—no footage is stored or uploaded.



FocusGuard: Stay present, track smarter.
