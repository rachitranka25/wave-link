# Backend image. Note: this pulls in torch + transformers, so the image is
# large (multiple GB) and the first build will take a while — that's
# expected, not a bug. The HuggingFace sentiment/NER models themselves are
# downloaded lazily on first real request (see app/services/hf_nlp.py), so
# the very first POST /reports after a fresh container start will also be
# noticeably slower than every one after it.
FROM python:3.13-slim

# Set up a non-root user for Hugging Face Spaces compatibility
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# (Switching back to root to install system dependencies is possible but we can just use root first, then switch)
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install the CPU-only torch build first
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Switch back to non-root user for running the app
USER user

COPY --chown=user app ./app
COPY --chown=user data ./data

# Hugging Face Spaces uses port 7860
EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
