"""Vietnamese voice lines for the splash and the galaxy (OpenAI text-to-speech).

Generates a few takes per line into .local/forge/voice-vi/, transcribes each take back
to check the words, then masters the chosen take into public/sfx/.

Usage:
  python3 gen_voice_vi.py                 # generate takes and print their transcripts
  python3 gen_voice_vi.py --publish nova  # master the takes of one voice into public/sfx/
"""
import argparse
import json
import subprocess
import urllib.request
import uuid

from common import FORGE, ROOT, load_env, post_json, with_retry

LINES = {
    "splash-voice": ("Chào mừng bạn mở cánh cửa IELTS.", -16),
    "voice-galaxy-hello": ("Đây là bầu trời từ vựng của bạn. Thuộc một từ, sáng thêm một ngôi sao.", -17),
    "voice-galaxy-lit": ("Những ngôi sao hôm nay đã sáng hết rồi.", -17),
}
VOICES = ["nova", "coral", "sage", "shimmer"]
STYLE = (
    "Speak Vietnamese with a natural Northern (Hanoi) accent. Warm, calm and gentle, like a kind "
    "narrator welcoming a learner at night. Unhurried pace, clear tones, a soft smile in the voice. "
    "Pronounce IELTS as the English letters: ai-eo."
)
OUT = FORGE / "voice-vi"


def speak(env, voice, text, path):
    body = post_json(
        env["SUB2_BASE_URL"].rstrip("/") + "/audio/speech",
        {"model": "gpt-4o-mini-tts", "voice": voice, "input": text, "instructions": STYLE, "response_format": "mp3"},
        {"Authorization": "Bearer " + env["SUB2_API_KEY"]},
    )
    path.write_bytes(body)


def transcribe(env, path):
    boundary = uuid.uuid4().hex
    parts = []
    for k, v in (("model", "gpt-4o-transcribe"), ("language", "vi")):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
        "Content-Type: audio/mpeg\r\n\r\n".encode() + path.read_bytes() + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    req = urllib.request.Request(
        env["SUB2_BASE_URL"].rstrip("/") + "/audio/transcriptions",
        data=b"".join(parts),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "Authorization": "Bearer " + env["SUB2_API_KEY"]},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["text"].strip()


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def publish(voice):
    for name, (_, lufs) in LINES.items():
        src = OUT / f"{name}-{voice}.mp3"
        dst = ROOT / "public" / "sfx" / f"{name}.mp3"
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                "-af",
                "silenceremove=start_periods=1:start_threshold=-50dB,"
                "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,"
                f"loudnorm=I={lufs}:TP=-2,afade=t=in:d=0.005",
                "-ac", "1" if name == "splash-voice" else "2", "-ar", "44100", "-b:a", "112k", str(dst),
            ],
            check=True,
        )
        print(f"published {dst.name} from {src.name} ({duration(dst):.2f}s)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--publish", metavar="VOICE", help="master the takes of this voice into public/sfx/")
    args = ap.parse_args()
    if args.publish:
        return publish(args.publish)
    env = load_env()
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (text, _) in LINES.items():
        print(f"{name}: {text}")
        for voice in VOICES:
            path = OUT / f"{name}-{voice}.mp3"
            if not path.exists():
                with_retry(lambda: speak(env, voice, text, path))
            heard = with_retry(lambda: transcribe(env, path))
            print(f"  {voice:8s} {duration(path):5.2f}s  {heard}")


if __name__ == "__main__":
    main()
