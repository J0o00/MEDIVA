import re

with open('c:/Users/jovia/MEDIVA/js/mediva-integration.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Make getElementById safe
content = re.sub(r"document\.getElementById\('([^']+)'\)", r"(document.getElementById('\1') || document.createElement('div'))", content)

# Change webcam and pose-canvas
content = content.replace("'webcam'", "'rehab-demo-video'")
content = content.replace("'pose-canvas'", "'rehab-demo-canvas'")

# Remove checkAuthAndRedirect
content = content.replace("checkAuthAndRedirect('patient');", "// checkAuthAndRedirect('patient');")

# Write back
with open('c:/Users/jovia/MEDIVA/js/mediva-integration.js', 'w', encoding='utf-8') as f:
    f.write(content)
