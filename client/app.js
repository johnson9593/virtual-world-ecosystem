// API Configuration
const API_URL = window.location.origin + '/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let refreshInterval = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    if (authToken) {
        verifyToken();
    } else {
        showScreen('auth');
    }
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('create-creature-form').addEventListener('submit', handleCreateCreature);
}

// Auth functions
function showAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            showDashboard();
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('Connection error. Please try again.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            showDashboard();
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('Connection error. Please try again.');
    }
}

async function verifyToken() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            showDashboard();
        } else {
            logout();
        }
    } catch (error) {
        logout();
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    showScreen('auth');
}

// Screen management
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${screen}-screen`).classList.add('active');
}

function showDashboard() {
    showScreen('dashboard');
    
    document.getElementById('user-info').textContent = `👤 ${currentUser.username}`;
    
    if (currentUser.isAdmin) {
        document.getElementById('admin-btn').style.display = 'inline-block';
    }
    
    showTab('world');
    loadWorldData();
    
    // Auto-refresh every 10 seconds
    refreshInterval = setInterval(() => {
        const activeTab = document.querySelector('.tab-content.active').id;
        if (activeTab === 'world-tab') {
            loadWorldData();
        } else if (activeTab === 'creatures-tab') {
            loadMyCreatures();
        } else if (activeTab === 'admin-tab' && currentUser.isAdmin) {
            loadAdminData();
        }
    }, 10000);
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    if (tab === 'world') {
        loadWorldData();
    } else if (tab === 'creatures') {
        loadMyCreatures();
    } else if (tab === 'admin') {
        loadAdminData();
    }
}

// World data functions
async function loadWorldData() {
    try {
        const response = await fetch(`${API_URL}/world/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateWorldStats(data);
            drawWorldMap(data.creatures);
        }
    } catch (error) {
        console.error('Error loading world data:', error);
    }
}

function updateWorldStats(data) {
    document.getElementById('world-day').textContent = data.day;
    document.getElementById('world-total').textContent = data.total_creatures;
    document.getElementById('world-herbivores').textContent = data.herbivores;
    document.getElementById('world-carnivores').textContent = data.carnivores;
    document.getElementById('world-omnivores').textContent = data.omnivores;
    document.getElementById('world-food').textContent = data.food_available;
}

function drawWorldMap(creatures) {
    const canvas = document.getElementById('world-map');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 100) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    // Draw creatures
    creatures.forEach(creature => {
        if (creature.isAlive) {
            const x = (creature.position.x / 1000) * canvas.width;
            const y = (creature.position.y / 1000) * canvas.height;
            
            // Set color based on type
            if (creature.type === 'Herbivore') {
                ctx.fillStyle = '#56ab2f';
            } else if (creature.type === 'Carnivore') {
                ctx.fillStyle = '#eb3349';
            } else {
                ctx.fillStyle = '#f2994a';
            }
            
            // Draw creature
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw health indicator
            const healthSize = (creature.health / 100) * 4;
            ctx.strokeStyle = creature.health > 50 ? '#27ae60' : '#e74c3c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 8 + healthSize, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
}

// Creature functions
async function loadMyCreatures() {
    try {
        const response = await fetch(`${API_URL}/creatures/my`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const creatures = await response.json();
            displayCreatures(creatures, 'creatures-list');
        }
    } catch (error) {
        console.error('Error loading creatures:', error);
    }
}

function displayCreatures(creatures, containerId) {
    const container = document.getElementById(containerId);
    
    if (creatures.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">No creatures yet. Create your first creature!</p>';
        return;
    }
    
    container.innerHTML = creatures.map(creature => `
        <div class="creature-card ${creature.is_alive ? '' : 'dead'}">
            <div class="creature-header">
                <span class="creature-name">${creature.name}</span>
                <span class="creature-type ${creature.type}">${creature.type}</span>
            </div>
            <div class="creature-stats">
                <div class="stat-row">
                    <span>Age: ${creature.age} days</span>
                    <span class="status-badge ${creature.is_alive ? 'alive' : 'dead'}">
                        ${creature.is_alive ? '✓ Alive' : '✗ Dead'}
                    </span>
                </div>
                ${creature.is_alive ? `
                    <div class="stat-row">
                        <span>Health: ${creature.health}%</span>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-fill health" style="width: ${creature.health}%"></div>
                    </div>
                    <div class="stat-row">
                        <span>Energy: ${creature.energy}%</span>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-fill energy" style="width: ${creature.energy}%"></div>
                    </div>
                ` : `
                    <div class="stat-row">
                        <span>Died: ${new Date(creature.died_at).toLocaleDateString()}</span>
                    </div>
                `}
            </div>
        </div>
    `).join('');
}

async function handleCreateCreature(e) {
    e.preventDefault();
    
    const name = document.getElementById('creature-name').value;
    const type = document.querySelector('input[name="creature-type"]:checked')?.value;
    
    if (!type) {
        showMessage('Please select a creature type', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/creatures`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, type })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(`${name} has been created successfully!`, 'success');
            document.getElementById('create-creature-form').reset();
            
            // Refresh creatures list after 1 second
            setTimeout(() => {
                showTab('creatures');
            }, 1500);
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Connection error. Please try again.', 'error');
    }
}

// Admin functions
async function loadAdminData() {
    if (!currentUser.isAdmin) return;
    
    try {
        // Load all creatures
        const creaturesResponse = await fetch(`${API_URL}/admin/creatures/all`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (creaturesResponse.ok) {
            const creatures = await creaturesResponse.json();
            displayCreatures(creatures, 'admin-creatures-list');
        }
        
        // Load events
        const eventsResponse = await fetch(`${API_URL}/admin/events?limit=20`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (eventsResponse.ok) {
            const events = await eventsResponse.json();
            displayEvents(events);
        }
        
        // Load users
        const usersResponse = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            displayUsers(users);
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

function displayEvents(events) {
    const container = document.getElementById('admin-events-list');
    
    if (events.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">No events yet.</p>';
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="event-item">
            <div class="event-type">${event.event_type}</div>
            <div class="event-description">${event.description}</div>
            <div class="event-time">${new Date(event.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
}

function displayUsers(users) {
    const container = document.getElementById('admin-users-list');
    
    container.innerHTML = users.map(user => `
        <div class="user-card">
            <h4>👤 ${user.username}</h4>
            <p>📧 ${user.email}</p>
            <p>📅 Joined: ${new Date(user.created_at).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// Utility functions
function showError(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('create-message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 5000);
}