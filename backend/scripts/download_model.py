#!/usr/bin/env python3
"""
TerraQuest Model Downloader
Downloads the official Qwen 2.5 0.5B Instruct GGUF model (~398 MB) for llama.cpp local inference.
Validates file size and handles interrupted downloads with atomic temporary file renaming.
"""

import os
import sys
import urllib.request
from pathlib import Path

MODEL_FILENAME = "qwen2.5-0.5b-instruct-q4_k_m.gguf"
DEFAULT_DOWNLOAD_URL = (
    "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
)
EXPECTED_MIN_BYTES = 390_000_000  # ~397.8 MB


def download_model(target_dir: str = "./models", download_url: str = DEFAULT_DOWNLOAD_URL) -> Path:
    models_path = Path(target_dir).resolve()
    models_path.mkdir(parents=True, exist_ok=True)

    dest_file = models_path / MODEL_FILENAME
    temp_file = models_path / f"{MODEL_FILENAME}.tmp"

    if dest_file.is_file():
        size = dest_file.stat().st_size
        if size >= EXPECTED_MIN_BYTES:
            print(f"[OK] Model already present: {dest_file} ({size / (1024*1024):.1f} MB)")
            return dest_file
        else:
            print(f"[WARN] Incomplete model found ({size} bytes). Re-downloading...")

    url = os.environ.get("MODEL_DOWNLOAD_URL", download_url)
    print(f"Downloading Qwen 2.5 0.5B Instruct GGUF from:\n  {url}")
    print(f"Destination: {dest_file}")

    def progress_hook(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = min(100.0, downloaded * 100 / total_size)
            mb_down = downloaded / (1024 * 1024)
            mb_total = total_size / (1024 * 1024)
            sys.stdout.write(f"\rProgress: {percent:5.1f}% [{mb_down:.1f} MB / {mb_total:.1f} MB]")
        else:
            sys.stdout.write(f"\rDownloaded: {downloaded / (1024*1024):.1f} MB")
        sys.stdout.flush()

    try:
        urllib.request.urlretrieve(url, temp_file, reporthook=progress_hook)
        print("\nDownload finished. Finalizing file...")
        temp_file.replace(dest_file)
        final_size = dest_file.stat().st_size
        print(f"[SUCCESS] Model ready at {dest_file} ({final_size / (1024*1024):.1f} MB)")
        return dest_file
    except Exception as e:
        if temp_file.exists():
            temp_file.unlink()
        print(f"\n[ERROR] Download failed: {e}")
        raise


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "./models"
    download_model(target)
