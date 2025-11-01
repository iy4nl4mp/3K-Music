const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');

const app = express();
const port = process.env.PORT || 3003;

// Koneksi MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/music-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', require('./routes/playlists'));
app.use('/api/favorites', require('./routes/favorites'));

app.get('/', (req, res) => {
  res.send('Music App Backend is running!');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
