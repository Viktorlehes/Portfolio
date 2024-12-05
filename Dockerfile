FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    xvfb \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    libgtk-3-0 \
    libgbm1 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver
RUN wget -q "https://chromedriver.storage.googleapis.com/114.0.5735.90/chromedriver_linux64.zip" \
    && unzip chromedriver_linux64.zip \
    && mv chromedriver /usr/local/bin/ \
    && chmod +x /usr/local/bin/chromedriver \
    && rm chromedriver_linux64.zip

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire app directory
COPY ./app ./app

# Set the Python path to include the app directory
ENV PYTHONPATH=/app/app

# Run the FastAPI application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]