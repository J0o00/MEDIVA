with open('c:/Users/jovia/MEDIVA/js/mediva-integration.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '// --- Chat ---'
end_marker = '// --- Post-Exercise Feedback Modal ---'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_chat_code = """// --- Chat ---
chatToggleBtn.addEventListener('click', () => {
    chatModal.classList.toggle('hidden');
    if (!chatModal.classList.contains('hidden') && chatMessages.children.length <= 1) {
        chatMessages.innerHTML = ''; // clear placeholder
        appendChatMessage('Hello! I am your AI Assistant. How can I help you with your screening or rehabilitation process today?', false);
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
        let response = 'I\\'m here to guide you. ';
        const lower = text.toLowerCase();
        if (lower.includes('squat') || lower.includes('exercise')) {
            response += 'For squats, keep your back straight and lower your hips until your knees are bent at a 90-degree angle. Real-time feedback will guide your form.';
        } else if (lower.includes('screening') || lower.includes('process') || lower.includes('step')) {
            response += 'The screening process involves answering a few questions, followed by movement analysis using the camera, and data collection from wearables if connected.';
        } else if (lower.includes('pain') || lower.includes('hurt')) {
            response += 'If you feel sharp pain, stop immediately. You can note this down in the feedback form after the session.';
        } else {
            response += 'The procedure is closely monitored. The doctor will review all the data collected during this session. Is there any specific step you need clarification on?';
        }
        appendChatMessage(response, false);
    }, 1000);
}

"""
    new_content = content[:start_idx] + new_chat_code + content[end_idx:]
    with open('c:/Users/jovia/MEDIVA/js/mediva-integration.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully patched chat logic')
else:
    print('Could not find markers')
