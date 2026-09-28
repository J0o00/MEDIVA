import re

with open('c:/Users/jovia/MEDIVA/js/mediva-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the `stopListening()` and `playVoice(context)` definitions and replace them entirely.
stop_listening_start = content.find('stopListening() {')
play_voice_start = content.find('playVoice(context) {')
end_bracket = content.find('};\n\nwindow.mediva = mediva;')

if stop_listening_start != -1 and play_voice_start != -1:
    new_functions = '''stopListening() {
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
'''
    new_content = content[:stop_listening_start] + new_functions + content[end_bracket:]
    with open('c:/Users/jovia/MEDIVA/js/mediva-app.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed functions!")
else:
    print("Could not find functions.")
