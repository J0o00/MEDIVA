/**
 * MEDIVA Core Application Logic
 * Integrates the complete SIH Prototype workflow.
 */

const mediva = {
    state: {
        currentView: 'dashboard',
        language: 'en',
        workflow: {
            patient: false,
            movement: false,
            wearables: false,
            analysis: false,
            riskAssessed: false,
            rehabActive: false
        },
                voicePrompts: {
            en: {
                start: "Welcome to MEDIVA. Let's begin the screening process.",
                movement: "Please position the chair and ensure your full body is visible.",
                wearables: "Wearable sensors are connected in demo mode.",
                risk: "Screening complete. Moderate risk markers detected."
            },
            as: {
                start: "MEDIVA লৈ স্বাগতম। স্ক্ৰীনিং প্ৰক্ৰিয়া আৰম্ভ কৰোঁ আহক।",
                movement: "অনুগ্ৰহ কৰি চকীখন ঠিক কৰক আৰু আপোনাৰ গোটেই শৰীৰটো দেখা পোৱা নিশ্চিত কৰক।",
                wearables: "ডেমাে মোডত ৱেৰেবেল চেন্সৰ সংযুক্ত হৈ আছে।",
                risk: "স্ক্ৰীনিং সম্পূৰ্ণ হৈছে। মজলীয়া বিপদাশংকাৰ লক্ষণ ধৰা পৰিছে।"
            },
            bn: {
                start: "MEDIVA-তে স্বাগতম। চলুন স্ক্রীনিং প্রক্রিয়া শুরু করি।",
                movement: "অনুগ্রহ করে চেয়ারটি ঠিক করুন এবং আপনার পুরো শরীরটি দেখা যাচ্ছে তা নিশ্চিত করুন।",
                wearables: "ডেমো মোডে পরিধানযোগ্য সেন্সর যুক্ত আছে।",
                risk: "স্ক্রীনিং সম্পন্ন হয়েছে। মাঝারি ঝুঁকির লক্ষণ ধরা পড়েছে।"
            },
            mni: {
                start: "MEDIVA da yengbiyu. Screening process houbasi.",
                movement: "Chair ado makhada thambiyu amadi nasha pumba yengba ngamgadabani.",
                wearables: "Wearable sensor sing demo mode ta connect toure.",
                risk: "Screening loire. Moderate risk markers leibasi thengnare."
            },
            kha: {
                start: "Kumno phi long sha MEDIVA. Ngin sdang ia ka screening process.",
                movement: "Sngewbha buh ka shuki bad pynthikna ba lah ban iohi baroh shispong.",
                wearables: "Ki sensor wearable ki la don ha demo mode.",
                risk: "Ka screening la dep. La lap ia ki dak kiba lah ban buh jingma."
            },
            lus: {
                start: "MEDIVA ah kan lo lawm a che. Screening process i tan ang u.",
                movement: "Khawngaihin thutphah rem la, i pum pui lan theih nan inring rawh.",
                wearables: "Wearable sensor te hi demo mode ah connect a ni.",
                risk: "Screening zawh a ni. Moderate risk markers hmuh a ni."
            }
        }
    },

    init() {
        // Initialize UI State
        this.updateDashboardUI();
        this.nav('dashboard');
        console.log("MEDIVA Prototype Initialized.");
    },

    nav(viewId) {
        // Handle Sidebar active states
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.getElementById(`nav-${viewId}`);
        if(navItem) navItem.classList.add('active');

        // Handle View visibility
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const viewEl = document.getElementById(`view-${viewId}`);
        if(viewEl) viewEl.classList.add('active');
        
        this.state.currentView = viewId;
        window.scrollTo(0, 0);

        // Specific view logic
        if (viewId === 'movement') this.playVoice('movement');
        if (viewId === 'wearables') this.playVoice('wearables');
        if (viewId === 'risk') this.playVoice('risk');
        
        // Stop videos if leaving demo pages
        if(viewId !== 'movement') this.stopDemoVideo('demo-video');
        if(viewId !== 'rehab') this.stopDemoVideo('rehab-demo-video');
    },

    startWizard() {
        this.playVoice('start');
        this.nav('screening');
    },

    completeStep(step) {
        this.state.workflow[step] = true;
        this.updateDashboardUI();
        
        // Auto-navigate progression
        if (step === 'patient') {
            this.nav('movement');
        } else if (step === 'movement') {
            this.nav('wearables');
        } else if (step === 'wearables') {
            this.nav('analysis');
        }
    },

    updateDashboardUI() {
        const wf = this.state.workflow;
        
        // Update Dashboard Cards
        this.updateCard('patient', wf.patient);
        this.updateCard('movement', wf.movement);
        this.updateCard('wearables', wf.wearables);
        
        // AI Analysis unlocks if first 3 are done
        const aiReady = wf.patient && wf.movement && wf.wearables;
        const analysisCard = document.getElementById('card-analysis');
        const btnAnalysis = document.getElementById('btn-analysis');
        
        if (aiReady && !wf.analysis) {
            analysisCard.classList.remove('opacity-60', 'bg-slate-50', 'border-slate-200');
            analysisCard.classList.add('cursor-pointer', 'border-mediva-400', 'bg-white', 'shadow-md');
            analysisCard.onclick = () => this.nav('analysis');
            btnAnalysis.textContent = "Start Analysis →";
            btnAnalysis.classList.remove('text-slate-400');
            btnAnalysis.classList.add('text-mediva-600');
        }

        // Update Care Pathway Timeline Progress
        let progress = 0;
        if (wf.patient) progress = 10;
        if (wf.movement) progress = 30;
        if (wf.wearables) progress = 50;
        if (wf.analysis) progress = 70;
        if (wf.riskAssessed) progress = 90;
        if (wf.rehabActive) progress = 100;
        
        const pwBar = document.getElementById('pathway-progress');
        if(pwBar) pwBar.style.width = `${progress}%`;

        // Pathway node colors
        this.setNodeActive('pw-screen', wf.patient || wf.movement || wf.wearables);
        this.setNodeActive('pw-analyze', wf.analysis);
        this.setNodeActive('pw-risk', wf.riskAssessed);
        this.setNodeActive('pw-refer', wf.riskAssessed);
        this.setNodeActive('pw-rehab', wf.rehabActive);
        
        // Dashboard Risk Badge
        if (wf.riskAssessed) {
            const badge = document.getElementById('dash-risk-badge');
            if(badge) {
                badge.className = "px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200";
                badge.textContent = "Moderate Risk";
            }
        }
    },

    updateCard(id, isComplete) {
        const icon = document.getElementById(`icon-${id}`);
        const btn = document.getElementById(`btn-${id}`);
        if(isComplete && icon) {
            icon.innerHTML = '✓';
            icon.className = "w-6 h-6 rounded-full bg-mediva-500 text-white flex items-center justify-center font-bold text-xs";
            if(btn) btn.textContent = "Completed ✓";
        }
    },

    setNodeActive(id, isActive) {
        const el = document.getElementById(id);
        if(el && isActive) {
            el.className = "w-8 h-8 rounded-full bg-mediva-500 text-white flex items-center justify-center shadow-md font-bold transition-all";
        }
    },

    // ---------------------------------------------------------
    // DEMO INTERACTIONS
    // ---------------------------------------------------------

    runMovementDemo() {
        document.getElementById('cam-placeholder').style.display = 'none';
        const vid = document.getElementById('demo-video');
        vid.style.display = 'block';
        vid.play();
        
        const btn = document.getElementById('btn-demo-movement');
        btn.textContent = "Analyzing Kinetics...";
        btn.classList.add('animate-pulse');

        // Simulate test progression
        let rep = 0;
        const interval = setInterval(() => {
            rep++;
            document.getElementById('sts-rep').textContent = `${rep} / 5`;
            document.getElementById('sts-angle').textContent = `${Math.floor(Math.random()*15 + 75)}°`;
            document.getElementById('sts-sym').textContent = `${Math.floor(Math.random()*10 + 75)}%`;
            document.getElementById('sts-sym-bar').style.width = `${Math.floor(Math.random()*10 + 75)}%`;
            
            if (rep >= 5) {
                clearInterval(interval);
                btn.textContent = "Test Complete. Proceeding...";
                btn.classList.remove('animate-pulse');
                btn.classList.replace('bg-mediva-600', 'bg-green-600');
                setTimeout(() => {
                    this.stopDemoVideo('demo-video');
                    this.completeStep('movement');
                }, 1500);
            }
        }, 1000);
    },

    runRehabDemo() {
        const vid = document.getElementById('rehab-demo-video');
        vid.style.display = 'block';
        vid.play();
        const btn = document.getElementById('btn-start-rehab');
        btn.style.display = 'none';
        this.state.workflow.rehabActive = true;
        this.updateDashboardUI();
    },

    stopDemoVideo(id) {
        const vid = document.getElementById(id);
        if(vid) {
            vid.pause();
            vid.style.display = 'none';
        }
    },

    runAI() {
        const core = document.getElementById('fusion-core');
        const btn = document.getElementById('btn-run-ai');
        
        btn.innerHTML = '<svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>';
        btn.classList.add('opacity-80');
        
        core.classList.add('scale-105', 'shadow-mediva-500/50');
        
        setTimeout(() => {
            this.state.workflow.analysis = true;
            this.state.workflow.riskAssessed = true;
            this.updateDashboardUI();
            this.nav('risk');
        }, 2000);
    },

    toggleVoiceAssist() {
        const overlay = document.getElementById('voice-overlay');
        if (overlay.classList.contains('hidden')) {
            overlay.classList.remove('hidden');
            this.playVoice(this.state.currentView);
            this.startListening();
        } else {
            overlay.classList.add('hidden');
            this.stopListening();
        }
    },

    startListening() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn("Speech recognition not supported in this browser.");
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!this.recognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                const last = event.results.length - 1;
                const command = event.results[last][0].transcript.toLowerCase().trim();
                console.log("Voice Command Received:", command);
                
                if (command.includes('start screening')) {
                    this.startWizard();
                } else if (command.includes('start exercise') || command.includes('rehab')) {
                    const btn = document.getElementById('btn-start-rehab');
                    if (btn) btn.click();
                } else if (command.includes('analyze') || command.includes('analysis')) {
                    this.runAI();
                } else if (command.includes('next')) {
                    const steps = ['patient', 'movement', 'wearables', 'analysis'];
                    for (let step of steps) {
                        if (!this.state.workflow[step]) {
                            this.completeStep(step);
                            break;
                        }
                    }
                }
            };
            
            this.recognition.onend = () => {
                const overlay = document.getElementById('voice-overlay');
                if (!overlay.classList.contains('hidden')) {
                    // Restart listening if overlay is still visible
                    try { this.recognition.start(); } catch(e){}
                }
            };
        }
        
        try {
            this.recognition.start();
        } catch (e) { console.warn(e); }
    },

    stopListening() {
        if (this.recognition) {
            try { this.recognition.stop(); } catch(e){}
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    },

    playVoice(context) {
        const textEl = document.getElementById('voice-text');
        if(!textEl) return;
        
        const lang = this.state.language;
        let prompt = this.state.voicePrompts[lang]?.[context] || this.state.voicePrompts['en']?.[context] || "Proceed with the current step on screen.";
        textEl.textContent = `"${prompt}"`;
        
        const overlay = document.getElementById('voice-overlay');
        if(overlay && overlay.classList.contains('hidden') && context === 'start') {
            overlay.classList.remove('hidden');
        }
        
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(prompt);
            
            const langMap = {
                'en': 'en-US',
                'as': 'as-IN',
                'bn': 'bn-IN',
                'hi': 'hi-IN',
                'mni': 'en-IN',
                'kha': 'en-IN',
                'lus': 'en-IN'
            };
            utterance.lang = langMap[lang] || 'en-US';
            
            // Try to find a matching voice, falling back intelligently
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const voice = voices.find(v => v.lang.startsWith(utterance.lang)) || 
                              voices.find(v => v.lang.startsWith('hi-IN')) || 
                              voices.find(v => v.lang.startsWith('en')) || 
                              voices[0];
                if (voice) utterance.voice = voice;
            }
            
            window.speechSynthesis.speak(utterance);
        }
    }
};

window.mediva = mediva;
