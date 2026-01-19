import h5py

PATH = "respiratory_sound_model.h5"

with h5py.File(PATH, "r") as f:
    mw = f["model_weights"]

    def walk(group, prefix=""):
        for k in group.keys():
            item = group[k]
            p = f"{prefix}/{k}" if prefix else k
            if isinstance(item, h5py.Dataset):
                print(p, item.shape)
            else:
                walk(item, p)

    # Print just Dense + final classifier weights (common names)
    for layer_name in ["dense", "dense_1", "global_average_pooling2d", "resnet50"]:
        if layer_name in mw:
            print("\n===", layer_name, "===")
            walk(mw[layer_name], layer_name)
        else:
            print("\n(Missing layer)", layer_name)
