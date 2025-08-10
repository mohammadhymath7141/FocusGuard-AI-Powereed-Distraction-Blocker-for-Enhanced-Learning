import requests

url = "http://localhost:5000/predict"
data = {"text": "chrome.exe YouTube - Music Video"}

response = requests.post(url, json=data)
print(response.json())
