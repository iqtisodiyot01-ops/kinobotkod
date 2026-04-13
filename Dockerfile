FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# FIX #22: Do not run as root in production containers.
RUN useradd -m botuser
USER botuser

CMD ["python", "main.py"]
