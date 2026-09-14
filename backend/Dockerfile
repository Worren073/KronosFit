FROM python:3.11-slim

WORKDIR /app

# install system deps
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# install python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy project
COPY src/ .

# create non-root user
RUN useradd -m appuser
USER appuser

# expose port
EXPOSE 8000

# command will be overridden in compose
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]