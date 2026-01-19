import json
import h5py

PATH = "respiratory_sound_model.h5"

with h5py.File(PATH, "r") as f:
    raw = f.attrs.get("model_config")
    if raw is None:
        raise SystemExit("No model_config attribute found")
    if isinstance(raw, (bytes, bytearray)):
        text = raw.decode("utf-8")
    else:
        text = str(raw)

cfg = json.loads(text)
print("top_level_class_name:", cfg.get("class_name"))
conf = cfg.get("config", {})
print("name:", conf.get("name"))

layers = conf.get("layers", [])
print("num_layers:", len(layers))
print("first_10_layers:")
for l in layers[:10]:
    print(" -", l.get("class_name"), l.get("config", {}).get("name"))

print("\nDense layers:")
for l in layers:
    if l.get("class_name") == "Dense":
        name = l.get("config", {}).get("name")
        cfg = l.get("config", {})
        print("  config:", {"units": cfg.get("units"), "activation": cfg.get("activation")})
        inbound = l.get("inbound_nodes", [])
        print(" -", name, "inbound_nodes:", len(inbound))
        if inbound:
            print("   inbound0:", str(inbound[0])[:250])

print("\ninput_layers:", conf.get("input_layers"))
print("output_layers:", conf.get("output_layers"))
