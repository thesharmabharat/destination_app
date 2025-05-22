import os
from flask import (
    Flask, render_template, jsonify, request,
    redirect, url_for, flash, send_file
)
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager, login_user, logout_user,
    login_required, current_user, UserMixin
)
from werkzeug.security import generate_password_hash, check_password_hash
from io import BytesIO
import csv

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.getenv('SECRET_KEY', 'dev_secret')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///places.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

##### MODELS #####

class User(db.Model, UserMixin):
    id             = db.Column(db.Integer, primary_key=True)
    username       = db.Column(db.String(80), unique=True, nullable=False)
    password_hash  = db.Column(db.String(120), nullable=False)
    # relationship
    places         = db.relationship('Place', backref='owner', lazy=True)

class Place(db.Model):
    id      = db.Column(db.Integer, primary_key=True)
    name    = db.Column(db.Text,    nullable=False)
    lat     = db.Column(db.Float,   nullable=False)
    lon     = db.Column(db.Float,   nullable=False)
    status  = db.Column(db.String(20), nullable=False)  # 'to_visit' or 'visited'
    category= db.Column(db.String(30), nullable=True)   # freeform or predefined
    note    = db.Column(db.Text, nullable=True)
    visited_on = db.Column(db.String(20), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    __table_args__ = (
        db.UniqueConstraint('name','lat','lon','user_id', name='uix_per_user'),
    )

##### LOGIN #####

@login_manager.user_loader
def load_user(uid):
    return User.query.get(int(uid))

@app.before_request
def enforce_https():
    if os.getenv('FLASK_ENV')=='production' and request.headers.get('X-Forwarded-Proto','http')!='https':
        return redirect(request.url.replace('http://','https://'), code=301)

##### ROUTES #####

@app.route('/register', methods=['GET','POST'])
def register():
    if request.method=='POST':
        u = request.form['username']
        p = request.form['password']
        if User.query.filter_by(username=u).first():
            flash('Username taken','error'); return redirect(url_for('register'))
        new = User(username=u, password_hash=generate_password_hash(p,'pbkdf2:sha256'))
        db.session.add(new); db.session.commit()
        flash('Registered! Please log in.','success')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method=='POST':
        u=request.form['username']; p=request.form['password']
        user=User.query.filter_by(username=u).first()
        if user and check_password_hash(user.password_hash,p):
            login_user(user); return redirect(url_for('index'))
        flash('Invalid credentials','error')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user(); return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html', user=current_user.username)

##### API: CRUD #####

@app.route('/api/places', methods=['GET'])
@login_required
def get_places():
    out=[]
    for p in current_user.places:
        out.append({
            'name':p.name, 'lat':p.lat,'lon':p.lon,
            'status':p.status,'category':p.category or '',
            'note':p.note or '', 'visited_on':p.visited_on or ''
        })
    return jsonify(out)

@app.route('/api/places', methods=['POST'])
@login_required
def save_place():
    data=request.get_json()
    p = Place.query.filter_by(
        name=data['name'], lat=data['lat'], lon=data['lon'],
        user_id=current_user.id
    ).first()
    if not p:
        p=Place(
            name=data['name'], lat=data['lat'], lon=data['lon'],
            status=data['status'], user_id=current_user.id
        )
        db.session.add(p)
    # update optional fields
    p.category   = data.get('category', p.category)
    p.note       = data.get('note', p.note)
    p.visited_on = data.get('visited_on', p.visited_on)
    p.status     = data['status']
    db.session.commit()
    return jsonify({'result':'ok'})

@app.route('/api/places', methods=['DELETE'])
@login_required
def delete_place():
    data=request.get_json()
    p=Place.query.filter_by(
        name=data['name'], lat=data['lat'], lon=data['lon'],
        user_id=current_user.id
    ).first()
    if p: db.session.delete(p); db.session.commit(); return jsonify({'result':'deleted'})
    return jsonify({'error':'not found'}),404

##### EXPORT #####

@app.route('/export/csv')
@login_required
def export_csv():
    # Write CSV to an in-memory text buffer
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(['Name','Latitude','Longitude','Status','Category','Note','Visited On'])
    for p in current_user.places:
        cw.writerow([
            p.name, p.lat, p.lon,
            p.status, p.category or '',
            p.note or '', p.visited_on or ''
        ])

    # Encode to bytes and send
    output = si.getvalue().encode('utf-8')
    return send_file(
        BytesIO(output),
        download_name='places.csv',
        as_attachment=True,
        mimetype='text/csv'
    )

##### INIT & RUN #####

if __name__=='__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=int(os.getenv('PORT',5500)), ssl_context='adhoc')