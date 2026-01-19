import argparse
import shutil
import json
import h5py


def patch_file(path: str) -> bool:
    backup_path = path + ".bak"
    shutil.copy2(path, backup_path)

    with h5py.File(path, "r+") as f:
        if "model_config" not in f.attrs:
            print(f"{path}: no model_config attribute")
            return False

        raw = f.attrs["model_config"]
        if isinstance(raw, (bytes, bytearray)):
            text = raw.decode("utf-8")
        else:
            text = str(raw)

        # Basic sanity check
        json.loads(text)

        # Keras 3 InputLayer uses `batch_shape`; Keras 2 expects `batch_input_shape`.
        patched = text.replace('"batch_shape"', '"batch_input_shape"')

        if patched == text:
            print(f"{path}: no changes needed")
            return False

        # Validate JSON still parses
        json.loads(patched)

        f.attrs.modify("model_config", patched)
        print(f"{path}: patched model_config (backup at {backup_path})")
        return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", help=".h5 model files to patch")
    args = parser.parse_args()

    changed_any = False
    for p in args.paths:
        try:
            changed = patch_file(p)
            changed_any = changed_any or changed
        except Exception as e:
            print(f"{p}: FAILED: {e}")

    if not changed_any:
        print("No files patched.")


if __name__ == "__main__":
    main()
