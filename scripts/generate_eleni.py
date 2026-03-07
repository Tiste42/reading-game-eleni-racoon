"""
Generate Eleni character images using Gemini, then remove backgrounds with rembg (U²-Net).
Two-pass approach: generate all images first, then remove backgrounds.
"""
import os
import sys
import time
import base64
import json
import urllib.request
from pathlib import Path

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
PROJECT_ROOT = Path(__file__).parent.parent
REFERENCE_IMAGE = PROJECT_ROOT / "eleniracoontransparent.png"
OUTPUT_DIR = PROJECT_ROOT / "public" / "images" / "generated" / "eleni"
RATE_LIMIT_S = 12

ELENI_IMAGES = [
    ("eleni-standing", "A cute cartoon raccoon character standing upright and smiling warmly. Big expressive eyes, fluffy striped tail, friendly pose. Pixar-style 3D cartoon look. Full body, facing the viewer."),
    ("eleni-excited", "A cute cartoon raccoon character jumping with excitement, arms raised in the air, big happy smile with sparkly eyes. Pixar-style 3D cartoon look. Full body."),
    ("eleni-celebrating", "A cute cartoon raccoon character celebrating a victory, doing a happy dance, arms wide open, huge joyful smile, confetti around. Pixar-style 3D cartoon look. Full body."),
    ("eleni-waving", "A cute cartoon raccoon character waving hello with one paw, friendly smile, looking directly at the viewer. Pixar-style 3D cartoon look. Full body."),
    ("eleni-sombrero", "A cute cartoon raccoon character wearing a colorful Mexican sombrero hat and a little poncho/serape. Happy, festive pose. Pixar-style 3D cartoon look. Full body."),
    ("eleni-beret", "A cute cartoon raccoon character wearing a French beret and a little striped shirt, artistic pose with a paintbrush. Pixar-style 3D cartoon look. Full body."),
    ("eleni-sailor", "A cute cartoon raccoon character wearing a sailor outfit with a captain's hat, standing heroically. Pixar-style 3D cartoon look. Full body."),
    ("eleni-knight", "A cute cartoon raccoon character wearing cute knight armor and holding a small shield, looking brave and adorable. Pixar-style 3D cartoon look. Full body."),
    ("eleni-explorer", "A cute cartoon raccoon character wearing an explorer/safari outfit with a pith helmet, binoculars around the neck, adventure pose. Pixar-style 3D cartoon look. Full body."),
    ("eleni-surfer", "A cute cartoon raccoon character wearing a wetsuit, holding a small surfboard, with cool sunglasses. Beach-ready pose. Pixar-style 3D cartoon look. Full body."),
    ("eleni-reading", "A cute cartoon raccoon character sitting and reading a colorful picture book, wearing small round glasses, cozy pose. Pixar-style 3D cartoon look. Full body."),
    ("eleni-thinking", "A cute cartoon raccoon character with one paw on chin, thinking pose, curious expression. Pixar-style 3D cartoon look. Full body."),
]

BG_SUFFIX = " IMPORTANT: Use a solid bright green (#00FF00) background with NO other elements. The character must be clearly separated from the background."

def load_reference():
    with open(REFERENCE_IMAGE, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def generate_one(name: str, prompt: str, ref_b64: str, out_path: Path) -> bool:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={GEMINI_API_KEY}"

    body = {
        "contents": [{"parts": [
            {"inline_data": {"mime_type": "image/png", "data": ref_b64}},
            {"text": f"Using this raccoon character named Eleni as a style reference, generate a NEW image: {prompt}{BG_SUFFIX}"},
        ]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")[:300]
        print(f"  HTTP {e.code}: {err}")
        if e.code == 429:
            print("  Rate limited -- waiting 60s...")
            time.sleep(60)
            return generate_one(name, prompt, ref_b64, out_path)
        return False
    except Exception as e:
        print(f"  Error: {e}")
        return False

    candidates = result.get("candidates", [])
    if not candidates:
        print("  No candidates")
        return False

    for part in candidates[0].get("content", {}).get("parts", []):
        if "inlineData" in part:
            img = base64.b64decode(part["inlineData"]["data"])
            with open(out_path, "wb") as f:
                f.write(img)
            print(f"  Saved raw: {len(img) // 1024}KB")
            return True

    print("  No image data in response")
    return False


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ref_b64 = load_reference()
    print(f"Reference loaded ({len(ref_b64) // 1024}KB)")

    # PASS 1: Generate from Gemini
    print(f"\n=== PASS 1: Generating {len(ELENI_IMAGES)} images from Gemini ===\n")
    generated = []
    for i, (name, prompt) in enumerate(ELENI_IMAGES):
        out_path = OUTPUT_DIR / f"{name}.png"
        if out_path.exists() and out_path.stat().st_size > 10000:
            print(f"[{i+1}/{len(ELENI_IMAGES)}] SKIP (exists): {name}")
            generated.append(out_path)
            continue

        print(f"[{i+1}/{len(ELENI_IMAGES)}] Generating: {name}...")
        if generate_one(name, prompt, ref_b64, out_path):
            generated.append(out_path)
        else:
            print(f"  FAILED: {name}")

        if i < len(ELENI_IMAGES) - 1:
            print(f"  Waiting {RATE_LIMIT_S}s...")
            time.sleep(RATE_LIMIT_S)

    print(f"\n=== PASS 1 complete: {len(generated)}/{len(ELENI_IMAGES)} images ===\n")

    # PASS 2: Remove backgrounds with rembg
    if not generated:
        print("No images to process")
        return

    print("=== PASS 2: Removing backgrounds with rembg (U\u00b2-Net) ===\n")
    try:
        from rembg import remove
        print("rembg loaded successfully")
    except ImportError:
        print("rembg not available -- skipping background removal")
        print("Run: pip install rembg[cli] onnxruntime")
        return

    for img_path in generated:
        print(f"  Processing: {img_path.name}...")
        try:
            with open(img_path, "rb") as f:
                raw = f.read()
            clean = remove(raw)
            with open(img_path, "wb") as f:
                f.write(clean)
            print(f"    Done ({len(clean) // 1024}KB)")
        except Exception as e:
            print(f"    FAILED: {e}")

    print("\n=== All done! ===")


if __name__ == "__main__":
    main()
