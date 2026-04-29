const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/student_report_system';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now }
});

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  rollNumber: { type: String, required: true },
  classroom: { type: String, required: true },
  assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjects: [
    {
      name: String,
      grade: String,
      remark: String
    }
  ],
  attendance: { type: Number, default: 95 },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);

mongoose.set('strictQuery', false);
app.use(cors());
app.use((req, res, next) => {
  if (req.method === 'POST' && !req.headers['content-type'] && req.headers['content-length']) {
    req.headers['content-type'] = 'application/json';
  }
  next();
});
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((error) => console.error('❌ MongoDB connection error:', error.message));

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) return res.status(401).json({ message: 'Invalid token.' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Permission denied.' });
  next();
};

app.post('/api/auth/register', async (req, res) => {
  try {
    let body = req.body;
    if (!body || Object.keys(body).length === 0) {
      try {
        body = JSON.parse(req.rawBody || '{}');
      } catch (parseError) {
        body = {};
      }
    }
    console.log('Register request body:', body);
    const { name, email, password, role } = body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required.' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email is already registered.' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: role || 'student' });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Failed to register user.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ message: 'Invalid email or password.' });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed.' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/students', authMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'teacher') filter.assignedTeacher = req.user._id;
    if (req.user.role === 'student') filter.email = req.user.email;
    const students = await Student.find(filter).populate('assignedTeacher', 'name email');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch student records.' });
  }
});

app.post('/api/students', authMiddleware, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { name, email, rollNumber, classroom, subjects, notes } = req.body;
    if (!name || !email || !rollNumber || !classroom) return res.status(400).json({ message: 'Name, email, roll number, and classroom are required.' });
    const student = await Student.create({
      name,
      email: email.toLowerCase(),
      rollNumber,
      classroom,
      assignedTeacher: req.user._id,
      subjects: subjects || [],
      attendance: 100,
      notes: notes || ''
    });
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: 'Unable to add student record.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});