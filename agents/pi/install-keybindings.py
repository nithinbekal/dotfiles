#!/usr/bin/env python3

import json
import os
import sys
import tempfile
from pathlib import Path


def load_object(path: Path, *, missing_ok: bool = False) -> dict:
    try:
        with path.open(encoding="utf-8") as file:
            value = json.load(file)
    except FileNotFoundError:
        if missing_ok:
            return {}
        raise

    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(f"usage: {sys.argv[0]} MANAGED_KEYBINDINGS TARGET_KEYBINDINGS")

    managed_path = Path(sys.argv[1]).expanduser()
    target_path = Path(sys.argv[2]).expanduser()
    managed = load_object(managed_path)
    existing = load_object(target_path, missing_ok=True)

    # Managed bindings win, while every unrelated user binding remains intact.
    merged = {**existing, **managed}
    target_path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=target_path.parent,
        prefix=f".{target_path.name}.",
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as file:
            json.dump(merged, file, indent=2)
            file.write("\n")
        os.replace(temporary_name, target_path)
    except BaseException:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


if __name__ == "__main__":
    main()
