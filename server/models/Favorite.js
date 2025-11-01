const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'removed'], default: 'active' }
});

module.exports = mongoose.model('Favorite', favoriteSchema);