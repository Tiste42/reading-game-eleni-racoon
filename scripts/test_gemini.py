"""Quick test of Gemini image generation API."""
import urllib.request
import json
import base64
import sys
import os

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={GEMINI_API_KEY}"

ref_path = "eleniracoontransparent.png"
with open(ref_path, "rb") as f:
    ref_b64 = base64.b64encode(f.read()).decode("utf-8")

print(f"Reference image: {len(ref_b64) // 1024}KB base64")

body = {
    "contents": [{"parts": [
        {"inline_data": {"mime_type": "image/png", "data": ref_b64}},
        {"text": "Using this raccoon character as a reference, generate a new image of the same cute cartoon raccoon standing upright and smiling warmly. Pixar-style 3D cartoon. Full body. Use a solid bright green (#00FF00) background with NO other elements."},
    ]}],
    "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
}

data = json.dumps(body).encode("utf-8")
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

print("Calling Gemini API...")
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode("utf-8"))

    candidates = result.get("candidates", [])
    if not candidates:
        print("No candidates")
        sys.exit(1)

    for part in candidates[0].get("content", {}).get("parts", []):
        if "inlineData" in part:
            img = base64.b64decode(part["inlineData"]["data"])
            out = "public/images/generated/eleni/eleni-standing.png"
            os.makedirs(os.path.dirname(out), exist_ok=True)
            with open(out, "wb") as f:
                f.write(img)
            print(f"SUCCESS: saved {len(img)} bytes to {out}")
        elif "text" in part:
            print(f"Text response: {part['text'][:200]}")

except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8")[:500]
    print(f"HTTP {e.code}: {body}")
except Exception as e:
    print(f"Error: {e}")
