// SPOTIFY PLAYER - SIMPLE WORKING CODE

const audio = document.getElementById('audioPlayer');
const progress = document.getElementById('myprogressbar');

let currentSongSrc = null;
let repeatMode = 0; // 0=off, 1=all, 2=one

// ===== LOGIN SYSTEM =====
let isUserLoggedIn = false;
let userData = null;

// Check if user is already logged in
function checkLoginStatus() {
    const storedUser = localStorage.getItem('spotSongUser');
    if (storedUser) {
        userData = JSON.parse(storedUser);
        isUserLoggedIn = true;
        updateLoginUI(true);
    }
}

// Update login button UI
function updateLoginUI(loggedIn) {
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    
    if (loggedIn && userData) {
        loginText.textContent = userData.name.split(' ')[0]; // Show first name
        loginBtn.classList.add('logged-in');
        loginBtn.title = 'Click to logout';
    } else {
        loginText.textContent = 'Login';
        loginBtn.classList.remove('logged-in');
        loginBtn.title = 'Click to login';
    }
}

// Show login required dialog
function showLoginRequiredDialog() {
    const dialog = document.getElementById('loginRequiredDialog');
    dialog.style.display = 'flex';
    dialog.style.alignItems = 'center';
    dialog.style.justifyContent = 'center';
}

// Hide login required dialog
function hideLoginRequiredDialog() {
    const dialog = document.getElementById('loginRequiredDialog');
    dialog.style.display = 'none';
}

// Show login modal
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.style.display = 'block';
}

// Hide login modal
function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.style.display = 'none';
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const loginClose = document.querySelector('.login-close');
    const loginForm = document.getElementById('loginForm');
    const loginRequiredBtn = document.getElementById('loginRequiredBtn');
    
    // Login button click
    loginBtn.addEventListener('click', () => {
        if (isUserLoggedIn) {
            // Logout
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('spotSongUser');
                isUserLoggedIn = false;
                userData = null;
                updateLoginUI(false);
                showToast('Logged out successfully!', 'success');
            }
        } else {
            // Show login modal
            showLoginModal();
        }
    });
    
    // Close button
    loginClose.addEventListener('click', hideLoginModal);
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            hideLoginModal();
        }
        if (e.target === document.getElementById('loginRequiredDialog')) {
            hideLoginRequiredDialog();
        }
    });
    
    // Login required button
    loginRequiredBtn.addEventListener('click', () => {
        hideLoginRequiredDialog();
        showLoginModal();
    });
    
    // Form submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const phone = document.getElementById('userPhone').value.trim();
        const dob = document.getElementById('userDOB').value;
        
        if (name && email) {
            userData = { name, email, phone, dob, loginDate: new Date().toISOString() };
            localStorage.setItem('spotSongUser', JSON.stringify(userData));
            isUserLoggedIn = true;
            updateLoginUI(true);
            hideLoginModal();
            showToast(`Welcome, ${name}! 🎵`, 'success');
            loginForm.reset();
        }
    });
});

// ===== ARTIST IMAGE FETCHER =====
// Function to retrieve artist images from external sources with fallback mechanisms
const artistImageCache = new Map(); // Cache to store fetched images

/**
 * Fetches artist image from multiple reliable sources
 * @param {string} artistName - Name of the artist
 * @returns {Promise<Object>} - Returns { artistName, imageUrl }
 */
async function fetchArtistImage(artistName) {
    // Check cache first
    if (artistImageCache.has(artistName.toLowerCase())) {
        return artistImageCache.get(artistName.toLowerCase());
    }

    try {
        // Try MusicBrainz API (free, no auth required)
        const musicBrainzImage = await fetchFromMusicBrainz(artistName);
        if (musicBrainzImage) {
            const result = { artistName, imageUrl: musicBrainzImage };
            artistImageCache.set(artistName.toLowerCase(), result);
            return result;
        }

        // Try Wikipedia/Wikimedia Commons
        const wikipediaImage = await fetchFromWikipedia(artistName);
        if (wikipediaImage) {
            const result = { artistName, imageUrl: wikipediaImage };
            artistImageCache.set(artistName.toLowerCase(), result);
            return result;
        }

        // Fallback to UI Avatars with artist-specific colors
        const fallbackImage = generateUIAvatar(artistName);
        const result = { artistName, imageUrl: fallbackImage };
        artistImageCache.set(artistName.toLowerCase(), result);
        return result;

    } catch (error) {
        // Error handling - return fallback avatar
        const fallbackImage = generateUIAvatar(artistName);
        return { artistName, imageUrl: fallbackImage, error: 'Failed to fetch from external sources' };
    }
}

/**
 * Fetch artist image from MusicBrainz + Cover Art Archive
 * @param {string} artistName - Artist name
 * @returns {Promise<string|null>} - Image URL or null
 */
async function fetchFromMusicBrainz(artistName) {
    try {
        const searchUrl = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artistName)}&fmt=json&limit=1`;
        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'SpotSong/1.0 (https://spotsong.com)' }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.artists && data.artists.length > 0) {
            const artistId = data.artists[0].id;
            
            // Try to get release group with cover art
            const releaseUrl = `https://musicbrainz.org/ws/2/release-group?artist=${artistId}&fmt=json&limit=1`;
            const releaseResponse = await fetch(releaseUrl, {
                headers: { 'User-Agent': 'SpotSong/1.0 (https://spotsong.com)' }
            });
            
            if (releaseResponse.ok) {
                const releaseData = await releaseResponse.json();
                if (releaseData['release-groups'] && releaseData['release-groups'].length > 0) {
                    const releaseGroupId = releaseData['release-groups'][0].id;
                    // Cover Art Archive URL
                    const coverArtUrl = `https://coverartarchive.org/release-group/${releaseGroupId}/front-500`;
                    
                    // Verify image exists
                    const imgCheck = await fetch(coverArtUrl, { method: 'HEAD' });
                    if (imgCheck.ok) return coverArtUrl;
                }
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Fetch artist image from Wikipedia
 * @param {string} artistName - Artist name
 * @returns {Promise<string|null>} - Image URL or null
 */
async function fetchFromWikipedia(artistName) {
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(artistName)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
        const response = await fetch(searchUrl);
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const pages = data.query?.pages;
        
        if (pages) {
            const pageId = Object.keys(pages)[0];
            const imageUrl = pages[pageId]?.thumbnail?.source;
            
            if (imageUrl && pageId !== '-1') {
                return imageUrl;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Generate UI Avatar as fallback
 * @param {string} artistName - Artist name
 * @returns {string} - UI Avatar URL
 */
function generateUIAvatar(artistName) {
    const colors = [
        'ffc107', '00c8ff', 'ff69b4', 'ff6347', 'ffd700',
        'dc143c', '8b008b', 'ff1493', '4169e1', '20b2aa',
        'ffa500', 'daa520', 'ff8c00', 'ffc107', 'ff69b4'
    ];
    
    // Generate consistent color based on artist name
    const colorIndex = artistName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    const bgColor = colors[colorIndex];
    const textColor = ['ffd700', 'ffa500', 'daa520', 'ff8c00', 'ffc107', 'ffc107'].includes(bgColor) ? '000' : 'fff';
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&size=200&background=${bgColor}&color=${textColor}&bold=true&format=png`;
}

/**
 * Batch fetch multiple artist images
 * @param {Array<string>} artistNames - Array of artist names
 * @returns {Promise<Array<Object>>} - Array of { artistName, imageUrl }
 */
async function fetchMultipleArtistImages(artistNames) {
    const promises = artistNames.map(name => fetchArtistImage(name));
    return await Promise.all(promises);
}

// ===== SPOTIFY-LEVEL DATA TRACKING & STATISTICS =====
class MusicTracker {
    constructor() {
        this.initializeStorage();
        this.startSessionTracking();
    }

    initializeStorage() {
        // Initialize localStorage with default values if not exists
        if (!localStorage.getItem('spotSongData')) {
            localStorage.setItem('spotSongData', JSON.stringify({
                playHistory: [],
                favorites: [],
                totalPlayTime: 0,
                lastPlayDate: null,
                streak: 0,
                stats: {
                    totalSongs: 0,
                    totalPlays: 0,
                    topGenres: {},
                    topArtists: {},
                    listeningPatterns: {}
                }
            }));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem('spotSongData'));
    }

    saveData(data) {
        localStorage.setItem('spotSongData', JSON.stringify(data));
    }

    // Track song play
    trackPlay(songInfo) {
        const data = this.getData();
        const timestamp = new Date().toISOString();
        
        const playEntry = {
            title: songInfo.title || 'Unknown',
            artist: songInfo.artist || 'Unknown',
            cover: songInfo.cover || 'haseen cover.jpg',
            duration: songInfo.duration || 0,
            timestamp: timestamp,
            type: songInfo.type || 'song' // song, podcast, radio
        };

        // Add to play history (keep last 100)
        data.playHistory.unshift(playEntry);
        if (data.playHistory.length > 100) {
            data.playHistory = data.playHistory.slice(0, 100);
        }

        // Update stats
        data.stats.totalPlays++;
        data.stats.totalSongs = new Set(data.playHistory.map(p => p.title)).size;
        
        // Track artist plays
        if (songInfo.artist) {
            data.stats.topArtists[songInfo.artist] = (data.stats.topArtists[songInfo.artist] || 0) + 1;
        }

        // Track genre plays
        if (songInfo.genre) {
            data.stats.topGenres[songInfo.genre] = (data.stats.topGenres[songInfo.genre] || 0) + 1;
        }

        // Track listening patterns by hour
        const hour = new Date().getHours();
        data.stats.listeningPatterns[hour] = (data.stats.listeningPatterns[hour] || 0) + 1;

        this.saveData(data);
        this.updateStreak();
    }

    // Update total play time
    addPlayTime(seconds) {
        const data = this.getData();
        data.totalPlayTime += seconds;
        this.saveData(data);
    }

    // Toggle favorite
    toggleFavorite(songInfo) {
        const data = this.getData();
        const songId = `${songInfo.title}-${songInfo.artist}`;
        
        const existingIndex = data.favorites.findIndex(f => 
            `${f.title}-${f.artist}` === songId
        );

        if (existingIndex !== -1) {
            data.favorites.splice(existingIndex, 1);
            this.saveData(data);
            return false; // Removed
        } else {
            data.favorites.push({
                title: songInfo.title,
                artist: songInfo.artist,
                cover: songInfo.cover,
                src: songInfo.src || '',
                type: songInfo.type || 'local',
                addedAt: new Date().toISOString()
            });
            this.saveData(data);
            return true; // Added
        }
    }

    isFavorite(title, artist) {
        const data = this.getData();
        const songId = `${title}-${artist}`;
        return data.favorites.some(f => `${f.title}-${f.artist}` === songId);
    }

    // Streak tracking
    updateStreak() {
        const data = this.getData();
        const today = new Date().toDateString();
        const lastPlay = data.lastPlayDate ? new Date(data.lastPlayDate).toDateString() : null;

        if (lastPlay === today) {
            // Already played today, streak unchanged
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastPlay === yesterdayStr) {
            // Played yesterday, increment streak
            data.streak++;
        } else if (lastPlay !== null) {
            // Streak broken, reset to 1
            data.streak = 1;
        } else {
            // First play ever
            data.streak = 1;
        }

        data.lastPlayDate = new Date().toISOString();
        this.saveData(data);
    }

    // Get statistics for library view
    getStats() {
        const data = this.getData();
        
        const hours = Math.floor(data.totalPlayTime / 3600);
        const minutes = Math.floor((data.totalPlayTime % 3600) / 60);

        return {
            totalSongs: data.stats.totalSongs,
            totalPlays: data.stats.totalPlays,
            totalTime: `${hours}h ${minutes}m`,
            favoritesCount: data.favorites.length,
            streak: data.streak,
            recentPlays: data.playHistory.slice(0, 10),
            topArtists: Object.entries(data.stats.topArtists)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5),
            topGenres: Object.entries(data.stats.topGenres)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5),
            listeningPatterns: data.stats.listeningPatterns
        };
    }

    // Session tracking
    startSessionTracking() {
        let sessionPlayTime = 0;
        setInterval(() => {
            if (audio && !audio.paused && !audio.ended) {
                sessionPlayTime++;
                if (sessionPlayTime % 10 === 0) { // Save every 10 seconds
                    this.addPlayTime(10);
                }
            }
        }, 1000);
    }
}

// Initialize tracker
const musicTracker = new MusicTracker();

// ===== VIEW SWITCHING =====
let currentView = 'songlist'; // 'songlist' or 'cover'

function showCoverView(coverSrc, title, description) {
    const coverView = document.getElementById('coverDisplayView');
    const songlistView = document.getElementById('songlistView');
    const backButton = document.getElementById('backButton');
    const displayImage = document.getElementById('displayCoverImage');
    const displayTitle = document.getElementById('displayTitle');
    const displayDescription = document.getElementById('displayDescription');
    
    if (coverView && songlistView && backButton) {
        // Update cover view content
        displayImage.src = coverSrc;
        displayTitle.textContent = title;
        displayDescription.textContent = description;
        
        // Switch views
        songlistView.style.display = 'none';
        coverView.style.display = 'flex';
        backButton.style.display = 'flex';
        currentView = 'cover';
    }
}

function showSonglistView() {
    const coverView = document.getElementById('coverDisplayView');
    const songlistView = document.getElementById('songlistView');
    const backButton = document.getElementById('backButton');
    const libraryView = document.getElementById('libraryView');
    const artistProfileView = document.getElementById('artistProfileView');
    const likedSongsView = document.getElementById('likedSongsView');
    
    if (coverView && songlistView && backButton) {
        // Switch back to songlist
        songlistView.style.display = 'block';
        coverView.style.display = 'none';
        backButton.style.display = 'none';
        if (libraryView) libraryView.style.display = 'none';
        if (artistProfileView) artistProfileView.style.display = 'none';
        if (likedSongsView) likedSongsView.style.display = 'none';
        currentView = 'songlist';
    }
}

// ===== PLAY/PAUSE FUNCTIONS =====

function playSong(src, songItem) {
    // Check if user is logged in
    if (!isUserLoggedIn) {
        showLoginRequiredDialog();
        return;
    }
    
    if (!audio || !src) return;
    audio.src = src;
    currentSongSrc = src;
    document.querySelectorAll('.songItem').forEach(s => s.classList.remove('playing'));
    document.querySelectorAll('.podcast-item').forEach(p => p.classList.remove('playing'));
    if (songItem) songItem.classList.add('playing');
    audio.play().catch(() => {});
    updateIcons();
    
    // Add to queue if not already there
    if (songItem && typeof addToQueue === 'function') {
        const title = songItem.querySelector('span:not(.timestamp)')?.textContent || 'Unknown';
        const cover = songItem.querySelector('img')?.src || 'cover.jpg';
        const duration = songItem.querySelector('.timestamp')?.textContent?.split('<')[0]?.trim() || '0:00';
        
        // Check if already in queue
        const alreadyInQueue = songQueue.some(q => q.src === src);
        if (!alreadyInQueue) {
            addToQueue(src, title, cover, duration, true); // Silent mode
        }
    }
    
    // Track the play
    if (songItem) {
        const title = songItem.querySelector('.songName, .podcast-title')?.textContent || 'Unknown';
        const artist = songItem.closest('.artist-item')?.dataset.artist || 
                      songItem.dataset.artist || 
                      document.querySelector('.artist-item.active .artist-name')?.textContent || 
                      'Unknown';
        const cover = songItem.querySelector('img')?.src || 
                     document.querySelector('.artist-item.active .artist-image')?.src || 
                     'haseen cover.jpg';
        const type = songItem.classList.contains('podcast-item') ? 'podcast' : 'song';
        const genre = songItem.closest('.artist-item')?.dataset.genre || 'Various';
        
        musicTracker.trackPlay({
            title: title,
            artist: artist,
            cover: cover,
            type: type,
            genre: genre,
            duration: audio.duration || 0
        });
    }
}

function pauseSong() {
    if (audio) audio.pause();
    updateIcons();
}

function togglePlayPause() {
    if (!audio) return;
    if (audio.paused) {
        audio.play().catch(() => {});
    } else {
        audio.pause();
    }
    updateIcons();
}

// ===== UPDATE ICONS =====

function updateIcons() {
    const playing = audio && !audio.paused;
    
    // Center play button icon
    const centerIcon = document.querySelector('.center-icons-group i.fa-circle-play, .center-icons-group i.fa-pause');
    if (centerIcon) {
        if (playing) {
            centerIcon.classList.remove('fa-circle-play', 'fa-regular');
            centerIcon.classList.add('fa-pause', 'fa-solid');
        } else {
            centerIcon.classList.remove('fa-pause', 'fa-solid');
            centerIcon.classList.add('fa-circle-play', 'fa-regular');
        }
    }
    
    // Song list icons
    document.querySelectorAll('.songItem').forEach(item => {
        const icon = item.querySelector('.timestamp i');
        if (!icon) return;
        const isActive = item.classList.contains('playing') && playing;
        if (isActive) {
            icon.classList.remove('fa-circle-play', 'fa-regular');
            icon.classList.add('fa-pause', 'fa-solid');
        } else {
            icon.classList.remove('fa-pause', 'fa-solid');
            icon.classList.add('fa-circle-play', 'fa-regular');
        }
    });
    
    // Podcast list icons
    document.querySelectorAll('.podcast-item').forEach(item => {
        const icon = item.querySelector('.podcast-play i');
        if (!icon) return;
        const isActive = item.classList.contains('playing') && playing;
        if (isActive) {
            icon.classList.remove('fa-circle-play', 'fa-regular');
            icon.classList.add('fa-pause', 'fa-solid');
        } else {
            icon.classList.remove('fa-pause', 'fa-solid');
            icon.classList.add('fa-circle-play', 'fa-regular');
        }
    });
    
    // Liked songs play button icons
    document.querySelectorAll('.liked-song-row').forEach(row => {
        const icon = row.querySelector('.liked-song-play-btn');
        if (!icon) return;
        const isActive = row.classList.contains('playing') && playing;
        if (isActive) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        }
    });
    
    // Volume icon
    updateVolumeIcon();
    updateRepeatIcon();
}

function updateVolumeIcon() {
    if (!audio) return;
    const mainVol = document.querySelector('.fa-volume-high, .fa-volume-low, .fa-volume-xmark');
    if (mainVol) {
        mainVol.classList.remove('fa-volume-high', 'fa-volume-low', 'fa-volume-xmark');
        if (audio.muted || audio.volume === 0) {
            mainVol.classList.add('fa-volume-xmark');
        } else if (audio.volume < 0.5) {
            mainVol.classList.add('fa-volume-low');
        } else {
            mainVol.classList.add('fa-volume-high');
        }
    }
}

function updateRepeatIcon() {
    const redo = document.querySelector('.fa-redo');
    if (!redo) return;
    if (repeatMode === 0) {
        redo.style.color = 'white';
        redo.style.textShadow = 'none';
        redo.removeAttribute('data-mode');
    } else {
        redo.style.color = 'rgb(255, 193, 7)';
        redo.style.textShadow = '0 0 10px rgba(255, 193, 7, 0.5)';
        if (repeatMode === 2) redo.setAttribute('data-mode', '1');
        else redo.removeAttribute('data-mode');
    }
}

// ===== CLICK HANDLER =====

document.addEventListener('click', (e) => {
    const icon = e.target.closest('i');
    if (!icon) return;
    
    e.stopPropagation();
    
    const container = icon.closest('.icon-container');
    const inPopup = icon.closest('.icon-popup');
    const inSongItem = icon.closest('.songItem');
    const inPodcastItem = icon.closest('.podcast-item');
    const inLikedSongRow = icon.closest('.liked-song-row');
    
    // CENTER PLAY BUTTON - TOGGLE PLAY/PAUSE
    if ((icon.classList.contains('fa-circle-play') || icon.classList.contains('fa-pause')) && !inPopup && !inSongItem && !inPodcastItem && !inLikedSongRow) {
        const centerGroup = icon.closest('.center-icons-group');
        if (centerGroup) {
            togglePlayPause();
            return;
        }
    }
    
    // SONG LIST PLAY BUTTON
    if ((icon.classList.contains('fa-circle-play') || icon.classList.contains('fa-pause')) && inSongItem) {
        const src = inSongItem.dataset.src;
        if (currentSongSrc === src && !audio.paused) {
            pauseSong();
        } else {
            playSong(src, inSongItem);
        }
        return;
    }
    
    // PODCAST PLAY BUTTON
    if ((icon.classList.contains('fa-circle-play') || icon.classList.contains('fa-pause')) && inPodcastItem) {
        const src = inPodcastItem.dataset.src;
        if (currentSongSrc === src && !audio.paused) {
            pauseSong();
        } else {
            playSong(src, inPodcastItem);
        }
        return;
    }
    
    // VOLUME - MUTE/UNMUTE
    if ((icon.classList.contains('fa-volume-high') || icon.classList.contains('fa-volume-low') || icon.classList.contains('fa-volume-xmark')) && !inPopup) {
        audio.muted = !audio.muted;
        updateVolumeIcon();
        return;
    }
    
    // VOLUME LOW POPUP
    if (icon.classList.contains('fa-volume-low') && inPopup) {
        audio.volume = Math.max(0, audio.volume - 0.25);
        updateVolumeIcon();
        return;
    }
    
    // VOLUME MUTE POPUP
    if (icon.classList.contains('fa-volume-mute') && inPopup) {
        audio.muted = true;
        audio.volume = 0;
        updateVolumeIcon();
        return;
    }
    
    // REPEAT - CYCLE MODES
    if (icon.classList.contains('fa-redo') && !inPopup) {
        repeatMode = (repeatMode + 1) % 3;
        updateRepeatIcon();
        return;
    }
    
    // REPEAT ALL POPUP
    if (icon.classList.contains('fa-repeat') && inPopup) {
        repeatMode = 1;
        updateRepeatIcon();
        return;
    }
    
    // REPEAT ONE POPUP
    if (icon.classList.contains('fa-repeat-1') && inPopup) {
        repeatMode = 2;
        updateRepeatIcon();
        return;
    }
    
    // BACKWARD - SEEK
    if (icon.classList.contains('fa-backward') && !inPopup) {
        if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
        return;
    }
    
    // STEP BACKWARD POPUP
    if (icon.classList.contains('fa-step-backward') && inPopup) {
        const current = document.querySelector('.songItem.playing');
        if (current && current.previousElementSibling) {
            const prev = current.previousElementSibling;
            if (prev.classList.contains('songItem')) {
                playSong(prev.dataset.src, prev);
            }
        }
        return;
    }
    
    // FAST BACKWARD POPUP
    if (icon.classList.contains('fa-fast-backward') && inPopup) {
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
        return;
    }
    
    // FORWARD - SEEK
    if (icon.classList.contains('fa-forward') && !inPopup) {
        if (audio && audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
        return;
    }
    
    // STEP FORWARD POPUP
    if (icon.classList.contains('fa-step-forward') && inPopup) {
        const current = document.querySelector('.songItem.playing');
        if (current && current.nextElementSibling) {
            const next = current.nextElementSibling;
            if (next.classList.contains('songItem')) {
                playSong(next.dataset.src, next);
            }
        }
        return;
    }
    
    // FAST FORWARD POPUP
    if (icon.classList.contains('fa-fast-forward') && inPopup) {
        if (audio && audio.duration) audio.currentTime = audio.duration - 0.1;
        return;
    }
    
    // LIKE/HEART
    if (icon.classList.contains('fa-heart')) {
        const isLiked = icon.style.color === 'rgb(255, 193, 7)';
        
        // Get currently playing song info
        const playingSongItem = document.querySelector('.songItem.playing, .podcast-item.playing');
        
        if (playingSongItem && currentSongSrc) {
            // Get song details
            const title = playingSongItem.querySelector('span:not(.timestamp)')?.textContent?.trim() || 'Unknown';
            const artist = playingSongItem.closest('.artist-item')?.dataset.artist || 
                          playingSongItem.dataset.artist || 
                          document.querySelector('.artist-item.active .artist-name')?.textContent || 
                          'Unknown';
            const cover = playingSongItem.querySelector('img')?.src || 'cover.jpg';
            
            // Determine type
            const type = currentSongSrc.includes('youtube.com') || currentSongSrc.includes('youtu.be') ? 'youtube' : 'local';
            
            // Toggle favorite
            const nowLiked = musicTracker.toggleFavorite({
                title: title,
                artist: artist,
                cover: cover,
                src: currentSongSrc,
                type: type
            });
            
            // Update icon
            if (nowLiked) {
                icon.style.color = 'rgb(255, 193, 7)';
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
                if (typeof showToast === 'function') {
                    showToast(`❤️ Added "${title}" to Liked Songs`, 'success');
                }
            } else {
                icon.style.color = 'white';
                icon.classList.remove('fa-solid');
                icon.classList.add('fa-regular');
                if (typeof showToast === 'function') {
                    showToast(`💔 Removed "${title}" from Liked Songs`, 'info');
                }
            }
            
            // Update liked songs view if open
            if (document.getElementById('likedSongsView')?.style.display === 'block') {
                loadLikedSongs();
            }
        } else {
            // Simple toggle without tracking if no song is playing
            if (isLiked) {
                icon.style.color = 'white';
                icon.classList.remove('fa-solid');
                icon.classList.add('fa-regular');
            } else {
                icon.style.color = 'rgb(255, 193, 7)';
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
            }
        }
        return;
    }
    
    // HEART CRACK POPUP
    if (icon.classList.contains('fa-heart-crack') && inPopup) {
        const heart = container?.querySelector('i.fa-heart');
        if (heart) {
            heart.style.color = 'white';
            heart.classList.remove('fa-solid');
            heart.classList.add('fa-regular');
        }
        return;
    }
    
    // SHARE - COPY LINK
    if (icon.classList.contains('fa-link') && inPopup) {
        const song = document.querySelector('.songItem.playing');
        const name = song ? song.querySelector('span:nth-child(3)')?.textContent : 'song';
        const link = window.location.href + '#' + name;
        navigator.clipboard.writeText(link).then(() => {
            alert('Link copied: ' + link);
            icon.style.color = 'rgb(255, 193, 7)';
            setTimeout(() => { icon.style.color = 'white'; }, 600);
        });
        return;
    }
    
    // DOWNLOAD
    if (icon.classList.contains('fa-download') && inPopup) {
        if (audio && audio.src) {
            const song = document.querySelector('.songItem.playing');
            const name = song ? song.querySelector('span:nth-child(3)')?.textContent : 'song';
            const a = document.createElement('a');
            a.href = audio.src;
            a.download = name + '.mp3';
            a.click();
        }
        return;
    }
    
    // MAIN ICONS WITH POPUPS - TOGGLE POPUP
    const popup = container?.querySelector('.icon-popup');
    if (popup && !inPopup) {
        container.classList.toggle('open');
        document.querySelectorAll('.icon-container.open').forEach(c => {
            if (c !== container) c.classList.remove('open');
        });
        return;
    }
});

// ===== SONG ITEM ROW CLICK =====

document.querySelectorAll('.songItem').forEach(item => {
    item.addEventListener('click', (e) => {
        if (e.target.closest('i')) return;
        playSong(item.dataset.src, item);
    });
});

// ===== PROGRESS BAR =====

if (audio && progress) {
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        progress.value = (audio.currentTime / audio.duration) * 100;
    });
    
    audio.addEventListener('play', updateIcons);
    audio.addEventListener('pause', updateIcons);
    
    audio.addEventListener('ended', () => {
        if (repeatMode === 2) {
            audio.currentTime = 0;
            audio.play();
        } else if (repeatMode === 1) {
            const current = document.querySelector('.songItem.playing');
            if (current && current.nextElementSibling?.classList.contains('songItem')) {
                playSong(current.nextElementSibling.dataset.src, current.nextElementSibling);
            } else {
                const first = document.querySelector('.songItem');
                if (first) playSong(first.dataset.src, first);
            }
        }
    });
    
    progress.addEventListener('input', () => {
        if (!audio.duration) return;
        audio.currentTime = (progress.value / 100) * audio.duration;
    });
}

// POPUP ANIMATION
document.addEventListener('click', (e) => {
    const popupIcon = e.target.closest('.icon-popup i');
    if (popupIcon) {
        popupIcon.style.transform = 'scale(1.3)';
        setTimeout(() => { popupIcon.style.transform = ''; }, 150);
    }
});

// ===== PODCAST ITEM CLICK HANDLERS =====
document.querySelectorAll('.podcast-item').forEach(item => {
    item.addEventListener('click', (e) => {
        // Don't trigger if clicking the icon itself (handled by main click handler)
        if (e.target.closest('.podcast-play i')) return;
        
        const src = item.dataset.src;
        if (!src) return;
        
        if (currentSongSrc === src && !audio.paused) {
            pauseSong();
        } else {
            playSong(src, item);
        }
    });
});

    
const heading = document.getElementById("songsHeading");
    const dialog = document.getElementById("songsDialog");

    heading.addEventListener("click", () => {
      if (dialog.style.display === "none" || dialog.style.display === "") {
        dialog.style.display = "block"; // show dialog
      } else {
        dialog.style.display = "none"; // hide dialog
      }
    });

    const podcastToggle = document.getElementById('podcastToggle');
const podcastSlidebar = document.getElementById('podcastSlidebar');

podcastToggle.addEventListener('click', () => {
  podcastSlidebar.classList.toggle('active');
  podcastToggle.classList.toggle('active');
});

const artistToggle = document.getElementById('artistToggle');
const artistSlidebar = document.getElementById('artistSlidebar');
const artistSearchContainer = document.getElementById('artistSearchContainer');

artistToggle.addEventListener('click', () => {
  artistSlidebar.classList.toggle('active');
  artistToggle.classList.toggle('active');
  if (artistSearchContainer) {
    if (artistSlidebar.classList.contains('active')) {
      artistSearchContainer.style.display = 'flex';
      setTimeout(() => {
        artistSearchContainer.style.opacity = '1';
        artistSearchContainer.style.transform = 'translateY(0)';
      }, 100);
    } else {
      artistSearchContainer.style.opacity = '0';
      artistSearchContainer.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        artistSearchContainer.style.display = 'none';
      }, 300);
    }
  }
});

// Artist Search Functionality
const artistSearchInput = document.getElementById('artistSearchInput');
if (artistSearchInput) {
    artistSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const artistItems = document.querySelectorAll('.artist-item');
        
        artistItems.forEach(item => {
            const artistName = item.dataset.artist || '';
            
            // If search is empty, show all
            if (searchTerm === '') {
                item.classList.remove('hidden');
                return;
            }
            
            // Check if artist name starts with the search term
            if (artistName.toLowerCase().startsWith(searchTerm)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    });
    
    // Clear search when artist section is closed
    artistToggle.addEventListener('click', () => {
        if (!artistSlidebar.classList.contains('active')) {
            artistSearchInput.value = '';
            document.querySelectorAll('.artist-item').forEach(item => {
                item.classList.remove('hidden');
            });
        }
    });
}

// ===== BACK BUTTON =====
const backButton = document.getElementById('backButton');
if (backButton) {
    backButton.addEventListener('click', () => {
        // Reset to songlist view
        showSonglistView();
        
        // Stop any playing audio
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
        
        // Remove all playing states
        document.querySelectorAll('.songItem').forEach(s => s.classList.remove('playing'));
        document.querySelectorAll('.podcast-item').forEach(p => p.classList.remove('playing'));
        document.querySelectorAll('.artist-song-item').forEach(a => a.classList.remove('playing'));
        document.querySelectorAll('.radio-station-item').forEach(r => r.classList.remove('playing'));
        
        // Reset progress bar
        if (progress) {
            progress.value = 0;
        }
        
        // Update all icons
        updateIcons();
        updateRadioIcons();
        updateArtistSongIcons();
        
        // Scroll songlist to top
        const songlistView = document.getElementById('songlistView');
        if (songlistView) {
            songlistView.scrollTop = 0;
        }
        
        // Reset sidebar to Browse (first item)
        const sidebarItems = document.querySelectorAll('.container-left li');
        sidebarItems.forEach((item, index) => {
            if (index === 0) { // Browse is the first item
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Hide all views except songlist
        const radioView = document.getElementById('radioView');
        const playlistView = document.getElementById('playlistView');
        const playlistDetailView = document.getElementById('playlistDetailView');
        const libraryView = document.getElementById('libraryView');
        const mainContainer = document.querySelector('.container');
        
        if (radioView) radioView.style.display = 'none';
        if (playlistView) playlistView.style.display = 'none';
        if (playlistDetailView) playlistDetailView.style.display = 'none';
        if (libraryView) libraryView.style.display = 'none';
        if (mainContainer) {
            mainContainer.classList.remove('radio-active');
            mainContainer.classList.remove('playlist-active');
        }
        
        currentSongSrc = null;
    });
}

// ===== PODCAST ITEM CLICK - SHOW COVER =====
document.querySelectorAll('.podcast-item').forEach(item => {
    const coverImg = item.querySelector('.podcast-cover');
    const titleEl = item.querySelector('.podcast-title');
    const descEl = item.querySelector('.podcast-description');
    
    // Add click on cover image to show full view
    if (coverImg) {
        coverImg.style.cursor = 'pointer';
        coverImg.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = titleEl ? titleEl.textContent : 'Podcast';
            const description = descEl ? descEl.textContent : '';
            showCoverView(coverImg.src, title, description);
        });
    }
});

// ===== SUGGESTED SONGS CLICK - SHOW COVER =====
const dialogItems = document.querySelectorAll('#songsDialog li');
dialogItems.forEach((item, index) => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
        // Use placeholder cover images - you can customize these
        const covers = [
            'haseen cover.jpg',
            'end of beginning cover.png',
            'dil tu jaan tu cover.jpg',
            'haseen cover.jpg'
        ];
        const title = item.textContent.replace('🎵 ', '');
        showCoverView(covers[index] || covers[0], title, 'Suggested Track');
    });
});

// ===== ARTIST ITEM CLICK - SHOW COVER =====
document.querySelectorAll('.artist-item').forEach((item, index) => {
    item.style.cursor = 'pointer';
    
    // Click on artist name to show cover
    const artistName = item.querySelector('.artist-name');
    if (artistName) {
        artistName.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = artistName.textContent || item.dataset.artist || 'Artist';
            const covers = [
                'haseen cover.jpg',
                'end of beginning cover.png',
                'dil tu jaan tu cover.jpg',
                'haseen cover.jpg',
                'end of beginning cover.png',
                'dil tu jaan tu cover.jpg',
                'haseen cover.jpg',
                'end of beginning cover.png',
                'haseen cover.jpg',
                'end of beginning cover.png',
                'dil tu jaan tu cover.jpg',
                'haseen cover.jpg',
                'end of beginning cover.png',
                'dil tu jaan tu cover.jpg',
                'haseen cover.jpg',
                'end of beginning cover.png'
            ];
            showCoverView(covers[index] || covers[0], name, 'Artist');
        });
    }
});

// ===== ARTIST SONG ITEM CLICK - PLAY SONG =====
document.querySelectorAll('.artist-song-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Check if it's a YouTube link
        const youtubeUrl = item.dataset.youtube;
        const titleEl = item.querySelector('.artist-song-title');
        const title = titleEl ? titleEl.textContent.replace('♫ ', '').trim() : 'Song';
        
        if (youtubeUrl) {
            // Extract video ID and get thumbnail
            let thumbnail = 'haseen cover.jpg';
            const match = youtubeUrl.match(/[?&]v=([^&]+)/);
            if (match) {
                const videoId = match[1];
                thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
            
            // Show cover view with YouTube thumbnail
            showCoverView(thumbnail, title, 'YouTube Song');
            
            // Store YouTube URL in cover display
            const coverDisplayView = document.getElementById('coverDisplayView');
            coverDisplayView.dataset.youtubeUrl = youtubeUrl;
            coverDisplayView.dataset.isYoutube = 'true';
            
            return;
        }
        
        // Otherwise play local file
        const src = item.dataset.src;
        if (!src) return;
        
        // Check if this song is already playing
        if (currentSongSrc === src && !audio.paused) {
            pauseSong();
            updateArtistSongIcons();
        } else {
            // Remove playing class from all
            document.querySelectorAll('.artist-song-item').forEach(s => s.classList.remove('playing'));
            document.querySelectorAll('.songItem').forEach(s => s.classList.remove('playing'));
            document.querySelectorAll('.podcast-item').forEach(p => p.classList.remove('playing'));
            document.querySelectorAll('.radio-station-item').forEach(r => r.classList.remove('playing'));
            
            // Play the song
            playSong(src, item);
            item.classList.add('playing');
            updateArtistSongIcons();
        }
    });
});

// Update artist song icons
function updateArtistSongIcons() {
    const playing = audio && !audio.paused;
    
    document.querySelectorAll('.artist-song-item').forEach(item => {
        const icon = item.querySelector('.artist-song-play');
        if (!icon) return;
        
        const isActive = item.classList.contains('playing') && playing;
        if (isActive) {
            icon.classList.remove('fa-circle-play', 'fa-regular');
            icon.classList.add('fa-pause', 'fa-solid');
        } else {
            icon.classList.remove('fa-pause', 'fa-solid');
            icon.classList.add('fa-circle-play', 'fa-regular');
        }
    });
}

// Update artist song icons when audio plays/pauses
if (audio) {
    audio.addEventListener('play', updateArtistSongIcons);
    audio.addEventListener('pause', updateArtistSongIcons);
}

// ===== NAV PLAYLISTS CLICK HANDLER =====
const navPlaylists = document.getElementById('navPlaylists');
if (navPlaylists) {
    navPlaylists.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Hide all views
        const songlistView = document.getElementById('songlistView');
        const radioView = document.getElementById('radioView');
        const coverView = document.getElementById('coverDisplayView');
        const playlistView = document.getElementById('playlistView');
        const playlistDetailView = document.getElementById('playlistDetailView');
        const mainContainer = document.querySelector('.container');
        
        if (songlistView) songlistView.style.display = 'none';
        if (radioView) radioView.style.display = 'none';
        if (coverView) coverView.style.display = 'none';
        if (playlistDetailView) playlistDetailView.style.display = 'none';
        
        // Remove blur effects
        if (mainContainer) {
            mainContainer.classList.remove('radio-active');
            mainContainer.classList.add('playlist-active');
        }
        
        // Show playlist view
        if (playlistView) {
            playlistView.style.display = 'block';
            loadPlaylists();
        }
        
        // Show back button
        const backButton = document.getElementById('backButton');
        if (backButton) backButton.style.display = 'flex';
    });
}

// ===== SEARCH FUNCTIONALITY =====
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// Build searchable database
function buildSearchDatabase() {
    const database = [];
    
    // Add songs from songlist
    document.querySelectorAll('.songItem').forEach(item => {
        const img = item.querySelector('img');
        const titleSpan = item.querySelector('span:not(.timestamp):not(.song-play-btn)');
        const src = item.dataset.src;
        if (img && titleSpan) {
            database.push({
                title: titleSpan.textContent.trim(),
                type: 'Song',
                cover: img.src,
                src: src,
                element: item
            });
        }
    });
    
    // Add podcasts
    document.querySelectorAll('.podcast-item').forEach(item => {
        const cover = item.querySelector('.podcast-cover');
        const title = item.querySelector('.podcast-title');
        const desc = item.querySelector('.podcast-description');
        const src = item.dataset.src;
        if (cover && title) {
            database.push({
                title: title.textContent.trim(),
                type: 'Podcast',
                description: desc ? desc.textContent.trim() : '',
                cover: cover.src,
                src: src,
                element: item
            });
        }
    });
    
    // Add artists
    document.querySelectorAll('.artist-item').forEach((item, index) => {
        const artistName = item.querySelector('.artist-name');
        const artistImage = item.querySelector('.artist-image');
        const artistSongs = [];
        
        // Get artist data from attributes
        const genre = item.dataset.genre || 'Various';
        const origin = item.dataset.origin || 'International';
        const bio = item.dataset.bio || 'Biography information not available.';
        
        // Collect all songs for this artist
        item.querySelectorAll('.artist-song-item').forEach(songItem => {
            const titleEl = songItem.querySelector('.artist-song-title');
            const youtubeUrl = songItem.dataset.youtube;
            if (titleEl && youtubeUrl) {
                const title = titleEl.textContent.replace('♫ ', '').trim();
                let thumbnail = 'haseen cover.jpg';
                const match = youtubeUrl.match(/[?&]v=([^&]+)/);
                if (match) {
                    const videoId = match[1];
                    thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }
                artistSongs.push({
                    title: title,
                    youtube: youtubeUrl,
                    thumbnail: thumbnail
                });
            }
        });
        
        const covers = [
            'haseen cover.jpg',
            'end of beginning cover.png',
            'dil tu jaan tu cover.jpg',
            'haseen cover.jpg'
        ];
        
        database.push({
            title: artistName ? artistName.textContent.trim() : '',
            type: 'Artist',
            cover: artistImage ? artistImage.src : covers[index] || covers[0],
            element: item,
            songs: artistSongs,
            artistImage: artistImage ? artistImage.src : null,
            genre: genre,
            origin: origin,
            bio: bio
        });
    });
    
    // Add suggested songs
    document.querySelectorAll('#songsDialog li').forEach((item, index) => {
        const covers = [
            'haseen cover.jpg',
            'end of beginning cover.png',
            'dil tu jaan tu cover.jpg',
            'haseen cover.jpg'
        ];
        const title = item.textContent.replace('🎵 ', '').trim();
        database.push({
            title: title,
            type: 'Suggested Song',
            cover: covers[index] || covers[0],
            element: item
        });
    });
    
    // Add artist songs (including YouTube links)
    document.querySelectorAll('.artist-song-item').forEach(item => {
        const titleEl = item.querySelector('.artist-song-title');
        const youtubeUrl = item.dataset.youtube;
        
        if (titleEl) {
            const title = titleEl.textContent.replace('♫ ', '').trim();
            let cover = 'haseen cover.jpg'; // default
            let videoId = null;
            
            // Extract YouTube video ID and get thumbnail
            if (youtubeUrl) {
                const match = youtubeUrl.match(/[?&]v=([^&]+)/);
                if (match) {
                    videoId = match[1];
                    cover = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }
            }
            
            database.push({
                title: title,
                type: youtubeUrl ? 'YouTube Song' : 'Song',
                cover: cover,
                src: item.dataset.src || null,
                youtube: youtubeUrl || null,
                videoId: videoId,
                element: item
            });
        }
    });
    
    return database;
}

// Search function
function performSearch(query) {
    if (!searchResults) return;
    
    if (!query.trim()) {
        searchResults.style.display = 'none';
        searchResults.classList.remove('active');
        return;
    }
    
    const searchDatabase = buildSearchDatabase();
    const lowerQuery = query.toLowerCase();
    const results = searchDatabase.filter(item => 
        item.title.toLowerCase().includes(lowerQuery)
    );
    
    displaySearchResults(results);
}

// Display search results
function displaySearchResults(results) {
    if (!searchResults) return;
    
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="search-no-results">
                <i class="fa-solid fa-face-frown"></i>
                <p>Oops! We don't have what you are looking for</p>
            </div>
        `;
        searchResults.style.display = 'block';
        searchResults.classList.add('active');
        return;
    }
    
    results.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'search-result-item';
        resultDiv.innerHTML = `
            <img src="${result.cover}" alt="${result.title}" class="search-result-icon">
            <div class="search-result-info">
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-type">${result.type}</div>
            </div>
            <button class="song-add-to-playlist" onclick="event.stopPropagation(); showAddToPlaylistModal({name: '${result.title.replace(/'/g, "\\'")}', src: '${result.src ? result.src.replace(/'/g, "\\'") : ''}'})">
                <i class="fa-solid fa-plus"></i>
            </button>
        `;
        
        resultDiv.addEventListener('click', () => {
            // Check if it's an artist - show artist profile
            if (result.type === 'Artist' && result.songs && result.songs.length > 0) {
                showArtistProfile(
                    result.title, 
                    result.artistImage || result.cover, 
                    result.songs,
                    result.genre,
                    result.origin,
                    result.bio
                );
                // Clear search
                if (searchInput) searchInput.value = '';
                searchResults.classList.remove('active');
                searchResults.style.display = 'none';
                return;
            }
            
            // Show cover view with YouTube thumbnail if available
            showCoverView(
                result.cover,
                result.title,
                result.type
            );
            
            // Store YouTube info in cover display for play button
            const coverDisplayView = document.getElementById('coverDisplayView');
            if (result.youtube) {
                coverDisplayView.dataset.youtubeUrl = result.youtube;
                coverDisplayView.dataset.isYoutube = 'true';
            } else {
                delete coverDisplayView.dataset.youtubeUrl;
                delete coverDisplayView.dataset.isYoutube;
                // Play the song if it has a local source
                if (result.src) {
                    playSong(result.src, result.element);
                }
            }
            
            // Clear search
            if (searchInput) searchInput.value = '';
            searchResults.classList.remove('active');
            searchResults.style.display = 'none';
        });
        
        searchResults.appendChild(resultDiv);
    });
    
    searchResults.style.display = 'block';
    searchResults.classList.add('active');
}

// Event listeners for search - only add if elements exist
if (searchInput && searchResults) {
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            performSearch(searchInput.value);
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.remove('active');
            searchResults.style.display = 'none';
        }
    });

    // Prevent closing when clicking inside search results
    searchResults.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}
// ===== RADIO FUNCTIONALITY =====
let currentRadioFilter = 'nearby';
let userLocation = null;

// Radio Browser API endpoint
const RADIO_API_BASE = 'https://de1.api.radio-browser.info/json';

// Get user's geolocation
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocation not supported');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                resolve(userLocation);
            },
            (error) => {
                // Fallback to a default location (India - Delhi)
                userLocation = { lat: 28.6139, lon: 77.2090 };
                resolve(userLocation);
            }
        );
    });
}

// Fetch radio stations based on filter
async function fetchRadioStations(filter, genre = '', city = '') {
    try {
        let url = '';
        let stations = [];
        
        switch(filter) {
            case 'all':
                // Fetch all Indian stations
                url = `${RADIO_API_BASE}/stations/bycountrycodeexact/IN?limit=100&hidebroken=true&order=votes&reverse=true`;
                break;
                
            case 'city':
                // Fetch stations by Indian city
                url = `${RADIO_API_BASE}/stations/bycountrycodeexact/IN?limit=200&hidebroken=true&order=votes&reverse=true`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to fetch radio stations');
                stations = await response.json();
                
                // Filter by city name in station name or state
                const cityLower = city.toLowerCase();
                stations = stations.filter(station => {
                    const name = (station.name || '').toLowerCase();
                    const state = (station.state || '').toLowerCase();
                    return name.includes(cityLower) || state.includes(cityLower);
                });
                
                return stations.filter(station => station.url_resolved).slice(0, 50);
                
            case 'genre':
                if (!genre) return [];
                url = `${RADIO_API_BASE}/stations/bycountrycodeexact/IN?hidebroken=true&order=votes&reverse=true`;
                const genreResponse = await fetch(url);
                if (!genreResponse.ok) throw new Error('Failed to fetch radio stations');
                stations = await genreResponse.json();
                
                // Filter by genre/tag
                const genreLower = genre.toLowerCase();
                stations = stations.filter(station => {
                    const tags = (station.tags || '').toLowerCase();
                    return tags.includes(genreLower);
                });
                
                return stations.filter(station => station.url_resolved).slice(0, 50);
                
            default:
                url = `${RADIO_API_BASE}/stations/bycountrycodeexact/IN?limit=50&hidebroken=true&order=votes&reverse=true`;
        }
        
        if (filter !== 'city' && filter !== 'genre') {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch radio stations');
            stations = await response.json();
        }
        
        return stations.filter(station => station.url_resolved); // Only return stations with valid URLs
        
    } catch (error) {
        // Return empty array on error
        return [];
    }
}

// Display radio stations
function displayRadioStations(stations) {
    const container = document.getElementById('radioStationsContainer');
    if (!container) return;
    
    if (stations.length === 0) {
        container.innerHTML = `
            <div class="radio-no-results">
                <i class="fa-solid fa-radio"></i>
                <p>No radio stations found. Try a different filter!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    stations.forEach(station => {
        const stationDiv = document.createElement('div');
        stationDiv.className = 'radio-station-item';
        stationDiv.dataset.url = station.url_resolved;
        stationDiv.dataset.name = station.name;
        
        const tags = station.tags ? station.tags.split(',').slice(0, 2) : [];
        const tagsHTML = tags.map(tag => 
            `<span class="radio-station-tag">${tag.trim()}</span>`
        ).join('');
        
        const bitrateHTML = station.bitrate ? 
            `<span class="radio-station-bitrate">${station.bitrate} kbps</span>` : '';
        
        // Extract actual location from station data
        let location = '';
        if (station.state && station.state.trim()) {
            location = station.state;
        } else if (station.country) {
            location = station.country;
        } else {
            location = 'India';
        }
        
        // Use station favicon or generate a placeholder with station initial
        const faviconUrl = station.favicon || '';
        const stationInitial = station.name ? station.name.charAt(0).toUpperCase() : 'R';
        const logoHTML = faviconUrl ? 
            `<img src="${faviconUrl}" alt="${station.name}" class="radio-station-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
             <div class="radio-station-logo-fallback" style="display:none;">${stationInitial}</div>` :
            `<div class="radio-station-logo-fallback">${stationInitial}</div>`;
        
        stationDiv.innerHTML = `
            <div class="radio-station-header">
                <div class="radio-station-logo-container">
                    ${logoHTML}
                </div>
                <div class="radio-station-info">
                    <div class="radio-station-name">${station.name}</div>
                    <div class="radio-station-country">
                        <i class="fa-solid fa-location-dot"></i>
                        ${location}
                    </div>
                </div>
                <div class="radio-station-play">
                    <i class="fa-solid fa-play"></i>
                </div>
            </div>
            <div class="radio-station-details">
                ${tagsHTML}
                ${bitrateHTML}
            </div>
        `;
        
        stationDiv.addEventListener('click', () => {
            playRadioStation(station.url_resolved, stationDiv, station.name);
        });
        
        container.appendChild(stationDiv);
    });
}

// Play radio station
function playRadioStation(url, stationElement, stationName) {
    if (!audio || !url) return;
    
    // Remove playing class from all stations
    document.querySelectorAll('.radio-station-item').forEach(s => s.classList.remove('playing'));
    document.querySelectorAll('.songItem').forEach(s => s.classList.remove('playing'));
    document.querySelectorAll('.podcast-item').forEach(p => p.classList.remove('playing'));
    
    // Check if already playing this station
    if (currentSongSrc === url && !audio.paused) {
        pauseSong();
        updateRadioIcons();
        return;
    }
    
    // Reset the audio element to clear any previous state
    audio.pause();
    audio.currentTime = 0;
    
    // Set the new radio stream
    audio.src = url;
    currentSongSrc = url;
    
    // Add playing class to the station
    if (stationElement) {
        stationElement.classList.add('playing');
    }
    
    // Load and play the stream
    audio.load();
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            // Playback started successfully
            console.log('Radio station playing:', stationName);
            updateRadioIcons();
            updateIcons();
        }).catch((error) => {
            console.error('Error playing radio station:', error);
            
            // Remove playing class if failed
            if (stationElement) {
                stationElement.classList.remove('playing');
            }
            
            // Try alternative approach for some streams
            setTimeout(() => {
                audio.play().catch(() => {
                    alert('Unable to play this radio station. The stream may be offline or incompatible. Please try another one.');
                });
            }, 500);
        });
    }
}

// Update radio station icons
function updateRadioIcons() {
    const playing = audio && !audio.paused;
    
    document.querySelectorAll('.radio-station-item').forEach(item => {
        const icon = item.querySelector('.radio-station-play i');
        if (!icon) return;
        
        const isActive = item.classList.contains('playing') && playing;
        if (isActive) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        }
    });
}

// Load radio stations
async function loadRadioStations(filter, genre = '', city = '') {
    const container = document.getElementById('radioStationsContainer');
    if (!container) return;
    
    // Show loading with city name if applicable
    let loadingText = 'Loading radio stations...';
    if (filter === 'city' && city) {
        loadingText = `Loading ${city.charAt(0).toUpperCase() + city.slice(1)} radio stations...`;
    }
    
    container.innerHTML = `
        <div class="radio-loading">
            <i class="fa-solid fa-spinner fa-spin fa-3x" style="color: rgb(255, 193, 7);"></i>
            <p>${loadingText}</p>
        </div>
    `;
    
    currentRadioFilter = filter;
    const stations = await fetchRadioStations(filter, genre, city);
    displayRadioStations(stations);
}

// Initialize radio filters
document.querySelectorAll('.radio-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        const city = btn.dataset.city || '';
        
        // Update active button
        document.querySelectorAll('.radio-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show/hide genre selection
        const genreSelection = document.getElementById('genreSelection');
        if (genreSelection) {
            genreSelection.style.display = filter === 'genre' ? 'block' : 'none';
        }
        
        // Load stations
        if (filter === 'genre') {
            const genreSelect = document.getElementById('genreSelect');
            if (genreSelect && genreSelect.value) {
                loadRadioStations(filter, genreSelect.value, '');
            } else {
                const container = document.getElementById('radioStationsContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="radio-no-results">
                            <i class="fa-solid fa-music"></i>
                            <p>Please select a genre from the dropdown above</p>
                        </div>
                    `;
                }
            }
        } else if (filter === 'city') {
            loadRadioStations(filter, '', city);
        } else {
            loadRadioStations(filter, '', '');
        }
    });
});

// Genre selection change
const genreSelect = document.getElementById('genreSelect');
if (genreSelect) {
    genreSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadRadioStations('genre', e.target.value, '');
        }
    });
}

// Update radio icons when audio plays/pauses
if (audio) {
    audio.addEventListener('play', updateRadioIcons);
    audio.addEventListener('pause', updateRadioIcons);
    
    // Add error handler for radio streams
    audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        
        // Check if it's a radio station (URL contains http/https)
        if (currentSongSrc && (currentSongSrc.includes('http://') || currentSongSrc.includes('https://'))) {
            // Remove playing class from all radio stations
            document.querySelectorAll('.radio-station-item').forEach(s => s.classList.remove('playing'));
            
            const errorMsg = audio.error ? 
                `Error: ${audio.error.message || 'Stream unavailable'}` : 
                'Unable to load radio stream';
            
            console.error('Radio stream error:', errorMsg);
            
            // Don't show alert for every error, just log it
            // The retry mechanism in playRadioStation will handle it
        }
    });
    
    // Add stalled/waiting handlers for radio streams
    audio.addEventListener('stalled', () => {
        console.log('Radio stream stalled, attempting to continue...');
    });
    
    audio.addEventListener('waiting', () => {
        console.log('Radio stream buffering...');
    });
    
    audio.addEventListener('canplay', () => {
        console.log('Radio stream ready to play');
    });
}

// ===== SIDEBAR NAVIGATION =====
const sidebarItems = document.querySelectorAll('.container-left li');
const songlistView = document.getElementById('songlistView');
const radioView = document.getElementById('radioView');
const coverView = document.getElementById('coverDisplayView');
const playlistView = document.getElementById('playlistView');
const libraryViewSidebar = document.getElementById('libraryView');

sidebarItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        // Remove active class from all items
        sidebarItems.forEach(i => i.classList.remove('active'));
        
        // Add active class to clicked item
        item.classList.add('active');
        
        // Hide all views and remove blur
        const mainContainer = document.querySelector('.container');
        if (songlistView) songlistView.style.display = 'none';
        if (radioView) radioView.style.display = 'none';
        if (coverView) coverView.style.display = 'none';
        if (playlistView) playlistView.style.display = 'none';
        if (libraryViewSidebar) libraryViewSidebar.style.display = 'none';
        const likedSongsView = document.getElementById('likedSongsView');
        if (likedSongsView) likedSongsView.style.display = 'none';
        if (mainContainer) {
            mainContainer.classList.remove('radio-active');
            mainContainer.classList.remove('playlist-active');
        }
        
        // Show appropriate view based on clicked item
        const itemText = item.textContent.trim().toLowerCase();
        
        if (itemText === 'create playlist') {
            // Show playlist view with blur effect
            if (playlistView) {
                playlistView.style.display = 'block';
                if (mainContainer) mainContainer.classList.add('playlist-active');
                loadPlaylists();
            }
        } else if (itemText === 'radio') {
            // Show radio view with blur effect
            if (radioView) {
                radioView.style.display = 'block';
                const mainContainer = document.querySelector('.container');
                if (mainContainer) mainContainer.classList.add('radio-active');
                // Load all India stations by default if not already loaded
                if (document.getElementById('radioStationsContainer').children.length === 1 && 
                    document.querySelector('.radio-loading')) {
                    loadRadioStations('all', '', '');
                }
            }
        } else if (itemText === 'your library') {
            // Show library view
            if (libraryViewSidebar) {
                libraryViewSidebar.style.display = 'flex';
                // Initialize library if first time
                if (!libraryViewSidebar.dataset.initialized) {
                    initLibraryView();
                    libraryViewSidebar.dataset.initialized = 'true';
                } else {
                    // Refresh stats when reopening library
                    calculateLibraryStats();
                    displayRecentPlays();
                    generateTopTracks();
                    generateTopArtists();
                    generateListeningStats();
                }
            }
        } else if (itemText === 'liked songs') {
            // Show liked songs view
            console.log('🎵 Sidebar: Liked Songs clicked');
            showLikedSongsView();
        } else {
            // Show songlist view for browse, liked songs, etc.
            if (songlistView) songlistView.style.display = 'block';
        }
    });
});

// ===== PLAYLIST MANAGEMENT SYSTEM =====
let playlists = [];
let currentPlaylistId = null;

// Mood configurations
const moodColors = {
    happy: {
        emoji: '😊',
        color: 'rgba(255, 193, 7, 0.5)',
        gradient: 'linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(30, 30, 30, 0.95))'
    },
    sad: {
        emoji: '😢',
        color: 'rgba(33, 150, 243, 0.5)',
        gradient: 'linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(30, 30, 30, 0.95))'
    },
    energetic: {
        emoji: '⚡',
        color: 'rgba(244, 67, 54, 0.5)',
        gradient: 'linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(30, 30, 30, 0.95))'
    },
    chill: {
        emoji: '😌',
        color: 'rgba(156, 39, 176, 0.5)',
        gradient: 'linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(30, 30, 30, 0.95))'
    },
    romantic: {
        emoji: '❤️',
        color: 'rgba(233, 30, 99, 0.5)',
        gradient: 'linear-gradient(135deg, rgba(233, 30, 99, 0.2), rgba(30, 30, 30, 0.95))'
    }
};

// Load playlists from localStorage
function loadPlaylists() {
    const stored = localStorage.getItem('spotifyPlaylists');
    if (stored) {
        playlists = JSON.parse(stored);
    }
    renderPlaylists();
}

// Save playlists to localStorage
function savePlaylists() {
    localStorage.setItem('spotifyPlaylists', JSON.stringify(playlists));
}

// Render playlists in the grid
function renderPlaylists() {
    const container = document.getElementById('playlistsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (playlists.length === 0) {
        container.innerHTML = `
            <div class="empty-playlists">
                <i class="fa-regular fa-folder-open" style="font-size: 4rem; opacity: 0.3;"></i>
                <p>No playlists yet</p>
                <p style="font-size: 0.9rem;">Create your first playlist to organize your favorite songs</p>
            </div>
        `;
        return;
    }
    
    playlists.forEach(playlist => {
        const mood = moodColors[playlist.mood] || moodColors.happy;
        const card = document.createElement('div');
        card.className = `playlist-card mood-${playlist.mood}`;
        card.onclick = () => openPlaylist(playlist.id);
        
        card.innerHTML = `
            <button class="playlist-card-add-songs" onclick="event.stopPropagation(); showAddSongsToPlaylistModal(${playlist.id})">
                <i class="fa-solid fa-plus"></i>
            </button>
            <div class="playlist-card-icon">${mood.emoji}</div>
            <div class="playlist-card-name">${playlist.name}</div>
            <div class="playlist-card-desc">${playlist.description || 'No description'}</div>
            <div class="playlist-card-stats">
                <span><i class="fa-solid fa-music"></i> ${playlist.songs.length} songs</span>
            </div>
            <div class="playlist-card-mood">${playlist.mood}</div>
        `;
        
        container.appendChild(card);
    });
}

// Create new playlist
function createPlaylist(name, description, mood) {
    const newPlaylist = {
        id: Date.now(),
        name: name,
        description: description,
        mood: mood,
        songs: [],
        createdAt: new Date().toISOString()
    };
    
    playlists.push(newPlaylist);
    savePlaylists();
    renderPlaylists();
    
    return newPlaylist;
}

// Delete playlist
function deletePlaylist(playlistId) {
    if (confirm('Are you sure you want to delete this playlist?')) {
        playlists = playlists.filter(p => p.id !== playlistId);
        savePlaylists();
        closePlaylistDetail();
        renderPlaylists();
    }
}

// Add song to playlist
function addSongToPlaylist(playlistId, songData) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    // Check if song already exists
    const exists = playlist.songs.some(s => s.src === songData.src);
    if (exists) {
        alert('Song already in playlist!');
        return;
    }
    
    playlist.songs.push(songData);
    savePlaylists();
    
    // Refresh if viewing this playlist
    if (currentPlaylistId === playlistId) {
        renderPlaylistDetail(playlistId);
    }
}

// Remove song from playlist
function removeSongFromPlaylist(playlistId, songSrc) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    playlist.songs = playlist.songs.filter(s => s.src !== songSrc);
    savePlaylists();
    renderPlaylistDetail(playlistId);
}

// Open playlist detail view
function openPlaylist(playlistId) {
    currentPlaylistId = playlistId;
    const playlistView = document.getElementById('playlistView');
    const detailView = document.getElementById('playlistDetailView');
    const songlistView = document.getElementById('songlistView');
    const radioView = document.getElementById('radioView');
    const coverView = document.getElementById('coverDisplayView');
    const mainContainer = document.querySelector('.container');
    const backButton = document.getElementById('backButton');
    
    // Hide all other views
    if (songlistView) songlistView.style.display = 'none';
    if (radioView) radioView.style.display = 'none';
    if (coverView) coverView.style.display = 'none';
    if (playlistView) playlistView.style.display = 'none';
    
    // Add blur effect
    if (mainContainer) {
        mainContainer.classList.remove('radio-active');
        mainContainer.classList.add('playlist-active');
    }
    
    // Show playlist detail view
    if (detailView) {
        detailView.style.display = 'block';
        renderPlaylistDetail(playlistId);
    }
    
    // Show back button
    if (backButton) backButton.style.display = 'flex';
}

// Close playlist detail view
function closePlaylistDetail() {
    const playlistView = document.getElementById('playlistView');
    const detailView = document.getElementById('playlistDetailView');
    
    if (playlistView && detailView) {
        detailView.style.display = 'none';
        playlistView.style.display = 'block';
        currentPlaylistId = null;
    }
}

// Render playlist detail view
function renderPlaylistDetail(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const detailInfo = document.querySelector('.playlist-detail-info');
    const songsContainer = document.getElementById('playlistSongsContainer');
    
    if (detailInfo) {
        const mood = moodColors[playlist.mood] || moodColors.happy;
        detailInfo.innerHTML = `
            <h1>${mood.emoji} ${playlist.name}</h1>
            <p>${playlist.description || 'No description'}</p>
            <div class="playlist-detail-stats">
                <button class="btn-play-playlist" onclick="playEntirePlaylist(${playlistId})">
                    <i class="fa-solid fa-play"></i> Play All
                </button>
                <button class="btn-delete-playlist" onclick="deletePlaylist(${playlistId})">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
                <span style="color: rgba(255,255,255,0.7);">
                    <i class="fa-solid fa-music"></i> ${playlist.songs.length} songs
                </span>
            </div>
        `;
    }
    
    if (songsContainer) {
        songsContainer.innerHTML = '';
        
        if (playlist.songs.length === 0) {
            songsContainer.innerHTML = `
                <div class="empty-playlist-songs">
                    <i class="fa-solid fa-music" style="font-size: 3rem; opacity: 0.3;"></i>
                    <p>No songs in this playlist</p>
                    <p style="font-size: 0.9rem;">Add songs from your library</p>
                </div>
            `;
            return;
        }
        
        playlist.songs.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'playlist-song-item';
            
            const isYouTube = song.src && song.src.includes('youtube.com');
            const sourceIcon = isYouTube ? 
                '<i class="fa-brands fa-youtube" style="color: #ff0000;"></i>' : 
                '<i class="fa-solid fa-music"></i>';
            
            songItem.innerHTML = `
                <span style="color: rgba(255,255,255,0.5); font-weight: 700;">${index + 1}</span>
                <div class="playlist-song-info">
                    <div class="playlist-song-name">${song.name}</div>
                    <div class="playlist-song-source">${sourceIcon} ${isYouTube ? 'YouTube' : 'Local'}</div>
                </div>
                <div class="playlist-song-actions">
                    <button class="btn-remove-song" onclick="removeSongFromPlaylist(${playlistId}, '${song.src}')">
                        <i class="fa-solid fa-xmark"></i> Remove
                    </button>
                </div>
            `;
            
            // Play song on click (except on remove button)
            songItem.onclick = (e) => {
                if (!e.target.closest('.btn-remove-song')) {
                    if (isYouTube) {
                        window.open(song.src, '_blank');
                    } else {
                        playSong(song.src, songItem);
                    }
                }
            };
            
            songsContainer.appendChild(songItem);
        });
    }
}

// Play entire playlist
function playEntirePlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || playlist.songs.length === 0) return;
    
    const firstSong = playlist.songs[0];
    
    if (firstSong.src.includes('youtube.com')) {
        // Open first YouTube song
        window.open(firstSong.src, '_blank');
        alert(`Playing ${playlist.name}!\n\nYouTube songs will open in new tabs. ${playlist.songs.length} songs total.`);
    } else {
        // Play first local song
        playSong(firstSong.src);
        alert(`Playing ${playlist.name}!\n${playlist.songs.length} songs in queue.`);
    }
}

// Modal handlers
function showCreatePlaylistModal() {
    const modal = document.getElementById('createPlaylistModal');
    if (modal) modal.style.display = 'flex';
}

function hideCreatePlaylistModal() {
    const modal = document.getElementById('createPlaylistModal');
    if (modal) modal.style.display = 'none';
    
    // Reset form
    document.getElementById('playlistName').value = '';
    document.getElementById('playlistDescription').value = '';
    document.getElementById('playlistMood').value = 'happy';
}

function submitCreatePlaylist() {
    const name = document.getElementById('playlistName').value.trim();
    const description = document.getElementById('playlistDescription').value.trim();
    const mood = document.getElementById('playlistMood').value;
    
    if (!name) {
        alert('Please enter a playlist name');
        return;
    }
    
    createPlaylist(name, description, mood);
    hideCreatePlaylistModal();
}

// Add to playlist modal
let songToAdd = null;

function showAddToPlaylistModal(songData) {
    const modal = document.getElementById('addToPlaylistModal');
    const list = document.getElementById('playlistSelectList');
    
    if (!modal || !list) return;
    
    songToAdd = songData;
    
    // Render playlist selection
    list.innerHTML = '';
    
    if (playlists.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.6);">
                <p>No playlists yet</p>
                <p style="font-size: 0.9rem;">Create a playlist first</p>
            </div>
        `;
    } else {
        playlists.forEach(playlist => {
            const mood = moodColors[playlist.mood] || moodColors.happy;
            const item = document.createElement('div');
            item.className = 'playlist-select-item';
            item.onclick = () => {
                addSongToPlaylist(playlist.id, songToAdd);
                hideAddToPlaylistModal();
            };
            
            item.innerHTML = `
                <i class="fa-solid fa-music"></i>
                <div>
                    <div class="playlist-select-name">${mood.emoji} ${playlist.name}</div>
                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5);">
                        ${playlist.songs.length} songs
                    </div>
                </div>
            `;
            
            list.appendChild(item);
        });
    }
    
    modal.style.display = 'flex';
}

function hideAddToPlaylistModal() {
    const modal = document.getElementById('addToPlaylistModal');
    if (modal) modal.style.display = 'none';
    songToAdd = null;
}

// Add quick-add buttons to existing songs
function addQuickAddButtons() {
    // Add to regular song items
    const songItems = document.querySelectorAll('.songItem');
    
    songItems.forEach(item => {
        // Skip if button already exists
        if (item.querySelector('.song-add-to-playlist')) return;
        
        // Get song name from the span element (third child, after p and img)
        const songNameSpan = item.querySelector('span:nth-child(3)');
        const songName = songNameSpan ? songNameSpan.textContent.trim() : 'Unknown';
        const songSrc = item.getAttribute('data-src');
        
        if (!songSrc) return;
        
        const addBtn = document.createElement('button');
        addBtn.className = 'song-add-to-playlist';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addBtn.title = 'Add to playlist';
        
        addBtn.onclick = (e) => {
            e.stopPropagation();
            showAddToPlaylistModal({
                name: songName,
                src: songSrc
            });
        };
        
        item.appendChild(addBtn);
    });
    
    // Add to artist song items
    const artistSongs = document.querySelectorAll('.artist-song-item');
    
    artistSongs.forEach(item => {
        // Skip if button already exists
        if (item.querySelector('.song-add-to-playlist')) return;
        
        const songName = item.querySelector('.artist-song-title')?.textContent.trim() || 'Unknown';
        const youtubeLink = item.getAttribute('data-youtube');
        
        if (!youtubeLink) return;
        
        const addBtn = document.createElement('button');
        addBtn.className = 'song-add-to-playlist';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addBtn.title = 'Add to playlist';
        addBtn.style.position = 'absolute';
        addBtn.style.right = '10px';
        addBtn.style.top = '50%';
        addBtn.style.transform = 'translateY(-50%)';
        
        addBtn.onclick = (e) => {
            e.stopPropagation();
            showAddToPlaylistModal({
                name: songName,
                src: youtubeLink
            });
        };
        
        item.style.position = 'relative';
        item.appendChild(addBtn);
    });
    
    // Add to podcasts
    addQuickAddButtonsToPodcasts();
}

// Initialize playlist system
// ===== COMPREHENSIVE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all features
    initializeApplication();
});

function initializeApplication() {
    console.log('🎵 Initializing SpotSong Application...');
    
    // Fix song thumbnails
    ensureSongThumbnailsLoad();
    
    // Playlists
    loadPlaylists();
    setTimeout(() => {
        addQuickAddButtons();
    }, 500);
    
    // Playlist buttons
    const createBtn = document.getElementById('btnCreatePlaylist');
    if (createBtn) {
        createBtn.onclick = showCreatePlaylistModal;
    }
    
    const backBtn = document.getElementById('btnBackToPlaylists');
    if (backBtn) {
        backBtn.onclick = closePlaylistDetail;
    }
    
    // Modal close handlers
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
        btn.onclick = () => {
            hideCreatePlaylistModal();
            hideAddToPlaylistModal();
        };
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                hideCreatePlaylistModal();
                hideAddToPlaylistModal();
                hideAddSongsToPlaylistModal();
            }
        };
    });
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });
    
    // Search songs in modal
    const searchSongsInput = document.getElementById('searchSongsInput');
    if (searchSongsInput) {
        searchSongsInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterAvailableSongs(query, 'searchSongsList');
        });
    }
    
    // Library view setup
    setupLibraryView();
    
    // Cover display play button
    setupCoverPlayButton();
    
    // Featured artists grid
    setupFeaturedArtists();
    
    // Artist images
    loadArtistImages();
    
    // Favorites
    addFavoriteButtons();
    setupFavoriteHandlers();
    
    // Library features
    setupLibraryTabs();
    setupMoodZones();
    setupActivitySections();
    setupInsights();
    
    // Discover features
    setupDiscoverFeatures();
}

function setupLibraryView() {
    const libraryBtn = document.querySelector('.container-left ul li:nth-child(3)');
    
    if (libraryBtn) {
        libraryBtn.addEventListener('click', () => {
            document.getElementById('songlistView').style.display = 'none';
            document.getElementById('coverDisplayView').style.display = 'none';
            document.getElementById('playlistView').style.display = 'none';
            document.getElementById('playlistDetailView').style.display = 'none';
            document.getElementById('radioView').style.display = 'none';
            const artistProfileView = document.getElementById('artistProfileView');
            if (artistProfileView) artistProfileView.style.display = 'none';
            
            const libraryView = document.getElementById('libraryView');
            if (libraryView) {
                libraryView.style.display = 'flex';
                
                // Initialize library if first time
                if (!libraryView.dataset.initialized) {
                    initLibraryView();
                    libraryView.dataset.initialized = 'true';
                }
                
                calculateLibraryStats();
                displayRecentPlays();
                
                // Show back button
                const backButton = document.getElementById('backButton');
                if (backButton) backButton.style.display = 'flex';
                
                // Update sidebar active state
                document.querySelectorAll('.container-left ul li').forEach(li => li.classList.remove('active'));
                libraryBtn.classList.add('active');
            }
        });
    }
}

function setupCoverPlayButton() {
    const btnCoverPlay = document.getElementById('btnCoverPlay');
    const coverDisplayView = document.getElementById('coverDisplayView');
    
    if (btnCoverPlay && coverDisplayView) {
        btnCoverPlay.style.display = 'none';
        
        const observer = new MutationObserver(() => {
            if (coverDisplayView.dataset.isYoutube === 'true') {
                btnCoverPlay.style.display = 'inline-flex';
            } else {
                btnCoverPlay.style.display = 'none';
            }
        });
        
        observer.observe(coverDisplayView, { attributes: true, attributeFilter: ['data-is-youtube'] });
        
        btnCoverPlay.addEventListener('click', () => {
            const youtubeUrl = coverDisplayView.dataset.youtubeUrl;
            if (youtubeUrl) {
                window.open(youtubeUrl, '_blank');
            }
        });
    }
}

function setupFeaturedArtists() {
    const mainArtistGrid = document.getElementById('mainArtistGrid');
    
    if (mainArtistGrid) {
        const artistItems = document.querySelectorAll('.artist-item');
        
        artistItems.forEach(artistItem => {
            const artistName = artistItem.querySelector('.artist-name');
            const artistImage = artistItem.querySelector('.artist-image');
            const artistSongs = artistItem.querySelectorAll('.artist-song-item');
            const genre = artistItem.dataset.genre || 'Various';
            const origin = artistItem.dataset.origin || 'International';
            const bio = artistItem.dataset.bio || 'Biography information not available.';
            
            if (artistName && artistImage) {
                const artistCard = document.createElement('div');
                artistCard.className = 'main-artist-card';
                artistCard.dataset.artist = artistItem.dataset.artist;
                
                // Create card with image
                const cardImage = document.createElement('img');
                cardImage.className = 'main-artist-card-image artist-image';
                cardImage.src = artistImage.src;
                cardImage.alt = artistName.textContent;
                cardImage.onerror = function() { this.src = 'haseen cover.jpg'; };
                
                const cardName = document.createElement('div');
                cardName.className = 'main-artist-card-name';
                cardName.textContent = artistName.textContent;
                
                const cardGenre = document.createElement('div');
                cardGenre.className = 'main-artist-card-info';
                cardGenre.textContent = genre;
                
                const cardSongCount = document.createElement('div');
                cardSongCount.className = 'main-artist-card-info';
                cardSongCount.textContent = `${artistSongs.length} songs`;
                
                artistCard.appendChild(cardImage);
                artistCard.appendChild(cardName);
                artistCard.appendChild(cardGenre);
                artistCard.appendChild(cardSongCount);
                
                // Click handler to show artist profile
                artistCard.addEventListener('click', () => {
                    // Collect artist songs data
                    const songs = [];
                    artistSongs.forEach(songItem => {
                        const titleEl = songItem.querySelector('.artist-song-title');
                        const youtubeUrl = songItem.dataset.youtube;
                        if (titleEl && youtubeUrl) {
                            const title = titleEl.textContent.replace('♫ ', '').trim();
                            let thumbnail = 'haseen cover.jpg';
                            const match = youtubeUrl.match(/[?&]v=([^&]+)/);
                            if (match) {
                                const videoId = match[1];
                                thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                            }
                            songs.push({
                                title: title,
                                youtube: youtubeUrl,
                                thumbnail: thumbnail
                            });
                        }
                    });
                    
                    // Show artist profile with all info
                    if (songs.length > 0) {
                        showArtistProfile(artistName.textContent, cardImage.src, songs, genre, origin, bio);
                    }
                });
                
                mainArtistGrid.appendChild(artistCard);
            }
        });
    }
}

async function loadArtistImages() {
    const artistImages = document.querySelectorAll('.artist-image');
    
    if (artistImages.length === 0) {
        console.log('No artist images found to load');
        return;
    }
    
    console.log(`Loading images for ${artistImages.length} artists...`);
    
    artistImages.forEach(img => {
        img.style.opacity = '0.6';
        img.style.transition = 'opacity 0.5s ease';
    });
    
    const artistNames = [];
    const imageElements = [];
    
    artistImages.forEach(img => {
        const artistName = img.alt || img.closest('.artist-item')?.dataset.artist || img.closest('.main-artist-card')?.dataset.artist;
        if (artistName) {
            artistNames.push(artistName);
            imageElements.push(img);
        }
    });
    
    console.log('Artist names:', artistNames);
    
    try {
        const results = await fetchMultipleArtistImages(artistNames);
        console.log('Fetched images:', results);
        
        results.forEach((result, index) => {
            if (result && result.imageUrl && imageElements[index]) {
                console.log(`Setting image for ${result.artistName}: ${result.imageUrl}`);
                imageElements[index].src = result.imageUrl;
                imageElements[index].style.opacity = '1';
            } else {
                console.warn(`No image found for artist at index ${index}`);
                if (imageElements[index]) {
                    imageElements[index].style.opacity = '1';
                }
            }
        });
        
        console.log('Artist images loaded successfully');
    } catch (error) {
        console.error('Error loading artist images:', error);
        artistImages.forEach(img => {
            img.style.opacity = '1';
        });
    }
}

// ===== ADD SONGS TO PLAYLIST MODAL =====
let targetPlaylistId = null;
let allAvailableSongs = [];

// ===== ENSURE SONG THUMBNAILS LOAD =====
function ensureSongThumbnailsLoad() {
    const songImages = document.querySelectorAll('.songItem img, .podcast-cover');
    
    songImages.forEach(img => {
        // Encode spaces in src if needed
        const currentSrc = img.getAttribute('src');
        if (currentSrc && currentSrc.includes(' ')) {
            const encodedSrc = currentSrc.replace(/ /g, '%20');
            img.setAttribute('src', encodedSrc);
        }
        
        // Add loading check
        img.addEventListener('error', function() {
            console.warn(`Failed to load image: ${this.getAttribute('src')}`);
            // Try with spaces first
            const originalSrc = this.getAttribute('src').replace(/%20/g, ' ');
            if (this.src !== originalSrc && !this.dataset.triedOriginal) {
                this.dataset.triedOriginal = 'true';
                this.src = originalSrc;
            } else if (!this.dataset.triedFallback) {
                // Final fallback
                this.dataset.triedFallback = 'true';
                this.src = 'cover.jpg';
            }
        });
        
        // Check if image loaded successfully
        if (img.complete && img.naturalHeight === 0) {
            console.warn(`Image not loaded: ${img.src}`);
            img.src = 'cover.jpg';
        }
    });
    
    console.log(`Checked ${songImages.length} song/podcast thumbnails`);
}

function showAddSongsToPlaylistModal(playlistId) {
    targetPlaylistId = playlistId;
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const modal = document.getElementById('addSongsToPlaylistModal');
    const playlistNameSpan = document.getElementById('targetPlaylistName');
    
    if (playlistNameSpan) {
        const mood = moodColors[playlist.mood] || moodColors.happy;
        playlistNameSpan.textContent = mood.emoji + ' ' + playlist.name;
    }
    
    // Collect all available songs from the page
    collectAllAvailableSongs();
    
    // Show library tab by default
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="library"]').classList.add('active');
    document.getElementById('libraryTab').classList.add('active');
    
    // Render available songs
    renderAvailableSongs('availableSongsList', allAvailableSongs);
    
    // Clear search and YouTube inputs
    const searchInput = document.getElementById('searchSongsInput');
    const youtubeInput = document.getElementById('youtubeUrlInput');
    const songNameInput = document.getElementById('songNameInput');
    if (searchInput) searchInput.value = '';
    if (youtubeInput) youtubeInput.value = '';
    if (songNameInput) songNameInput.value = '';
    
    if (modal) modal.style.display = 'flex';
}

function hideAddSongsToPlaylistModal() {
    const modal = document.getElementById('addSongsToPlaylistModal');
    if (modal) modal.style.display = 'none';
    targetPlaylistId = null;
    allAvailableSongs = [];
}

function collectAllAvailableSongs() {
    allAvailableSongs = [];
    
    // Collect from regular song items
    document.querySelectorAll('.songItem').forEach(item => {
        const songNameSpan = item.querySelector('span:nth-child(3)');
        const songName = songNameSpan ? songNameSpan.textContent.trim() : 'Unknown';
        const songSrc = item.getAttribute('data-src');
        
        if (songSrc) {
            allAvailableSongs.push({
                name: songName,
                src: songSrc,
                type: 'local'
            });
        }
    });
    
    // Collect from artist songs
    document.querySelectorAll('.artist-song-item').forEach(item => {
        const songName = item.querySelector('.artist-song-title')?.textContent.trim() || 'Unknown';
        const youtubeLink = item.getAttribute('data-youtube');
        
        if (youtubeLink) {
            allAvailableSongs.push({
                name: songName,
                src: youtubeLink,
                type: 'youtube'
            });
        }
    });
}

function renderAvailableSongs(containerId, songs) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (songs.length === 0) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">No songs found</p>';
        return;
    }
    
    const playlist = playlists.find(p => p.id === targetPlaylistId);
    
    songs.forEach(song => {
        const item = document.createElement('div');
        item.className = 'available-song-item';
        
        const isInPlaylist = playlist && playlist.songs.some(s => s.src === song.src);
        const sourceIcon = song.type === 'youtube' ? 
            '<i class="fa-brands fa-youtube" style="color: #ff0000;"></i>' : 
            '<i class="fa-solid fa-music"></i>';
        
        item.innerHTML = `
            <div class="available-song-info">
                <div class="available-song-name">${song.name}</div>
                <div class="available-song-source">${sourceIcon} ${song.type === 'youtube' ? 'YouTube' : 'Local'}</div>
            </div>
            <button class="btn-add-song-to-playlist" 
                    onclick="addSongToPlaylistFromModal('${song.src.replace(/'/g, "\\'")}', '${song.name.replace(/'/g, "\\'")}', '${song.type}')"
                    ${isInPlaylist ? 'disabled' : ''}>
                ${isInPlaylist ? 'Added' : '<i class="fa-solid fa-plus"></i> Add'}
            </button>
        `;
        
        container.appendChild(item);
    });
}

function filterAvailableSongs(query, containerId) {
    if (!query) {
        renderAvailableSongs(containerId, allAvailableSongs);
        return;
    }
    
    const filtered = allAvailableSongs.filter(song => 
        song.name.toLowerCase().includes(query)
    );
    
    renderAvailableSongs(containerId, filtered);
}

function addSongToPlaylistFromModal(songSrc, songName, songType) {
    if (!targetPlaylistId) return;
    
    addSongToPlaylist(targetPlaylistId, {
        name: songName,
        src: songSrc
    });
    
    // Re-render the songs list to update button states
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab.id === 'libraryTab') {
        renderAvailableSongs('availableSongsList', allAvailableSongs);
    } else if (activeTab.id === 'searchTab') {
        const searchInput = document.getElementById('searchSongsInput');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        filterAvailableSongs(query, 'searchSongsList');
    }
    
    // Update playlist card display
    renderPlaylists();
}

function addYouTubeSongToPlaylist() {
    if (!targetPlaylistId) return;
    
    const youtubeInput = document.getElementById('youtubeUrlInput');
    const songNameInput = document.getElementById('songNameInput');
    
    const url = youtubeInput ? youtubeInput.value.trim() : '';
    let songName = songNameInput ? songNameInput.value.trim() : '';
    
    if (!url) {
        alert('Please enter a YouTube URL');
        return;
    }
    
    // Basic YouTube URL validation
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        alert('Please enter a valid YouTube URL');
        return;
    }
    
    // Extract song name from URL if not provided
    if (!songName) {
        try {
            const urlObj = new URL(url);
            const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
            songName = `YouTube Song - ${videoId}`;
        } catch {
            songName = 'YouTube Song';
        }
    }
    
    addSongToPlaylist(targetPlaylistId, {
        name: songName,
        src: url
    });
    
    // Clear inputs
    if (youtubeInput) youtubeInput.value = '';
    if (songNameInput) songNameInput.value = '';
    
    // Update display
    renderPlaylists();
    
    alert(`"${songName}" added to playlist!`);
}

// Update the addQuickAddButtons function to work with search results
function updateQuickAddButtonsForSearchResults() {
    setTimeout(() => {
        addQuickAddButtons();
    }, 300);
}

// Add podcast items support
function addQuickAddButtonsToPodcasts() {
    const podcastItems = document.querySelectorAll('.podcast-item');
    
    podcastItems.forEach(item => {
        if (item.querySelector('.song-add-to-playlist')) return;
        
        const podcastName = item.querySelector('span:nth-child(3)')?.textContent.trim() || 'Podcast';
        const podcastSrc = item.getAttribute('data-src');
        
        if (!podcastSrc) return;
        
        const addBtn = document.createElement('button');
        addBtn.className = 'song-add-to-playlist';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addBtn.title = 'Add to playlist';
        
        addBtn.onclick = (e) => {
            e.stopPropagation();
            showAddToPlaylistModal({
                name: podcastName,
                src: podcastSrc
            });
        };
        
        item.appendChild(addBtn);
    });
}


// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ignore if typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey;
    const alt = e.altKey;
    const shift = e.shiftKey;

    // Space - Play/Pause
    if (key === ' ' && !ctrl && !alt) {
        e.preventDefault();
        togglePlayPause();
        return;
    }

    // Ctrl + P - Play/Pause
    if (ctrl && key === 'p') {
        e.preventDefault();
        togglePlayPause();
        return;
    }

    // Ctrl + Right Arrow / Ctrl + N - Next Song
    if ((ctrl && key === 'arrowright') || (ctrl && key === 'n')) {
        e.preventDefault();
        const current = document.querySelector('.songItem.playing, .podcast-item.playing');
        if (current && current.nextElementSibling) {
            const next = current.nextElementSibling;
            if (next.classList.contains('songItem') || next.classList.contains('podcast-item')) {
                playSong(next.dataset.src, next);
            }
        }
        return;
    }

    // Ctrl + Left Arrow / Ctrl + B - Previous Song
    if ((ctrl && key === 'arrowleft') || (ctrl && key === 'b')) {
        e.preventDefault();
        const current = document.querySelector('.songItem.playing, .podcast-item.playing');
        if (current && current.previousElementSibling) {
            const prev = current.previousElementSibling;
            if (prev.classList.contains('songItem') || prev.classList.contains('podcast-item')) {
                playSong(prev.dataset.src, prev);
            }
        }
        return;
    }

    // Arrow Up - Volume Up
    if (key === 'arrowup' && !ctrl && !alt) {
        e.preventDefault();
        if (audio) {
            audio.volume = Math.min(1, audio.volume + 0.1);
            updateVolumeIcon();
        }
        return;
    }

    // Arrow Down - Volume Down
    if (key === 'arrowdown' && !ctrl && !alt) {
        e.preventDefault();
        if (audio) {
            audio.volume = Math.max(0, audio.volume - 0.1);
            updateVolumeIcon();
        }
        return;
    }

    // Arrow Right - Seek Forward 10s
    if (key === 'arrowright' && !ctrl && !alt) {
        e.preventDefault();
        if (audio && audio.duration) {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
        }
        return;
    }

    // Arrow Left - Seek Backward 10s
    if (key === 'arrowleft' && !ctrl && !alt) {
        e.preventDefault();
        if (audio) {
            audio.currentTime = Math.max(0, audio.currentTime - 10);
        }
        return;
    }

    // Ctrl + M / M - Mute/Unmute
    if ((ctrl && key === 'm') || (!ctrl && key === 'm' && !alt)) {
        e.preventDefault();
        if (audio) {
            audio.muted = !audio.muted;
            updateVolumeIcon();
        }
        return;
    }

    // Ctrl + R / R - Toggle Repeat Mode
    if ((ctrl && key === 'r') || (!ctrl && key === 'r' && !alt)) {
        e.preventDefault();
        repeatMode = (repeatMode + 1) % 3;
        updateRepeatIcon();
        return;
    }

    // Ctrl + S / S - Shuffle (if implemented)
    if ((ctrl && key === 's') || (!ctrl && key === 's' && !alt)) {
        e.preventDefault();
        // Add shuffle functionality here if needed
        return;
    }

    // Ctrl + L / L - Like/Unlike current song
    if ((ctrl && key === 'l') || (!ctrl && key === 'l' && !alt)) {
        e.preventDefault();
        const heartIcon = document.querySelector('.center-icons-group .fa-heart');
        if (heartIcon) {
            heartIcon.click();
        }
        return;
    }

    // F1 - Show/Hide Playlists
    if (key === 'f1') {
        e.preventDefault();
        document.getElementById('navPlaylists')?.click();
        return;
    }

    // F2 - Show Radio
    if (key === 'f2') {
        e.preventDefault();
        const radioBtn = document.querySelector('.container-left ul li:nth-child(2)');
        if (radioBtn) radioBtn.click();
        return;
    }

    // F3 - Focus Search
    if (key === 'f3') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
        return;
    }

    // F5 - Refresh (allow default browser behavior)
    // F11 - Fullscreen (allow default browser behavior)
    // F12 - DevTools (allow default browser behavior)

    // Escape - Close modals / Go back
    if (key === 'escape') {
        const activeModal = document.querySelector('.modal-overlay[style*="display: block"], .modal-overlay[style*="display: flex"]');
        if (activeModal) {
            activeModal.querySelector('.modal-close')?.click();
            return;
        }
        
        const backButton = document.getElementById('backButton');
        if (backButton && backButton.style.display !== 'none') {
            backButton.click();
            return;
        }
    }

    // Ctrl + Home - Jump to start
    if (ctrl && key === 'home') {
        e.preventDefault();
        if (audio) audio.currentTime = 0;
        return;
    }

    // Ctrl + End - Jump to end
    if (ctrl && key === 'end') {
        e.preventDefault();
        if (audio && audio.duration) {
            audio.currentTime = audio.duration - 0.1;
        }
        return;
    }

    // Number keys 1-9 - Jump to percentage of song
    if (!ctrl && !alt && key >= '1' && key <= '9') {
        e.preventDefault();
        if (audio && audio.duration) {
            const percent = parseInt(key) * 0.1;
            audio.currentTime = audio.duration * percent;
        }
        return;
    }

    // 0 - Jump to start
    if (!ctrl && !alt && key === '0') {
        e.preventDefault();
        if (audio) audio.currentTime = 0;
        return;
    }

    // + or = - Increase volume
    if (key === '+' || key === '=') {
        e.preventDefault();
        if (audio) {
            audio.volume = Math.min(1, audio.volume + 0.05);
            updateVolumeIcon();
        }
        return;
    }

    // - or _ - Decrease volume
    if (key === '-' || key === '_') {
        e.preventDefault();
        if (audio) {
            audio.volume = Math.max(0, audio.volume - 0.05);
            updateVolumeIcon();
        }
        return;
    }
});

// Keyboard shortcuts available:
// Playback: Space/Ctrl+P (Play/Pause), Ctrl+N/Ctrl+→ (Next), Ctrl+B/Ctrl+← (Previous), →/← (Seek), 0-9 (Jump to position)
// Volume: ↑/↓ (Volume), +/- (Fine volume), M/Ctrl+M (Mute)
// Controls: R/Ctrl+R (Repeat), L/Ctrl+L (Like), S/Ctrl+S (Shuffle)
// Navigation: F1 (Playlists), F2 (Radio), F3 (Search), Esc (Back)

// ===== LIBRARY VIEW FUNCTIONALITY =====

// Library Data Storage
const libraryData = {
    totalSongs: 0,
    totalTime: 0,
    favorites: 0,
    streak: 0,
    recentSongs: [],
    playHistory: {},
    listeningPatterns: []
};

// Initialize Library View
function initLibraryView() {
    // Calculate library stats using real data from tracker
    calculateLibraryStats();
    
    // Setup tab switching
    setupLibraryTabs();
    
    // Setup mood zones
    setupMoodZones();
    
    // Setup activity sections
    setupActivitySections();
    
    // Setup insights
    setupInsights();
    
    // Setup discover features
    setupDiscoverFeatures();
    
    // Generate listening heatmap
    generateListeningHeatmap();
    
    // Display recent plays
    displayRecentPlays();
}

// Calculate Library Statistics with Real Data
function calculateLibraryStats() {
    const stats = musicTracker.getStats();
    
    // Count total songs including YouTube and local
    const localSongs = document.querySelectorAll('.songItem').length;
    const youtubeSongs = Array.from(document.querySelectorAll('.artist-item')).reduce((count, artist) => {
        return count + artist.querySelectorAll('.artist-song-item').length;
    }, 0);
    
    const totalAvailable = localSongs + youtubeSongs;
    const totalPlayed = stats.totalSongs || 0;
    
    // Show played songs vs available
    document.getElementById('totalSongs').textContent = totalPlayed > 0 ? 
        `${totalPlayed} / ${totalAvailable}` : totalAvailable;
    document.getElementById('totalTime').textContent = stats.totalTime;
    document.getElementById('favoritesCount').textContent = stats.favoritesCount;
    document.getElementById('streakDays').textContent = stats.streak;
}

// Display Recent Plays
function displayRecentPlays() {
    const recentList = document.getElementById('recentSongsList');
    if (!recentList) return;
    
    const stats = musicTracker.getStats();
    const recentPlays = stats.recentPlays;
    
    if (recentPlays.length === 0) {
        recentList.innerHTML = '<p class="empty-message">No songs played yet</p>';
        return;
    }
    
    recentList.innerHTML = recentPlays.map(play => `
        <div class="recent-song-item" data-type="${play.type || 'song'}" data-title="${play.title}" data-artist="${play.artist}">
            <img src="${play.cover}" alt="${play.title}" class="recent-song-cover" onerror="this.src='haseen cover.jpg'">
            <div class="recent-song-info">
                <div class="recent-song-title">${play.title}</div>
                <div class="recent-song-artist">${play.artist}</div>
            </div>
            <div class="recent-song-time">${getTimeAgo(play.timestamp)}</div>
        </div>
    `).join('');
    
    // Add click handlers to replay songs
    document.querySelectorAll('.recent-song-item').forEach(item => {
        item.addEventListener('click', () => {
            const title = item.dataset.title;
            const artist = item.dataset.artist;
            const type = item.dataset.type;
            
            // Find and play the song
            if (type === 'youtube') {
                // Search for the YouTube song in artist profiles
                const artistItems = document.querySelectorAll('.artist-item');
                for (const artistItem of artistItems) {
                    if (artistItem.dataset.artist?.toLowerCase() === artist.toLowerCase()) {
                        artistItem.click(); // Open artist profile
                        setTimeout(() => {
                            // Find the song in the profile
                            const songItems = document.querySelectorAll('.artist-profile-song-item');
                            for (const songItem of songItems) {
                                if (songItem.textContent.includes(title)) {
                                    songItem.click();
                                    break;
                                }
                            }
                        }, 100);
                        break;
                    }
                }
            } else {
                // Find local song
                const songItems = document.querySelectorAll('.songItem');
                for (const song of songItems) {
                    const songName = song.querySelector('.songName')?.textContent;
                    if (songName === title) {
                        playSong(song.dataset.src, song);
                        break;
                    }
                }
            }
        });
    });
}

// Time ago helper
function getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

// Setup Library Tabs
function setupLibraryTabs() {
    const tabs = document.querySelectorAll('.library-tab');
    const contents = document.querySelectorAll('.library-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(`${targetTab}Tab`).classList.add('active');
        });
    });
}

// Setup Mood Zones
function setupMoodZones() {
    const moodZones = document.querySelectorAll('.mood-zone');
    
    moodZones.forEach(zone => {
        const browseBtn = zone.querySelector('.btn-mood-browse');
        if (browseBtn) {
            browseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const mood = zone.dataset.mood;
                const icon = zone.querySelector('.mood-icon').textContent;
                const title = zone.querySelector('h3').textContent;
                const description = zone.querySelector('p').textContent;
                showMoodPlaylist(mood, icon, title, description);
            });
        }
    });
    
    // Back button
    const backBtn = document.getElementById('btnBackToMoods');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('moodPlaylistView').style.display = 'none';
            document.getElementById('moodZonesGrid').style.display = 'grid';
        });
    }
    
    // Shuffle button
    const shuffleBtn = document.getElementById('btnShuffleMood');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            const songs = document.querySelectorAll('#moodSongsList .mood-song-item');
            if (songs.length > 0) {
                const randomIndex = Math.floor(Math.random() * songs.length);
                songs[randomIndex].click();
            }
        });
    }
}

function showMoodPlaylist(mood, icon, title, description) {
    // Hide grid, show playlist view
    document.getElementById('moodZonesGrid').style.display = 'none';
    document.getElementById('moodPlaylistView').style.display = 'block';
    
    // Update header
    document.getElementById('moodPlaylistIcon').textContent = icon;
    document.getElementById('moodPlaylistTitle').textContent = title;
    document.getElementById('moodPlaylistDescription').textContent = description;
    
    // Get all songs matching this mood
    const matchedSongs = getMoodMatchingSongs(mood);
    
    // Update stats
    document.getElementById('moodSongCount').textContent = `${matchedSongs.length} songs`;
    document.getElementById('moodMixType').textContent = 'Local + YouTube';
    
    // Display songs
    const songsList = document.getElementById('moodSongsList');
    
    if (matchedSongs.length === 0) {
        songsList.innerHTML = '<p class="empty-message">No songs match this mood yet. Try adding more music!</p>';
        return;
    }
    
    songsList.innerHTML = matchedSongs.map((song, index) => `
        <div class="mood-song-item" data-type="${song.type}" data-src="${song.src || ''}" data-youtube="${song.youtube || ''}" data-artist="${song.artist}">
            <span class="mood-song-number">${index + 1}</span>
            <img src="${song.cover}" alt="${song.title}" class="mood-song-cover" onerror="this.src='haseen cover.jpg'">
            <div class="mood-song-info">
                <div class="mood-song-title">${song.title}</div>
                <div class="mood-song-artist">${song.artist}</div>
            </div>
            <div class="mood-song-type">
                ${song.type === 'youtube' ? '<i class="fa-brands fa-youtube" style="color: #FF0000;"></i>' : '<i class="fa-solid fa-music" style="color: rgb(255, 193, 7);"></i>'}
            </div>
            <button class="mood-song-play">
                <i class="fa-solid fa-play"></i>
            </button>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.mood-song-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            const src = item.dataset.src;
            const youtube = item.dataset.youtube;
            const artist = item.dataset.artist;
            const title = item.querySelector('.mood-song-title').textContent;
            const cover = item.querySelector('.mood-song-cover').src;
            
            if (type === 'youtube') {
                // Track and open YouTube
                musicTracker.trackPlay({
                    title: title,
                    artist: artist,
                    cover: cover,
                    type: 'youtube',
                    genre: mood,
                    duration: 0
                });
                window.open(youtube, '_blank');
                showNotification(`▶️ Playing: ${title}`);
            } else {
                // Play local song
                const songElement = document.querySelector(`.songItem[data-src="${src}"]`);
                if (songElement) {
                    playSong(src, songElement);
                }
            }
        });
    });
}

function getMoodMatchingSongs(mood) {
    const songs = [];
    
    // Mood to keyword mapping
    const moodKeywords = {
        'energetic': ['party', 'dance', 'upbeat', 'energy', 'fast', 'badshah', 'neha kakkar', 'diljit'],
        'focus': ['calm', 'instrumental', 'focus', 'study', 'ambient', 'classical'],
        'chill': ['chill', 'relax', 'slow', 'peaceful', 'acoustic', 'lofi'],
        'workout': ['gym', 'workout', 'fitness', 'energy', 'motivation', 'fast'],
        'sleep': ['sleep', 'calm', 'slow', 'peaceful', 'soothing', 'lullaby'],
        'happy': ['happy', 'upbeat', 'cheerful', 'fun', 'pop', 'party'],
        'romantic': ['love', 'romantic', 'ballad', 'soft', 'arijit', 'atif', 'shreya'],
        'party': ['party', 'dance', 'club', 'dj', 'upbeat', 'badshah', 'neha']
    };
    
    const keywords = moodKeywords[mood.toLowerCase()] || [];
    
    // Get local songs
    const songItems = document.querySelectorAll('.songItem');
    songItems.forEach(item => {
        const artistItem = item.closest('.artist-item');
        if (artistItem) {
            const genre = (artistItem.dataset.genre || '').toLowerCase();
            const artist = (artistItem.dataset.artist || '').toLowerCase();
            const songName = item.querySelector('.songName')?.textContent || '';
            
            const matches = keywords.some(keyword => 
                genre.includes(keyword) || 
                artist.includes(keyword) || 
                songName.toLowerCase().includes(keyword)
            );
            
            if (matches || keywords.length === 0) {
                songs.push({
                    title: songName,
                    artist: artistItem.dataset.artist || 'Unknown',
                    cover: item.querySelector('img')?.src || 'haseen cover.jpg',
                    src: item.dataset.src,
                    type: 'local'
                });
            }
        }
    });
    
    // Get YouTube songs from artist profiles
    const artistItems = document.querySelectorAll('.artist-item');
    artistItems.forEach(artistItem => {
        const genre = (artistItem.dataset.genre || '').toLowerCase();
        const artist = (artistItem.dataset.artist || '');
        const artistLower = artist.toLowerCase();
        
        const artistMatches = keywords.some(keyword => 
            genre.includes(keyword) || artistLower.includes(keyword)
        );
        
        if (artistMatches || keywords.length === 0) {
            const youtubeSongs = artistItem.querySelectorAll('.artist-song-item');
            youtubeSongs.forEach(songItem => {
                const titleEl = songItem.querySelector('.artist-song-title');
                const youtubeUrl = songItem.dataset.youtube;
                
                if (titleEl && youtubeUrl) {
                    const title = titleEl.textContent.replace('♫ ', '').trim();
                    let thumbnail = 'haseen cover.jpg';
                    const match = youtubeUrl.match(/[?&]v=([^&]+)/);
                    if (match) {
                        const videoId = match[1];
                        thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }
                    
                    songs.push({
                        title: title,
                        artist: artist,
                        cover: thumbnail,
                        youtube: youtubeUrl,
                        type: 'youtube'
                    });
                }
            });
        }
    });
    
    // Shuffle for variety
    return songs.sort(() => Math.random() - 0.5);
}

function playMoodPlaylist(mood) {
    // This is now just a helper for old code
    const matchedSongs = getMoodMatchingSongs(mood);
    if (matchedSongs.length > 0) {
        const randomSong = matchedSongs[Math.floor(Math.random() * matchedSongs.length)];
        
        if (randomSong.type === 'youtube') {
            musicTracker.trackPlay({
                title: randomSong.title,
                artist: randomSong.artist,
                cover: randomSong.cover,
                type: 'youtube',
                genre: mood,
                duration: 0
            });
            window.open(randomSong.youtube, '_blank');
            showNotification(`▶️ Playing ${mood} mood: ${randomSong.title}`);
        } else {
            const songElement = document.querySelector(`.songItem[data-src="${randomSong.src}"]`);
            if (songElement) {
                playSong(randomSong.src, songElement);
            }
        }
    }
}

// Setup Activity Sections
function setupActivitySections() {
    // Time slots
    const timeSlots = document.querySelectorAll('.time-slot');
    timeSlots.forEach(slot => {
        slot.addEventListener('click', () => {
            const time = slot.dataset.time;
            const emoji = slot.querySelector('.time-emoji').textContent;
            const text = slot.querySelector('span:last-child').textContent;
            showActivityPlaylist(time, emoji, text, 'Perfect music for this time of day');
        });
    });
    
    // Weather moods
    const weatherMoods = document.querySelectorAll('.weather-mood');
    weatherMoods.forEach(mood => {
        mood.addEventListener('click', () => {
            const weather = mood.dataset.weather;
            const emoji = mood.querySelector('.weather-emoji')?.textContent || '🌤️';
            const text = mood.textContent;
            showActivityPlaylist(weather, emoji, text, 'Songs matching this weather');
        });
    });
    
    // Back button
    const backBtn = document.getElementById('btnBackToActivities');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('activityPlaylistView').style.display = 'none';
            document.getElementById('activitySectionsGrid').style.display = 'flex';
        });
    }
    
    // Shuffle button
    const shuffleBtn = document.getElementById('btnShuffleActivity');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            const songs = document.querySelectorAll('#activitySongsList .mood-song-item');
            if (songs.length > 0) {
                const randomIndex = Math.floor(Math.random() * songs.length);
                songs[randomIndex].click();
            }
        });
    }
}

function showActivityPlaylist(activity, icon, title, description) {
    // Hide grid, show playlist view
    document.getElementById('activitySectionsGrid').style.display = 'none';
    document.getElementById('activityPlaylistView').style.display = 'block';
    
    // Update header
    document.getElementById('activityPlaylistIcon').textContent = icon;
    document.getElementById('activityPlaylistTitle').textContent = title;
    document.getElementById('activityPlaylistDescription').textContent = description;
    
    // Get matching songs based on activity/time
    const matchedSongs = getActivityMatchingSongs(activity);
    
    // Update stats
    document.getElementById('activitySongCount').textContent = `${matchedSongs.length} songs`;
    
    // Display songs
    const songsList = document.getElementById('activitySongsList');
    
    if (matchedSongs.length === 0) {
        songsList.innerHTML = '<p class="empty-message">No songs found for this activity yet!</p>';
        return;
    }
    
    songsList.innerHTML = matchedSongs.map((song, index) => `
        <div class="mood-song-item" data-type="${song.type}" data-src="${song.src || ''}" data-youtube="${song.youtube || ''}" data-artist="${song.artist}">
            <span class="mood-song-number">${index + 1}</span>
            <img src="${song.cover}" alt="${song.title}" class="mood-song-cover" onerror="this.src='haseen cover.jpg'">
            <div class="mood-song-info">
                <div class="mood-song-title">${song.title}</div>
                <div class="mood-song-artist">${song.artist}</div>
            </div>
            <div class="mood-song-type">
                ${song.type === 'youtube' ? '<i class="fa-brands fa-youtube" style="color: #FF0000;"></i>' : '<i class="fa-solid fa-music" style="color: rgb(255, 193, 7);"></i>'}
            </div>
            <button class="mood-song-play">
                <i class="fa-solid fa-play"></i>
            </button>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('#activitySongsList .mood-song-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            const src = item.dataset.src;
            const youtube = item.dataset.youtube;
            const artist = item.dataset.artist;
            const title = item.querySelector('.mood-song-title').textContent;
            const cover = item.querySelector('.mood-song-cover').src;
            
            if (type === 'youtube') {
                musicTracker.trackPlay({
                    title: title,
                    artist: artist,
                    cover: cover,
                    type: 'youtube',
                    genre: activity,
                    duration: 0
                });
                window.open(youtube, '_blank');
                showNotification(`▶️ Playing: ${title}`);
            } else {
                const songElement = document.querySelector(`.songItem[data-src="${src}"]`);
                if (songElement) {
                    playSong(src, songElement);
                }
            }
        });
    });
}

function getActivityMatchingSongs(activity) {
    const songs = [];
    
    // Activity to mood/time mapping
    const activityKeywords = {
        'morning': ['energetic', 'happy', 'upbeat', 'fresh', 'pop'],
        'afternoon': ['focus', 'work', 'calm', 'productive'],
        'evening': ['chill', 'relax', 'calm', 'peaceful'],
        'night': ['romantic', 'slow', 'calm', 'soft', 'ballad'],
        'rainy': ['romantic', 'calm', 'melancholic', 'slow'],
        'sunny': ['happy', 'energetic', 'party', 'dance'],
        'workout': ['energy', 'fast', 'gym', 'motivation'],
        'study': ['focus', 'calm', 'instrumental', 'peaceful']
    };
    
    const keywords = activityKeywords[activity.toLowerCase()] || [];
    
    // Get all songs (local + YouTube) - use similar logic as mood
    const songItems = document.querySelectorAll('.songItem');
    songItems.forEach(item => {
        const artistItem = item.closest('.artist-item');
        if (artistItem) {
            const genre = (artistItem.dataset.genre || '').toLowerCase();
            const artist = (artistItem.dataset.artist || '').toLowerCase();
            const songName = item.querySelector('.songName')?.textContent || '';
            
            const matches = keywords.length === 0 || keywords.some(keyword => 
                genre.includes(keyword) || artist.includes(keyword) || songName.toLowerCase().includes(keyword)
            );
            
            if (matches) {
                songs.push({
                    title: songName,
                    artist: artistItem.dataset.artist || 'Unknown',
                    cover: item.querySelector('img')?.src || 'haseen cover.jpg',
                    src: item.dataset.src,
                    type: 'local'
                });
            }
        }
    });
    
    // Get YouTube songs
    const artistItems = document.querySelectorAll('.artist-item');
    artistItems.forEach(artistItem => {
        const genre = (artistItem.dataset.genre || '').toLowerCase();
        const artist = (artistItem.dataset.artist || '');
        
        const matches = keywords.length === 0 || keywords.some(keyword => genre.includes(keyword));
        
        if (matches) {
            const youtubeSongs = artistItem.querySelectorAll('.artist-song-item');
            youtubeSongs.forEach(songItem => {
                const titleEl = songItem.querySelector('.artist-song-title');
                const youtubeUrl = songItem.dataset.youtube;
                
                if (titleEl && youtubeUrl) {
                    const title = titleEl.textContent.replace('♫ ', '').trim();
                    let thumbnail = 'haseen cover.jpg';
                    const match = youtubeUrl.match(/[?&]v=([^&]+)/);
                    if (match) {
                        thumbnail = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
                    }
                    
                    songs.push({
                        title: title,
                        artist: artist,
                        cover: thumbnail,
                        youtube: youtubeUrl,
                        type: 'youtube'
                    });
                }
            });
        }
    });
    
    return songs.sort(() => Math.random() - 0.5);
}

function playActivityMusic(activity) {
    const matchedSongs = getActivityMatchingSongs(activity);
    if (matchedSongs.length > 0) {
        const randomSong = matchedSongs[Math.floor(Math.random() * matchedSongs.length)];
        
        if (randomSong.type === 'youtube') {
            musicTracker.trackPlay({
                title: randomSong.title,
                artist: randomSong.artist,
                cover: randomSong.cover,
                type: 'youtube',
                genre: activity,
                duration: 0
            });
            window.open(randomSong.youtube, '_blank');
            showNotification(`▶️ Playing: ${randomSong.title}`);
        } else {
            const songElement = document.querySelector(`.songItem[data-src="${randomSong.src}"]`);
            if (songElement) {
                playSong(randomSong.src, songElement);
            }
        }
    }
}

// Show notification helper
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'music-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.95), rgba(218, 165, 32, 0.95));
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 8px 24px rgba(255, 193, 7, 0.4);
        animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Setup Insights
function setupInsights() {
    // Generate insights with real data from tracker
    generateTopTracks();
    generateTopArtists();
    generateListeningStats();
    generateHiddenGems();
    updateMusicDNA();
}

function generateTopTracks() {
    const topTracksList = document.getElementById('topTracksList');
    if (!topTracksList) return;
    
    const stats = musicTracker.getStats();
    const recentPlays = stats.recentPlays;
    
    if (recentPlays.length === 0) {
        topTracksList.innerHTML = '<p class="empty-message">Start listening to see your top tracks!</p>';
        return;
    }
    
    // Count plays per track
    const trackCounts = {};
    recentPlays.forEach(play => {
        const key = `${play.title}-${play.artist}`;
        if (!trackCounts[key]) {
            trackCounts[key] = { title: play.title, artist: play.artist, cover: play.cover, count: 0 };
        }
        trackCounts[key].count++;
    });
    
    // Sort and get top 5
    const topTracks = Object.values(trackCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    topTracksList.innerHTML = topTracks.map((track, index) => `
        <div class="top-track">
            <span class="track-rank">#${index + 1}</span>
            <img src="${track.cover}" alt="${track.title}" class="track-thumb" onerror="this.src='haseen cover.jpg'">
            <div class="track-details">
                <div class="track-name">${track.title}</div>
                <div class="track-artist">${track.artist}</div>
            </div>
            <span class="track-plays">${track.count} ${track.count === 1 ? 'play' : 'plays'}</span>
        </div>
    `).join('');
}

function generateTopArtists() {
    const stats = musicTracker.getStats();
    const topArtistsContainer = document.getElementById('topArtistsChart');
    
    if (!topArtistsContainer) return;
    
    if (stats.topArtists.length === 0) {
        topArtistsContainer.innerHTML = '<p class="empty-message">Start listening to see your top artists!</p>';
        return;
    }
    
    const maxPlays = Math.max(...stats.topArtists.map(a => a[1]));
    
    topArtistsContainer.innerHTML = stats.topArtists.map(([artist, plays]) => {
        const percentage = (plays / maxPlays) * 100;
        return `
            <div class="artist-stat">
                <div class="artist-stat-name">${artist}</div>
                <div class="artist-stat-bar-container">
                    <div class="artist-stat-bar" style="width: ${percentage}%"></div>
                </div>
                <div class="artist-stat-plays">${plays} ${plays === 1 ? 'play' : 'plays'}</div>
            </div>
        `;
    }).join('');
}

function generateListeningStats() {
    const stats = musicTracker.getStats();
    const listeningHeatmap = document.getElementById('listeningHeatmap');
    
    if (!listeningHeatmap) return;
    
    const hours = Object.keys(stats.listeningPatterns).length;
    
    if (hours === 0) {
        listeningHeatmap.innerHTML = '<p class="empty-message">Start listening to see your patterns!</p>';
        return;
    }
    
    const maxPlays = Math.max(...Object.values(stats.listeningPatterns));
    
    listeningHeatmap.innerHTML = Array.from({ length: 24 }, (_, hour) => {
        const plays = stats.listeningPatterns[hour] || 0;
        const intensity = maxPlays > 0 ? (plays / maxPlays) * 100 : 0;
        const timeLabel = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        
        return `
            <div class="heatmap-hour" title="${timeLabel}: ${plays} ${plays === 1 ? 'play' : 'plays'}">
                <div class="heatmap-bar" style="height: ${intensity}%; background: rgba(255, 193, 7, ${0.2 + (intensity / 100) * 0.8})"></div>
                <div class="heatmap-label">${hour === 0 || hour === 6 || hour === 12 || hour === 18 ? timeLabel : ''}</div>
            </div>
        `;
    }).join('');
}

function generateHiddenGems() {
    const hiddenGemsList = document.getElementById('hiddenGemsList');
    const songs = Array.from(document.querySelectorAll('.songItem'));
    
    if (songs.length < 3) {
        hiddenGemsList.innerHTML = '<p class="empty-message">Add more songs to discover hidden gems!</p>';
        return;
    }
    
    hiddenGemsList.innerHTML = '';
    
    // Get random songs as hidden gems
    const gems = songs.slice(-3);
    
    gems.forEach(song => {
        const songName = song.querySelector('span:not(.timestamp)').textContent;
        const daysAgo = Math.floor(Math.random() * 60) + 30;
        
        const gemDiv = document.createElement('div');
        gemDiv.className = 'gem-item';
        gemDiv.innerHTML = `
            <h4>${songName}</h4>
            <p>Last played ${daysAgo} days ago</p>
        `;
        gemDiv.addEventListener('click', () => {
            playSong(song.dataset.src, song);
        });
        hiddenGemsList.appendChild(gemDiv);
    });
}

function updateMusicDNA() {
    // Update mock BPM and energy
    const avgBPM = Math.floor(Math.random() * 40) + 100;
    const energies = ['Low', 'Medium', 'High', 'Very High'];
    const avgEnergy = energies[Math.floor(Math.random() * energies.length)];
    
    document.getElementById('avgBPM').textContent = avgBPM;
    document.getElementById('avgEnergy').textContent = avgEnergy;
}

// Generate Listening Heatmap
function generateListeningHeatmap() {
    const heatmapGrid = document.getElementById('heatmapGrid');
    heatmapGrid.innerHTML = '';
    
    // Generate 7 days x 4 weeks = 28 cells
    for (let i = 0; i < 28; i++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        
        // Random intensity
        const intensity = Math.random();
        cell.style.background = `rgba(255, 193, 7, ${intensity * 0.8})`;
        cell.title = `${Math.floor(intensity * 50)} plays`;
        
        heatmapGrid.appendChild(cell);
    }
}

// Setup Discover Features
function setupDiscoverFeatures() {
    // Vibe Matcher
    setupVibeMatcher();
    
    // Challenges
    setupChallenges();
    
    // Song Stories
    setupSongStories();
    
    // Sonic Twins
    generateSonicTwins();
}

function setupVibeMatcher() {
    const energySlider = document.getElementById('energySlider');
    const moodSlider = document.getElementById('moodSlider');
    const energyValue = document.getElementById('energyValue');
    const moodValue = document.getElementById('moodValue');
    const findBtn = document.querySelector('.btn-find-match');
    
    energySlider.addEventListener('input', () => {
        energyValue.textContent = energySlider.value;
    });
    
    moodSlider.addEventListener('input', () => {
        moodValue.textContent = moodSlider.value;
    });
    
    findBtn.addEventListener('click', () => {
        findVibeMatches(energySlider.value, moodSlider.value);
    });
}

function findVibeMatches(energy, mood) {
    const vibeResults = document.getElementById('vibeResults');
    const songs = Array.from(document.querySelectorAll('.songItem'));
    
    if (songs.length === 0) {
        vibeResults.innerHTML = '<p class="empty-message">No songs available</p>';
        return;
    }
    
    vibeResults.innerHTML = '';
    
    // Get random matches (in real app, would use actual audio features)
    const matches = songs.slice(0, Math.min(5, songs.length));
    
    matches.forEach(song => {
        const songName = song.querySelector('span:not(.timestamp)').textContent;
        const matchScore = Math.floor(Math.random() * 30) + 70;
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'vibe-result-item';
        resultDiv.innerHTML = `
            <span>${songName}</span>
            <span class="vibe-match-score">${matchScore}% match</span>
        `;
        resultDiv.addEventListener('click', () => {
            playSong(song.dataset.src, song);
        });
        vibeResults.appendChild(resultDiv);
    });
}

function setupChallenges() {
    const challengeBtns = document.querySelectorAll('.btn-challenge');
    
    challengeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.textContent = 'Started!';
            btn.style.background = 'rgb(255, 193, 7)';
            btn.style.color = 'black';
            setTimeout(() => {
                btn.textContent = 'Start';
                btn.style.background = 'rgba(255, 193, 7, 0.2)';
                btn.style.color = 'white';
            }, 2000);
        });
    });
}

function setupSongStories() {
    const addStoryBtn = document.querySelector('.btn-add-story');
    const songDiary = document.getElementById('songDiary');
    
    addStoryBtn.addEventListener('click', () => {
        const story = prompt('Add a memory or note about a song:');
        if (story && story.trim()) {
            const storyDiv = document.createElement('div');
            storyDiv.className = 'gem-item';
            storyDiv.innerHTML = `
                <h4>📝 Memory Added</h4>
                <p>${story}</p>
            `;
            songDiary.insertBefore(storyDiv, addStoryBtn);
        }
    });
}

function generateSonicTwins() {
    const sonicTwinsList = document.getElementById('sonicTwinsList');
    const songs = Array.from(document.querySelectorAll('.songItem'));
    
    if (songs.length < 4) {
        sonicTwinsList.innerHTML = '<p class="empty-message">Add more songs to find sonic twins!</p>';
        return;
    }
    
    sonicTwinsList.innerHTML = '';
    
    // Create random pairs
    for (let i = 0; i < Math.min(3, songs.length / 2); i++) {
        const song1 = songs[i * 2];
        const song2 = songs[i * 2 + 1];
        
        if (!song1 || !song2) continue;
        
        const name1 = song1.querySelector('span:not(.timestamp)').textContent;
        const name2 = song2.querySelector('span:not(.timestamp)').textContent;
        
        const twinDiv = document.createElement('div');
        twinDiv.className = 'twin-pair';
        twinDiv.innerHTML = `
            <div class="twin-song">
                <strong>${name1}</strong>
                <span style="color: rgba(255,255,255,0.6)">Similar tempo & mood</span>
            </div>
            <span class="twin-separator">↔️</span>
            <div class="twin-song">
                <strong>${name2}</strong>
                <span style="color: rgba(255,255,255,0.6)">Similar tempo & mood</span>
            </div>
        `;
        sonicTwinsList.appendChild(twinDiv);
    }
}

// Track recent songs
function trackRecentSong(songSrc, songItem) {
    const songName = songItem.querySelector('span:not(.timestamp)').textContent;
    const coverImg = songItem.querySelector('img')?.src || '';
    
    libraryData.recentSongs.unshift({
        name: songName,
        src: songSrc,
        cover: coverImg,
        timestamp: Date.now()
    });
    
    // Keep only last 10
    if (libraryData.recentSongs.length > 10) {
        libraryData.recentSongs.pop();
    }
    
    updateRecentSongsList();
}

function updateRecentSongsList() {
    const recentSongsList = document.getElementById('recentSongsList');
    
    if (libraryData.recentSongs.length === 0) {
        recentSongsList.innerHTML = '<p class="empty-message">No songs played yet</p>';
        return;
    }
    
    recentSongsList.innerHTML = '';
    
    libraryData.recentSongs.slice(0, 5).forEach(song => {
        const timeAgo = getTimeAgo(song.timestamp);
        
        const songDiv = document.createElement('div');
        songDiv.className = 'recent-song-item';
        songDiv.innerHTML = `
            ${song.cover ? `<img src="${song.cover}" alt="Cover">` : '<div style="width:50px;height:50px;background:rgba(0,255,136,0.2);border-radius:8px;"></div>'}
            <div class="recent-song-info">
                <h4>${song.name}</h4>
                <p>${timeAgo}</p>
            </div>
        `;
        songDiv.addEventListener('click', () => {
            const songItem = document.querySelector(`[data-src="${song.src}"]`);
            if (songItem) playSong(song.src, songItem);
        });
        recentSongsList.appendChild(songDiv);
    });
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Override playSong to track recent songs
const originalPlaySong = playSong;
window.playSong = function(src, songItem) {
    originalPlaySong(src, songItem);
    if (songItem) trackRecentSong(src, songItem);
};

// Collection card handlers
document.addEventListener('click', (e) => {
    const collectionCard = e.target.closest('.collection-card');
    if (collectionCard) {
        const type = collectionCard.dataset.type;
        // In real implementation, would open specialized view
        alert(`${collectionCard.querySelector('h3').textContent} - Coming soon!`);
    }
});

// ===== ARTIST PROFILE VIEW =====
function showArtistProfile(artistName, artistImage, songs, genre, origin, bio) {
    // Hide all other views
    const songlistView = document.getElementById('songlistView');
    const coverView = document.getElementById('coverDisplayView');
    const playlistView = document.getElementById('playlistView');
    const playlistDetailView = document.getElementById('playlistDetailView');
    const radioView = document.getElementById('radioView');
    const libraryView = document.getElementById('libraryView');
    const artistProfileView = document.getElementById('artistProfileView');
    
    if (songlistView) songlistView.style.display = 'none';
    if (coverView) coverView.style.display = 'none';
    if (playlistView) playlistView.style.display = 'none';
    if (playlistDetailView) playlistDetailView.style.display = 'none';
    if (radioView) radioView.style.display = 'none';
    if (libraryView) libraryView.style.display = 'none';
    
    // Show artist profile view
    if (artistProfileView) {
        artistProfileView.style.display = 'block';
        
        // Set background image with the artist image
        artistProfileView.style.backgroundImage = `url('${artistImage}')`;
        artistProfileView.style.backgroundSize = 'cover';
        artistProfileView.style.backgroundPosition = 'center';
        artistProfileView.style.backgroundRepeat = 'no-repeat';
        artistProfileView.style.backgroundAttachment = 'fixed';
        
        // Set artist info
        const profileImage = document.getElementById('artistProfileImage');
        const profileName = document.getElementById('artistProfileName');
        const profileGenre = document.getElementById('artistProfileGenre');
        const profileOrigin = document.getElementById('artistProfileOrigin');
        const profileBio = document.getElementById('artistProfileBio');
        const songsList = document.getElementById('artistProfileSongs');
        
        if (profileImage) profileImage.src = artistImage;
        if (profileName) profileName.textContent = artistName;
        if (profileGenre) profileGenre.textContent = `Genre: ${genre || 'Various'}`;
        if (profileOrigin) profileOrigin.textContent = origin || 'International';
        if (profileBio) profileBio.textContent = bio || 'Biography information not available.';
        
        // Clear and populate songs list
        if (songsList) {
            songsList.innerHTML = '';
            songs.forEach((song, index) => {
                const songItem = document.createElement('div');
                songItem.className = 'artist-profile-song-item';
                songItem.style.position = 'relative';
                
                // Check if song is favorited
                const isFav = musicTracker.isFavorite(song.title, artistName);
                
                songItem.innerHTML = `
                    <span class="artist-profile-song-title">${index + 1}. ${song.title}</span>
                    <i class="fa-heart favorite-btn youtube-fav ${isFav ? 'fa-solid favorited' : 'fa-regular'}" 
                       data-title="${song.title}" 
                       data-artist="${artistName}"
                       data-cover="${song.thumbnail}"
                       style="position: absolute; right: 45px; top: 50%; transform: translateY(-50%); color: #ff4444; cursor: pointer; font-size: 1.1rem; z-index: 100; transition: all 0.3s ease;"></i>
                    <i class="fa-brands fa-youtube artist-profile-song-youtube"></i>
                `;
                
                songItem.addEventListener('click', () => {
                    // Track YouTube song play
                    musicTracker.trackPlay({
                        title: song.title,
                        artist: artistName,
                        cover: song.thumbnail,
                        type: 'youtube',
                        genre: genre || 'Various',
                        duration: 0
                    });
                    
                    // Open YouTube URL directly in new tab
                    if (song.youtube) {
                        window.open(song.youtube, '_blank');
                    }
                    
                    // Also show cover view with YouTube thumbnail
                    showCoverView(song.thumbnail, song.title, 'YouTube Song');
                    
                    // Store YouTube info for play button
                    const coverDisplayView = document.getElementById('coverDisplayView');
                    if (coverDisplayView) {
                        coverDisplayView.dataset.youtube = song.youtube;
                        coverDisplayView.dataset.isYoutube = 'true';
                    }
                    
                    // Update library stats if open
                    if (document.getElementById('libraryView').style.display === 'flex') {
                        calculateLibraryStats();
                        displayRecentPlays();
                    }
                });
                
                songsList.appendChild(songItem);
            });
        }
    }
    
    // Show back button
    const backButton = document.getElementById('backButton');
    if (backButton) backButton.style.display = 'flex';
}

// ===== POPULATE MAIN ARTIST GRID =====
// This is called from setupFeaturedArtists() in initializeApplication()
function populateMainArtistGrid() {
    const mainArtistGrid = document.getElementById('mainArtistGrid');
    
    if (mainArtistGrid) {
        // Get all artists from sidebar
        const artistItems = document.querySelectorAll('.artist-item');
        
        artistItems.forEach(artistItem => {
            const artistName = artistItem.querySelector('.artist-name');
            const artistImage = artistItem.querySelector('.artist-image');
            const artistSongs = artistItem.querySelectorAll('.artist-song-item');
            const genre = artistItem.dataset.genre || 'Various';
            const origin = artistItem.dataset.origin || 'International';
            const bio = artistItem.dataset.bio || 'Biography information not available.';
            
            if (artistName && artistImage) {
                // Create artist card
                const card = document.createElement('div');
                card.className = 'main-artist-card';
                card.dataset.artist = artistItem.dataset.artist;
                
                card.innerHTML = `
                    <img src="${artistImage.src}" alt="${artistName.textContent}" class="main-artist-card-image artist-image" onerror="this.src='haseen cover.jpg'">
                    <div class="main-artist-card-name">${artistName.textContent}</div>
                    <div class="main-artist-card-info">${genre}</div>
                    <div class="main-artist-card-info">${artistSongs.length} songs</div>
                `;
                
                // Click handler - show artist profile
                card.addEventListener('click', () => {
                    // Collect artist songs data
                    const songs = [];
                    artistSongs.forEach(songItem => {
                        const titleEl = songItem.querySelector('.artist-song-title');
                        const youtubeUrl = songItem.dataset.youtube;
                        if (titleEl && youtubeUrl) {
                            const title = titleEl.textContent.replace('♫ ', '').trim();
                            let thumbnail = 'haseen cover.jpg';
                            const match = youtubeUrl.match(/[?&]v=([^&]+)/);
                            if (match) {
                                const videoId = match[1];
                                thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                            }
                            songs.push({
                                title: title,
                                youtube: youtubeUrl,
                                thumbnail: thumbnail
                            });
                        }
                    });
                    
                    // Show artist profile with all info
                    if (songs.length > 0) {
                        showArtistProfile(artistName.textContent, artistImage.src, songs, genre, origin, bio);
                    }
                });
                
                mainArtistGrid.appendChild(card);
            }
        });
    }
}

// ===== AUTO-LOAD ARTIST IMAGES FROM EXTERNAL SOURCES =====
// (Now called from initializeApplication())

// ===== MANUAL IMAGE REFRESH UTILITY =====
/**
 * Manually refresh artist images (accessible via console)
 * Usage: window.refreshArtistImages() or refreshArtistImages()
 */
window.refreshArtistImages = async function() {
    const artistImages = document.querySelectorAll('.artist-image');
    
    for (const img of artistImages) {
        const artistName = img.alt || img.closest('.artist-item')?.dataset.artist;
        if (artistName) {
            try {
                // Clear cache for this artist
                artistImageCache.delete(artistName.toLowerCase());
                
                // Fetch fresh image
                const result = await fetchArtistImage(artistName);
                
                if (result && result.imageUrl) {
                    img.src = result.imageUrl;
                }
            } catch (error) {
                // Silent fail - keep current image
            }
        }
    }
    
    return 'Artist images refreshed!';
};

// ===== EXPORT FUNCTIONS FOR EXTERNAL USE =====
/**
 * Get artist image by name (accessible globally)
 * Usage: await getArtistImage('Arijit Singh')
 */
window.getArtistImage = fetchArtistImage;

/**
 * Clear image cache (accessible globally)
 * Usage: clearArtistImageCache()
 */
window.clearArtistImageCache = function() {
    artistImageCache.clear();
    return 'Artist image cache cleared!';
};

// ===== FAVORITES / LIKE SYSTEM =====
// (Now called from initializeApplication())

function addFavoriteButtons() {
    // Add to regular song items
    document.querySelectorAll('.songItem').forEach(songItem => {
        if (!songItem.querySelector('.favorite-btn')) {
            const songName = songItem.querySelector('.songName')?.textContent || 'Unknown';
            const artist = songItem.closest('.artist-item')?.dataset.artist || 'Unknown';
            const isFav = musicTracker.isFavorite(songName, artist);
            
            const favBtn = document.createElement('i');
            favBtn.className = `fa-heart favorite-btn ${isFav ? 'fa-solid favorited' : 'fa-regular'}`;
            favBtn.style.cssText = 'position: absolute; right: 50px; top: 50%; transform: translateY(-50%); color: #ff4444; cursor: pointer; font-size: 1.2rem; z-index: 10; transition: all 0.3s ease;';
            favBtn.dataset.title = songName;
            favBtn.dataset.artist = artist;
            
            songItem.style.position = 'relative';
            songItem.appendChild(favBtn);
        }
    });
    
    // Add to podcast items
    document.querySelectorAll('.podcast-item').forEach(podcastItem => {
        if (!podcastItem.querySelector('.favorite-btn')) {
            const title = podcastItem.querySelector('.podcast-title')?.textContent || 'Unknown';
            const isFav = musicTracker.isFavorite(title, 'Podcast');
            
            const favBtn = document.createElement('i');
            favBtn.className = `fa-heart favorite-btn ${isFav ? 'fa-solid favorited' : 'fa-regular'}`;
            favBtn.style.cssText = 'position: absolute; right: 60px; top: 50%; transform: translateY(-50%); color: #ff4444; cursor: pointer; font-size: 1.2rem; z-index: 10; transition: all 0.3s ease;';
            favBtn.dataset.title = title;
            favBtn.dataset.artist = 'Podcast';
            
            podcastItem.style.position = 'relative';
            podcastItem.appendChild(favBtn);
        }
    });
}

function setupFavoriteHandlers() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('favorite-btn')) {
            e.stopPropagation();
            toggleFavorite(e.target);
        }
    });
}

function toggleFavorite(favBtn) {
    const title = favBtn.dataset.title;
    const artist = favBtn.dataset.artist;
    const songItem = favBtn.closest('.songItem, .podcast-item, .artist-profile-song-item');
    
    // Get cover - check for YouTube songs in artist profile
    let cover = 'haseen cover.jpg';
    if (favBtn.dataset.cover) {
        cover = favBtn.dataset.cover;
    } else if (songItem?.querySelector('img')) {
        cover = songItem.querySelector('img').src;
    } else if (favBtn.classList.contains('youtube-fav')) {
        // For YouTube songs, try to get artist profile image
        cover = document.getElementById('artistProfileImage')?.src || 'haseen cover.jpg';
    }
    
    // Get src and type
    let src = '';
    let type = 'local';
    if (songItem) {
        src = songItem.dataset.src || songItem.getAttribute('data-youtube') || '';
        type = songItem.getAttribute('data-youtube') ? 'youtube' : 'local';
    } else if (favBtn.closest('.artist-profile-view')) {
        const ytLink = favBtn.closest('[data-youtube]')?.getAttribute('data-youtube');
        if (ytLink) {
            src = ytLink;
            type = 'youtube';
        }
    }
    
    const isNowFavorited = musicTracker.toggleFavorite({
        title: title,
        artist: artist,
        cover: cover,
        src: src,
        type: type
    });
    
    // Update button appearance
    if (isNowFavorited) {
        favBtn.classList.remove('fa-regular');
        favBtn.classList.add('fa-solid', 'favorited');
        // Animate
        favBtn.style.transform = 'translateY(-50%) scale(1.3)';
        setTimeout(() => {
            favBtn.style.transform = 'translateY(-50%) scale(1)';
        }, 200);
        
        // Show notification
        showNotification(`❤️ Added "${title}" to favorites`);
    } else {
        favBtn.classList.remove('fa-solid', 'favorited');
        favBtn.classList.add('fa-regular');
        showNotification(`💔 Removed "${title}" from favorites`);
    }
    
    // Update library stats if library is open
    if (document.getElementById('libraryView').style.display === 'flex') {
        calculateLibraryStats();
    }
    
    // Update liked songs view if open
    if (document.getElementById('likedSongsView').style.display === 'block') {
        loadLikedSongs();
    }
}

// ===== LIKED SONGS VIEW =====
function showLikedSongsView() {
    console.log('🎵 Showing Liked Songs View');
    
    // Hide all other views
    const views = ['songlistView', 'radioView', 'coverDisplayView', 'playlistView', 'libraryView', 'artistProfileView'];
    views.forEach(viewId => {
        const view = document.getElementById(viewId);
        if (view) view.style.display = 'none';
    });
    
    // Show liked songs view
    const likedSongsView = document.getElementById('likedSongsView');
    if (likedSongsView) {
        likedSongsView.style.display = 'block';
        loadLikedSongs();
        console.log('✅ Liked Songs View displayed');
    } else {
        console.error('❌ likedSongsView element not found');
    }
    
    // Show back button
    const backButton = document.getElementById('backButton');
    if (backButton) backButton.style.display = 'flex';
}

function loadLikedSongs() {
    const data = musicTracker.getData();
    const favorites = data.favorites || [];
    
    const likedSongsCount = document.getElementById('likedSongsCount');
    const likedSongsList = document.getElementById('likedSongsList');
    
    if (likedSongsCount) {
        likedSongsCount.textContent = favorites.length;
    }
    
    if (!likedSongsList) return;
    
    // Add fade-out animation before updating
    likedSongsList.style.opacity = '0';
    
    setTimeout(() => {
        if (favorites.length === 0) {
            likedSongsList.innerHTML = `
                <div class="empty-liked-songs">
                    <i class="fa-regular fa-heart fa-5x"></i>
                    <h2>Songs you like will appear here</h2>
                    <p>Save songs by tapping the heart icon.</p>
                </div>
            `;
        } else {
            // Sort by date added (most recent first)
            const sortedFavorites = [...favorites].sort((a, b) => 
                new Date(b.addedAt) - new Date(a.addedAt)
            );
            
            likedSongsList.innerHTML = `
                <table class="liked-songs-table">
                    <thead class="liked-songs-table-header">
                        <tr>
                            <th class="col-index">#</th>
                            <th class="col-title">Title</th>
                            <th class="col-artist">Artist</th>
                            <th class="col-date">Date Added</th>
                            <th class="col-actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedFavorites.map((song, index) => {
                            const addedDate = new Date(song.addedAt);
                            const formattedDate = addedDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                            });
                            
                            return `
                                <tr class="liked-song-row" data-title="${song.title}" data-artist="${song.artist}" data-cover="${song.cover}" data-src="${song.src || ''}" data-type="${song.type || 'local'}" style="animation-delay: ${index * 0.05}s">
                                    <td class="liked-song-index">
                                        <span class="liked-song-number">${index + 1}</span>
                                        <i class="fa-solid fa-play liked-song-play-btn"></i>
                                    </td>
                                    <td>
                                        <div class="liked-song-title-cell">
                                            <img src="${song.cover}" alt="${song.title}" class="liked-song-cover" onerror="this.src='cover.jpg'">
                                            <span class="liked-song-title">${song.title}</span>
                                            ${song.type === 'youtube' ? '<i class="fa-brands fa-youtube" style="color: #FF0000; margin-left: 8px;"></i>' : ''}
                                        </div>
                                    </td>
                                    <td class="liked-song-artist">${song.artist}</td>
                                    <td class="liked-song-date">${formattedDate}</td>
                                    <td class="liked-song-actions">
                                        <i class="fa-solid fa-heart liked-heart-icon" title="Remove from Liked Songs"></i>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            
            // Add event listeners to rows
            attachLikedSongsListeners();
        }
        
        // Fade in
        likedSongsList.style.opacity = '1';
    }, 200);
}

// Separate function for attaching event listeners
function attachLikedSongsListeners() {
    document.querySelectorAll('.liked-song-row').forEach(row => {
        const title = row.dataset.title;
        const artist = row.dataset.artist;
        const cover = row.dataset.cover;
        
        // Play button click
        const playBtn = row.querySelector('.liked-song-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playLikedSong(title, artist, row);
            });
        }
        
        // Click row to play
        row.addEventListener('click', (e) => {
            if (e.target.closest('.liked-song-actions')) return;
            playLikedSong(title, artist, row);
        });
        
        // Remove from favorites with confirmation and smooth animation
        const heartIcon = row.querySelector('.liked-heart-icon');
        if (heartIcon) {
            heartIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Add animation
                heartIcon.style.transform = 'scale(1.5)';
                heartIcon.style.color = '#ff3232';
                
                setTimeout(() => {
                    row.style.transform = 'translateX(-100%)';
                    row.style.opacity = '0';
                    
                    setTimeout(() => {
                        musicTracker.toggleFavorite({ title, artist, cover });
                        
                        if (typeof showToast === 'function') {
                            showToast(`💔 Removed "${title}" from Liked Songs`, 'info');
                        } else {
                            showNotification(`💔 Removed "${title}" from Liked Songs`);
                        }
                        
                        loadLikedSongs();
                        
                        // Update heart icons in the main view
                        updateAllHeartIcons();
                    }, 300);
                }, 200);
            });
        }
    });
}

// Helper function to play a liked song
function playLikedSong(title, artist, row) {
    // Remove playing class from all rows
    document.querySelectorAll('.liked-song-row').forEach(r => r.classList.remove('playing'));
    
    // Add playing class to current row
    row.classList.add('playing');
    
    const src = row.dataset.src;
    const type = row.dataset.type;
    
    // If it's a YouTube link, open it
    if (type === 'youtube' && src) {
        window.open(src, '_blank');
        if (typeof showToast === 'function') {
            showToast(`🎥 Opening "${title}" on YouTube`, 'success', 2000);
        } else {
            showNotification(`🎥 Opening "${title}" on YouTube`);
        }
        return;
    }
    
    // Check if user is logged in
    if (!isUserLoggedIn) {
        showLoginRequiredDialog();
        return;
    }
    
    // Play the song directly from stored src
    if (!src || src === '') {
        // Fallback: try to find in current playlist
        const songItems = document.querySelectorAll('.songItem');
        let found = false;
        
        songItems.forEach(item => {
            const itemTitle = item.querySelector('span:not(.timestamp)')?.textContent?.trim();
            if (itemTitle && itemTitle.toLowerCase() === title.toLowerCase()) {
                playSong(item.dataset.src, item);
                found = true;
            }
        });
        
        if (!found) {
            row.classList.remove('playing');
            if (typeof showToast === 'function') {
                showToast(`❌ Unable to play "${title}"`, 'error');
            }
        }
        return;
    }
    
    // Play directly
    if (!audio) return;
    
    audio.src = src;
    currentSongSrc = src;
    
    // Remove playing state from all song items
    document.querySelectorAll('.songItem').forEach(s => s.classList.remove('playing'));
    document.querySelectorAll('.podcast-item').forEach(p => p.classList.remove('playing'));
    
    // Play audio
    audio.play().then(() => {
        if (typeof showToast === 'function') {
            showToast(`▶️ Now playing: ${title}`, 'success', 2000);
        }
        updateIcons();
        
        // Track the play
        musicTracker.addPlayCount({
            title: title,
            artist: artist,
            cover: row.dataset.cover,
            duration: 0
        });
    }).catch((error) => {
        console.error('Playback error:', error);
        row.classList.remove('playing');
        if (typeof showToast === 'function') {
            showToast(`❌ Unable to play "${title}"`, 'error');
        } else {
            showNotification(`❌ Unable to play "${title}"`);
        }
    });
}

// Update all heart icons to reflect liked status
function updateAllHeartIcons() {
    const data = musicTracker.getData();
    const favorites = data.favorites || [];
    
    document.querySelectorAll('.songItem').forEach(item => {
        const title = item.querySelector('span:not(.timestamp)')?.textContent?.trim();
        const heartIcon = item.closest('.songlist')?.querySelector('.fa-heart');
        
        if (heartIcon && title) {
            const isLiked = favorites.some(fav => fav.title.toLowerCase() === title.toLowerCase());
            
            if (isLiked) {
                heartIcon.classList.remove('fa-regular');
                heartIcon.classList.add('fa-solid');
                heartIcon.style.color = 'rgb(255, 193, 7)';
            } else {
                heartIcon.classList.remove('fa-solid');
                heartIcon.classList.add('fa-regular');
                heartIcon.style.color = 'white';
            }
        }
    });
}

function playAllLikedSongs() {
    const data = musicTracker.getData();
    const favorites = data.favorites || [];
    
    if (favorites.length === 0) {
        if (typeof showToast === 'function') {
            showToast('❌ No liked songs to play', 'error');
        } else {
            showNotification('❌ No liked songs to play');
        }
        return;
    }
    
    // Play the first song
    const firstSong = favorites[0];
    const songItems = document.querySelectorAll('.songItem');
    let found = false;
    
    songItems.forEach(item => {
        const itemTitle = item.querySelector('span:not(.timestamp)')?.textContent?.trim();
        if (itemTitle && itemTitle.toLowerCase() === firstSong.title.toLowerCase()) {
            playSong(item.dataset.src, item);
            found = true;
        }
    });
    
    if (found) {
        if (typeof showToast === 'function') {
            showToast(`▶️ Playing ${favorites.length} liked song${favorites.length > 1 ? 's' : ''}`, 'success');
        } else {
            showNotification(`▶️ Playing ${favorites.length} liked songs`);
        }
    } else {
        if (typeof showToast === 'function') {
            showToast('❌ Songs not found in current playlist', 'error');
        } else {
            showNotification('❌ Songs not found in current playlist');
        }
    }
}

function shuffleLikedSongs() {
    const data = musicTracker.getData();
    const favorites = data.favorites || [];
    
    if (favorites.length === 0) {
        if (typeof showToast === 'function') {
            showToast('❌ No liked songs to shuffle', 'error');
        } else {
            showNotification('❌ No liked songs to shuffle');
        }
        return;
    }
    
    // Shuffle and play random song
    const randomSong = favorites[Math.floor(Math.random() * favorites.length)];
    const songItems = document.querySelectorAll('.songItem');
    let found = false;
    
    songItems.forEach(item => {
        const itemTitle = item.querySelector('span:not(.timestamp)')?.textContent?.trim();
        if (itemTitle && itemTitle.toLowerCase() === randomSong.title.toLowerCase()) {
            playSong(item.dataset.src, item);
            found = true;
        }
    });
    
    if (found) {
        if (typeof showToast === 'function') {
            showToast(`🔀 Shuffling ${favorites.length} liked song${favorites.length > 1 ? 's' : ''}`, 'success');
        } else {
            showNotification(`🔀 Shuffling ${favorites.length} liked songs`);
        }
    } else {
        if (typeof showToast === 'function') {
            showToast('❌ Songs not found in current playlist', 'error');
        } else {
            showNotification('❌ Songs not found in current playlist');
        }
    }
}

// Add event listeners for liked songs buttons
document.addEventListener('DOMContentLoaded', () => {
    const btnPlayAllLiked = document.getElementById('btnPlayAllLiked');
    const btnShuffleLiked = document.getElementById('btnShuffleLiked');
    
    if (btnPlayAllLiked) {
        btnPlayAllLiked.addEventListener('click', playAllLikedSongs);
    }
    
    if (btnShuffleLiked) {
        btnShuffleLiked.addEventListener('click', shuffleLikedSongs);
    }
});

// ===== NEW ENHANCED FEATURES =====

// ***** TOAST NOTIFICATION SYSTEM *****
function showToast(message, type = 'success', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return; // Safety check
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 
                 type === 'error' ? 'fa-circle-xmark' : 
                 'fa-circle-info';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ***** KEYBOARD SHORTCUTS SYSTEM *****
let shortcutHintVisible = false;

document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(e.key.toLowerCase()) {
        case ' ': // Space - Play/Pause
            e.preventDefault();
            const playBtn = document.querySelector('.fa-circle-play, .fa-circle-pause');
            if (playBtn) playBtn.click();
            break;
            
        case 'arrowright': // Right Arrow - Next Song
            e.preventDefault();
            const nextBtn = document.querySelector('.fa-forward');
            if (nextBtn) nextBtn.click();
            break;
            
        case 'arrowleft': // Left Arrow - Previous Song
            e.preventDefault();
            const prevBtn = document.querySelector('.fa-backward');
            if (prevBtn) prevBtn.click();
            break;
            
        case 'q': // Q - Toggle Queue
            e.preventDefault();
            toggleQueue();
            break;
            
        case '?': // ? - Toggle Shortcuts Hint
            e.preventDefault();
            toggleShortcutHint();
            break;
    }
    
    // Ctrl+F - Focus Search
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }
});

function toggleShortcutHint() {
    const hint = document.getElementById('shortcutHint');
    if (!hint) return; // Safety check
    shortcutHintVisible = !shortcutHintVisible;
    hint.style.display = shortcutHintVisible ? 'block' : 'none';
}

// Show shortcut hint on first load
setTimeout(() => {
    if (!localStorage.getItem('shortcutsShown')) {
        const hint = document.getElementById('shortcutHint');
        if (hint) {
            toggleShortcutHint();
            localStorage.setItem('shortcutsShown', 'true');
            setTimeout(() => toggleShortcutHint(), 8000);
        }
    }
}, 2000);

// ***** QUEUE MANAGEMENT SYSTEM *****
let songQueue = [];
let currentQueueIndex = -1;

function toggleQueue() {
    const queuePanel = document.getElementById('queuePanel');
    const queueToggleBtn = document.getElementById('queueToggle');
    if (queuePanel) {
        queuePanel.classList.toggle('open');
        if (queueToggleBtn) {
            queueToggleBtn.classList.toggle('active');
        }
    }
}

// Queue toggle button click handler
const queueToggleBtn = document.getElementById('queueToggle');
if (queueToggleBtn) {
    queueToggleBtn.addEventListener('click', toggleQueue);
}

function addToQueue(songSrc, songName, songCover, duration, silent = true) {
    songQueue.push({
        src: songSrc,
        name: songName,
        cover: songCover,
        duration: duration
    });
    
    updateQueueDisplay();
    if (!silent) {
        showToast(`Added "${songName}" to queue`, 'success', 2000);
    }
}

function updateQueueDisplay() {
    const queueList = document.getElementById('queueList');
    if (!queueList) return; // Safety check
    
    if (songQueue.length === 0) {
        queueList.innerHTML = `
            <div class="queue-empty">
                <i class="fa-solid fa-music"></i>
                <p>Queue is empty</p>
            </div>
        `;
        return;
    }
    
    queueList.innerHTML = songQueue.map((song, index) => `
        <div class="queue-item ${index === currentQueueIndex ? 'current-playing' : ''}" data-index="${index}">
            <img src="${song.cover}" alt="${song.name}" onerror="this.src='cover.jpg'">
            <div class="queue-item-info">
                <div class="queue-item-name">${song.name}</div>
                <div class="queue-item-duration">${song.duration}</div>
            </div>
            <i class="fa-solid fa-xmark queue-item-remove" onclick="removeFromQueue(${index})"></i>
        </div>
    `).join('');
    
    // Add click handlers to queue items
    document.querySelectorAll('.queue-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('queue-item-remove')) {
                const index = parseInt(item.dataset.index);
                playFromQueue(index);
            }
        });
    });
}

function removeFromQueue(index) {
    const removedSong = songQueue[index];
    songQueue.splice(index, 1);
    
    if (currentQueueIndex >= index && currentQueueIndex > 0) {
        currentQueueIndex--;
    }
    
    updateQueueDisplay();
}

function clearQueue() {
    songQueue = [];
    currentQueueIndex = -1;
    updateQueueDisplay();
}

const btnClearQueue = document.getElementById('btnClearQueue');
if (btnClearQueue) {
    btnClearQueue.addEventListener('click', clearQueue);
}

function playFromQueue(index) {
    if (index >= 0 && index < songQueue.length) {
        const song = songQueue[index];
        currentQueueIndex = index;
        
        // Play the song
        audio.src = song.src;
        audio.play();
        
        updateQueueDisplay();
    }
}

// Auto-play next song from queue when current song ends
audio.addEventListener('ended', () => {
    if (repeatMode === 2) {
        audio.play();
    } else if (currentQueueIndex >= 0 && currentQueueIndex < songQueue.length - 1) {
        playFromQueue(currentQueueIndex + 1);
    } else if (repeatMode === 1 && songQueue.length > 0) {
        playFromQueue(0);
    }
});

// ***** RECENTLY PLAYED SYSTEM *****
let recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');

function addToRecentlyPlayed(songSrc, songName, songCover) {
    const newSong = {
        src: songSrc,
        name: songName,
        cover: songCover,
        playedAt: new Date().toISOString()
    };
    
    // Remove if already exists
    recentlyPlayed = recentlyPlayed.filter(song => song.src !== songSrc);
    
    // Add to beginning
    recentlyPlayed.unshift(newSong);
    
    // Keep only last 12 songs
    recentlyPlayed = recentlyPlayed.slice(0, 12);
    
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
    updateRecentlyPlayedDisplay();
}

function updateRecentlyPlayedDisplay() {
    const section = document.getElementById('recentlyPlayedSection');
    const grid = document.getElementById('recentlyPlayedGrid');
    
    if (!section || !grid) return; // Safety check
    
    if (recentlyPlayed.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    grid.innerHTML = recentlyPlayed.map(song => {
        const playedDate = new Date(song.playedAt);
        const timeAgo = getTimeAgo(playedDate);
        
        return `
            <div class="recent-song-card" data-src="${song.src}" style="cursor: pointer;">
                <img src="${song.cover}" alt="${song.name}" onerror="this.src='cover.jpg'">
                <div class="song-name">${song.name}</div>
                <div class="song-time">${timeAgo}</div>
            </div>
        `;
    }).join('');
    
    // Add click handlers to recent song cards
    grid.querySelectorAll('.recent-song-card').forEach(card => {
        card.addEventListener('click', function() {
            const src = this.dataset.src;
            const songItems = document.querySelectorAll('.songItem');
            songItems.forEach(item => {
                if (item.dataset.src === src) {
                    playSong(src, item);
                }
            });
        });
    });
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

// Track recently played when audio plays
let lastTrackedSrc = '';
audio.addEventListener('play', () => {
    if (audio.src && audio.src !== lastTrackedSrc) {
        lastTrackedSrc = audio.src;
        const fileName = audio.src.split('/').pop().split('?')[0];
        const songItems = document.querySelectorAll('.songItem');
        songItems.forEach(item => {
            if (item.dataset.src === fileName) {
                const songName = item.querySelector('span:not(.timestamp)')?.textContent || 'Unknown';
                const songCover = item.querySelector('img')?.src || 'cover.jpg';
                addToRecentlyPlayed(item.dataset.src, songName, songCover);
            }
        });
    }
});

// Initialize recently played on page load
updateRecentlyPlayedDisplay();

// ***** AUDIO VISUALIZER *****
let audioContext;
let analyser;
let dataArray;
let visualizerBars = [];
let animationId;

function initAudioVisualizer() {
    const visualizer = document.getElementById('audioVisualizer');
    if (!visualizer || !audio) return; // Safety check
    
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            analyser.fftSize = 64;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            // Create visualizer bars
            visualizer.innerHTML = ''; // Clear first
            for (let i = 0; i < 32; i++) {
                const bar = document.createElement('div');
                bar.className = 'visualizer-bar';
                bar.style.height = '5px';
                visualizer.appendChild(bar);
                visualizerBars.push(bar);
            }
        } catch (e) {
            console.log('Audio context error:', e);
        }
    }
}

function animateVisualizer() {
    if (!audio.paused) {
        analyser.getByteFrequencyData(dataArray);
        
        visualizerBars.forEach((bar, i) => {
            const value = dataArray[i];
            const height = (value / 255) * 70 + 5; // 5-75px
            bar.style.height = `${height}px`;
        });
        
        animationId = requestAnimationFrame(animateVisualizer);
    }
}

// Start visualizer when audio plays
audio.addEventListener('play', () => {
    const visualizer = document.getElementById('audioVisualizer');
    if (visualizer) {
        visualizer.style.display = 'flex';
        
        try {
            initAudioVisualizer();
            animateVisualizer();
        } catch (e) {
            console.log('Visualizer error:', e);
        }
    }
});

audio.addEventListener('pause', () => {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});

// ***** ENHANCED SEARCH WITH SUGGESTIONS *****
let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

// Search history is tracked in the main search functionality
// This section keeps the history array for future enhancements

function addToSearchHistory(query) {
    if (!searchHistory.includes(query)) {
        searchHistory.unshift(query);
        searchHistory = searchHistory.slice(0, 10); // Keep last 10 searches
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    }
}

// ***** ENHANCED SONG ITEM INTERACTIONS *****
// Add songs to queue when clicking plus icon (you can add this icon to HTML)
document.addEventListener('click', (e) => {
    if (e.target.closest('.add-to-queue-btn')) {
        const songItem = e.target.closest('.songItem');
        if (songItem) {
            const songSrc = songItem.dataset.src;
            const songName = songItem.querySelector('span').textContent;
            const songCover = songItem.querySelector('img').src;
            const duration = songItem.querySelector('.timestamp').textContent.split('<')[0];
            
            addToQueue(songSrc, songName, songCover, duration);
        }
    }
});

// ***** RIPPLE EFFECT FOR BUTTONS *****
document.querySelectorAll('button, .btn-cover-play, .btn-create-playlist').forEach(btn => {
    if (!btn.classList.contains('ripple')) {
        btn.classList.add('ripple');
    }
});

// ***** SMOOTH SCROLLING FOR NAVIGATION *****
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

console.log('✨ SpotSong Enhanced Features Loaded!');
