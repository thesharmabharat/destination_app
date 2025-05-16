# 🚀 Deploying a Flask App to Heroku with a Custom GoDaddy Domain

## 📁 Project Structure
```
destination_app/
├── app.py
├── requirements.txt
├── Procfile
└── runtime.txt (optional)
```

---

## ✅ Step 1: Prepare Your Flask App

### `app.py`
```python
from flask import Flask, jsonify, request, redirect

app = Flask(__name__)

@app.before_request
def redirect_to_https():
    if not request.is_secure and request.headers.get("X-Forwarded-Proto") != "https":
        return redirect(request.url.replace("http://", "https://"), code=301)

@app.route('/')
def home():
    return jsonify({"output": "Welcome to your first Flask API"})

@app.route('/api/example/', methods=['GET'])
def example_api():
    return jsonify({"key_1": 1, "key2": 2})

if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
```

### Create the `Procfile`
```bash
echo 'web: gunicorn app:app' > Procfile
```

### `requirements.txt`
Created with:
```bash
pip install gunicorn flask
pip freeze > requirements.txt
```

---

## ✅ Step 2: Deploy to Heroku

### 1. Login and create the Heroku app:
```bash
heroku login
heroku create destination-app-name
```

### 2. Initialize Git repo and push:
```bash
git init
git add .
git commit -m "Initial deploy"
git push heroku main
```

### 3. Verify it's working:
Visit:
```
https://destination-app-name-xxxx.herokuapp.com
```

Check logs if needed:
```bash
heroku logs --tail
```

---

## 🌐 Step 3: Connect Your GoDaddy Domain

### 1. Add custom domain to Heroku:
```bash
heroku domains:add www.nineextralives.com
```

Heroku responds with:
```
DNS Target: secure-coyote-xxxxxxxxxxxxxxxx.herokudns.com
```

### 2. Configure DNS in GoDaddy:
- **Type**: `CNAME`
- **Name**: `www`
- **Value**: `secure-coyote-xxxxxxxxxxxxxxxx.herokudns.com`
- **TTL**: Default or 1 hour

Delete any conflicting `www` records first if necessary.

### 3. Check propagation:
```bash
heroku domains:wait www.nineextralives.com
```

---

## 🔒 Step 4: Enable Free SSL (HTTPS)

```bash
heroku certs:auto:enable
```

Wait a few minutes, then test:
```
https://www.nineextralives.com
```

---

## 🌐 Optional: Forward Root Domain to `www`

In GoDaddy DNS settings:
- **Forward From**: `nineextralives.com`
- **To**: `https://www.nineextralives.com`
- **Type**: Permanent (301)
- **Forward Only** (or Masking, optional)

---

## ✅ You’re Done!

Your Flask API is now:
- ✅ Deployed to Heroku
- ✅ Accessible via your GoDaddy domain
- ✅ Secured with HTTPS
- ✅ Redirecting HTTP → HTTPS