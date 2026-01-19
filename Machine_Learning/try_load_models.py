import traceback

import tensorflow as tf

paths = ["model.h5", "respiratory_sound_model.h5", "model.h5.bak", "respiratory_sound_model.h5.bak"]

for p in paths:
    print("\n==>", p)
    try:
        m = tf.keras.models.load_model(p, compile=False)
        print("LOADED via tf.keras", type(m), "inputs", getattr(m, "inputs", None), "outputs", getattr(m, "outputs", None))
    except Exception as e:
        print("FAILED via tf.keras:", repr(e))

    try:
        import tf_keras  # type: ignore

        m2 = tf_keras.models.load_model(p, compile=False)
        print("LOADED via tf_keras", type(m2), "inputs", getattr(m2, "inputs", None), "outputs", getattr(m2, "outputs", None))
    except Exception as e:
        print("FAILED via tf_keras:", repr(e))
