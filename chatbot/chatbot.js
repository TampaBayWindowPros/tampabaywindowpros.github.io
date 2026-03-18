/**
 * Tampa Bay Window Pros — Qualifying Chatbot
 * AI calls routed through n8n webhook — NO API keys in this file
 * Set your n8n webhook URL in your n8n workflow and paste it below
 */

(function() {

  // ─── ONLY THING TO CONFIGURE ─────────────────────────────────────────────
  // After setting up n8n workflow 05, paste your webhook URL here:
  const N8N_CHAT_WEBHOOK = 'http://localhost:5678/webhook/window-chat';
  const PHONE = '727-265-1038';
  // ─────────────────────────────────────────────────────────────────────────

  let messages = [];
  let leadSubmitted = false;
  let isOpen = false;

  const styles = `
    #tb-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      background: #0a1628; color: #fff; border: none; border-radius: 50px;
      padding: 14px 22px; cursor: pointer; font-family: 'DM Sans', sans-serif;
      font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); transition: transform 0.2s;
    }
    #tb-chat-btn:hover { transform: translateY(-2px); }
    #tb-chat-btn .pulse {
      width: 10px; height: 10px; background: #22c55e; border-radius: 50%;
      animation: tb-pulse 2s infinite;
    }
    @keyframes tb-pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50% { opacity:0.6; transform:scale(1.2); }
    }
    #tb-chat-window {
      position: fixed; bottom: 90px; right: 24px; z-index: 9999;
      width: 360px; max-height: 560px; background: #fff; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.2); display: none; flex-direction: column;
      font-family: 'DM Sans', sans-serif; overflow: hidden;
    }
    #tb-chat-window.open { display: flex; }
    .tb-chat-header {
      background: #0a1628; color: #fff; padding: 16px 20px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .tb-chat-header .title { font-weight: 700; font-size: 0.95rem; }
    .tb-chat-header .sub { font-size: 0.78rem; opacity: 0.7; margin-top: 2px; }
    .tb-chat-close { background: none; border: none; color: #fff; font-size: 1.4rem; cursor: pointer; line-height: 1; }
    #tb-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
      max-height: 380px;
    }
    .tb-msg { max-width: 82%; padding: 10px 14px; border-radius: 12px; font-size: 0.9rem; line-height: 1.5; }
    .tb-msg.bot { background: #f3f6fa; color: #0a1628; align-self: flex-start; border-bottom-left-radius: 4px; }
    .tb-msg.user { background: #0a1628; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .tb-msg.typing { background: #f3f6fa; color: #888; font-style: italic; align-self: flex-start; }
    .tb-chat-input-row {
      padding: 12px 16px; border-top: 1px solid #eee; display: flex; gap: 8px;
    }
    #tb-user-input {
      flex: 1; border: 1px solid #dde3eb; border-radius: 8px; padding: 10px 14px;
      font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none; resize: none;
    }
    #tb-user-input:focus { border-color: #1e6fa5; }
    #tb-send-btn {
      background: #e8a020; color: #0a1628; border: none; border-radius: 8px;
      padding: 10px 16px; cursor: pointer; font-weight: 700; font-size: 0.9rem;
    }
    #tb-send-btn:disabled { opacity: 0.5; cursor: default; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  const btn = document.createElement('button');
  btn.id = 'tb-chat-btn';
  btn.innerHTML = '<span class="pulse"></span>Get a Free Quote';

  const win = document.createElement('div');
  win.id = 'tb-chat-window';
  win.innerHTML = `
    <div class="tb-chat-header">
      <div>
        <div class="title">🪟 Tampa Bay Window Pros</div>
        <div class="sub">Typically replies in seconds</div>
      </div>
      <button class="tb-chat-close" id="tb-close-btn">×</button>
    </div>
    <div id="tb-messages"></div>
    <div class="tb-chat-input-row">
      <textarea id="tb-user-input" rows="1" placeholder="Type your message..."></textarea>
      <button id="tb-send-btn">Send</button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    if (isOpen && messages.length === 0) startConversation();
  });

  document.getElementById('tb-close-btn').addEventListener('click', () => {
    isOpen = false;
    win.classList.remove('open');
  });

  document.getElementById('tb-send-btn').addEventListener('click', sendMessage);
  document.getElementById('tb-user-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  function appendMessage(text, role) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `tb-msg ${role}`;
    msgDiv.textContent = text;
    document.getElementById('tb-messages').appendChild(msgDiv);
    document.getElementById('tb-messages').scrollTop = 99999;
    return msgDiv;
  }

  function startConversation() {
    const greeting = `Hi! 👋 I'm here to help you get a free window replacement quote for your Tampa Bay home. What brings you here today — are you looking to replace windows, get impact windows, or maybe fix an existing window?`;
    appendMessage(greeting, 'bot');
    messages.push({ role: 'assistant', content: greeting });
  }

  async function sendMessage() {
    const input = document.getElementById('tb-user-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    appendMessage(text, 'user');
    messages.push({ role: 'user', content: text });

    const sendBtn = document.getElementById('tb-send-btn');
    sendBtn.disabled = true;
    const typingDiv = appendMessage('Typing...', 'typing');

    try {
      const res = await fetch(N8N_CHAT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, page: window.location.href })
      });

      const data = await res.json();
      typingDiv.remove();

      const reply = data.reply || "Sorry, I had a connection issue. Please call us at " + PHONE;
      const leadData = data.lead || null;

      appendMessage(reply, 'bot');
      messages.push({ role: 'assistant', content: reply });

      if (leadData && !leadSubmitted) {
        leadSubmitted = true;
        // Lead already saved by n8n — nothing else needed here
      }
    } catch(err) {
      typingDiv.remove();
      appendMessage(`Sorry, I'm having a connection issue. Please call us at ${PHONE} or use the quote form on this page.`, 'bot');
    }

    sendBtn.disabled = false;
    input.focus();
  }

})();
