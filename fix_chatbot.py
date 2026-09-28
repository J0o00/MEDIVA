import re

with open('c:/Users/jovia/MEDIVA/js/mediva-integration.js', 'r', encoding='utf-8') as f:
    content = f.read()

chat_start = content.find('// --- Chat ---')
feedback_start = content.find('// --- Post-Exercise Feedback Modal ---')

new_chat_logic = '''// --- Chat ---
const chatTranslations = {
    en: {
        hello: 'Hello! I am your AI Assistant. How can I help you with your screening or rehabilitation process today?',
        guide: 'I\\'m here to guide you. ',
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

'''
content = content[:chat_start] + new_chat_logic + content[feedback_start:]

with open('c:/Users/jovia/MEDIVA/js/mediva-integration.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched mediva-integration.js')
