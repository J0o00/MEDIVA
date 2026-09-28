with open('c:/Users/jovia/MEDIVA/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('onclick="mediva.runMovementDemo()"', 'onclick="window.startCameraDemo()"')

with open('c:/Users/jovia/MEDIVA/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
