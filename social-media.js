import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    let videos = [];
    let activeFilter = 'all';

    const grid = document.getElementById('video-grid');
    const emptyState = document.getElementById('empty-state');
    const detailModal = document.getElementById('detail-modal');
    const detailModalClose = document.getElementById('detail-modal-close');
    const filterTabs = document.querySelectorAll('.filter-tab');

    // Setup Firestore listener
    const configRef = doc(db, 'config', 'website');
    onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            videos = data.socialMedia || [];
            
            // Add internal IDs for modal linking
            videos = videos.map((v, i) => ({ ...v, _id: i }));
            
            renderGrid();
        } else {
            console.log("No config document found!");
            videos = [];
            renderGrid();
        }
    });

    function renderGrid() {
        const filtered = activeFilter === 'all'
            ? videos
            : videos.filter(v => v.platform === activeFilter);

        grid.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        filtered.forEach((video, index) => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.style.animationDelay = `${index * 0.08}s`;
            card.dataset.id = video._id;

            const thumbHTML = video.thumbnail
                ? `<img class="video-card-thumb" src="${escapeHTML(video.thumbnail)}" alt="${escapeHTML(video.title)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="video-card-no-img" style="display:none;">${video.platform === 'youtube' ? '<i class="fa-brands fa-youtube"></i>' : '<i class="fa-brands fa-tiktok"></i>'}</div>`
                : `<div class="video-card-no-img">${video.platform === 'youtube' ? '<i class="fa-brands fa-youtube"></i>' : '<i class="fa-brands fa-tiktok"></i>'}</div>`;

            card.innerHTML = `
                ${thumbHTML}
                <div class="video-card-overlay">
                    <div class="video-card-title">${escapeHTML(video.title)}</div>
                    <div class="video-card-platform ${video.platform}">
                        ${video.platform === 'tiktok' ? '<i class="fa-brands fa-tiktok" style="margin-right:4px;"></i> TikTok' : '<i class="fa-brands fa-youtube" style="margin-right:4px;"></i> YouTube'}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => openDetail(video._id));
            grid.appendChild(card);
        });
    }

    // Filter Tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            renderGrid();
        });
    });

    // Modal Logic
    function openModal(modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    detailModalClose.addEventListener('click', () => closeModal(detailModal));

    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeModal(detailModal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal(detailModal);
    });

    function openDetail(id) {
        const video = videos.find(v => v._id === id);
        if (!video) return;

        document.getElementById('detail-title').textContent = video.title;
        document.getElementById('detail-img').src = video.thumbnail || '';
        document.getElementById('detail-img').alt = video.title;

        const thumbContainer = document.getElementById('detail-thumbnail');
        thumbContainer.style.display = video.thumbnail ? 'flex' : 'none';

        const badge = document.getElementById('detail-platform');
        badge.innerHTML = video.platform === 'tiktok' ? '<i class="fa-brands fa-tiktok" style="margin-right:4px;"></i> TikTok' : '<i class="fa-brands fa-youtube" style="margin-right:4px;"></i> YouTube';
        badge.className = 'detail-badge ' + video.platform;

        const linkEl = document.getElementById('detail-link');
        linkEl.href = video.link;
        linkEl.textContent = 'Watch video →';

        openModal(detailModal);
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
