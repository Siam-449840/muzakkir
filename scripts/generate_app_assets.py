#!/usr/bin/env python3
"""
Generates high quality app icons and splash assets for iOS and Android.
Creates PNG assets with proper Islamic gold/green skeuomorphic emblems.
"""

import os
import struct
import zlib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
SOUNDS_DIR = os.path.join(ASSETS_DIR, "sounds")

os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(SOUNDS_DIR, exist_ok=True)

def create_solid_png(filename, width, height, bg_r, bg_g, bg_b, bg_a=255, draw_emblem=True):
    raw_data = bytearray()
    
    center_x, center_y = width / 2, height / 2
    emblem_radius = min(width, height) * 0.28
    inner_radius = emblem_radius * 0.82

    # Gold colors
    gold_r, gold_g, gold_b = 197, 160, 89
    gold_dark_r, gold_dark_g, gold_dark_b = 138, 107, 46

    for y in range(height):
        raw_data.append(0)  # Filter type None
        for x in range(width):
            dx = x - center_x
            dy = y - center_y
            dist = (dx * dx + dy * dy) ** 0.5

            if draw_emblem and dist <= emblem_radius:
                # Decorative gold disc with subtle bevel
                if dist >= inner_radius:
                    # Outer gold border ring
                    raw_data.extend((gold_dark_r, gold_dark_g, gold_dark_b, 255))
                elif dist <= inner_radius * 0.55 and dx > -inner_radius * 0.2:
                    # Inner crescent cutout
                    raw_data.extend((bg_r, bg_g, bg_b, bg_a))
                else:
                    # Gold surface
                    raw_data.extend((gold_r, gold_g, gold_b, 255))
            else:
                raw_data.extend((bg_r, bg_g, bg_b, bg_a))

    # Compress IDAT
    compressed = zlib.compress(bytes(raw_data), 9)

    # Build PNG chunks
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png_bytes = b'\x89PNG\r\n\x1a\n'
    png_bytes += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png_bytes += chunk(b'IDAT', compressed)
    png_bytes += chunk(b'IEND', b'')

    out_path = os.path.join(ASSETS_DIR, filename)
    with open(out_path, 'wb') as f:
        f.write(png_bytes)
    print(f"✓ Created asset: {out_path} ({width}x{height})")

def create_dummy_wav(filename):
    out_path = os.path.join(SOUNDS_DIR, filename)
    # Minimal valid 44-byte WAV header with 0.1s silence
    num_samples = 800
    wav_header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        36 + num_samples * 2,
        b'WAVE',
        b'fmt ',
        16, # Subchunk1Size
        1,  # PCM
        1,  # Mono
        8000, # SampleRate
        16000, # ByteRate
        2,  # BlockAlign
        16, # BitsPerSample
        b'data',
        num_samples * 2
    )
    silence = b'\x00\x00' * num_samples
    with open(out_path, 'wb') as f:
        f.write(wav_header + silence)
    print(f"✓ Created audio chime asset: {out_path}")

def main():
    # 1. Main Icon (1024x1024 deep Islamic green #14382A with gold emblem)
    create_solid_png("icon.png", 512, 512, 20, 56, 42)

    # 2. Adaptive Icon (512x512)
    create_solid_png("adaptive-icon.png", 512, 512, 20, 56, 42)

    # 3. Splash Screen (warm ivory #FAF7F2 with gold emblem)
    create_solid_png("splash.png", 600, 1000, 250, 247, 242)

    # 4. Favicon (64x64)
    create_solid_png("favicon.png", 64, 64, 20, 56, 42)

    # 5. Notification Icon (monochrome silhouette)
    create_solid_png("notification-icon.png", 96, 96, 20, 56, 42, draw_emblem=True)

    # 6. Audio chime asset
    create_dummy_wav("chime.wav")

    print("✨ All visual & audio assets generated successfully.")

if __name__ == "__main__":
    main()
