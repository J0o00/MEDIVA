import re

with open('c:/Users/jovia/MEDIVA/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract the MEDIVA feedback UI block
rehab_start = content.find('<div class="grid grid-cols-3 gap-4 shrink-0">')
# Find the end of this div block by looking for "Finish & Feedback"
finish_btn_idx = content.find('Finish & Feedback', rehab_start)
div_end_idx = content.find('</div>', finish_btn_idx)
# Need to go up two more </div> tags to close the grid
for _ in range(3):
    div_end_idx = content.find('</div>', div_end_idx + 6)
feedback_ui = content[rehab_start:div_end_idx+6]

# 2. Insert the MEDIVA UI underneath movement-cam-container
cam_container_end = content.find('id="demo-canvas"')
if cam_container_end != -1:
    div_end = content.find('</div>', cam_container_end)
    content = content[:div_end+6] + '\n                        <div class="mt-4">\n' + feedback_ui + '\n                        </div>\n' + content[div_end+6:]

# 3. Add Complete Demo button and reps to the Movement Lab header
movement_header = '<h3 class="font-bold text-slate-800 mb-4 text-lg">Test Protocol</h3>'
new_movement_header = '''<h3 class="font-bold text-slate-800 mb-2 text-lg" id="current-exercise-title">Test Protocol (Squat)</h3>
<div class="flex items-center gap-3 mb-4">
    <span class="text-sm font-black text-mediva-700 bg-mediva-100 border border-mediva-200 px-4 py-1.5 rounded-full">Rep <span id="current-reps">0</span> / <span id="target-reps">5</span></span>
    <button id="btn-complete-rehab" class="hidden px-4 py-1.5 bg-mediva-600 hover:bg-mediva-500 text-white rounded-full font-bold text-sm shadow-sm">Complete Demo</button>
</div>'''
content = content.replace(movement_header, new_movement_header)

# 4. Remove view-rehab entirely
rehab_view_start = content.find('<!-- VIEW: REHABILITATE (MEDIVA) -->')
rehab_view_end = content.find('<!-- VIEW: CLINICIAN PORTAL -->')
if rehab_view_start != -1 and rehab_view_end != -1:
    content = content[:rehab_view_start] + content[rehab_view_end:]

# 5. Make sure static src is removed from demo-video
content = content.replace('src="https://storage.googleapis.com/mediapipe-assets/squat.mp4"', '')

with open('c:/Users/jovia/MEDIVA/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Merge complete")
