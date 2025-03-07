FROM python:3.11-alpine

RUN apk add --no-cache gcc musl-dev postgresql-dev

WORKDIR /app

ENV VIRTUAL_ENV=/app/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
ENV APP_PORT=8000

RUN python -m venv $VIRTUAL_ENV && \
	$VIRTUAL_ENV/bin/pip install --upgrade pip setuptools wheel

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# TODO: USE THIS FOR PRODUCTION
# COPY . .

# EXPOSE $APP_PORT

# TODO: LAUNCH WITH GUNICORN INSTEAD OF PYTHON MANAGE
CMD ["sh", "-c", "python manage.py runserver 0.0.0.0:$APP_PORT"]
