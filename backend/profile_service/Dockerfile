FROM django_base_image

ENV SIGNING_KEY=TODO

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# EXPOSE $APP_PORT

# TODO: Use gunicorn in production instead of the development server
CMD ["sh", "-c", "python manage.py runserver 0.0.0.0:$APP_PORT"]
