with open('c:/Users/jovia/MEDIVA/js/mediva-integration.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('let currentPrescription = null;', "let currentPrescription = { exercise: 'Squat', sets: 3, reps: 10 };")

content = content.replace('const userId = auth.currentUser.uid;', '''
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
''')

content = content.replace('logExerciseRep(auth.currentUser.uid', 'if (auth.currentUser) logExerciseRep(auth.currentUser.uid')

with open('c:/Users/jovia/MEDIVA/js/mediva-integration.js', 'w', encoding='utf-8') as f:
    f.write(content)
