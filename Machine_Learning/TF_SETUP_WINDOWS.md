# Windows TensorFlow/ResNet setup (eg1.py)

Your Colab versions:
- TensorFlow: `2.19.0`
- Keras: `3.13.2`
- NumPy: `2.0.2`

## Why it currently fails
Your logs show `AttributeError: _ARRAY_API not found` during `import tensorflow`.
That happens when **NumPy 2.x** is installed but some compiled packages in the env were built against **NumPy 1.x** (common on Windows).

Also, you appear to be running **Microsoft Store Python** (`...WindowsApps\python.exe`). Avoid it for ML.

## ResNet (fastest fix): ONNX Runtime (resnet_model.onnx)
Your repo already contains `resnet_model.onnx`. This is the fastest way to get ResNet working on Windows because it avoids TensorFlow DLL issues.

`eg1.py` uses **onnxruntime**. A common failure is:

`ImportError: DLL load failed while importing onnxruntime_pybind11_state: A dynamic link library (DLL) initialization routine failed.`

Fix checklist:
- Install **Microsoft Visual C++ Redistributable 2015–2022 (x64)**, then reboot.
- Use **python.org** Python (64-bit) + a fresh venv (avoid Microsoft Store Python).
- Install dependencies inside the venv (recommended requirements file):

```powershell
cd Machine_Learning
py -3.11 -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\pip install -r requirements-resnet-onnx-windows.txt

# sanity
.\.venv\Scripts\python -c "import numpy as np; import onnxruntime as ort; print('numpy', np.__version__, 'onnxruntime', ort.__version__)"

# run server
.\.venv\Scripts\python eg1.py
```

If `onnxruntime` still fails to import, try the DirectML build:

```powershell
.\.venv\Scripts\pip uninstall -y onnxruntime
.\.venv\Scripts\pip install -r requirements-resnet-onnx-directml-windows.txt
.\.venv\Scripts\python -c "import onnxruntime as ort; print('onnxruntime', ort.__version__)"
```

## Recommended (most reliable) setup
This matches Colab **TF/Keras** but uses **NumPy 1.26** to avoid ABI breakage.

From `resp/Machine_Learning`:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\pip uninstall -y tensorflow keras numpy opencv-python matplotlib
.\.venv\Scripts\pip install -r requirements-resnet-windows.txt

# sanity
.\.venv\Scripts\python -c "import numpy as np; import tensorflow as tf; import keras; print('numpy',np.__version__,'tf',tf.__version__,'keras',keras.__version__)"

# run server
.\.venv\Scripts\python eg1.py
```

Expected:
- The sanity import prints versions (no traceback)
- `GET /health` includes `resnet`

## If sklearn model .pkl load fails (MT19937 / BitGenerator)
If you start the server and see an error like:

`ValueError: <class 'numpy.random._mt19937.MT19937'> is not a known BitGenerator module.`

That means your `*.pkl` files were pickled under **NumPy 2.x**, and NumPy 1.26 can't unpickle them.

Fast fix (use NumPy 2.0.2 in the venv):

```powershell
cd Machine_Learning
.\.venv\Scripts\pip install -r requirements-ml-numpy2-windows.txt
.\.venv\Scripts\python eg1.py
```

## If you insist on exact Colab NumPy (2.0.2)
Try only if the above works and you want to experiment:

```powershell
.\.venv\Scripts\pip uninstall -y numpy
.\.venv\Scripts\pip install -r requirements-resnet-colab.txt

# Reinstall compiled deps to match NumPy 2 (only if you installed them)
.\.venv\Scripts\pip install --upgrade --force-reinstall opencv-python matplotlib

.\.venv\Scripts\python -c "import tensorflow as tf; print(tf.__version__)"
```

If it breaks again, revert to `requirements-resnet-windows.txt`.
