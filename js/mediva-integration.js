import { auth, checkAuthAndRedirect, logout, db } from "./services/auth.js";
import { getPatientPrescriptions, subscribeToChat, sendMessage, logExerciseRep, completeExercise, saveExerciseFeedback, getExerciseStats } from "./services/db.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// db imported from services/auth.js

// Initialize Auth Guard
// checkAuthAndRedirect('patient');

// DOM Elements
const mainContent = (document.getElementById('main-content') || document.createElement('div'));
const loadingView = (document.getElementById('loading-view') || document.createElement('div'));
const prescriptionListView = (document.getElementById('prescription-list-view') || document.createElement('div'));
const exerciseSessionView = (document.getElementById('exercise-session-view') || document.createElement('div'));
const prescriptionList = (document.getElementById('prescription-list') || document.createElement('div'));
const prescriptionLoadingDiv = (document.getElementById('prescription-loading') || document.createElement('div'));
// Exercise UI
const progressBar = (document.getElementById('progress-bar') || document.createElement('div'));
const feedbackBox = (document.getElementById('feedback-box') || document.createElement('div'));
// Chat UI
const chatToggleBtn = (document.getElementById('chat-toggle-btn') || document.createElement('div'));
const chatModal = (document.getElementById('chat-modal') || document.createElement('div'));
const closeChatBtn = (document.getElementById('close-chat-btn') || document.createElement('div'));
const chatInput = (document.getElementById('chat-input') || document.createElement('div'));
const sendMsgBtn = (document.getElementById('send-msg-btn') || document.createElement('div'));
const chatMessages = (document.getElementById('chat-messages') || document.createElement('div'));

// State
let video, canvasCtx, canvasElement, pose, cameraInstance;
let isCameraActive = false;
let currentPrescription = { exercise: 'Squat', sets: 3, reps: 10 };
let currentSet = 1;
let currentReps = 0;
let totalReps = 0;
let lastRepTime = 0;
let repThreshold = 1000;
let currentPoints = 0;
let chatUnsubscribe = null;

// AI Form Accuracy State
let currentAccuracy = 0;
let jointStatuses = {};

// --- Utility: Calculate angle between three points ---
function calculateAngle(a, b, c) {
    // a, b, c are {x, y} points. b is the vertex.
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

// --- Update Accuracy UI ---
function updateAccuracyUI(accuracy, feedback, joints) {
    currentAccuracy = accuracy;
    jointStatuses = joints;

    const ring = (document.getElementById('accuracy-ring') || document.createElement('div'));
    const percent = (document.getElementById('accuracy-percent') || document.createElement('div'));
    const feedbackEl = (document.getElementById('form-feedback') || document.createElement('div'));
    const jointIndicators = (document.getElementById('joint-indicators') || document.createElement('div'));

    if (!ring || !percent) return;

    // Update circular gauge (circumference = 2 * PI * 45 = ~283)
    const offset = 283 - (283 * accuracy / 100);
    ring.style.strokeDashoffset = offset;

    // Update color based on accuracy
    if (accuracy >= 80) {
        ring.style.stroke = '#22c55e'; // green
        percent.className = 'text-2xl font-bold text-green-400';
    } else if (accuracy >= 50) {
        ring.style.stroke = '#eab308'; // yellow
        percent.className = 'text-2xl font-bold text-yellow-400';
    } else {
        ring.style.stroke = '#ef4444'; // red
        percent.className = 'text-2xl font-bold text-red-400';
    }

    percent.textContent = `${Math.round(accuracy)}%`;
    feedbackEl.textContent = feedback;

    // Update joint indicators
    if (jointIndicators) {
        jointIndicators.innerHTML = '';
        for (const [joint, isCorrect] of Object.entries(joints)) {
            const indicator = document.createElement('span');
            indicator.className = `px-2 py-1 rounded text-xs font-medium ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`;
            indicator.textContent = `${isCorrect ? '✓' : '✗'} ${joint}`;
            jointIndicators.appendChild(indicator);
        }
    }
}


// --- Initialization ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            loadingView.classList.add('hidden');
            mainContent.classList.remove('hidden');

            // Load points
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                updatePointsUI(userDoc.data().points || 0);
            }
            (document.getElementById('rewards-card') || document.createElement('div')).classList.remove('hidden');

            await loadPrescriptions();
            loadAnalytics(); // Load analytics dashboard
        } catch (error) {
            console.error("Init error:", error);
            loadingView.innerHTML = `<p class="text-red-500">Error loading dashboard: ${error.message}</p>`;
            loadingView.classList.remove('hidden');
        }
    }
});

(document.getElementById('logout-btn') || document.createElement('div')).addEventListener('click', () => {
    cleanupPatientView();
    logout();
});

(document.getElementById('back-to-prescriptions') || document.createElement('div')).addEventListener('click', showPrescriptionList);

async function loadPrescriptions() {
    prescriptionList.innerHTML = '';
    prescriptionLoadingDiv.textContent = 'Loading...';

    
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    let items = [];
    try {
        items = await getPatientPrescriptions(userId);
    } catch (err) {
        console.error("Prescription load error:", err);
        prescriptionLoadingDiv.innerHTML = `<span class="text-red-400">Failed to load: ${err.message}</span>`;
        if (err.message.includes('index')) {
            prescriptionLoadingDiv.innerHTML += `<br><span class="text-xs text-gray-400">Database index required. Check console for link.</span>`;
        }
        return;
    }

    if (items.length > 0) {
        items.forEach(createPrescriptionCard);
        prescriptionLoadingDiv.textContent = `${items.length} prescription(s) found`;
    } else {
        // Sample fallback
        const samples = [
            { id: 'sample1', exercise: 'Right Hand Raise', sets: 3, reps: 10, assignedAt: new Date() },
            { id: 'sample2', exercise: 'Shoulder Abduction', sets: 2, reps: 15, assignedAt: new Date() },
            { id: 'sample3', exercise: 'Squat', sets: 3, reps: 12, assignedAt: new Date() }
        ];
        samples.forEach(createPrescriptionCard);
        prescriptionLoadingDiv.textContent = 'Showing sample prescriptions';
    }
}

function createPrescriptionCard(prescription) {
    const card = document.createElement('div');
    card.className = 'bg-gray-700 p-4 rounded-xl border border-gray-600 hover:border-teal-500 transition-colors';

    // Convert timestamp
    let dateStr = 'Recently';
    if (prescription.assignedAt && prescription.assignedAt.toDate) {
        dateStr = prescription.assignedAt.toDate().toLocaleDateString();
    } else if (prescription.assignedAt instanceof Date) {
        dateStr = prescription.assignedAt.toLocaleDateString();
    }

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h4 class="font-semibold text-lg">${prescription.exercise}</h4>
                <p class="text-gray-400">${prescription.sets} sets × ${prescription.reps} reps</p>
                <p class="text-sm text-gray-500">Assigned: ${dateStr}</p>
            </div>
            <button class="start-btn bg-teal-500 hover:bg-teal-600 text-black font-bold py-2 px-4 rounded-lg">
                Start
            </button>
        </div>
    `;

    card.querySelector('.start-btn').onclick = () => showExerciseDemo(prescription);
    prescriptionList.appendChild(card);
}

// Exercise demo content
const exerciseDemos = {
    'Right Hand Raise': {
        emoji: '🙋‍♂️',
        title: 'Right Hand Raise',
        steps: [
            '1. Stand straight with arms at your sides',
            '2. Keep your right arm straight',
            '3. Raise your right arm above your head',
            '4. Hold briefly, then lower slowly'
        ]
    },
    'Shoulder Abduction': {
        emoji: '🧍‍♂️',
        title: 'Shoulder Abduction (T-Pose)',
        steps: [
            '1. Stand with arms relaxed at sides',
            '2. Raise both arms out to the sides',
            '3. Stop when arms are at shoulder height',
            '4. Hold the T-pose, then lower'
        ]
    },
    'Squat': {
        emoji: '🏋️',
        title: 'Squat Exercise',
        steps: [
            '1. Stand with feet shoulder-width apart',
            '2. Bend your knees and push hips back',
            '3. Lower until thighs are parallel to floor',
            '4. Push through heels to stand up'
        ]
    }
};

let pendingPrescription = null;

function showExerciseDemo(prescription) {
    pendingPrescription = prescription;

    const demo = exerciseDemos[prescription.exercise] || {
        emoji: '🏃',
        title: prescription.exercise,
        steps: ['Follow the on-screen instructions']
    };

    (document.getElementById('demo-title') || document.createElement('div')).textContent = demo.title;
    (document.getElementById('demo-animation') || document.createElement('div')).textContent = demo.emoji;
    (document.getElementById('demo-instructions') || document.createElement('div')).innerHTML =
        `<ul class="text-left space-y-2">${demo.steps.map(s => `<li class="flex gap-2"><span class="text-teal-400">•</span> ${s}</li>`).join('')}</ul>`;

    (document.getElementById('demo-modal') || document.createElement('div')).classList.remove('hidden');
}

(document.getElementById('btn-start-rehab') || document.createElement('div'))?.addEventListener('click', () => {
    (document.getElementById('demo-modal') || document.createElement('div')).classList.add('hidden');
    if (pendingPrescription) {
        startExercise(pendingPrescription);
    }
});

(document.getElementById('cancel-demo-btn') || document.createElement('div'))?.addEventListener('click', () => {
    (document.getElementById('demo-modal') || document.createElement('div')).classList.add('hidden');
    pendingPrescription = null;
});

function startExercise(prescription) {
    if (!prescription) return;

    currentPrescription = prescription;
    currentSet = 1;
    currentReps = 0;
    totalReps = 0;

    // Update UI
    (document.getElementById('exercise-name') || document.createElement('div')).textContent = prescription.exercise;
    (document.getElementById('exercise-sets') || document.createElement('div')).textContent = prescription.sets;
    (document.getElementById('exercise-reps') || document.createElement('div')).textContent = prescription.reps;
    (document.getElementById('total-sets') || document.createElement('div')).textContent = prescription.sets;
    (document.getElementById('target-reps') || document.createElement('div')).textContent = prescription.reps;
    (document.getElementById('current-set') || document.createElement('div')).textContent = currentSet;
    (document.getElementById('current-reps') || document.createElement('div')).textContent = currentReps;
    (document.getElementById('current-exercise-title') || document.createElement('div')).textContent = `${prescription.exercise} - Set ${currentSet}`;

    updateProgressUI();

    prescriptionListView.classList.add('hidden');
    exerciseSessionView.classList.remove('hidden');

    initCamera();
}

function showPrescriptionList() {
    exerciseSessionView.classList.add('hidden');
    prescriptionListView.classList.remove('hidden');
    cleanupPatientView();
}

function updateProgressUI() {
    if (!currentPrescription) return;
    const totalTargetReps = currentPrescription.sets * currentPrescription.reps;
    const completedReps = (currentSet - 1) * currentPrescription.reps + currentReps;
    const progress = Math.min((completedReps / totalTargetReps) * 100, 100);
    progressBar.style.width = `${progress}%`;
}

async function initCamera() {
    if (isCameraActive) return;
    isCameraActive = true;
    video = (document.getElementById('demo-video') || document.createElement('div'));
    canvasElement = (document.getElementById('demo-canvas') || document.createElement('div'));
    canvasCtx = canvasElement.getContext('2d');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } });
        video.srcObject = stream;
        (document.getElementById('demo-canvas') || document.createElement('div')).classList.remove('hidden');
        (document.getElementById('demo-video') || document.createElement('div')).classList.remove('hidden');
        
        (document.getElementById('btn-complete-rehab') || document.createElement('div')).classList.remove('hidden');
        (document.getElementById('btn-complete-rehab') || document.createElement('div')).addEventListener('click', () => {
            cleanupPatientView();
            showFeedbackModal(0);
        });
        video.onloadedmetadata = () => {

            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;
            pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
            pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
            pose.onResults(onPoseResults);
            cameraInstance = new Camera(video, {
                onFrame: async () => { if (video.readyState >= 3) await pose.send({ image: video }); },
                width: 1280, height: 720
            });
            cameraInstance.start();
        };
    } catch (err) {
        feedbackBox.textContent = `Error: ${err.message}`;
    }
}

function cleanupPatientView() {
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (cameraInstance) { cameraInstance.stop(); cameraInstance = null; }
    if (pose) { pose.close(); pose = null; }
    (document.getElementById('demo-video') || document.createElement('div')).classList.add('hidden');
    (document.getElementById('demo-canvas') || document.createElement('div')).classList.add('hidden');
    (document.getElementById('btn-complete-rehab') || document.createElement('div')).classList.add('hidden');
    (document.getElementById('btn-start-rehab') || document.createElement('div')).style.display = 'block';

    isCameraActive = false;
}

// --- Pose Analysis ---
async function onPoseResults(results) {
    if (!isCameraActive || !currentPrescription || !canvasCtx || !canvasElement) return;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
        const landmarks = results.poseLandmarks;
        let analysisResult = { isCorrect: false, accuracy: 0, feedback: '', joints: {} };

        switch (currentPrescription.exercise) {
            case 'Right Hand Raise': analysisResult = analyzeHandRaiseWithAccuracy(landmarks); break;
            case 'Shoulder Abduction': analysisResult = analyzeShoulderAbductionWithAccuracy(landmarks); break;
            case 'Squat': analysisResult = analyzeSquatWithAccuracy(landmarks); break;
        }

        // Update the AI Accuracy UI
        updateAccuracyUI(analysisResult.accuracy, analysisResult.feedback, analysisResult.joints);

        if (analysisResult.isCorrect) {
            const now = Date.now();
            if (now - lastRepTime > repThreshold) {
                currentReps++;
                totalReps++;
                lastRepTime = now;

                if (currentReps >= currentPrescription.reps) {
                    currentSet++;
                    currentReps = 0;
                    if (currentSet > currentPrescription.sets) {
                        feedbackBox.className = "mt-4 text-center text-xl font-bold p-4 rounded-lg bg-green-800 text-green-200";
                        feedbackBox.textContent = "🎉 Exercise completed!";
                        finishExercise();
                    } else {
                        feedbackBox.textContent = `✅ Set ${currentSet - 1} completed! Start set ${currentSet}`;
                        (document.getElementById('current-set') || document.createElement('div')).textContent = currentSet;
                        (document.getElementById('current-exercise-title') || document.createElement('div')).textContent = `${currentPrescription.exercise} - Set ${currentSet}`;
                    }
                } else {
                    feedbackBox.className = "mt-4 text-center text-xl font-bold p-4 rounded-lg bg-green-800 text-green-200";
                    feedbackBox.textContent = `✅ Rep ${currentReps}/${currentPrescription.reps}`;
                }

                (document.getElementById('current-reps') || document.createElement('div')).textContent = currentReps;
                updateProgressUI();
                if (auth.currentUser) logExerciseRep(auth.currentUser.uid, auth.currentUser.email, currentPrescription.exercise, currentReps, currentSet, totalReps);
            }
        } else {
            feedbackBox.className = "mt-4 text-center text-xl font-bold p-4 rounded-lg bg-yellow-800 text-yellow-200";
            feedbackBox.textContent = analysisResult.feedback || getInstruction();
        }

        // Draw skeleton with color-coded joints
        drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, { color: '#4ade80', lineWidth: 4 });

        // Custom landmark drawing with color based on correctness
        landmarks.forEach((landmark, idx) => {
            if (landmark.visibility > 0.5) {
                const x = landmark.x * canvasElement.width;
                const y = landmark.y * canvasElement.height;
                canvasCtx.beginPath();
                canvasCtx.arc(x, y, 6, 0, 2 * Math.PI);

                // Color key joints based on their status
                let color = '#f87171'; // default red
                if (analysisResult.accuracy >= 80) color = '#22c55e'; // green
                else if (analysisResult.accuracy >= 50) color = '#eab308'; // yellow

                canvasCtx.fillStyle = color;
                canvasCtx.fill();
            }
        });
    } else {
        feedbackBox.textContent = "No person detected.";
        feedbackBox.className = "mt-4 text-center text-xl font-bold p-4 rounded-lg bg-red-800 text-red-200";
        updateAccuracyUI(0, "Position yourself in front of the camera", {});
    }
    canvasCtx.restore();
}

// --- Enhanced Exercise Analysis with Accuracy ---

function analyzeHandRaiseWithAccuracy(landmarks) {
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    const rightHip = landmarks[24];

    const visible = rightShoulder.visibility > 0.5 && rightElbow.visibility > 0.5 && rightWrist.visibility > 0.5;
    if (!visible) return { isCorrect: false, accuracy: 0, feedback: "Can't see your right arm clearly", joints: {} };

    // Calculate arm angle (shoulder-elbow-wrist)
    const armAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const armStraight = armAngle > 150; // Arm should be relatively straight

    // Check if hand is above shoulder
    const handAboveShoulder = rightWrist.y < rightShoulder.y;
    const heightDiff = (rightShoulder.y - rightWrist.y) * 100; // normalized

    // Calculate accuracy
    let accuracy = 0;
    if (handAboveShoulder) {
        accuracy += 50; // Base points for raising hand
        accuracy += Math.min(heightDiff * 2, 30); // Bonus for height
        if (armStraight) accuracy += 20; // Bonus for straight arm
    } else {
        accuracy = Math.max(0, 30 - (rightWrist.y - rightShoulder.y) * 100);
    }
    accuracy = Math.min(100, Math.max(0, accuracy));

    const isCorrect = accuracy >= 80;

    let feedback = '';
    if (accuracy >= 80) feedback = "Excellent form! Hold the position.";
    else if (accuracy >= 50) feedback = "Almost there! Raise your hand higher.";
    else if (!handAboveShoulder) feedback = "⬆️ Raise your right hand above shoulder";
    else if (!armStraight) feedback = "Straighten your arm";
    else feedback = "Keep raising your hand higher";

    return {
        isCorrect,
        accuracy,
        feedback,
        joints: {
            'Shoulder': true,
            'Elbow': armStraight,
            'Wrist': handAboveShoulder
        }
    };
}

function analyzeShoulderAbductionWithAccuracy(landmarks) {
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    const visible = leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5;
    if (!visible) return { isCorrect: false, accuracy: 0, feedback: "Position both shoulders visible", joints: {} };

    // Calculate angles for both arms relative to torso
    const leftArmAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
    const rightArmAngle = calculateAngle(rightHip, rightShoulder, rightElbow);

    // Target: arms at ~90 degrees from body (horizontal)
    const leftScore = Math.max(0, 100 - Math.abs(90 - leftArmAngle));
    const rightScore = Math.max(0, 100 - Math.abs(90 - rightArmAngle));

    const accuracy = (leftScore + rightScore) / 2;
    const isCorrect = accuracy >= 70;

    let feedback = '';
    if (accuracy >= 80) feedback = "Perfect T-pose! Hold it steady.";
    else if (accuracy >= 50) feedback = "Raise both arms to shoulder height";
    else feedback = "Spread arms out to the sides horizontally";

    return {
        isCorrect,
        accuracy,
        feedback,
        joints: {
            'Left Arm': leftScore >= 60,
            'Right Arm': rightScore >= 60
        }
    };
}

function analyzeSquatWithAccuracy(landmarks) {
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];

    const visible = leftKnee.visibility > 0.5 && rightKnee.visibility > 0.5;
    if (!visible) return { isCorrect: false, accuracy: 0, feedback: "Can't see your legs clearly", joints: {} };

    // Calculate knee angles
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // Target: ~90 degrees for a proper squat
    // Score based on how close to 90 degrees
    let accuracy = 0;
    if (avgKneeAngle <= 110) {
        accuracy = Math.max(0, 100 - Math.abs(90 - avgKneeAngle) * 2);
    } else {
        // Standing - encourage going lower
        accuracy = Math.max(0, 50 - (avgKneeAngle - 110));
    }
    accuracy = Math.min(100, Math.max(0, accuracy));

    const isCorrect = accuracy >= 70;

    let feedback = '';
    if (accuracy >= 80) feedback = "Great squat depth! Hold and rise.";
    else if (accuracy >= 50) feedback = "Good start, go a bit lower";
    else if (avgKneeAngle > 150) feedback = "Bend your knees to start the squat";
    else feedback = "Lower your hips more";

    return {
        isCorrect,
        accuracy,
        feedback,
        joints: {
            'Left Knee': leftKneeAngle <= 110,
            'Right Knee': rightKneeAngle <= 110,
            'Depth': avgKneeAngle <= 100
        }
    };
}

function getInstruction() {
    if (currentPrescription.exercise === 'Right Hand Raise') return '⬆️ Raise right hand above shoulder';
    if (currentPrescription.exercise === 'Shoulder Abduction') return '↔️ Spread arms out horizontally';
    if (currentPrescription.exercise === 'Squat') return '⬇️ Bend knees and lower your hips';
    return 'Perform the exercise correctly';
}

async function finishExercise() {
    const points = await completeExercise(auth.currentUser.uid, auth.currentUser.email, currentPrescription.id, currentPrescription.exercise, totalReps, currentPoints);
    updatePointsUI(currentPoints + points);

    // Show the feedback modal instead of immediately redirecting
    showFeedbackModal(points);
}

function updatePointsUI(points) {
    currentPoints = points;
    (document.getElementById('user-points') || document.createElement('div')).textContent = points;
    (document.getElementById('user-currency') || document.createElement('div')).textContent = `₹${(points / 100).toFixed(2)}`;
}

function showRewardNotification(points) {
    const notif = document.createElement('div');
    notif.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black font-bold p-6 rounded-2xl shadow-2xl z-50 animate-bounce text-center';
    notif.innerHTML = `<div class="text-4xl mb-2">🎉</div><div class="text-2xl">Exercise Complete!</div><div class="text-xl">+${points} Points</div>`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// --- Chat ---
const chatTranslations = {
    en: {
        hello: 'Hello! I am your AI Assistant. How can I help you with your screening or rehabilitation process today?',
        guide: 'I\'m here to guide you. ',
        squat: 'For squats, keep your back straight and lower your hips until your knees are bent at a 90-degree angle. Real-time feedback will guide your form.',
        screening: 'The screening process involves answering a few questions, followed by movement analysis using the camera, and data collection from wearables if connected.',
        pain: 'If you feel sharp pain, stop immediately. You can note this down in the feedback form after the session.',
        default: 'The procedure is closely monitored. The doctor will review all the data collected during this session. Is there any specific step you need clarification on?'
    },
    as: {
        hello: 'নমস্কাৰ! মই আপোনাৰ এ.আই. সহায়ক। আজি আপোনাৰ স্ক্ৰীনিং বা পুনৰ্বাসন প্ৰক্ৰিয়াত মই কেনেকৈ সহায় কৰিব পাৰোঁ?',
        guide: 'মই আপোনাক নিৰ্দেশনা দিবলৈ ইয়াত আছোঁ। ',
        squat: 'স্কোৱাটৰ বাবে, আপোনাৰ পিঠিখন পোনকৈ ৰাখক আৰু আঁঠু ৯০ ডিগ্ৰী কোণত ভাঁজ নোখোৱালৈকে আপোনাৰ নিতম্ব তললৈ নমাই আনক।',
        screening: 'স্ক্ৰীনিং প্ৰক্ৰিয়াত কেইটামান প্ৰশ্নৰ উত্তৰ দিয়া, তাৰ পিছত কেমেৰা ব্যৱহাৰ কৰি চলন বিশ্লেষণ, আৰু পিন্ধিব পৰা সঁজুলিৰ পৰা তথ্য সংগ্ৰহ কৰা অন্তৰ্ভুক্ত।',
        pain: 'যদি আপুনি তীব্ৰ বিষ অনুভৱ কৰে, লগে লগে বন্ধ কৰক। আপুনি চেচনৰ পিছত ফীডবেক ফৰ্মত এই বিষয়ে লিখিব পাৰে।',
        default: 'প্ৰক্ৰিয়াটো অতি মনোযোগেৰে নিৰীক্ষণ কৰা হয়। চিকিৎসকগৰাকীয়ে এই চেচনত সংগ্ৰহ কৰা সকলো তথ্য পৰীক্ষা কৰিব। আপোনাক কোনো নিৰ্দিষ্ট পদক্ষেপৰ বিষয়ে স্পষ্টীকৰণ লাগে নেকি?'
    },
    bn: {
        hello: 'নমস্কার! আমি আপনার এআই সহকারী। আজ আপনার স্ক্রীনিং বা পুনর্বাসন প্রক্রিয়ায় আমি কীভাবে সাহায্য করতে পারি?',
        guide: 'আমি আপনাকে গাইড করতে এখানে আছি। ',
        squat: 'স্কোয়াটের জন্য, আপনার পিঠ সোজা রাখুন এবং আপনার হাঁটু ৯০ ডিগ্রি কোণে বাঁকা না হওয়া পর্যন্ত আপনার নিতম্ব নিচু করুন।',
        screening: 'স্ক্রীনিং প্রক্রিয়ায় কয়েকটি প্রশ্নের উত্তর দেওয়া, তারপর ক্যামেরা ব্যবহার করে চলাফেরা বিশ্লেষণ এবং পরিধানযোগ্য ডিভাইস থেকে ডেটা সংগ্রহ অন্তর্ভুক্ত।',
        pain: 'যদি আপনি তীব্র ব্যথা অনুভব করেন, অবিলম্বে বন্ধ করুন। সেশনের পরে আপনি ফিডব্যাক ফর্মে এটি লিখতে পারেন।',
        default: 'পুরো প্রক্রিয়াটি গভীরভাবে পর্যবেক্ষণ করা হচ্ছে। ডাক্তার এই সেশনে সংগৃহীত সমস্ত ডেটা পর্যালোচনা করবেন। আপনার কি নির্দিষ্ট কোনো ধাপ সম্পর্কে আরও কিছু জানার আছে?'
    },
    mni: {
        hello: 'Khuru-m-jari! Eihakki AI assistant ni. Ngasi screening natraga rehabilitation process ta karamna mateng pang-gadage?',
        guide: 'Eina mateng pang-gani. ',
        squat: 'Squat ki damak, nasha chum-na thambiyu amadi nakhu 90-degree da sok-pa faoba makhada thambiyu.',
        screening: 'Screening da wahang khara hang-gani, aduga camera ga wearable sensor ga sijinnaduna analysis tougani.',
        pain: 'Naba faba taradi thok-toknaba tok-piyu. Session matungda feedback form da hairak-piyu.',
        default: 'Process asi nung-na yeng-li. Doctor na data pumnamak yeng-gani. Wahang ama-faoba leibra?'
    },
    kha: {
        hello: 'Khublei! Nga long u AI Assistant jong phi. Kumno nga lah ban iarap ia phi mynta ka sngi?',
        guide: 'Nga don hangne ban pyni lynti. ',
        squat: 'Na ka bynta ki squat, pynieng beit ia ka met bad pynnguh ia ki khohsiew haduh 90 degree.',
        screening: 'Ka screening ka kynthup ia ka jingkylli, nangta ka jingpeit ia ka jingkhih lyngba ka camera bad ki sensor.',
        pain: 'Lada phi sngew kthaid, sangeh mardor. Phi lah ban thoh ia kane ha ka form ynda la dep.',
        default: 'Ia ka rukom leh la peit bniah. U doktor un peit ia ki data baroh. Don kano kano ka bynta ba phi kwah ban tip kham bniah?'
    },
    lus: {
        hello: 'Chibai! I AI Assistant ka ni e. Vawiin ah engtin nge ka puih theih ang che?',
        guide: 'Ka pui ang che. ',
        squat: 'Squat turin, i hnungzang ngil takin awm la, i khup 90 degree a a thleh hma chu i mawng hniam rawh.',
        screening: 'Screening ah hian zawhna thenkhat chhan te, camera hmanga i chetzia endik te, leh wearable aṭanga data lakkhawm te a tel.',
        pain: 'Na tak i neih chuan chawl nghal rawh. Session zawhah feedback form ah i ziak thei ang.',
        default: 'He thil hi uluk taka vil a ni. Doctor in data zawng zawng a endik ang. Hriat chian duh i nei em?'
    }
};

function getChatText(key) {
    const lang = window.mediva?.state?.language || 'en';
    return chatTranslations[lang]?.[key] || chatTranslations['en'][key];
}

chatToggleBtn.addEventListener('click', () => {
    // Modal visibility is toggled directly here
    chatModal.classList.toggle('hidden');
    if (!chatModal.classList.contains('hidden') && chatMessages.children.length <= 1) {
        chatMessages.innerHTML = ''; // clear placeholder
        appendChatMessage(getChatText('hello'), false);
    }
});
closeChatBtn.addEventListener('click', () => chatModal.classList.add('hidden'));
sendMsgBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });

function appendChatMessage(text, isMe) {
    const div = document.createElement('div');
    div.className = `flex ${isMe ? 'justify-end' : 'justify-start'}`;
    div.innerHTML = `
        <div class="max-w-[80%] rounded-lg px-3 py-2 ${isMe ? 'bg-mediva-600 text-white' : 'bg-slate-200 text-slate-800'}">
            <p class="text-sm">${text}</p>
        </div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    appendChatMessage(text, true);
    chatInput.value = '';
    
    setTimeout(() => {
        let response = getChatText('guide');
        const lower = text.toLowerCase();
        if (lower.includes('squat') || lower.includes('exercise')) {
            response += getChatText('squat');
        } else if (lower.includes('screening') || lower.includes('process') || lower.includes('step')) {
            response += getChatText('screening');
        } else if (lower.includes('pain') || lower.includes('hurt')) {
            response += getChatText('pain');
        } else {
            response += getChatText('default');
        }
        appendChatMessage(response, false);
    }, 1000);
}

// --- Post-Exercise Feedback Modal ---
let selectedDifficulty = null;
let pendingPoints = 0;

function showFeedbackModal(points) {
    pendingPoints = points;
    selectedDifficulty = null;

    // Reset modal state
    (document.getElementById('pain-slider') || document.createElement('div')).value = 1;
    (document.getElementById('pain-value') || document.createElement('div')).textContent = '1';
    (document.getElementById('feedback-notes') || document.createElement('div')).value = '';
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('border-teal-500', 'bg-teal-500/20');
        btn.classList.add('border-gray-700');
    });

    // Show modal
    (document.getElementById('feedback-modal') || document.createElement('div')).classList.remove('hidden');
}

function closeFeedbackModal() {
    (document.getElementById('feedback-modal') || document.createElement('div')).classList.add('hidden');
    showRewardNotification(pendingPoints);

    setTimeout(() => {
        showPrescriptionList();
        loadPrescriptions();
    }, 2000);
}

// Pain slider update
(document.getElementById('pain-slider') || document.createElement('div'))?.addEventListener('input', (e) => {
    (document.getElementById('pain-value') || document.createElement('div')).textContent = e.target.value;
});

// Difficulty button selection
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove selection from all
        document.querySelectorAll('.difficulty-btn').forEach(b => {
            b.classList.remove('border-teal-500', 'bg-teal-500/20');
            b.classList.add('border-gray-700');
        });
        // Add selection to clicked
        btn.classList.add('border-teal-500', 'bg-teal-500/20');
        btn.classList.remove('border-gray-700');
        selectedDifficulty = btn.dataset.difficulty;
    });
});

// Submit feedback
(document.getElementById('submit-feedback-btn') || document.createElement('div'))?.addEventListener('click', async () => {
    const painLevel = parseInt((document.getElementById('pain-slider') || document.createElement('div')).value);
    const notes = (document.getElementById('feedback-notes') || document.createElement('div')).value.trim();

    if (!selectedDifficulty) {
        alert('Please select a difficulty level');
        return;
    }

    try {
        await saveExerciseFeedback(
            auth.currentUser.uid,
            auth.currentUser.email,
            currentPrescription.exercise,
            painLevel,
            selectedDifficulty,
            notes
        );
        console.log('Feedback saved successfully');
    } catch (e) {
        console.error('Error saving feedback:', e);
    }

    closeFeedbackModal();
});

// Skip feedback
(document.getElementById('skip-feedback-btn') || document.createElement('div'))?.addEventListener('click', () => {
    closeFeedbackModal();
});

// --- Analytics Dashboard ---
let weeklyChart = null;

async function loadAnalytics() {
    try {
        const stats = await getExerciseStats(auth.currentUser.uid);

        // Update stat cards
        (document.getElementById('stat-total-exercises') || document.createElement('div')).textContent = stats.totalExercises || 0;
        (document.getElementById('stat-streak') || document.createElement('div')).textContent = stats.streak || 0;
        (document.getElementById('stat-adherence') || document.createElement('div')).textContent = `${stats.adherenceRate || 0}%`;

        // Render weekly chart if Chart.js is available
        const canvas = (document.getElementById('weekly-chart') || document.createElement('div'));
        if (canvas && typeof Chart !== 'undefined' && stats.weeklyData && stats.weeklyData.length > 0) {
            const ctx = canvas.getContext('2d');

            // Destroy existing chart if any
            if (weeklyChart) weeklyChart.destroy();

            weeklyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: stats.weeklyData.map(d => d.day),
                    datasets: [{
                        label: 'Exercises Completed',
                        data: stats.weeklyData.map(d => d.count),
                        backgroundColor: 'rgba(20, 184, 166, 0.7)',
                        borderColor: 'rgba(20, 184, 166, 1)',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#9ca3af',
                                stepSize: 1
                            },
                            grid: { color: 'rgba(75, 85, 99, 0.3)' }
                        },
                        x: {
                            ticks: { color: '#9ca3af' },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    } catch (e) {
        console.error("Error loading analytics:", e);
    }
}

window.startCameraDemo = function() {
    initCamera();
    document.getElementById('cam-placeholder').style.display = 'none';
    const btn = document.getElementById('btn-demo-movement');
    if(btn) {
        btn.textContent = 'Analyzing Kinetics...';
        btn.classList.add('animate-pulse');
    }
};
