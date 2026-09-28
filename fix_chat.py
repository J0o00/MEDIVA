with open('c:/Users/jovia/MEDIVA/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("onclick=\"document.getElementById('chat-modal').classList.toggle('hidden')\"", "")

with open('c:/Users/jovia/MEDIVA/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed HTML toggle')
