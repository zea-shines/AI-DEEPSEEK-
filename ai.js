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
            connectSrc: ["'self'"], 
            imgSrc: ["'self'", "data:"]
        }
    },
    crossOriginEmbedderPolicy: false 
}));

app.use(express.json());

// ==========================================
// 2. DEEPSEEK API ENDPOINT (Otak Belajar AI)
// ==========================================
app.post('/api/ask-deepseek', async (req, res) => {
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
                        content: "Kamu adalah mentor AI pribadi yang sabar, jujur, dan ahli dalam pemrograman, Termux, Node.js, serta pengembangan web. Berikan penjelasan yang mendalam, praktis, dan mudah dipahami dalam bahasa Indonesia." 
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
// 3. FRONTEND LANDING & LEARNING UI
// ==========================================
app.get('/', (req, res) => {
    const htmlPage = `
<!DOCTYPE html>
<html lang="id" class="dark scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Learning Hub — Ruang Belajar DeepSeek</title>
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

    <!-- HEADER -->
    <header class="w-full max-w-4xl mx-auto px-5 py-5 flex items-center justify-between border-b border-gray-800/60">
        <div class="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
            <span class="text-blue-500"><i class="fa-solid fa-brain"></i></span>
            <span>AI Learning Hub</span>
        </div>
        <span class="text-xs px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
            Powered by DeepSeek API
        </span>
    </header>

    <!-- MAIN CHAT CONTAINER -->
    <main class="w-full max-w-4xl mx-auto px-5 py-8 flex-1 flex flex-col">
        <div class="text-center mb-8">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ruang Belajar Mandiri</h1>
            <p class="text-gray-400 text-sm sm:text-base mt-2">Ketik apa saja yang ingin kamu bedah: logika kode, error Termux, atau konsep AI.</p>
        </div>

        <!-- Chat Box Area -->
        <div id="chat-container" class="glass glow rounded-2xl p-4 sm:p-6 flex-1 min-h-[350px] max-h-[500px] overflow-y-auto space-y-4 mb-4">
            <div class="flex gap-3 items-start">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">AI</div>
                <div class="glass p-4 rounded-2xl rounded-tl-sm text-sm text-gray-200 max-w-[85%] leading-relaxed">
                    Halo! Saya siap membantumu belajar. Apa yang ingin kita bahas atau bedah hari ini?
                </div>
            </div>
        </div>

        <!-- Input Form -->
        <form id="chat-form" class="flex gap-2 relative">
            <input 
                type="text" 
                id="user-input" 
                placeholder="Tulis pertanyaan atau kode yang error di sini..." 
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
        &copy; 2026 AI Learning Hub. Dibangun mandiri di Termux.
    </footer>

    <!-- SCRIPT CLIENT -->
    <script>
        const chatForm = document.getElementById('chat-form');
        const userInput = document.getElementById('user-input');
        const chatContainer = document.getElementById('chat-container');
        const sendBtn = document.getElementById('send-btn');

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const promptText = userInput.value.trim();
            if(!promptText) return;

            // Tambah pesan user ke layar
            appendMessage(promptText, 'user');
            userInput.value = '';
            userInput.disabled = true;
            sendBtn.disabled = true;

            // Indikator loading
            const loadingId = appendLoading();

            try {
                const res = await fetch('/api/ask-deepseek', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptText })
                });

                const data = await res.json();
                removeLoading(loadingId);

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
            // Format sederhana untuk baris baru
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
// 4. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3002;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[LEARNING HUB] Berjalan di port ${PORT}`);
});
