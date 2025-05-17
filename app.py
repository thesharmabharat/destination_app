
import os
from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'your_secret_key_here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///places.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Database
db = SQLAlchemy(app)

# Login Manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Models
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)

class Place(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lon = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    __table_args__ = (db.UniqueConstraint('name', 'lat', 'lon', 'user_id', name='unique_place_per_user'),)

# HTTPS redirect for production
@app.before_request
def redirect_to_https():
    if os.getenv("FLASK_ENV") == "production":
        if request.headers.get("X-Forwarded-Proto", "http") != "https":
            return redirect(request.url.replace("http://", "https://"), code=301)

# Routes
@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if User.query.filter_by(username=username).first():
            flash('Username already exists.')
            return redirect(url_for('register'))
        # hashed_password = generate_password_hash(password)
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        user = User(username=username, password_hash=hashed_password)
        db.session.add(user)
        db.session.commit()
        flash('Registration successful. Please log in.')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('index'))
        flash('Invalid username or password.')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/api/places', methods=['GET'])
@login_required
def get_places():
    places = Place.query.filter_by(user_id=current_user.id).all()
    return jsonify([
        {'name': p.name, 'lat': p.lat, 'lon': p.lon, 'status': p.status}
        for p in places
    ])

@app.route('/api/places', methods=['POST'])
@login_required
def save_place():
    data = request.get_json()
    existing = Place.query.filter_by(name=data['name'], lat=data['lat'], lon=data['lon'], user_id=current_user.id).first()
    if existing:
        existing.status = data['status']
    else:
        new_place = Place(
            name=data['name'],
            lat=data['lat'],
            lon=data['lon'],
            status=data['status'],
            user_id=current_user.id
        )
        db.session.add(new_place)
    db.session.commit()
    return jsonify({'message': 'Place saved/updated successfully'})

@app.route('/api/places', methods=['DELETE'])
@login_required
def delete_place():
    data = request.get_json()
    place = Place.query.filter_by(
        name=data['name'],
        lat=data['lat'],
        lon=data['lon'],
        user_id=current_user.id
    ).first()
    if place:
        db.session.delete(place)
        db.session.commit()
        return jsonify({'message': 'Place deleted'}), 200
    return jsonify({'error': 'Place not found'}), 404


if __name__ == '__main__':
    # with app.app_context():
    #     db.create_all()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5500)), ssl_context='adhoc')