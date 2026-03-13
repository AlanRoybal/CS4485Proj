import pathlib
import modal

app = modal.App('real-estate-predictor')

volume = modal.Volume.from_name('real-estate-data')

backend_dir = pathlib.Path(__file__).parent

image = (
    modal.Image.debian_slim()
    .pip_install(
        'fastapi', 'pandas', 'scikit-learn', 'xgboost',
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
