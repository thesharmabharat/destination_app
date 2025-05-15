from flask import Flask, jsonify

# create the Flask app
app = Flask(__name__)

# Define a home route
@app.route('/')
def home():
    return jsonify({"output": "Welcome to your first Flask API"})
    # return jsonify({"output:":"Welcome to your first Flask API"})

# Define an example API route
@app.route('/api/example/',methods = ['GET'])
def example_api():
    data = {"key_1":1,"key2":2}
    return jsonify(data)

# Run the app
if __name__ == "__main__":
    # app.run(debug=True)
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))