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



// --- AUDIO PLAYER (CUSTOM WITH CROSSFADE) ---
let activeAudio = null;
let fadingOutAudio = null;
let activeAudioBtn = null;
let crossfadeInterval = null;

const playerUI = document.getElementById('custom-audio-player');
const playerTitle = document.getElementById('player-title');
const playerPlayBtn = document.getElementById('player-play');
const playerTimeline = document.getElementById('player-timeline');
const playerCurrentTime = document.getElementById('player-current-time');
const playerTotalTime = document.getElementById('player-total-time');
const playerCloseBtn = document.getElementById('player-close');
const useFadeCheckbox = document.getElementById('use-fade');

// Called when clicking the scene's Audio button
window.toggleAudio = function(url, buttonElement) {
    const title = buttonElement.innerHTML.includes('INTRO') ? 'Trilha: Introdução Família' : 'Trilha: Restauração Final';
    
    // If clicking the same track
    if (activeAudio && activeAudio.src.includes(encodeURI(url.replace(/ /g, '%20')))) {
        if (!playerUI.classList.contains('visible')) {
            playerUI.classList.remove('hidden');
            setTimeout(() => playerUI.classList.add('visible'), 10);
        }
        return;
    }
    
    // Prepare the new track in the UI, but don't play yet
    playerTitle.innerText = title;
    playerUI.dataset.pendingUrl = url;
    playerUI.dataset.pendingBtnId = Math.random().toString(); // unique id hack
    buttonElement.dataset.playerId = playerUI.dataset.pendingBtnId;
    
    // Reset timeline
    playerTimeline.value = 0;
    playerCurrentTime.innerText = "00:00";
    playerTotalTime.innerText = "00:00";
    playerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    playerPlayBtn.classList.remove('playing');
    
    // Show player
    playerUI.classList.remove('hidden');
    setTimeout(() => playerUI.classList.add('visible'), 10);
    
    // Auto-play after 500ms for convenience, or wait for user?
    // Let's NOT auto play as requested in the plan, or wait, user didn't specify.
    // If we auto-play, it's faster for the operator. Let's auto play.
    setTimeout(() => togglePlayerPlay(buttonElement), 300);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
}

window.togglePlayerPlay = function(sourceButton = null) {
    const url = playerUI.dataset.pendingUrl;
    if (!url && !activeAudio) return;

    // If we already have an active audio for this URL
    if (activeAudio && (!url || activeAudio.src.includes(encodeURI(url.replace(/ /g, '%20'))))) {
        if (activeAudio.paused) {
            activeAudio.play();
            playerPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            playerPlayBtn.classList.add('playing');
            if (activeAudioBtn) activeAudioBtn.classList.add('playing-active');
        } else {
            activeAudio.pause();
            playerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            playerPlayBtn.classList.remove('playing');
            if (activeAudioBtn) activeAudioBtn.classList.remove('playing-active');
        }
        return;
    }

    // Start a NEW audio track
    const newAudio = new Audio(url);
    
    // Find the button that triggered this
    const btnId = playerUI.dataset.pendingBtnId;
    const sceneBtn = sourceButton || document.querySelector(`button[data-player-id="${btnId}"]`);
    
    if (activeAudioBtn) {
        activeAudioBtn.classList.remove('playing-active');
        activeAudioBtn.innerHTML = activeAudioBtn.innerHTML.replace('TOCANDO...', 'CONTINUAR').replace('fa-pause', 'fa-play');
    }
    
    activeAudioBtn = sceneBtn;
    if (activeAudioBtn) {
        activeAudioBtn.classList.add('playing-active');
        activeAudioBtn.innerHTML = activeAudioBtn.innerHTML.replace('OUVIR ÁUDIO', 'TOCANDO...').replace('CONTINUAR', 'TOCANDO...').replace('PLAY:', 'TOCANDO...').replace('fa-play', 'fa-pause');
    }

    // CROSSFADE LOGIC
    if (activeAudio && useFadeCheckbox.checked) {
        fadingOutAudio = activeAudio;
        let fadeOutVol = fadingOutAudio.volume;
        
        newAudio.volume = 0;
        newAudio.play().catch(console.error);
        
        clearInterval(crossfadeInterval);
        // 3 seconds fade = 30 steps of 100ms
        const step = 1 / 30; 
        
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
        if (activeAudio) activeAudio.pause();
        newAudio.volume = 1;
        newAudio.play().catch(console.error);
    }

    activeAudio = newAudio;
    playerUI.dataset.pendingUrl = ""; // Clear pending
    
    playerPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    playerPlayBtn.classList.add('playing');

    activeAudio.addEventListener('timeupdate', () => {
        if (!activeAudio) return;
        playerCurrentTime.innerText = formatTime(activeAudio.currentTime);
        playerTotalTime.innerText = formatTime(activeAudio.duration);
        if (activeAudio.duration) {
            playerTimeline.value = (activeAudio.currentTime / activeAudio.duration) * 100;
        }
    });

    activeAudio.addEventListener('ended', () => {
        playerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        playerPlayBtn.classList.remove('playing');
        if (activeAudioBtn) {
            activeAudioBtn.classList.remove('playing-active');
            activeAudioBtn.innerHTML = '<i class="fa-solid fa-check"></i> FINALIZADO';
        }
    });
}

// Event Listeners for Player UI
if (playerPlayBtn) {
    playerPlayBtn.addEventListener('click', () => togglePlayerPlay());
}

if (playerCloseBtn) {
    playerCloseBtn.addEventListener('click', () => {
        playerUI.classList.remove('visible');
        setTimeout(() => playerUI.classList.add('hidden'), 400);
    });
}

if (playerTimeline) {
    playerTimeline.addEventListener('input', (e) => {
        if (activeAudio && activeAudio.duration) {
            const seekTime = (e.target.value / 100) * activeAudio.duration;
            activeAudio.currentTime = seekTime;
        }
    });
}


// --- AUDIO PLAYER ---
let currentAudio = null;
let currentAudioButton = null;

function toggleAudio(url, buttonElement) {
    const defaultText = buttonElement.innerHTML.includes('INTRO') ? 'PLAY: INTRODUÇÃO' : 'PLAY: FINAL';

    if (currentAudio && currentAudio.src.includes(encodeURI(url.replace(/ /g, '%20')))) {
        if (!currentAudio.paused) {
            currentAudio.pause();
            buttonElement.innerHTML = '<i class="fa-solid fa-play"></i> CONTINUAR';
            buttonElement.classList.remove('playing');
        } else {
            currentAudio.play();
            buttonElement.innerHTML = '<i class="fa-solid fa-pause"></i> TOCANDO...';
            buttonElement.classList.add('playing');
        }
        return;
    }
    
    if (currentAudio) {
        currentAudio.pause();
        if (currentAudioButton) {
            const prevDefaultText = currentAudioButton.innerHTML.includes('FINAL') ? 'PLAY: FINAL' : 'PLAY: INTRODUÇÃO';
            currentAudioButton.innerHTML = '<i class="fa-solid fa-play"></i> ' + prevDefaultText;
            currentAudioButton.classList.remove('playing');
        }
    }
    
    currentAudio = new Audio(url);
    currentAudioButton = buttonElement;
    
    currentAudio.play().catch(e => alert("Erro ao reproduzir áudio: " + e.message));
    buttonElement.innerHTML = '<i class="fa-solid fa-pause"></i> TOCANDO...';
    buttonElement.classList.add('playing');
    
    currentAudio.onended = () => {
        buttonElement.innerHTML = '<i class="fa-solid fa-check"></i> FINALIZADO';
        buttonElement.classList.remove('playing');
        currentAudio = null;
    };
}
