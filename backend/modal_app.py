import pathlib
import modal

app = modal.App('real-estate-predictor')

volume = modal.Volume.from_name('real-estate-data')

backend_dir = pathlib.Path(__file__).parent

image = (
    modal.Image.debian_slim()
    .pip_install(
        # NOTE: keep xgboost in sync with backend/train_xgboost.py and
        # backend/retrain_on_modal.py. The .pkl files on Volume were saved by
        # whichever xgboost the training image installed (currently unpinned),
        # and xgboost cannot reliably load a model pickled by a different
        # major version (e.g. 1.7.x serving + 2.x trained -> AttributeError on
        # `gpu_id` because 2.x removed it).
        'fastapi', 'pandas', 'pyarrow', 'scikit-learn', 'xgboost',
        'joblib', 'numpy',
    )
    .add_local_dir(backend_dir, remote_path="/root/backend")
)

@app.function(
    image=image,
    volumes={'/mnt/real-estate-data': volume},
)
@modal.asgi_app()
def fastapi_app():
    import sys
    if "/root/backend" not in sys.path:
        sys.path.insert(0, "/root/backend")
    from main import app as web_app
    return web_app
