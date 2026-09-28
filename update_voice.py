with open('c:/Users/jovia/MEDIVA/js/mediva-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_prompts = '''        voicePrompts: {
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
        }'''

import re
pattern = re.compile(r'voicePrompts:\s*\{.*?\n\s*\}\s*\}', re.DOTALL)
content = pattern.sub(new_prompts, content)

with open('c:/Users/jovia/MEDIVA/js/mediva-app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated voicePrompts.')
