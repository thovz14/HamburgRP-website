import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    let currentServerIP = 'play.papersmp.net'; // Default

    // Firestore Live Listener
    const configRef = doc(db, 'config', 'website');
    onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            updateWebsiteContent(data);
        } else {
            console.log("No config found in Firestore, using defaults.");
        }
    });

    function updateWebsiteContent(data) {
        // Update Server IP Widget
        if (data.serverIP) {
            currentServerIP = data.serverIP;
            const ipWidget = document.querySelector('.widget[data-type="ip"]');
            if (ipWidget) {
                ipWidget.setAttribute('data-copy', data.serverIP);
                ipWidget.querySelector('h2').textContent = data.serverIP.toUpperCase();
            }
        }

        // Update Discord Widget
        if (data.discordLink) {
            const discordWidget = document.querySelector('.widget[data-type="discord"]');
            if (discordWidget) {
                discordWidget.setAttribute('data-copy', data.discordLink);
            }
        }

        // Update Owners/Staff Section
        const ownersContainer = document.querySelector('.owners');
        if (ownersContainer && data.staff) {
            ownersContainer.innerHTML = ''; // Clear current
            
            data.staff.forEach(staff => {
                const card = document.createElement('div');
                card.className = 'owner-card';
                card.innerHTML = `
                    <div class="avatar-wrapper">
                        <img src="https://minotar.net/helm/${staff.name}/100.png" alt="${staff.name}" class="owner-avatar">
                        <div class="status-indicator offline" id="status-${staff.name}" title="Checking status..."></div>
                    </div>
                    <div class="owner-info">
                        <h3>${staff.name}</h3>
                        <span class="badge ${staff.rankClass}">${staff.rank}</span>
                    </div>
                `;
                
                // Add modal click listener
                card.addEventListener('click', () => {
                    openModal(staff);
                });
                
                ownersContainer.appendChild(card);
            });
            
            // Re-fetch status immediately to color new dots
            updateServerStatus();
        }

        // Update "Updates" nav link gold glow
        const updatesLinks = document.querySelectorAll('.nav-link[href="updates.html"]');
        updatesLinks.forEach(link => {
            if (data.hasNewUpdates) {
                link.classList.add('has-updates');
            } else {
                link.classList.remove('has-updates');
            }
        });
    }

    // Modal Logic
    const modal = document.getElementById('player-modal');
    const closeBtn = document.querySelector('.close-btn');

    async function openModal(staff) {
        if (!modal) return;

        // Show modal immediately with loading state
        document.getElementById('modal-name').textContent = staff.name;
        document.getElementById('modal-skin').src = `https://crafatar.com/renders/body/${staff.name}?overlay&scale=10`;
        
        const rankBadge = document.getElementById('modal-rank');
        rankBadge.textContent = staff.rank;
        rankBadge.className = `badge ${staff.rankClass}`;

        document.getElementById('modal-uuid').textContent = 'Loading...';
        document.getElementById('modal-model').textContent = 'Loading...';

        // Check online status
        const statusRow = document.getElementById('modal-status');
        const statusIndicator = document.querySelector(`#status-${staff.name}`);
        const isOnline = statusIndicator && statusIndicator.classList.contains('online');
        statusRow.innerHTML = `
            <div class="status-dot ${isOnline ? 'online' : 'offline'}"></div>
            <span>${isOnline ? 'Online on server' : 'Offline'}</span>
        `;

        modal.classList.add('active');

        // Fetch real Minecraft profile data
        try {
            const response = await fetch(`https://playerdb.co/api/player/minecraft/${staff.name}`);
            const data = await response.json();
            
            if (data.success && data.data && data.data.player) {
                const player = data.data.player;
                document.getElementById('modal-uuid').textContent = player.id;
                
                // Use the real UUID for the skin render
                document.getElementById('modal-skin').src = `https://crafatar.com/renders/body/${player.raw_id}?overlay&scale=10`;

                // Decode skin model from properties
                try {
                    const textureData = JSON.parse(atob(player.properties[0].value));
                    const skinModel = textureData.textures.SKIN.metadata?.model === 'slim' ? 'Slim (Alex)' : 'Classic (Steve)';
                    document.getElementById('modal-model').textContent = skinModel;
                } catch {
                    document.getElementById('modal-model').textContent = 'Classic (Steve)';
                }
            } else {
                document.getElementById('modal-uuid').textContent = 'Not found';
                document.getElementById('modal-model').textContent = 'Unknown';
            }
        } catch (error) {
            console.error('Error fetching player data:', error);
            document.getElementById('modal-uuid').textContent = 'Error';
            document.getElementById('modal-model').textContent = 'Error';
        }
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Copy Widget Logic
    const copyables = document.querySelectorAll('.copyable');
    copyables.forEach(widget => {
        widget.addEventListener('click', async () => {
            const textToCopy = widget.getAttribute('data-copy');
            const tooltip = widget.querySelector('.tooltip');
            try {
                await navigator.clipboard.writeText(textToCopy);
                tooltip.classList.add('show');
                widget.style.transform = 'scale(0.97)';
                setTimeout(() => widget.style.transform = '', 150);
                setTimeout(() => tooltip.classList.remove('show'), 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        });
    });

    // Live Server Status
    async function updateServerStatus() {
        const apiUrl = `https://api.mcstatus.io/v2/status/java/${currentServerIP}`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            const playerCountEl = document.getElementById('player-count');
            
            if (data && data.online) {
                if (playerCountEl) {
                    playerCountEl.textContent = `${data.players.online} players online`;
                }
                
                let onlinePlayers = [];
                if (data.players && data.players.list) {
                    onlinePlayers = data.players.list.map(p => {
                        const name = typeof p === 'object' ? p.name_clean : p;
                        return name ? name.toLowerCase() : '';
                    });
                }
                
                const indicators = document.querySelectorAll('.status-indicator');
                indicators.forEach(indicator => {
                    const idParts = indicator.id.split('-');
                    if (idParts.length > 1) {
                        const playerName = idParts[1].toLowerCase();
                        if (onlinePlayers.includes(playerName)) {
                            indicator.className = 'status-indicator online';
                            indicator.title = 'Online';
                        } else {
                            indicator.className = 'status-indicator offline';
                            indicator.title = 'Offline';
                        }
                    }
                });
            } else {
                if (playerCountEl) {
                    playerCountEl.textContent = 'Server offline';
                }
                const indicators = document.querySelectorAll('.status-indicator');
                indicators.forEach(indicator => {
                    indicator.className = 'status-indicator offline';
                    indicator.title = 'Offline';
                });
            }
        } catch (error) {
            console.error('Error fetching server status:', error);
        }
    }

    // Call immediately, then every 60 seconds
    updateServerStatus();
    setInterval(updateServerStatus, 6000);
});
