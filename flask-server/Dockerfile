FROM python:3.11.2

WORKDIR /usr/src/app

COPY './extras/requirements.txt' .

RUN pip install -r requirements.txt

COPY . .


EXPOSE 80

CMD ["gunicorn","--config", "gunicorn_config.py", "app:app"]