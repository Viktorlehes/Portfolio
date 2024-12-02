FROM python:3.9-slim

WORKDIR /server/app
COPY server/app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
CMD ["uvicorn", "server.app.main:app", "--host", "0.0.0.0", "--port", "8000"]