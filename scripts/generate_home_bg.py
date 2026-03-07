"""
Generate a travel/learning themed home screen background using Gemini.
"""
import base64
import json
import os
import urllib.request
from pathlib import Path

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = PROJECT_ROOT / "public" / "images" / "generated" / "backgrounds"

PROMPT = (
    "Create a beautiful, whimsical world map background for a children's reading game. "
    "The map shows a colorful, illustrated globe or world map with cute landmarks from different countries: "
    "pyramids, Eiffel tower, castles, palm trees, mountains, oceans with little boats. "
    "The style is warm, inviting, Pixar-like 3D illustration with soft pastel colors. "
    "There are scattered letters (A, B, C) and open books floating around as decorative elements. "
    "The overall feel should be adventure, discovery, and learning. "
    "Landscape orientation, suitable as a mobile app background. "
    "Soft gradient sky from warm pink/orange at top to light blue at bottom. "
    "No text or UI elements, just the illustrated scene."
)

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / "bg-home.png"

    if out_path.exists():
        print(f"Already exists: {out_path}")
        return

    print("Generating home screen background...")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={GEMINI_API_KEY}"

    body = {
        "contents": [{"parts": [{"text": PROMPT}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode("utf-8"))

    candidates = result.get("candidates", [])
    if not candidates:
        print("No candidates returned")
        return

    for part in candidates[0].get("content", {}).get("parts", []):
        if "inlineData" in part:
            img_data = base64.b64decode(part["inlineData"]["data"])
            with open(out_path, "wb") as f:
                f.write(img_data)
            print(f"Saved: {out_path} ({os.path.getsize(out_path) // 1024}KB)")
            return

    print("No image in response")


if __name__ == "__main__":
    main()
