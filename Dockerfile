# Backend image. Note: this pulls in torch + transformers, so the image is
# large (multiple GB) and the first build will take a while — that's
# expected, not a bug. The HuggingFace sentiment/NER models themselves are
# downloaded lazily on first real request (see app/services/hf_nlp.py), so
# the very first POST /reports after a fresh container start will also be
# noticeably slower than every one after it.
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install the CPU-only torch build first — this container never has a GPU,
# and plain `pip install torch` pulls in ~1.5GB of unused NVIDIA CUDA
# libraries. Installing the CPU wheel first satisfies the later
# `pip install -r requirements.txt`'s unpinned "torch" line without
# reinstalling it.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
