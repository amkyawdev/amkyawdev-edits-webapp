// ==================== Configuration ====================
const CONFIG = {
    // Backend API URL - Update this after Vercel deployment
    API_BASE: 'https://amkyawdev-edits-api.vercel.app',
    // For local development, use:
    // API_BASE: 'http://localhost:8000',
    
    // Supported video formats
    SUPPORTED_FORMATS: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    
    // Timeline settings
    TIMELINE_SKIP_SECONDS: 5,
};

// ==================== State Management ====================
const state = {
    videoFile: null,
    videoFilename: null,
    videoInfo: null,
    isPlaying: false,
    isProcessing: false,
    trimStart: 0,
    trimEnd: 0,
    currentFilter: null,
    filterValue: 1.0,
};

// ==================== DOM Elements ====================
const elements = {
    // Loader
    loader: document.getElementById('loader'),
    app: document.getElementById('app'),
    
    // Upload
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    btnBrowse: document.getElementById('btn-browse'),
    
    // Editor
    editorArea: document.getElementById('editor-area'),
    videoPlayer: document.getElementById('video-player'),
    videoOverlay: document.getElementById('video-overlay'),
    btnPlay: document.getElementById('btn-play'),
    processingIndicator: document.getElementById('processing-indicator'),
    
    // Timeline
    currentTime: document.getElementById('current-time'),
    durationTime: document.getElementById('duration-time'),
    timeline: document.getElementById('timeline'),
    timelineTrack: document.getElementById('timeline-track'),
    timelineProgress: document.getElementById('timeline-progress'),
    timelineHandle: document.getElementById('timeline-handle'),
    btnSkipBack: document.getElementById('btn-skip-back'),
    btnSkipForward: document.getElementById('btn-skip-forward'),
    btnTimelinePlay: document.getElementById('btn-timeline-play'),
    
    // Trim
    trimStartInput: document.getElementById('trim-start-input'),
    trimEndInput: document.getElementById('trim-end-input'),
    trimStart: document.getElementById('trim-start'),
    trimEnd: document.getElementById('trim-end'),
    trimRegion: document.getElementById('trim-region'),
    btnApplyTrim: document.getElementById('btn-apply-trim'),
    btnResetTrim: document.getElementById('btn-reset-trim'),
    
    // Filters
    filterBtns: document.querySelectorAll('.filter-btn'),
    filterSlider: document.getElementById('filter-slider'),
    filterSliderLabel: document.getElementById('filter-slider-label'),
    filterValue: document.getElementById('filter-value'),
    filterValueDisplay: document.getElementById('filter-value-display'),
    
    // Export
    btnExport: document.getElementById('btn-export'),
    
    // Toast
    toastContainer: document.getElementById('toast-container'),
};

// ==================== Utility Functions ====================
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseTime(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showProcessing(show = true) {
    elements.processingIndicator.classList.toggle('hidden', !show);
    state.isProcessing = show;
    updateButtonStates();
}

function updateButtonStates() {
    elements.btnExport.disabled = !state.videoFile || state.isProcessing;
    elements.btnApplyTrim.disabled = !state.videoFile || state.isProcessing;
}

// ==================== Loader Animation ====================
function hideLoader() {
    elements.loader.classList.add('fade-out');
    setTimeout(() => {
        elements.loader.classList.add('hidden');
        elements.app.classList.remove('hidden');
    }, 500);
}

// ==================== API Functions ====================
async function uploadVideo(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/video/upload`, {
            method: 'POST',
            body: formData,
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

async function trimVideo(filename, startTime, endTime, includeAudio = true) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/video/trim?${new URLSearchParams({
            filename,
            start_time: startTime,
            end_time: endTime,
            include_audio: includeAudio,
        })}`, {
            method: 'POST',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Trim failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Trim error:', error);
        throw error;
    }
}

async function applyFilter(filename, filterType, value = null) {
    try {
        const params = new URLSearchParams({ filename, filter_type: filterType });
        if (value !== null) {
            params.append('value', value);
        }
        
        const response = await fetch(`${CONFIG.API_BASE}/api/video/filter?${params}`, {
            method: 'POST',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Filter failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Filter error:', error);
        throw error;
    }
}

// ==================== Video Functions ====================
function loadVideo(file) {
    const url = URL.createObjectURL(file);
    elements.videoPlayer.src = url;
    
    elements.videoPlayer.onloadedmetadata = () => {
        state.videoFile = file;
        state.trimStart = 0;
        state.trimEnd = elements.videoPlayer.duration;
        
        elements.durationTime.textContent = formatTime(elements.videoPlayer.duration);
        elements.trimStartInput.value = formatTime(state.trimStart);
        elements.trimEndInput.value = formatTime(state.trimEnd);
        
        updateTrimMarkers();
        
        // Show editor, hide upload
        elements.uploadArea.classList.add('hidden');
        elements.editorArea.classList.remove('hidden');
        
        updateButtonStates();
        showToast('Video loaded successfully!');
    };
    
    elements.videoPlayer.onerror = () => {
        showToast('Failed to load video. Please try another file.', 'error');
    };
}

async function handleFileSelect(file) {
    if (!file) return;
    
    // Validate file type
    if (!CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
        showToast('Unsupported video format. Please use MP4, WebM, or MOV.', 'error');
        return;
    }
    
    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
        showToast('File too large. Maximum size is 500MB.', 'error');
        return;
    }
    
    showProcessing(true);
    
    try {
        // Upload to backend
        const response = await uploadVideo(file);
        state.videoFilename = response.filename;
        state.videoInfo = response;
        
        // Load video
        loadVideo(file);
        
    } catch (error) {
        showToast(`Failed to upload: ${error.message}`, 'error');
        console.error(error);
    } finally {
        showProcessing(false);
    }
}

function togglePlay() {
    if (elements.videoPlayer.paused) {
        elements.videoPlayer.play();
        state.isPlaying = true;
        updatePlayButton();
    } else {
        elements.videoPlayer.pause();
        state.isPlaying = false;
        updatePlayButton();
    }
}

function updatePlayButton() {
    const playIcon = elements.btnTimelinePlay.querySelector('.play-icon');
    const pauseIcon = elements.btnTimelinePlay.querySelector('.pause-icon');
    
    if (state.isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        elements.videoOverlay.classList.remove('paused');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        elements.videoOverlay.classList.add('paused');
    }
}

// ==================== Timeline Functions ====================
function updateTimeline() {
    if (!elements.videoPlayer.duration) return;
    
    const current = elements.videoPlayer.currentTime;
    const duration = elements.videoPlayer.duration;
    const progress = (current / duration) * 100;
    
    elements.currentTime.textContent = formatTime(current);
    elements.timelineProgress.style.width = `${progress}%`;
    elements.timelineHandle.style.left = `${progress}%`;
}

function seekVideo(percentage) {
    if (!elements.videoPlayer.duration) return;
    elements.videoPlayer.currentTime = (percentage / 100) * elements.videoPlayer.duration;
}

function skipTime(seconds) {
    if (!elements.videoPlayer.duration) return;
    elements.videoPlayer.currentTime = Math.max(0, Math.min(
        elements.videoPlayer.duration,
        elements.videoPlayer.currentTime + seconds
    ));
}

// ==================== Trim Functions ====================
function updateTrimMarkers() {
    if (!elements.videoPlayer.duration) return;
    
    const duration = elements.videoPlayer.duration;
    const startPercent = (state.trimStart / duration) * 100;
    const endPercent = (state.trimEnd / duration) * 100;
    
    elements.trimStart.style.left = `${startPercent}%`;
    elements.trimEnd.style.left = `${100 - endPercent}%`;
    elements.trimRegion.style.left = `${startPercent}%`;
    elements.trimRegion.style.width = `${endPercent - startPercent}%`;
    
    elements.trimStartInput.value = formatTime(state.trimStart);
    elements.trimEndInput.value = formatTime(state.trimEnd);
}

function setTrimStart(position) {
    const time = (position / 100) * elements.videoPlayer.duration;
    state.trimStart = Math.max(0, Math.min(time, state.trimEnd - 1));
    updateTrimMarkers();
}

function setTrimEnd(position) {
    const time = (position / 100) * elements.videoPlayer.duration;
    state.trimEnd = Math.min(elements.videoPlayer.duration, Math.max(time, state.trimStart + 1));
    updateTrimMarkers();
}

async function applyTrim() {
    if (!state.videoFilename || state.isProcessing) return;
    
    if (state.trimStart >= state.trimEnd) {
        showToast('Invalid trim range', 'error');
        return;
    }
    
    showProcessing(true);
    
    try {
        const result = await trimVideo(
            state.videoFilename,
            state.trimStart,
            state.trimEnd,
            true
        );
        
        // Load the trimmed video
        elements.videoPlayer.src = `${CONFIG.API_BASE}${result.output_url}`;
        state.videoFilename = result.output_url.split('/').pop();
        
        showToast('Video trimmed successfully!');
    } catch (error) {
        showToast(`Trim failed: ${error.message}`, 'error');
    } finally {
        showProcessing(false);
    }
}

function resetTrim() {
    state.trimStart = 0;
    state.trimEnd = elements.videoPlayer.duration;
    updateTrimMarkers();
    showToast('Trim reset to full video');
}

// ==================== Filter Functions ====================
function setActiveFilter(filterType) {
    elements.filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterType);
    });
    
    state.currentFilter = filterType;
    
    // Show slider for adjustable filters
    const adjustableFilters = ['brightness', 'contrast', 'saturation', 'blur'];
    if (adjustableFilters.includes(filterType)) {
        elements.filterSlider.classList.remove('hidden');
        
        // Set slider label and range based on filter type
        if (filterType === 'blur') {
            elements.filterSliderLabel.textContent = 'Radius:';
            elements.filterValue.min = 1;
            elements.filterValue.max = 20;
            elements.filterValue.step = 1;
            elements.filterValue.value = 5;
        } else {
            elements.filterSliderLabel.textContent = 'Value:';
            elements.filterValue.min = 0;
            elements.filterValue.max = 2;
            elements.filterValue.step = 0.1;
            elements.filterValue.value = 1;
        }
        state.filterValue = parseFloat(elements.filterValue.value);
        elements.filterValueDisplay.textContent = state.filterValue;
    } else {
        elements.filterSlider.classList.add('hidden');
    }
}

function clearActiveFilter() {
    elements.filterBtns.forEach(btn => btn.classList.remove('active'));
    elements.filterSlider.classList.add('hidden');
    state.currentFilter = null;
    state.filterValue = 1.0;
}

async function applySelectedFilter() {
    if (!state.currentFilter || !state.videoFilename || state.isProcessing) return;
    
    showProcessing(true);
    
    try {
        const result = await applyFilter(
            state.videoFilename,
            state.currentFilter,
            state.filterValue
        );
        
        // Load the filtered video
        elements.videoPlayer.src = `${CONFIG.API_BASE}${result.output_url}`;
        state.videoFilename = result.output_url.split('/').pop();
        
        showToast(`Filter "${state.currentFilter}" applied!`);
    } catch (error) {
        showToast(`Filter failed: ${error.message}`, 'error');
    } finally {
        showProcessing(false);
    }
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    // File selection
    elements.btnBrowse.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    
    // Drag and drop
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.querySelector('.upload-box').classList.add('drag-over');
    });
    
    elements.uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        elements.uploadArea.querySelector('.upload-box').classList.remove('drag-over');
    });
    
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.querySelector('.upload-box').classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    });
    
    // Play/Pause
    elements.btnPlay.addEventListener('click', togglePlay);
    elements.btnTimelinePlay.addEventListener('click', togglePlay);
    
    elements.videoPlayer.addEventListener('click', togglePlay);
    elements.videoPlayer.addEventListener('ended', () => {
        state.isPlaying = false;
        updatePlayButton();
    });
    
    // Time update
    elements.videoPlayer.addEventListener('timeupdate', updateTimeline);
    
    // Skip buttons
    elements.btnSkipBack.addEventListener('click', () => skipTime(-CONFIG.TIMELINE_SKIP_SECONDS));
    elements.btnSkipForward.addEventListener('click', () => skipTime(CONFIG.TIMELINE_SKIP_SECONDS));
    
    // Timeline click
    elements.timeline.addEventListener('click', (e) => {
        const rect = elements.timelineTrack.getBoundingClientRect();
        const percentage = ((e.clientX - rect.left) / rect.width) * 100;
        seekVideo(Math.max(0, Math.min(100, percentage)));
    });
    
    // Trim controls
    elements.btnApplyTrim.addEventListener('click', applyTrim);
    elements.btnResetTrim.addEventListener('click', resetTrim);
    
    // Filter buttons
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) {
                clearActiveFilter();
            } else {
                setActiveFilter(btn.dataset.filter);
            }
        });
    });
    
    // Filter slider
    elements.filterValue.addEventListener('input', (e) => {
        state.filterValue = parseFloat(e.target.value);
        elements.filterValueDisplay.textContent = state.filterValue;
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowLeft':
                skipTime(-5);
                break;
            case 'ArrowRight':
                skipTime(5);
                break;
        }
    });
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Hide loader after a brief animation
    setTimeout(hideLoader, 1500);
});
