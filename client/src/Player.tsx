import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Player.css';

interface Song {
  _id: string;
  title: string;
  artist: string;
  filePath: string;
  albumArt?: string;
}

interface Playlist {
  _id: string;
  name: string;
  songs: string[];
}

interface PlayerProps {
  user?: { username: string; email: string } | null;
  onLogout?: () => void;
}

const Player: React.FC<PlayerProps> = ({ user, onLogout }) => {
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<Song | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string>('all');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.7); // Default volume 70%
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isRepeat;
    }
  }, [isRepeat]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const fetchSongs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3003/api/songs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ensure songs have _id fields
        const songsWithId = data.map((song: any) => ({...song, _id: song._id || song.id}));
        setSongs(songsWithId);
        setCurrentSong(prev => prev || (songsWithId.length > 0 ? songsWithId[0] : null));
      }
    } catch (err) {
      console.error('Failed to fetch songs', err);
    }
  }, []);

  const fetchPlaylists = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3003/api/playlists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      }
    } catch (err) {
      console.error('Failed to fetch playlists', err);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3003/api/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.map((fav: any) => fav.songId || fav._id));
      }
    } catch (err) {
      console.error('Failed to fetch favorites', err);
    }
  }, []);

  const toggleFavorite = async (songId: string) => {
    // Optimistic update
    const wasFavorite = favorites.includes(songId);
    const newFavorites = wasFavorite
      ? favorites.filter(id => id !== songId)
      : [...favorites, songId];
      
    setFavorites(newFavorites);
    
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:3003/api/favorites${wasFavorite ? '' : ''}`;
      const options = {
        method: wasFavorite ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ songId })
      };
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        // Revert if API call fails
        setFavorites(favorites);
        const msg = wasFavorite ? 'Failed to remove favorite' : 'Failed to add favorite';
        alert(`${msg}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Favorite toggle failed', err);
      setFavorites(favorites); // Revert on error
      alert('Failed to update favorites');
    }
  };

  const addToPlaylist = async (playlistId: string, songId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3003/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ songId })
      });
      
      if (response.ok) {
        alert('Song added to playlist successfully!');
        fetchPlaylists();
      } else {
        alert('Failed to add song to playlist, song already exists');
      }
    } catch (err) {
      console.error('Add to playlist error:', err);
      alert('Failed to add song to playlist');
    } finally {
      setShowAddToPlaylist(false);
      setSelectedSongForPlaylist(null);
    }
  };
  const removeFromPlaylist = async (playlistId: string, songId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3003/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Song removed from playlist successfully!');
        await fetchPlaylists();
      } else {
        const errorMsg = await response.text();
        alert('Failed to remove song from playlist: ' + errorMsg);
      }
    } catch (err) {
      console.error('Remove from playlist error:', err);
      alert('Failed to remove song from playlist');
    }
  };

  const deleteSong = async (songId: string) => {
    if (!window.confirm('Delete this song permanently?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3003/api/songs/${songId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Song deleted successfully!');
        await fetchSongs();
        await fetchPlaylists();
        // If the deleted song was currently playing, stop playback
        if (currentSong && currentSong._id === songId) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
          }
          setCurrentSong(null);
          setIsPlaying(false);
        }
      } else {
        const errorMsg = await response.text();
        alert(`Failed to delete song: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Delete song error:', err);
      alert('Failed to delete song');
    }
  };

  // Drag-and-drop: add song to a playlist by dropping onto the playlist item
  const handlePlaylistDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handlePlaylistDrop = (playlistId: string) => (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    const songId = e.dataTransfer.getData('songId');
    if (!songId) {
      return;
    }
    addToPlaylist(playlistId, songId);
    setDragOverPlaylistId(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };


  useEffect(() => {
    fetchSongs();
    fetchPlaylists();
    fetchFavorites();
  }, [fetchSongs, fetchPlaylists, fetchFavorites]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !isMuted;
    audio.muted = next;
    setIsMuted(next);
  };

  const toggleRepeat = () => {
    const next = !isRepeat;
    setIsRepeat(next);
    if (audioRef.current) {
      audioRef.current.loop = next;
    }
  };

  const toggleShuffle = () => {
    setIsShuffle(prev => !prev);
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(prev => !prev);
  };

  const startEdit = (song: Song) => {
    setEditingSongId(song._id);
    setEditTitle(song.title);
    setEditArtist(song.artist);
  };

  const cancelEdit = () => {
    setEditingSongId(null);
    setEditTitle('');
    setEditArtist('');
  };

  const saveEdit = async (songId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3003/api/songs/${songId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle, artist: editArtist })
      });

      if (response.ok) {
        const data = await response.json();
        const updated = data.song || { title: editTitle, artist: editArtist };
        setSongs(prev => prev.map(s => s._id === songId ? { ...s, title: updated.title, artist: updated.artist } : s));
        setCurrentSong(cs => cs && cs._id === songId ? { ...cs, title: updated.title, artist: updated.artist } : cs);
        cancelEdit();
        alert('Song updated successfully!');
      } else {
        const txt = await response.text();
        alert(`Failed to update song: ${txt}`);
      }
    } catch (err) {
      console.error('Update song error', err);
      alert('Failed to update song');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('song', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ""));
    formData.append('artist', 'Unknown Artist');

    setUploading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3003/api/songs/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      if (response.ok) {
        await fetchSongs();
        alert('Song uploaded successfully!');
      }
    } catch (err) {
      console.error('Upload failed', err);
      let errorMessage = 'Upload failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const selectSong = async (song: Song) => {
  const audio = audioRef.current;
  if (!audio) return;

  // Stop current playback and reset
  audio.pause();
  audio.currentTime = 0;

  // Point to the new source and start loading
  audio.src = `http://localhost:3003/${song.filePath}`;
  audio.load();

  // Update UI immediately for responsiveness
  setCurrentSong(song);

  // Helper to attempt playback and reflect state
  const attemptPlay = () => {
    audio.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
          console.log('Autoplay blocked or interrupted');
        } else {
          console.error('Playback failed:', err);
        }
        setIsPlaying(false);
      });
  };

  // If the element already has enough data, play immediately.
  // readyState: 2 = HAVE_CURRENT_DATA, 3 = HAVE_FUTURE_DATA, 4 = HAVE_ENOUGH_DATA
  if (audio.readyState >= 2) {
    attemptPlay();
  } else {
    const onCanPlay = () => {
      audio.removeEventListener('canplay', onCanPlay);
      attemptPlay();
    };
    audio.addEventListener('canplay', onCanPlay, { once: true });
  }
};


  const playNext = async () => {
    if (!currentSong) return;
    const currentIndex = filteredDisplayedSongs.findIndex(song => song._id === currentSong._id);
    const total = filteredDisplayedSongs.length;
    if (total === 0) return;

    if (isShuffle) {
      let nextIndex = Math.floor(Math.random() * total);
      if (total > 1) {
        while (nextIndex === currentIndex) {
          nextIndex = Math.floor(Math.random() * total);
        }
      }
      const nextSong = filteredDisplayedSongs[nextIndex];
      await selectSong(nextSong);
      return;
    }

    if (currentIndex < total - 1) {
      const nextSong = filteredDisplayedSongs[currentIndex + 1];
      await selectSong(nextSong);
    } else {
      // Jika di akhir playlist, berhenti
      setIsPlaying(false);
    }
  };


  const playPrev = async () => {
    if (!currentSong) return;
    const currentIndex = filteredDisplayedSongs.findIndex(song => song._id === currentSong._id);
    const total = filteredDisplayedSongs.length;
    if (total === 0) return;

    if (isShuffle) {
      let prevIndex = Math.floor(Math.random() * total);
      if (total > 1) {
        while (prevIndex === currentIndex) {
          prevIndex = Math.floor(Math.random() * total);
        }
      }
      const prevSong = filteredDisplayedSongs[prevIndex];
      await selectSong(prevSong);
      return;
    }

    if (currentIndex > 0) {
      const prevSong = filteredDisplayedSongs[currentIndex - 1];
      await selectSong(prevSong);
    }
  };


  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const width = progressBar.clientWidth;
    const seekTime = (offsetX / width) * duration;
    
    setCurrentTime(seekTime);
    audioRef.current.currentTime = seekTime;
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const volumeBar = e.currentTarget;
    const rect = volumeBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const width = volumeBar.clientWidth;
    const newVolume = Math.min(1, Math.max(0, offsetX / width));
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3003/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newPlaylistName })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlaylists([...playlists, data]);
        setNewPlaylistName('');
        setShowCreatePlaylist(false);
        alert('Playlist created successfully!');
      }
    } catch (err) {
      console.error('Create playlist failed', err);
      alert('Failed to create playlist');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deletePlaylist = async (playlistId: string) => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3003/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setPlaylists(playlists.filter(p => p._id !== playlistId));
        // Reset to All Songs if current playlist was deleted
        if (currentPlaylistId === playlistId) {
          setCurrentPlaylistId('all');
        }
        alert('Playlist deleted successfully!');
      } else {
        const errorMsg = await response.text();
        alert(`Failed to delete playlist: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Delete playlist failed', err);
      alert('Failed to delete playlist');
    }
  };


  const displayedSongs = currentPlaylistId === 'all'
    ? songs
    : currentPlaylistId === 'favorites'
      ? songs.filter(song => favorites.includes(song._id))
      : (() => {
          const playlist = playlists.find(p => p._id === currentPlaylistId);
          if (playlist) {
            const playlistSongIds = playlist.songs.map((s: any) => (typeof s === 'string' ? s : s._id));
            return songs.filter(song => playlistSongIds.includes(song._id));
          }
          return [];
        })();

  const filteredDisplayedSongs = searchTerm.trim()
    ? displayedSongs.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.artist.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : displayedSongs;


  return (
    <div className="player spotify-style">
      {/* Top Bar - with logo on left, search in center, user on right */}
      {/* Top Bar */}
      <div className="top-bar">
        <div className="navigation-controls">
          {/* <button className="nav-btn">&nbsp;</button> */}
          <button className="nav-btn">&nbsp;</button>
          <button
            className="nav-btn"
            onClick={toggleSidebar}
            title={isSidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            ☰
          </button>
        </div>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Cari lagu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarVisible ? '' : 'collapsed'}`}>
        <div className="logo">3K Music</div>
        
        <div className="navigation">
          <ul>
            <li className="active">
              <span className="icon">🏠</span>
              <span>Home</span>
            </li>
            <li>
              <span className="icon">🔍</span>
              <span>Search</span>
            </li>
            <li>
              <span className="icon">📚</span>
              <span>Your Library</span>
            </li>
          </ul>
        </div>
        
        <div className="playlists">
          <div className="playlist-header">
            <h3>PLAYLISTS</h3>
            <button onClick={() => setShowCreatePlaylist(!showCreatePlaylist)}>+</button>
          </div>
          
          {showCreatePlaylist && (
            <div className="create-playlist">
              <input
                type="text"
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name"
              />
              <button onClick={createPlaylist}>Create</button>
            </div>
          )}
          
          <ul>
            <li
              className={currentPlaylistId === 'all' ? 'active' : ''}
              onClick={() => setCurrentPlaylistId('all')}
            >
              All Songs
            </li>
            <li
              className={currentPlaylistId === 'favorites' ? 'active' : ''}
              onClick={() => setCurrentPlaylistId('favorites')}
            >
              Favorites
            </li>
            {playlists.map(playlist => (
              <li
                key={playlist._id}
                className={`${currentPlaylistId === playlist._id ? 'active' : ''} ${dragOverPlaylistId === playlist._id ? 'droppable-hover' : ''}  `}
                title="drag songs to add to your playlist!"                
                onClick={() => setCurrentPlaylistId(playlist._id)}
                onDragEnter={() => setDragOverPlaylistId(playlist._id)}
                onDragLeave={() => setDragOverPlaylistId(prev => (prev === playlist._id ? null : prev))}
                onDragOver={handlePlaylistDragOver}
                onDrop={handlePlaylistDrop(playlist._id)}
              >
                <span className="playlist-name">{playlist.name}</span>
                <button
                  className="playlist-delete-btn"
                  title="Delete playlist"
                  aria-label="Delete playlist"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePlaylist(playlist._id);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="5" y="5" width="6" height="8" rx="1" ry="1" fill="currentColor" />
                    <rect x="4" y="3" width="8" height="2" fill="currentColor" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Main Content */}
      <div className={`main-content ${isSidebarVisible ? '' : 'expanded'}`}>
        <div className="content">
          {/* Heading */}
          <h1 className="playlist-heading">
            {currentPlaylistId === 'all' ? 'All Songs' :
             currentPlaylistId === 'favorites' ? 'Favorite Songs' :
             playlists.find(p => p._id === currentPlaylistId)?.name || 'Playlist'}
          </h1>
          
          {/* Upload Button */}
          <div className="upload-section">
            <label className="upload-btn">
              {uploading ? 'Uploading...' : 'Upload Song'}
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          
          {/* Song List */}
          <div className="song-list">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>TITLE</th>
                  <th>ARTIST</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDisplayedSongs.map((song, index) => (
                  <tr
                    key={song._id}
                    className={currentSong?._id === song._id ? 'active' : ''}
                    onClick={() => selectSong(song)}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('songId', song._id);
                      e.dataTransfer.setData('songTitle', song.title);
                    }}
                  >
                    <td>{index + 1}</td>
                    <td>
                      <div className="song-title-wrapper">
                        {song.albumArt ? (
                          <img
                            src={`http://localhost:3003/${song.albumArt}`}
                            alt={song.title}
                            className="song-thumbnail"
                          />
                        ) : (
                          <div className="default-thumbnail"></div>
                        )}
                        <div className="song-title">
                          <div className="song-name">{song.title}</div>
                          <div className="song-artist-mobile">{song.artist}</div>
                        </div>
                        <div className="inline-actions">
                          {editingSongId === song._id ? (
                            <>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Title"
                              />
                              <input
                                type="text"
                                value={editArtist}
                                onChange={(e) => setEditArtist(e.target.value)}
                                placeholder="Artist"
                              />
                              <button
                                className="save-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEdit(song._id);
                                }}
                              >
                                Save
                              </button>
                              <button
                                className="cancel-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEdit();
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className={`like-btn ${favorites.includes(song._id) ? 'liked' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(song._id);
                                }}
                              >
                                {favorites.includes(song._id) ? '❤️' : '🤍'}
                              </button>
                              
                              {currentPlaylistId !== 'all' && currentPlaylistId !== 'favorites' && (
                                <button
                                  className="remove-btn"
                                  title="Remove from this playlist"
                                  aria-label="Remove from this playlist"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromPlaylist(currentPlaylistId, song._id);
                                  }}
                                >
                                  ✖
                                </button>
                              )}
                                <button
                                  className="edit-btn"
                                  title="Edit song title/artist"
                                  aria-label="Edit song"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(song);
                                  }}
                                >
                                  ✏️
                                </button>
                              <button
                                className="delete-song-btn"
                                title="Delete this song"
                                aria-label="Delete this song"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSong(song._id);
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                                  <rect x="5" y="5" width="6" height="8" rx="1" ry="1" fill="currentColor" />
                                  <rect x="4" y="3" width="8" height="2" fill="currentColor" />
                                </svg>
                              </button>
                              
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="song-artist">{song.artist}</td>
                    <td className="row-actions"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Now Playing Bar */}
      <div className="now-playing-bar">
        {currentSong && (
          <div className="now-playing-left">
            <div className="album-cover">
              {currentSong.albumArt ? (
                <img src={`http://localhost:3003/${currentSong.albumArt}`} alt="Album cover" />
              ) : (
                <div className="default-album-art"></div>
              )}
            </div>
            <div className="track-details">
              <div className="track-title">{currentSong.title}</div>
              <div className="track-artist">{currentSong.artist}</div>
            </div>
            <button
              className={`like-btn ${favorites.includes(currentSong._id) ? 'liked' : ''}`}
              onClick={() => toggleFavorite(currentSong._id)}
              title={favorites.includes(currentSong._id) ? "Remove from favorites" : "Add to favorites"}
            >
              {favorites.includes(currentSong._id) ? '❤️' : '🤍'}
            </button>
          </div>
        )}
        
        <div className="now-playing-center">
          <div className="player-controls">
            <button className={`control-btn ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title={isShuffle ? 'Shuffle: On' : 'Shuffle: Off'}>
              <svg height="16" width="16" viewBox="0 0 16 16">
                <path d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 00.39 3.5z"></path>
                <path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 001.724.804h1.947l-1.017-1.018a.75.75 0 111.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 11-1.06-1.06L13.109 13H11.16a3.75 3.75 0 01-2.873-1.34l-.787-.939z"></path>
              </svg>
            </button>
            <button className="control-btn" onClick={playPrev} title="Previous">
              <svg height="16" width="16" viewBox="0 0 16 16">
                <path d="M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.575a.7.7 0 01-1.05.607L4 9.149V14.3a.7.7 0 01-.7.7H1.7a.7.7 0 01-.7-.7V1.7a.7.7 0 01.7-.7h1.6z"></path>
              </svg>
            </button>
            <button className="play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? (
                <svg height="16" width="16" viewBox="0 0 16 16">
                  <path d="M2.7 1a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7H2.7zm8 0a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-2.6z"></path>
                </svg>
              ) : (
                <svg height="16" width="16" viewBox="0 0 16 16">
                  <path d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z"></path>
                </svg>
              )}
            </button>
            <button className="control-btn" onClick={playNext} title="Next">
              <svg height="16" width="16" viewBox="0 0 16 16">
                <path d="M12.7 1a.7.7 0 00-.7.7v5.15L2.05 1.107A.7.7 0 001 1.712v12.575a.7.7 0 001.05.607L12 9.149V14.3a.7.7 0 00.7.7h1.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-1.6z"></path>
              </svg>
            </button>
            <button className={`control-btn ${isRepeat ? 'active' : ''}`} onClick={toggleRepeat} title={isRepeat ? 'Repeat: On' : 'Repeat: Off'}>
              <svg height="16" width="16" viewBox="0 0 16 16">
                <path d={isRepeat ? "M4 4h8v8H4z" : "M0 4.75A3.75 3.75 0 013.75 1h8.5A3.75 3.75 0 0116 4.75v5a3.75 3.75 0 01-3.75 3.75H9.81l1.018 1.018a.75.75 0 11-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 111.06 1.06L9.811 12h2.439a2.25 2.25 0 002.25-2.25v-5a2.25 2.25 0 00-2.25-2.25h-8.5A2.25 2.25 0 001.5 4.75v5A2.25 2.25 0 003.75 12H5v1.5H3.75A3.75 3.75 0 010 9.75v-5z"}></path>
              </svg>
            </button>
          </div>
          
          <div className="progress-container">
            <span className="time">{formatTime(currentTime)}</span>
            <div className="progress-bar" onClick={handleSeek}>
              <div className="progress" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}></div>
            </div>
            <span className="time">{formatTime(duration)}</span>
          </div>
        </div>
        
        <div className="now-playing-right">
          <button className="control-btn" title="Queue">
            <svg height="16" width="16" viewBox="0 0 16 16">
              <path d="M15 15H1v-1.5h14V15zm0-4.5H1V9h14v1.5zm-14-7A.5.5 0 01.5 3h15a.5.5 0 01.5.5v1a.5.5 0 01-.5.5H.5a.5.5 0 01-.5-.5v-1zm0 4.5A.5.5 0 01.5 7h15a.5.5 0 01.5.5v1a.5.5 0 01-.5.5H.5a.5.5 0 01-.5-.5v-1z"></path>
            </svg>
          </button>
          <div className="volume-control">
            <button className="control-btn" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
              <svg height="16" width="16" viewBox="0 0 16 16">
                <path d={isMuted ? "M0 5v6h2.804L8 14V2L2.804 5H0zm10 1l3 3-1.06 1.06L8.94 7.06 10 6z" : "M0 5v6h2.804L8 14V2L2.804 5H0zm9 3a4.5 4.5 0 004.5 4.5v-1A3.5 3.5 0 0110 8z"}></path>
              </svg>
            </button>
            <div className="volume-wrapper">
              <div
                className="volume-bar"
                onClick={handleVolumeClick}
              >
                <div
                  className="volume-progress"
                  style={{ width: `${volume * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <audio
          ref={audioRef}
          src={currentSong ? `http://localhost:3003/${currentSong.filePath}` : ''}
          onEnded={() => {
            if (!isRepeat) {
              playNext();
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
        />
      </div>
      
      {/* Add to Playlist Modal */}
      {showAddToPlaylist && selectedSongForPlaylist && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add "{selectedSongForPlaylist.title}" to Playlist</h3>
            <ul>
              {playlists.map(playlist => (
                <li key={playlist._id} onClick={() => addToPlaylist(playlist._id, selectedSongForPlaylist._id)}>
                  {playlist.name}
                </li>
              ))}
            </ul>
            <button className="cancel-btn" onClick={() => setShowAddToPlaylist(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;
