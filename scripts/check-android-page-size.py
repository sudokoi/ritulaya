#!/usr/bin/env python3
"""Check 64-bit ELF LOAD alignment and APK/AAB packaging before publishing."""

import argparse
import json
from pathlib import Path
import struct
import subprocess
import sys
import zipfile

PAGE_SIZE = 16384
ABIS = {"arm64-v8a", "x86_64"}


def check_library(data):
    if data[:6] != b"\x7fELF\x02\x01":
        raise ValueError("expected a little-endian ELF64 library")
    header_offset = struct.unpack_from("<Q", data, 32)[0]
    entry_size, count = struct.unpack_from("<HH", data, 54)
    if entry_size < 56:
        raise ValueError("invalid ELF program header size")
    loads = []
    for index in range(count):
        kind, _, offset, address, _, _, _, alignment = struct.unpack_from(
            "<IIQQQQQQ", data, header_offset + index * entry_size
        )
        if kind == 1:  # PT_LOAD
            loads.append(alignment)
            if alignment < PAGE_SIZE or (address - offset) % PAGE_SIZE:
                raise ValueError(f"LOAD segment is not 16 KB aligned (p_align={alignment})")
    if not loads:
        raise ValueError("no ELF LOAD segments found")


def check_apk_offset(archive, info):
    if info.compress_type != zipfile.ZIP_STORED:
        return  # Compressed libraries are extracted rather than mapped from the ZIP.
    archive.fp.seek(info.header_offset)
    header = archive.fp.read(30)
    name_size, extra_size = struct.unpack_from("<HH", header, 26)
    offset = info.header_offset + 30 + name_size + extra_size
    if offset % PAGE_SIZE:
        raise ValueError(f"uncompressed library ZIP offset {offset} is not 16 KB aligned")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--bundletool", type=Path, help="bundletool JAR (required for AAB)")
    args = parser.parse_args()
    suffix = args.artifact.suffix.lower()
    if suffix not in {".apk", ".aab"}:
        parser.error("artifact must be an APK or AAB")
    if suffix == ".aab" and not args.bundletool:
        parser.error("--bundletool is required to verify AAB packaging configuration")

    failures = []
    with zipfile.ZipFile(args.artifact) as archive:
        libraries = [
            info for info in archive.infolist()
            if info.filename.endswith(".so")
            and len(Path(info.filename).parts) >= 3
            and Path(info.filename).parts[-2] in ABIS
        ]
        if not libraries:
            raise ValueError("no 64-bit native libraries found; check the artifact/ABI configuration")
        for info in libraries:
            try:
                check_library(archive.read(info))
                if suffix == ".apk":
                    check_apk_offset(archive, info)
                print(f"PASS {info.filename}")
            except (ValueError, struct.error) as error:
                failures.append(f"{info.filename}: {error}")

    if suffix == ".aab":
        output = subprocess.check_output(
            ["java", "-jar", str(args.bundletool), "dump", "config", f"--bundle={args.artifact}"],
            text=True,
        )
        config = json.loads(output)
        packaging = config.get("optimizations", {}).get("uncompressNativeLibraries", {})
        if packaging.get("alignment") != "PAGE_ALIGNMENT_16K":
            failures.append("AAB does not explicitly request PAGE_ALIGNMENT_16K")
        else:
            print("PASS AAB requests PAGE_ALIGNMENT_16K")

    for failure in failures:
        print(f"FAIL {failure}", file=sys.stderr)
    if failures:
        return 1
    print(f"16 KB alignment checks passed for {len(libraries)} libraries in {args.artifact.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
