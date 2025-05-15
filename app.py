from flask import Flask, jsonify

# create the Flask app
first_app = Flask(__name__)

# Define a home route
@first_app.route('/')
def home():
    return jsonify({"output:":"Welcome to your first Flask API"})

# Define an example API route
@first_app.route('/api/example/',methods = ['GET'])
def example_api():
    data = {"key_1":1,"key2":2}
    return jsonify(data)

# Run the app
if __name__ == "__main__":
    first_app.run(debug=True)