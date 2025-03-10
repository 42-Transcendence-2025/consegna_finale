FROM django_base_image

ENV SIGNING_KEY=TODO

COPY requirements.txt .
RUN pip install -r requirements.txt

# TODO: USE THIS FOR PRODUCTION
# COPY . .

# EXPOSE $APP_PORT

# TODO: LAUNCH WITH GUNICORN INSTEAD OF PYTHON MANAGE
CMD ["sh", "-c", "python manage.py runserver 0.0.0.0:$APP_PORT"]
