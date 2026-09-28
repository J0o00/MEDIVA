import os
import re

dir_path = r'c:\Users\jovia\MEDIVA'
for root, dirs, files in os.walk(dir_path):
    if '.git' in root:
        continue
    for file in files:
        if file.endswith(('.py', '.html', '.js', '.json', '.txt', 'Documentation', '.firebaserc', '.gitignore', 'rules')):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = re.sub(re.compile(r'MEDIVA', re.IGNORECASE), 'MEDIVA', content)
                
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {file_path}")
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
