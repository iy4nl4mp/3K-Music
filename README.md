# 3K Music — Full Project Documentation

Overview
- Full‑stack music app with Node/Express backend and React TypeScript frontend.
- Backend exposes REST APIs for auth, songs, playlists, and favorites; serves uploaded audio files.
- Frontend provides a Spotify‑style player with upload, playlist, favorites, and playback controls.

Repository Structure
- [server](server) — Node/Express API and MongoDB models.
- [client](client) — React TypeScript single page app.

Server Bootstrap
- Express app init: [express()](server/index.js:8)
- MongoDB connect: [mongoose.connect()](server/index.js:12)
- CORS and JSON middleware: [app.use()](server/index.js:19)
- Static file hosting for uploads: [app.use()](server/index.js:23)
- Route mounting: [app.use()](server/index.js:26)
- Health route: [app.get()](server/index.js:31)
- Server start: [app.listen()](server/index.js:35)

Environment Variables
- Configure JWT secret, Mongo URI, and port in [.env](server/.env.example).
- Defaults: PORT 3003, JWT fallback "your_secret_key", local Mongo URI.

Authentication Middleware
- Auth check: [module.exports()](server/middleware/auth.js:4)
  - Reads Authorization Bearer token, verifies with JWT, loads user, assigns req.user { id, username }.
  - Returns 401 for missing/invalid token, 403 handled by routes for ownership.

Data Models
- Song: [server/models/Song.js](server/models/Song.js)
  - title (required), artist (required), album, duration, filePath (required), userId (required), createdAt.
- Playlist: [server/models/Playlist.js](server/models/Playlist.js)
  - name (required), userId (required), songs [ObjectId Song], createdAt.
- Favorite: [server/models/Favorite.js](server/models/Favorite.js)
  - userId (required), songId (required), createdAt, status enum('active','removed').

REST API — Auth
Base: /api/auth
- Register: [router.post()](server/routes/auth.js:8)
  - POST /register { username, email, password } → 201 on success; 400 if user exists.
- Login: [router.post()](server/routes/auth.js:29)
  - POST /login { email, password } → { token } (1h expiry); 401 invalid credentials.
- Current user: [router.get()](server/routes/auth.js:57)
  - GET /me with Authorization: Bearer token → { id, username, email }.

REST API — Songs
Base: /api/songs
- List songs: [router.get()](server/routes/songs.js:21)
  - GET / → array of Song documents (all songs).
- Upload: [router.post()](server/routes/songs.js:32)
  - POST /upload with Bearer token; multipart form field "song" (audio file), optional title, artist.
  - Stores file to uploads/, creates Song { title, artist, filePath, userId }.
  - Returns 201 with created song.
- Update metadata: [router.put()](server/routes/songs.js:108)
  - PUT /:id with Bearer token; body { title?, artist? }.
  - Only owner may update; 403 if not owner; 404 if not found.
- Delete: [router.delete()](server/routes/songs.js:69)
  - DELETE /:id with Bearer token.
  - Owner‑only; removes from all playlists, removes favorites, and attempts to unlink the file; deletes Song.

REST API — Playlists
Base: /api/playlists
- Create playlist: [router.post()](server/routes/playlists.js:7)
  - POST / { name } with Bearer token → 201 Playlist.
- List my playlists: [router.get()](server/routes/playlists.js:60)
  - GET / with Bearer token → array of my playlists with populated songs.
- Add song to playlist: [router.post()](server/routes/playlists.js:29)
  - POST /:id/songs { songId } owner‑only; prevents duplicates → updated playlist.
- Remove song from playlist: [router.delete()](server/routes/playlists.js:71)
  - DELETE /:id/songs/:songId owner‑only → updated playlist or 404 if song absent.
- Delete playlist: [router.delete()](server/routes/playlists.js:100)
  - DELETE /:id owner‑only → { message }.

REST API — Favorites
Base: /api/favorites
- Add favorite: [router.post()](server/routes/favorites.js:9)
  - POST / { songId } with Bearer token; validates ObjectId and song existence; prevents duplicates → 201 Favorite.
- Remove favorite: [router.delete()](server/routes/favorites.js:50)
  - DELETE / with Bearer token; accepts songId in query or body → { message } or 404 if not present.
- List my favorites: [router.get()](server/routes/favorites.js:79)
  - GET / with Bearer token → array of Song documents (mapped from favorites).

Static Files
- Uploaded files are served under /uploads via [app.use()](server/index.js:23).
- A song filePath is a relative path like "uploads/12345.mp3"; frontend prefixes with server origin.

Frontend — Player Component
Component: [Player()](client/src/Player.tsx:23)
- Responsibilities: fetch and render songs/playlists/favorites; control playback; upload; edit metadata; manage playlists and favorites; drag‑drop to add songs; search; sidebar toggle; volume and seek.

Initialization and Effects
- Set initial audio volume: [useEffect()](client/src/Player.tsx:49)
- Sync loop/repeat to audio element: [useEffect()](client/src/Player.tsx:55)
- Sync mute to audio element: [useEffect()](client/src/Player.tsx:61)
- Initial data load (songs, playlists, favorites): [useEffect()](client/src/Player.tsx:258)

Data Fetching
- Fetch songs: [fetchSongs()](client/src/Player.tsx:67)
  - GET /api/songs; normalizes _id; sets currentSong to first if none.
- Fetch playlists: [fetchPlaylists()](client/src/Player.tsx:86)
  - GET /api/playlists and set local state.
- Fetch favorites: [fetchFavorites()](client/src/Player.tsx:102)
  - GET /api/favorites; stores array of songIds (fav.songId or _id).

Favorites
- Toggle favorite: [toggleFavorite()](client/src/Player.tsx:118)
  - Optimistic UI update; POST /api/favorites to add; DELETE /api/favorites to remove; reverts on failure.

Playlists
- Add to playlist: [addToPlaylist()](client/src/Player.tsx:154)
  - POST /api/playlists/:playlistId/songs; refreshes playlists on success.
- Remove from playlist: [removeFromPlaylist()](client/src/Player.tsx:180)
  - DELETE /api/playlists/:playlistId/songs/:songId; refreshes playlists on success.
- Create playlist: [createPlaylist()](client/src/Player.tsx:499)
  - POST /api/playlists { name }; updates local list; clears form; hides dialog.
- Delete playlist: [deletePlaylist()](client/src/Player.tsx:527)
  - DELETE /api/playlists/:id; removes from local state; resets filter if needed.

Songs — CRUD and Selection
- Upload file: [handleFileUpload()](client/src/Player.tsx:340)
  - Uses file input, builds FormData with fields song, title, artist; POST /api/songs/upload; refreshes list.
- Edit metadata start: [startEdit()](client/src/Player.tsx:299)
- Cancel edit: [cancelEdit()](client/src/Player.tsx:305)
- Save edit: [saveEdit()](client/src/Player.tsx:311)
  - PUT /api/songs/:id { title, artist }; updates songs and currentSong in state.
- Delete song: [deleteSong()](client/src/Player.tsx:203)
  - DELETE /api/songs/:id; refreshes songs and playlists; stops playback if deleting current song.
- Select song for playback: [selectSong()](client/src/Player.tsx:377)
  - Stops current, sets new src to server/filePath, waits for canplay, attempts play with error handling, updates isPlaying.

Playback Controls
- Play/pause: [togglePlay()](client/src/Player.tsx:264)
- Previous: [playPrev()](client/src/Player.tsx:448)
- Next: [playNext()](client/src/Player.tsx:420)
- Repeat toggle: [toggleRepeat()](client/src/Player.tsx:283)
- Shuffle toggle: [toggleShuffle()](client/src/Player.tsx:291)
- Mute toggle: [toggleMute()](client/src/Player.tsx:275)
- Sidebar toggle: [toggleSidebar()](client/src/Player.tsx:295)

Seek and Volume
- Seek by clicking progress bar: [handleSeek()](client/src/Player.tsx:473)
- Volume by clicking volume bar: [handleVolumeClick()](client/src/Player.tsx:486)
- Progress/metadata events are wired on the audio element; onEnded triggers [playNext()](client/src/Player.tsx:420).

Drag and Drop to Playlists
- Mark playlist droppable and accept songId: [handlePlaylistDragOver()](client/src/Player.tsx:236)
- On drop, add the song: [handlePlaylistDrop()](client/src/Player.tsx:241)

Derived Lists and Search
- Displayed songs are derived from "all", "favorites", or selected playlist with populated ids.
- Filtered by search term (title or artist) client‑side.

Audio Source Resolution
- Audio src is built as http://localhost:3003/{filePath}, matching server static hosting via [app.use()](server/index.js:23).

Error Handling Patterns
- Backend returns standard HTTP codes with message.
- Frontend uses optimistic updates for favorites; alerts on failure; console logs detailed errors.

Security and Ownership
- Auth enforced by [module.exports()](server/middleware/auth.js:4) on protected routes.
- Ownership checks before changing resources: songs and playlists ensure req.user.id matches resource.userId.

Usage Examples (cURL)
- Login to obtain token:
  - curl -X POST http://localhost:3003/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"user@example.com\",\"password\":\"secret\"}"
- Upload a song:
  - curl -X POST http://localhost:3003/api/songs/upload -H "Authorization: Bearer TOKEN" -F "song=@path/to/file.mp3" -F "title=My Song" -F "artist=Me"
- Add favorite:
  - curl -X POST http://localhost:3003/api/favorites -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d "{\"songId\":\"<id>\"}"
- Create playlist and add song:
  - curl -X POST http://localhost:3003/api/playlists -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"My List\"}"
  - curl -X POST http://localhost:3003/api/playlists/<playlistId>/songs -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d "{\"songId\":\"<id>\"}"

Development Notes
- Ensure client localStorage contains token from auth/login; the Player fetches with Authorization header.
- Ensure server uploads folder is writable; files are stored with Date.now() + ext by [multer.diskStorage()](server/routes/songs.js:10).
- Deleting songs attempts fs.unlink; failure is logged and ignored.

Health and Static Routes
- Backend health: [app.get()](server/index.js:31) → "Music App Backend is running!".
- Static uploads available at GET /uploads/{filename}.

Build/Run
- Backend: from server folder run "npm install" and "npm run start".
- Frontend: from client folder run "npm install" and "npm run start".
- Both are already configured in the workspace terminals.

Notes on IDs and Populated Data
- When fetching playlists, songs within a playlist are populated; UI maps string ids or objects uniformly.
- Favorites endpoint returns an array of Song documents; UI maps to song ids for quick lookup.

Validation Summary
- Playlists require non‑empty name in [router.post()](server/routes/playlists.js:7).
- Favorites validate songId ObjectId and existence in [router.post()](server/routes/favorites.js:9).
- Songs upload requires file present via [upload.single()](server/routes/songs.js:32) and auth.

File References
- Server entry: [server/index.js](server/index.js)
- Routes: [server/routes/auth.js](server/routes/auth.js), [server/routes/songs.js](server/routes/songs.js), [server/routes/playlists.js](server/routes/playlists.js), [server/routes/favorites.js](server/routes/favorites.js)
- Middleware: [server/middleware/auth.js](server/middleware/auth.js)
- Models: [server/models/User.js](server/models/User.js), [server/models/Song.js](server/models/Song.js), [server/models/Playlist.js](server/models/Playlist.js), [server/models/Favorite.js](server/models/Favorite.js)
- Frontend Player: [client/src/Player.tsx](client/src/Player.tsx)

End of Documentation
