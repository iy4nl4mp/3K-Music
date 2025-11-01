const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');
const auth = require('../middleware/auth');

// Create new playlist
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Playlist name is required' });
    }

    const newPlaylist = new Playlist({
      name,
      userId: req.user.id,
      songs: []
    });

    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (err) {
    console.error('Create playlist error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add song to playlist
router.post('/:id/songs', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { songId } = req.body;
    if (!songId) {
      return res.status(400).json({ message: 'Song ID is required' });
    }

    // Prevent duplicate songs
    if (!playlist.songs.includes(songId)) {
      playlist.songs.push(songId);
      await playlist.save();
      res.json(playlist);
    } else {
      res.status(400).json({ message: 'Song already in playlist' });
    }
  } catch (err) {
    console.error('Add to playlist error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's playlists
router.get('/', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user.id }).populate('songs');
    res.json(playlists);
  } catch (err) {
    console.error('Get playlists error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove song from playlist
router.delete('/:id/songs/:songId', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Check ownership
    if (playlist.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { songId } = req.params;
    const beforeLen = playlist.songs.length;
    playlist.songs = playlist.songs.filter(s => s.toString() !== songId);

    if (playlist.songs.length === beforeLen) {
      return res.status(404).json({ message: 'Song not in playlist' });
    }

    await playlist.save();
    res.json(playlist);
  } catch (err) {
    console.error('Remove from playlist error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a playlist
router.delete('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Check if user owns the playlist
    if (playlist.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await playlist.deleteOne();
    res.json({ message: 'Playlist deleted successfully' });
  } catch (err) {
    console.error('Delete playlist error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;