with open('c:/Users/jovia/MEDIVA/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

injected_start = content.find('<div class="mt-4">', content.find('id="movement-cam-container"'))
if injected_start != -1:
    injected_end = content.find('</div>', content.find('Finish & Feedback', injected_start))
    # Close out the grid and the mt-4 wrapper
    for _ in range(4):
        injected_end = content.find('</div>', injected_end + 6)
        
    content = content[:injected_start] + content[injected_end:]
    
    with open('c:/Users/jovia/MEDIVA/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Successfully removed the duplicated MEDIVA dashboard from Movement Lab.')
else:
    print('Could not find injected block.')
