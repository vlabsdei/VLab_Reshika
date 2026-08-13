import urllib.request
import json
import base64
import os

images_to_restore = [
    {
        "url": "https://api.github.com/repos/vlabsdei/VLab_Reshika/git/blobs/70d47339fc35d7ce6722cb7e15e1a09a7aa1c1c2",
        "path": r"exp-ai-based-eco-driving-and-energy-optimisation\experiment\images\ai-based-eco-driving.drawio.png"
    },
    {
        "url": "https://api.github.com/repos/vlabsdei/VLab_Reshika/git/blobs/9b29734cfa4c0b5cb2d8f6577b9d55c6bf191e2a",
        "path": r"exp-thermal-runaway-propagation-and-emergency-battery-isolation-system-dei\experiment\images\Milestione 2.png"
    },
    {
        "url": "https://api.github.com/repos/vlabsdei/VLab_Reshika/git/blobs/f1f97712f453dec8b37ed00bf55f51d7ea4e8867",
        "path": r"exp-thermal-runaway-propagation-and-emergency-battery-isolation-system-dei\experiment\images\Milestone 1.png"
    },
    {
        "url": "https://api.github.com/repos/vlabsdei/VLab_Reshika/git/blobs/f49f22ff6cc58d0b1d9dcdc240c07227a6869c61",
        "path": r"exp-thermal-runaway-propagation-and-emergency-battery-isolation-system-dei\experiment\images\propagation.drawio.png"
    },
    {
        "url": "https://api.github.com/repos/vlabsdei/VLab_Reshika/git/blobs/1fba1acf7711ba9c6a35d64065eae31f2e309a73",
        "path": r"exp-vehicle-to-grid-smart-energy-exchange-system-dei\experiment\images\block diagram.png"
    }
]

headers = {'User-Agent': 'Mozilla/5.0'}

for img in images_to_restore:
    req = urllib.request.Request(img["url"], headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            raw_bytes = base64.b64decode(data['content'])
            os.makedirs(os.path.dirname(img["path"]), exist_ok=True)
            with open(img["path"], 'wb') as f:
                f.write(raw_bytes)
            print(f"Successfully restored image: {img['path']}")
    except Exception as e:
        print(f"Error restoring {img['path']}: {e}")

print("All original images restored!")
