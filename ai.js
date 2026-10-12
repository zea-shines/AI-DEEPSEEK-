require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const app = express();

// ==========================================
// 1. SECURITY & MIDDLEWARE
// ==========================================
app.use(compression());
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            connectSrc: ["'self' https://api.deepseek.com"], 
            imgSrc: ["'self'", "data:"]
        }
    },
    crossOriginEmbedderPolicy: false 
}));

app.use(express.json());

// Middleware Autentikasi Password
const requireAuth = (req, res, next) => {
    const password = req.headers['x-app-password'];
    if (!process.env.APP_PASSWORD) {
        return res.status(500).json({ status: "error", message: "APP_PASSWORD belum diatur di file .env!" });
    }
    if (password === process.env.APP_PASSWORD) {
        next();
    } else {
        res.status(401).json({ status: "error", message: "Unauthorized: Password salah atau tidak ada!" });
    }
};

// ==========================================
// 2. AUTHENTICATION ENDPOINT
// ==========================================
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (!process.env.APP_PASSWORD) {
        return res.status(500).json({ status: "error", message: "APP_PASSWORD belum diatur di file .env!" });
    }
    if (password === process.env.APP_PASSWORD) {
        res.status(200).json({ status: "success", message: "Login berhasil" });
    } else {
        res.status(401).json({ status: "error", message: "Password salah!" });
    }
});

// ==========================================
// 3. DEEPSEEK API ENDPOINT (General Assistant)
// ==========================================
app.post('/api/ask-deepseek', requireAuth, async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ status: "error", message: "Pertanyaan tidak boleh kosong!" });
    }

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah asisten AI dan mentor pribadi yang cerdas, jujur, kritis, analitis, dan siap membantu pengguna memahami berbagai topik secara mendalam. Berikan penjelasan yang terstruktur, objektif, praktis, dan mudah dipahami dalam bahasa Indonesia." 
                    },
                    { role: "user", content: prompt }
                ],
                stream: false
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Gagal terhubung ke server DeepSeek');
        }

        const reply = data.choices[0].message.content;
        res.status(200).json({ status: "success", reply: reply });

    } catch (error) {
        console.error("[DEEPSEEK ERROR]:", error);
        res.status(500).json({ status: "error", message: error.message || "Terjadi kesalahan pada server AI." });
    }
});

// ==========================================
// 4. FRONTEND CHAT UI (HALAMAN UTAMA)
// ==========================================
app.get('/', (req, res) => {
    const htmlPage = `
<!DOCTYPE html>
<html lang="id" class="dark scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Hub — Ruang Diskusi & Belajar Pintar</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #030712; background-image: radial-gradient(rgba(59,130,246,.10) 1px, transparent 1px); background-size: 38px 38px; }
        .glass { background: rgba(17,24,39,.75); border: 1px solid rgba(148,163,184,.12); backdrop-filter: blur(14px); }
        .glow { box-shadow: 0 0 60px rgba(59,130,246,.12); }
    </style>
</head>
<body class="text-gray-100 antialiased min-h-screen flex flex-col justify-between">

    <!-- LOGIN SCREEN OVERLAY -->
    <div id="login-screen" class="fixed inset-0 z-50 bg-[#030712] flex items-center justify-center p-5">
        <div class="glass glow rounded-2xl p-8 max-w-md w-full text-center">
            <div class="text-blue-500 text-4xl mb-4"><i class="fa-solid fa-lock"></i></div>
            <h2 class="text-2xl font-extrabold text-white mb-2">Autentikasi Diperlukan</h2>
            <p class="text-gray-400 text-sm mb-6">Masukkan password akses untuk masuk ke AI Hub.</p>
            <form id="login-form" class="space-y-4">
                <input 
                    type="password" 
                    id="login-password" 
                    placeholder="Masukkan password..." 
                    required
                    class="w-full glass rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                >
                <button 
                    type="submit" 
                    class="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-900/30"
                >
                    Masuk
                </button>
                <p id="login-error" class="text-red-400 text-xs hidden"></p>
            </form>
        </div>
    </div>

    <!-- HEADER -->
    <header class="w-full max-w-4xl mx-auto px-5 py-5 flex items-center justify-between border-b border-gray-800/60">
        <div class="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
            <span class="text-blue-500"><i class="fa-solid fa-brain"></i></span>
            <span>AI Hub</span>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-xs px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                Powered by DeepSeek API
            </span>
            <button id="logout-btn" title="Keluar" class="text-gray-400 hover:text-red-400 text-sm transition px-2 py-1">
                <i class="fa-solid fa-right-from-bracket"></i>
            </button>
        </div>
    </header>

    <!-- MAIN CHAT CONTAINER -->
    <main class="w-full max-w-4xl mx-auto px-5 py-8 flex-1 flex flex-col">
        <div class="text-center mb-8">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ruang Diskusi & Eksplorasi</h1>
            <p class="text-gray-400 text-sm sm:text-base mt-2">Tanyakan apa saja: mulai dari pengetahuan umum, sains, strategi kerja, hingga teknologi.</p>
        </div>

        <!-- Chat Box Area -->
        <div id="chat-container" class="glass glow rounded-2xl p-4 sm:p-6 flex-1 min-h-[350px] max-h-[500px] overflow-y-auto space-y-4 mb-4">
            <div class="flex gap-3 items-start">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">AI</div>
                <div class="glass p-4 rounded-2xl rounded-tl-sm text-sm text-gray-200 max-w-[85%] leading-relaxed">
                    Halo! Saya siap membantumu berdiskusi dan memecahkan berbagai topik. Apa yang ingin kita bahas atau bedah hari ini?
                </div>
            </div>
        </div>

        <!-- Input Form -->
        <form id="chat-form" class="flex gap-2 relative">
            <input 
                type="text" 
                id="user-input" 
                placeholder="Tulis pertanyaan atau topik yang ingin dibahas..." 
                autocomplete="off"
                required
                class="flex-1 glass rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            >
            <button 
                type="submit" 
                id="send-btn"
                class="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/30"
            >
                <i class="fa-solid fa-paper-plane"></i>
            </button>
        </form>
    </main>

    <!-- FOOTER -->
    <footer class="w-full max-w-4xl mx-auto px-5 py-6 text-center text-xs text-gray-500 border-t border-gray-800/60">
        &copy; 2026 AI Hub. Berjalan di Cloud Vercel.
    </footer>

    <!-- SCRIPT CLIENT -->
    <script>
        const loginScreen = document.getElementById('login-screen');
        const loginForm = document.getElementById('login-form');
        const loginPassword = document.getElementById('login-password');
        const loginError = document.getElementById('login-error');
        const logoutBtn = document.getElementById('logout-btn');

        const chatForm = document.getElementById('chat-form');
        const userInput = document.getElementById('user-input');
        const chatContainer = document.getElementById('chat-container');
        const sendBtn = document.getElementById('send-btn');

        // Cek status login saat halaman dimuat
        const savedPassword = localStorage.getItem('ai_hub_password');
        if (savedPassword) {
            verifyInitialPassword(savedPassword);
        }

        async function verifyInitialPassword(pwd) {
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pwd })
                });
                if (res.ok) {
                    loginScreen.style.display = 'none';
                } else {
                    localStorage.removeItem('ai_hub_password');
                }
            } catch (err) {
                console.error(err);
            }
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pwd = loginPassword.value.trim();
            if (!pwd) return;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pwd })
                });
                const data = await res.json();

                if (res.ok && data.status === 'success') {
                    localStorage.setItem('ai_hub_password', pwd);
                    loginScreen.style.display = 'none';
                    loginError.classList.add('hidden');
                } else {
                    loginError.textContent = data.message || 'Password salah!';
                    loginError.classList.remove('hidden');
                }
            } catch (err) {
                loginError.textContent = 'Terjadi kesalahan jaringan.';
                loginError.classList.remove('hidden');
            }
        });

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('ai_hub_password');
            location.reload();
        });

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const promptText = userInput.value.trim();
            if(!promptText) return;

            appendMessage(promptText, 'user');
            userInput.value = '';
            userInput.disabled = true;
            sendBtn.disabled = true;

            const loadingId = appendLoading();
            const currentPassword = localStorage.getItem('ai_hub_password');

            try {
                const res = await fetch('/api/ask-deepseek', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-app-password': currentPassword
                    },
                    body: JSON.stringify({ prompt: promptText })
                });

                const data = await res.json();
                removeLoading(loadingId);

                if(res.status === 401) {
                    localStorage.removeItem('ai_hub_password');
                    location.reload();
                    return;
                }

                if(data.status === 'success') {
                    appendMessage(data.reply, 'ai');
                } else {
                    appendMessage('Error: ' + (data.message || 'Gagal memproses.'), 'ai');
                }
            } catch (err) {
                removeLoading(loadingId);
                appendMessage('Terjadi kesalahan jaringan.', 'ai');
            } finally {
                userInput.disabled = false;
                sendBtn.disabled = false;
                userInput.focus();
            }
        });

        function appendMessage(text, sender) {
            const isUser = sender === 'user';
            const wrapper = document.createElement('div');
            wrapper.className = \`flex gap-3 items-start \${isUser ? 'flex-row-reverse' : ''}\`;
            
            const avatar = document.createElement('div');
            avatar.className = \`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm \${isUser ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}\`;
            avatar.textContent = isUser ? 'U' : 'AI';

            const bubble = document.createElement('div');
            bubble.className = \`glass p-4 rounded-2xl text-sm text-gray-200 max-w-[85%] leading-relaxed \${isUser ? 'rounded-tr-sm bg-blue-600/20 border-blue-500/20' : 'rounded-tl-sm'}\`;
            bubble.innerHTML = text.replace(/\\n/g, '<br>');

            wrapper.appendChild(avatar);
            wrapper.appendChild(bubble);
            chatContainer.appendChild(wrapper);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function appendLoading() {
            const id = 'loading-' + Date.now();
            const wrapper = document.createElement('div');
            wrapper.id = id;
            wrapper.className = 'flex gap-3 items-start';
            wrapper.innerHTML = \`
                <div class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">AI</div>
                <div class="glass p-4 rounded-2xl rounded-tl-sm text-sm text-gray-400 animate-pulse">Sedang berpikir...</div>
            \`;
            chatContainer.appendChild(wrapper);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            return id;
        }

        function removeLoading(id) {
            const el = document.getElementById(id);
            if(el) el.remove();
        }
    </script>
</body>
</html>
    `;
    res.send(htmlPage);
});

// ==========================================
// 5. SERVER INITIALIZATION (LOCAL / VERCEL)
// ==========================================
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[AI HUB] Berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;
