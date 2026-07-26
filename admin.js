import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    const configIp = document.getElementById('config-ip');
    const configDiscord = document.getElementById('config-discord');
    const staffListContainer = document.getElementById('staff-list');
    const addStaffBtn = document.getElementById('add-staff-btn');
    const saveStatus = document.getElementById('save-status');
    const configUpdatesBadge = document.getElementById('config-updates-badge');

    let saveTimeout = null;
    let isLoading = false; // Prevent auto-save while loading data

    // Gold glow on Updates nav link (works on admin page too)
    const configRef = doc(db, 'config', 'website');
    onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const updatesLinks = document.querySelectorAll('.nav-link[href="updates.html"]');
            updatesLinks.forEach(link => {
                if (data.hasNewUpdates) {
                    link.classList.add('has-updates');
                } else {
                    link.classList.remove('has-updates');
                }
            });
        }
    });

    // Authentication State
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            loadConfiguration();
        } else {
            loginSection.style.display = 'block';
            dashboardSection.style.display = 'none';
        }
    });

    // Login Logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        loginError.textContent = '';

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Login error:', error.code, error.message);
            if (error.code === 'auth/invalid-email') {
                loginError.textContent = 'Voer een geldig e-mailadres in.';
            } else if (error.code === 'auth/wrong-password') {
                loginError.textContent = 'Onjuiste gebruikersnaam of wachtwoord.';
            } else if (error.code === 'auth/user-not-found') {
                loginError.textContent = 'Geen account gevonden met dit e-mailadres.';
            } else if (error.code === 'auth/too-many-requests') {
                loginError.textContent = 'Teveel pogingen. Probeer het later opnieuw.';
            } else if (error.code === 'auth/network-request-failed') {
                loginError.textContent = 'Verbindingsprobleem. Controleer je internetverbinding.';
            } else {
                loginError.textContent = `Fout: ${error.message}`;
            }
        }
    });

    // Logout Logic
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });

    // Auto-save with debounce
    function scheduleAutoSave() {
        if (isLoading) return;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveStatus.textContent = 'Saving...';
        saveStatus.style.color = 'var(--text-muted)';
        saveTimeout = setTimeout(() => autoSave(), 800);
    }

    async function autoSave() {
        const staffInputs = document.querySelectorAll('.staff-input-row');
        const staff = Array.from(staffInputs).map(row => ({
            name: row.querySelector('.staff-name').value,
            userid: row.querySelector('.staff-id').value,
            rank: row.querySelector('.staff-rank').value,
            rankClass: row.querySelector('.staff-class').value,
            playtime: '0',
            kills: '0',
            deaths: '0'
        }));

        const configData = {
            serverIP: configIp.value,
            discordLink: configDiscord.value,
            hasNewUpdates: configUpdatesBadge.checked,
            staff: staff
        };

        try {
            await setDoc(doc(db, 'config', 'website'), configData);
            saveStatus.textContent = 'Saved ✓';
            saveStatus.style.color = 'var(--accent-green)';
            setTimeout(() => saveStatus.textContent = '', 3000);
        } catch (error) {
            console.error('Error saving config:', error);
            saveStatus.textContent = 'Error saving.';
            saveStatus.style.color = '#e74c3c';
        }
    }

    // Listen for changes on IP, Discord, and toggle
    configIp.addEventListener('input', scheduleAutoSave);
    configDiscord.addEventListener('input', scheduleAutoSave);
    configUpdatesBadge.addEventListener('change', () => {
        updateUpdatesNavState(configUpdatesBadge.checked);
        scheduleAutoSave();
    });

    function updateUpdatesNavState(isActive) {
        const updatesLinks = document.querySelectorAll('.nav-link[href="updates.html"]');
        updatesLinks.forEach(link => {
            if (isActive) {
                link.classList.add('has-updates');
            } else {
                link.classList.remove('has-updates');
            }
        });
    }

    // Staff member creation
    function createStaffInput(name = '', userid = '', rank = 'OWNER', rankClass = 'owner-badge') {
        const div = document.createElement('div');
        div.className = 'staff-input-row';
        div.innerHTML = `
            <input type="text" class="staff-name" placeholder="Roblox Name" value="${name}">
            <input type="text" class="staff-id" placeholder="Roblox ID (cijfers)" value="${userid}">
            <input type="text" class="staff-rank" placeholder="Rank (e.g. OWNER)" value="${rank}">
            <select class="staff-class">
                <option value="owner-badge" ${rankClass === 'owner-badge' ? 'selected' : ''}>Gold Badge</option>
                <option value="co-owner-badge" ${rankClass === 'co-owner-badge' ? 'selected' : ''}>Red Badge</option>
                <option value="badge" ${rankClass === 'badge' ? 'selected' : ''}>Default Badge</option>
            </select>
            <button type="button" class="btn btn-secondary remove-staff-btn"><i class="fa-solid fa-trash"></i></button>
        `;

        // Auto-save on any staff field change
        div.querySelector('.staff-name').addEventListener('input', scheduleAutoSave);
        div.querySelector('.staff-id').addEventListener('input', scheduleAutoSave);
        div.querySelector('.staff-rank').addEventListener('input', scheduleAutoSave);
        div.querySelector('.staff-class').addEventListener('change', scheduleAutoSave);

        div.querySelector('.remove-staff-btn').addEventListener('click', () => {
            div.remove();
            scheduleAutoSave();
        });

        staffListContainer.appendChild(div);
    }

    addStaffBtn.addEventListener('click', () => {
        createStaffInput();
        scheduleAutoSave();
    });

    const defaultConfig = {
        serverIP: 'Roblox Hamburg RP',
        discordLink: 'https://discord.gg/mQt4J5Brug',
        hasNewUpdates: false,
        staff: [
            { name: 'tienmaster10', userid: '2434076326', rank: 'OWNER', rankClass: 'owner-badge' },
            { name: 'j3ss3_0182', userid: '12345678', rank: 'CO-OWNER', rankClass: 'co-owner-badge' }
        ]
    };

    async function loadConfiguration() {
        isLoading = true;
        try {
            const docRef = doc(db, 'config', 'website');
            const docSnap = await getDoc(docRef);

            let data;
            if (docSnap.exists()) {
                data = docSnap.data();
            } else {
                data = defaultConfig;
                await setDoc(docRef, data);
            }

            configIp.value = data.serverIP || defaultConfig.serverIP;
            configDiscord.value = data.discordLink || defaultConfig.discordLink;
            configUpdatesBadge.checked = data.hasNewUpdates || false;
            updateUpdatesNavState(configUpdatesBadge.checked);

            staffListContainer.innerHTML = '';
            const staffList = (data.staff && Array.isArray(data.staff)) ? data.staff : defaultConfig.staff;
            staffList.forEach(staff => {
                createStaffInput(staff.name, staff.userid || '', staff.rank, staff.rankClass);
            });

        } catch (error) {
            console.error('Error loading config:', error);
            saveStatus.textContent = 'Error loading configuration.';
            saveStatus.style.color = '#e74c3c';
        } finally {
            isLoading = false;
        }
    }
});
