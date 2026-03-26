import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const apiKey = ""; // Insert Your Gemini API Key here
const TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

let state = {
    user: { name: 'Guest', plan: 'ultra', messages: 0, loggedIn: false },
    history: [],
    threads: [],
    currentSessionId: Date.now().toString(),
    isGenerating: false,
    settings: { sound: true, scroll: true, persona: 'default', language: 'English', creativity: 0.7 }
};

// Application State Management
async function init() {
    const saved = localStorage.getItem('zxnv_state');
    if(saved) Object.assign(state, JSON.parse(saved));
    
    updateUI();
    renderHistory();
    renderSidebarThreads();

    if(!state.user.loggedIn) {
        document.getElementById('auth-modal').classList.remove('hidden');
    } else {
        document.getElementById('auth-modal').classList.add('hidden');
    }
}

// Logic for Sending Messages
window.sendMessage = async function() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if(!text) return;

    const message = { id: crypto.randomUUID(), role: 'user', content: text };
    state.history.push(message);
    appendMessage(message);
    input.value = '';
    
    await callGeminiText();
};

async function callGeminiText() {
    state.isGenerating = true;
    toggleAIStatus(true, "Thinking...");

    try {
        const response = await fetch(TEXT_API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                contents: state.history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }))
            })
        });
        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;

        const aiMsg = { id: crypto.randomUUID(), role: 'model', content: aiText };
        state.history.push(aiMsg);
        appendMessage(aiMsg);
        save();
    } catch(e) {
        console.error("API Error", e);
    } finally {
        state.isGenerating = false;
        toggleAIStatus(false);
    }
}

// UI Rendering Functions
function appendMessage(msg) {
    const container = document.getElementById('chat-container');
    const div = document.createElement('div');
    const isUser = msg.role === 'user';
    
    div.className = `flex flex-col w-full ${isUser ? 'msg-enter-user items-end' : 'msg-enter items-start'} mb-4`;
    div.innerHTML = `
        <div class="max-w-[85%] ${isUser ? 'bg-white text-black' : 'bg-[#111] text-gray-200'} rounded-[24px] px-6 py-4 shadow-lg">
            <div class="content-body prose prose-invert">${DOMPurify.sanitize(marked.parse(msg.content))}</div>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    const c = document.getElementById('chat-container');
    c.scrollTop = c.scrollHeight;
}

function save() {
    localStorage.setItem('zxnv_state', JSON.stringify(state));
}

function updateUI() {
    document.getElementById('user-display-name').textContent = state.user.name;
}

function toggleAIStatus(loading, text) {
    document.getElementById('ai-status-text').textContent = text;
}

window.toggleSettings = () => document.getElementById('settings-panel').classList.toggle('open');
window.startNewChat = () => { state.history = []; renderHistory(); save(); };

document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    state.user.name = document.getElementById('username').value;
    state.user.loggedIn = true;
    document.getElementById('auth-modal').classList.add('hidden');
    save();
    updateUI();
};

document.addEventListener('DOMContentLoaded', init);