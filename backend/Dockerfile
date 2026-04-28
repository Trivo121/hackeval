# Use the official Python slim image for a smaller footprint
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies
# These are required by docling, OpenCV, pymupdf, and general build processes
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first to leverage Docker layer caching
COPY requirements.txt .

# Install CPU-only PyTorch to prevent pulling massive CUDA GPU binaries on an ARM CPU instance
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install Python dependencies
# We use --no-cache-dir to keep the image size small
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Expose the port FastAPI runs on
EXPOSE 8000
