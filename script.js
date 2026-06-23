document.addEventListener('DOMContentLoaded', () => {
    // Wrapper for smooth grid animation
    document.querySelectorAll('.scene-content').forEach(content => {
        const inner = document.createElement('div');
        inner.className = 'scene-content-inner';
        while (content.firstChild) {
            inner.appendChild(content.firstChild);
        }
        content.appendChild(inner);
    });

    initProgressObserver();
    initDrawerMenu();

    // Mutual exclusion for fade toggles
    const fadeMusica = document.getElementById('use-fade');
    const fadeNarracao = document.getElementById('use-fade-narration');
    
    if (fadeMusica && fadeNarracao) {
        fadeMusica.addEventListener('change', () => {
            if (fadeMusica.checked) fadeNarracao.checked = false;
        });
        fadeNarracao.addEventListener('change', () => {
            if (fadeNarracao.checked) fadeMusica.checked = false;
        });
    }
});

function startReading() {
    // Rolar até Detalhes da Peça e abrir se estiver fechada
    const detailsSection = document.getElementById('scene-1');
    if (detailsSection) {
        if (!detailsSection.classList.contains('expanded')) {
            detailsSection.classList.add('expanded');
        }
        detailsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// 1. Intersection Observer for Header & Progress
function initProgressObserver() {
    const topNav = document.getElementById('top-nav');
    const hero = document.getElementById('hero');
    const currentSceneText = document.getElementById('current-scene');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    
    const scenes = Array.from(document.querySelectorAll('.scene-section'));

    // Observer to hide/show header based on Hero visibility
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                topNav.classList.add('hidden');
            } else {
                topNav.classList.remove('hidden');
            }
        });
    }, { threshold: 0.1 });
    
    if (hero) heroObserver.observe(hero);

    // Update Progress on Scroll
    window.addEventListener('scroll', () => {
        if (!scenes.length) return;
        
        // Calculate percentage (ignoring hero height)
        const heroHeight = hero ? hero.offsetHeight : 0;
        const scrollPosition = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        
        let percentage = 0;
        if (scrollPosition > heroHeight) {
            const scrollableDistance = documentHeight - heroHeight - windowHeight;
            const currentScroll = scrollPosition - heroHeight;
            percentage = Math.min(100, Math.max(0, (currentScroll / scrollableDistance) * 100));
        }
        
        const percValue = Math.round(percentage);
        progressText.innerText = `${percValue}%`;
        progressBar.style.width = `${percentage}%`;

        // Determine current scene
        let currentTitle = 'Detalhes da Peça';
        // Check which scene is near the top of the viewport
        for (let i = scenes.length - 1; i >= 0; i--) {
            const rect = scenes[i].getBoundingClientRect();
            // If the top of the scene is above the middle of the screen
            if (rect.top <= windowHeight / 3) {
                currentTitle = scenes[i].getAttribute('data-title');
                updateMenuHighlight(scenes[i].id);
                break;
            }
        }
        currentSceneText.innerText = currentTitle;
    });
}

// 2. Fullscreen Logic
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

document.addEventListener('fullscreenchange', () => {
    const btn = document.getElementById('fullscreen-btn');
    if (document.fullscreenElement) {
        btn.innerHTML = '<i class="fa-solid fa-compress"></i>';
        btn.setAttribute('title', 'Sair da Tela Cheia');
        btn.setAttribute('aria-label', 'Sair da Tela Cheia');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-expand"></i>';
        btn.setAttribute('title', 'Tela Cheia');
        btn.setAttribute('aria-label', 'Tela Cheia');
    }
});

// 3. Drawer Menu Logic
function initDrawerMenu() {
    const drawerList = document.getElementById('drawer-list');
    const scenes = document.querySelectorAll('.scene-section');
    
    drawerList.innerHTML = '';
    
    scenes.forEach(scene => {
        const title = scene.getAttribute('data-title');
        const id = scene.id;
        
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.innerText = title;
        btn.id = `menu-link-${id}`;
        btn.onclick = () => {
            toggleMenu();
            scene.scrollIntoView({ behavior: 'smooth' });
        };
        li.appendChild(btn);
        drawerList.appendChild(li);
    });
}

function toggleMenu() {
    const drawer = document.getElementById('drawer-menu');
    const overlay = document.getElementById('drawer-overlay');
    drawer.classList.toggle('active');
    overlay.classList.toggle('active');
}

function updateMenuHighlight(activeId) {
    document.querySelectorAll('.drawer-list button').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`menu-link-${activeId}`);
    if (activeBtn) activeBtn.classList.add('active');
}
// 4. Accordion Logic
function toggleScene(headerElement) {
    const sceneSection = headerElement.closest('.scene-section');
    sceneSection.classList.toggle('expanded');
}



// --- AUDIO PLAYER LOGIC ---
const PLAYLIST = [
    { url: 'audios e trilhas/01-familia-intro-narração.mp3', title: 'Trilha 1: Introdução Família' },
    { url: 'audios e trilhas/02-suspense-1.mp3', title: 'Trilha 2: Suspense 1' },
    { url: 'audios e trilhas/03-suspense-2-impacto.mp3', title: 'Trilha 3: Suspense 2 (Impacto)' },
    { url: 'audios e trilhas/04-epic-motivacional.mp3', title: 'Trilha 4: Épico Motivacional' },
    { url: 'audios e trilhas/05-familia-final-narração.mp3', title: 'Trilha 5: Narração Final' }
];

let activeAudio = null;
let fadingOutAudio = null;
let currentTrackIndex = -1;
let crossfadeInterval = null;

const playerUI = document.getElementById('custom-audio-player');
const minimizedUI = document.getElementById('minimized-player');
const playerTitle = document.getElementById('player-title');
const minimizedTitle = document.getElementById('minimized-title');
const playerPlayBtn = document.getElementById('player-play');
const minimizedPlayBtn = document.getElementById('minimized-play');
const playerTimeline = document.getElementById('player-timeline');
const playerCurrentTime = document.getElementById('player-current-time');
const playerTotalTime = document.getElementById('player-total-time');

// Load a specific track into the player (without playing automatically)
function loadTrack(index) {
    if (index < 0 || index >= PLAYLIST.length) return;
    currentTrackIndex = index;
    const track = PLAYLIST[index];
    
    playerTitle.innerText = track.title;
    minimizedTitle.innerText = track.title;
    
    playerUI.dataset.pendingUrl = track.url;
    
    // Reset UI
    playerTimeline.value = 0;
    playerCurrentTime.innerText = "00:00";
    playerTotalTime.innerText = "00:00";
    updatePlayState(false);

    // Update Next/Prev buttons disabled state
    const prevBtn = document.getElementById('player-prev');
    const nextBtn = document.getElementById('player-next');
    if (prevBtn) prevBtn.disabled = (currentTrackIndex === 0);
    if (nextBtn) nextBtn.disabled = (currentTrackIndex === PLAYLIST.length - 1);
}

// Called when clicking the scene's Audio button
window.toggleAudio = function(url, buttonElement) {
    // Find index in playlist
    let trackIndex = PLAYLIST.findIndex(t => url.includes(t.url) || t.url.includes(url));
    if (trackIndex === -1) {
        // Fallback
        trackIndex = url.includes('01') ? 0 : 1;
    }
    
    // If it's the currently active audio, just toggle play/pause
    if (activeAudio && activeAudio.src.includes(encodeURI(url.replace(/ /g, '%20')))) {
        openPlayer();
        return;
    }

    // Otherwise, load this new track and open player (don't play yet)
    loadTrack(trackIndex);
    openPlayer();
}

// Play/Pause logic with Crossfade
window.togglePlayerPlay = function() {
    const url = playerUI.dataset.pendingUrl;
    
    if (activeAudio && (!url || activeAudio.src.includes(encodeURI(url.replace(/ /g, '%20'))))) {
        // Toggle play/pause on current active audio
        if (activeAudio.paused) {
            activeAudio.play();
            updatePlayState(true);
        } else {
            activeAudio.pause();
            updatePlayState(false);
        }
        return;
    }

    if (!url) return;

    // Start a NEW audio track
    const newAudio = new Audio(url);
    
    const useFade = document.getElementById('use-fade').checked;
    const useFadeNarration = document.getElementById('use-fade-narration').checked;
    
    if (activeAudio && useFadeNarration) {
        // Fade out music, then start narration
        fadingOutAudio = activeAudio;
        let fadeOutVol = fadingOutAudio.volume;
        
        clearInterval(crossfadeInterval);
        const step = 1 / 20; // 2 seconds fade out
        
        crossfadeInterval = setInterval(() => {
            fadeOutVol = Math.max(0, fadeOutVol - step);
            if (fadingOutAudio) fadingOutAudio.volume = fadeOutVol;
            
            if (fadeOutVol <= 0) {
                clearInterval(crossfadeInterval);
                if (fadingOutAudio) fadingOutAudio.pause();
                fadingOutAudio = null;
                // Start narration at full volume after fade completes
                newAudio.volume = 1;
                newAudio.play().catch(console.error);
            }
        }, 100);
    } else if (activeAudio && useFade) {
        // Normal crossfade: fade out old, fade in new
        fadingOutAudio = activeAudio;
        let fadeOutVol = fadingOutAudio.volume;
        
        newAudio.volume = 0;
        newAudio.play().catch(console.error);
        
        clearInterval(crossfadeInterval);
        const step = 1 / 20; // 2 seconds
        
        crossfadeInterval = setInterval(() => {
            fadeOutVol = Math.max(0, fadeOutVol - step);
            if (fadingOutAudio) fadingOutAudio.volume = fadeOutVol;
            
            newAudio.volume = Math.min(1, newAudio.volume + step);
            
            if (fadeOutVol <= 0) {
                clearInterval(crossfadeInterval);
                if (fadingOutAudio) fadingOutAudio.pause();
                fadingOutAudio = null;
                newAudio.volume = 1;
            }
        }, 100);
    } else {
        // Hard cut
        if (fadingOutAudio) {
            fadingOutAudio.pause();
            fadingOutAudio = null;
        }
        if (activeAudio) {
            activeAudio.pause();
            activeAudio.volume = 1;
        }
        clearInterval(crossfadeInterval);
        newAudio.volume = 1;
        newAudio.play().catch(console.error);
    }

    activeAudio = newAudio;
    playerUI.dataset.pendingUrl = ""; // Clear pending
    updatePlayState(true);

    activeAudio.addEventListener('timeupdate', () => {
        if (!activeAudio || activeAudio !== newAudio) return;
        playerCurrentTime.innerText = formatTime(activeAudio.currentTime);
        playerTotalTime.innerText = formatTime(activeAudio.duration);
        if (activeAudio.duration) {
            playerTimeline.value = (activeAudio.currentTime / activeAudio.duration) * 100;
        }
    });

    activeAudio.addEventListener('ended', () => {
        updatePlayState(false);
    });
}

function updatePlayState(isPlaying) {
    const icon = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    playerPlayBtn.innerHTML = icon;
    minimizedPlayBtn.innerHTML = icon;
    if (isPlaying) {
        playerPlayBtn.classList.add('playing');
        minimizedPlayBtn.classList.add('playing');
        document.querySelector('.minimized-label').innerText = 'Reproduzindo';
    } else {
        playerPlayBtn.classList.remove('playing');
        minimizedPlayBtn.classList.remove('playing');
        document.querySelector('.minimized-label').innerText = 'Em espera';
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
        return h + ":" + (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    }
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
}

// UI Controls
function openPlayer() {
    minimizedUI.classList.remove('visible');
    setTimeout(() => minimizedUI.classList.add('hidden'), 400);
    
    playerUI.classList.remove('hidden');
    setTimeout(() => playerUI.classList.add('visible'), 10);
}

function minimizePlayer() {
    playerUI.classList.remove('visible');
    setTimeout(() => playerUI.classList.add('hidden'), 400);
    
    minimizedUI.classList.remove('hidden');
    setTimeout(() => minimizedUI.classList.add('visible'), 10);
}

function closePlayer() {
    playerUI.classList.remove('visible');
    minimizedUI.classList.remove('visible');
    setTimeout(() => {
        playerUI.classList.add('hidden');
        minimizedUI.classList.add('hidden');
    }, 400);
    if (activeAudio) {
        activeAudio.pause();
        updatePlayState(false);
    }
}

window.restorePlayer = function() {
    openPlayer();
}

// Event Listeners for Player UI
document.getElementById('player-minimize').addEventListener('click', minimizePlayer);
document.getElementById('player-close').addEventListener('click', closePlayer);
playerPlayBtn.addEventListener('click', togglePlayerPlay);

document.getElementById('player-next').addEventListener('click', () => {
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < PLAYLIST.length) {
        loadTrack(nextIndex);
    }
});

document.getElementById('player-prev').addEventListener('click', () => {
    const prevIndex = currentTrackIndex - 1;
    if (prevIndex >= 0) {
        loadTrack(prevIndex);
    }
});

if (playerTimeline) {
    playerTimeline.addEventListener('input', (e) => {
        if (activeAudio && activeAudio.duration) {
            const seekTime = (e.target.value / 100) * activeAudio.duration;
            activeAudio.currentTime = seekTime;
        }
    });
}
