const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Song = require('../models/Song');
const Favorite = require('../models/Favorite');
const Playlist = require('../models/Playlist');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const songs = await Song.find();
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const auth = require('../middleware/auth');

router.post('/upload', auth, upload.single('song'), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);
    console.log('Authenticated user ID:', req.user._id);
    
    const { title, artist } = req.body;
    
    // Create a simple song object with required fields
    const songData = {
      title: title || req.file.originalname,
      artist: artist || 'Unknown Artist',
      filePath: req.file.path,
      userId: req.user.id  // Get user ID from auth middleware
    };

    const newSong = new Song(songData);
    await newSong.save();
    
    res.status(201).json({
      message: 'Song uploaded successfully',
      song: newSong
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(400).json({
      message: 'Failed to upload song',
      error: err.message
    });
  }
});

/**
 * Delete a song by id (only owner can delete)
 * - Removes references from all playlists and favorites
 * - Attempts to delete the audio file from disk
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Ownership check
    if (song.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Remove song from all playlists where it appears
    await Playlist.updateMany({}, { $pull: { songs: song._id } });

    // Remove all favorites referencing this song
    await Favorite.deleteMany({ songId: song._id });

    // Attempt to delete the uploaded file from disk
    if (song.filePath) {
      try {
        await fs.promises.unlink(song.filePath);
      } catch (fileErr) {
        // Ignore file deletion errors (file may not exist)
        console.warn('File delete warning:', fileErr?.message || fileErr);
      }
    }

    // Delete the song document
    await song.deleteOne();

    res.json({ message: 'Song deleted successfully' });
  } catch (err) {
    console.error('Delete song error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a song's metadata (title, artist) - only owner can update
router.put('/:id', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Ownership check
    if (song.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { title, artist } = req.body;
    if (title !== undefined) song.title = String(title).trim();
    if (artist !== undefined) song.artist = String(artist).trim();
    await song.save();

    res.json({ message: 'Song updated successfully', song });
  } catch (err) {
    console.error('Update song error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
 
module.exports = router;