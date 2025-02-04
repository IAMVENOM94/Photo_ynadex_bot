import requests

url = "https://oauth.yandex.ru/token"
data = {
    "grant_type": "authorization_code",
    "code": "knxf3yrxuebfnvvr",
    "client_id": "818c34fb81a14e36916604a641ea7698",
    "client_secret": "d46c32fd1a6a43c6a539a817674e612e"
}

response = requests.post(url, data=data)
print(response.json())  # Выведет OAuth-токен
