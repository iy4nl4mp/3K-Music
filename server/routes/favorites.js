const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Favorite = require('../models/Favorite');
const Song = require('../models/Song');
const auth = require('../middleware/auth');

// Add to favorites
router.post('/', auth, async (req, res) => {
  try {
    const { songId } = req.body;
    if (!songId) {
      return res.status(400).json({ message: 'Song ID is required' });
    }
    
    // Validate songId format
    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({ message: 'Invalid Song ID format' });
    }

    // Check if song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const existingFavorite = await Favorite.findOne({
      userId: req.user.id,
      songId
    });

    if (existingFavorite) {
      return res.status(400).json({ message: 'Song already in favorites' });
    }

    const newFavorite = new Favorite({
      userId: req.user.id,
      songId
    });

    await newFavorite.save();
    res.status(201).json(newFavorite);
  } catch (err) {
    console.error('Add favorite error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove from favorites by songId
router.delete('/', auth, async (req, res) => {
  try {
    let songId = req.query.songId || req.body.songId;  // Handle both query and body
    if (!songId) {
      return res.status(400).json({ message: 'Song ID is required' });
    }
    
    // Validate songId format
    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({ message: 'Invalid Song ID format' });
    }

    const result = await Favorite.deleteOne({
      userId: req.user.id,
      songId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Favorite not found or already removed' });
    }

    res.json({ message: 'Favorite removed' });
  } catch (err) {
    console.error('Remove favorite error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's favorites
router.get('/', auth, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id }).populate('songId');
    res.json(favorites.map(fav => fav.songId));
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;