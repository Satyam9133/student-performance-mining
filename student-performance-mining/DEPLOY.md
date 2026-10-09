# Deploy on Render

1. Push this repository to GitHub.
2. In Render, choose New > Web Service and connect the GitHub repository.
3. Render can use render.yaml, or use:
   - Build Command: `pip install -r requirements.txt && pip install --upgrade "setuptools<81" && cd frontend && npm ci && npm run build`
   - Start Command: `gunicorn backend.app:app --bind 0.0.0.0:$PORT`
4. Choose a Python runtime and deploy.
