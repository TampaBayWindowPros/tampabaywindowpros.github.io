/**
 * Tampa Bay Window Pros — Qualifying Chatbot
 * Uses Groq API (Llama 4) as primary, Gemini as fallback
 * Qualifies leads and submits to Web3Forms + Google Sheets via n8n webhook
 */

(function() {
  // ─── CONFIG ───────────────────────────────────────────────────────────────
  const CONFIG = {
    groqApiKey: 'YOUR_GROQ_API_KEY',           // replace in n8n or directly
    geminiApiKey: 'YOUR_GROQ_API_KEY',        // fallback
    web3formsKey: 'e06afea8-b4ad-4363-bbe1-5db03091ae01',         // replace with your key
    n8nWebhook: 'http://localhost:5678/webhook/window-lead',  // n8n webhook URL
    businessName: 'Tampa Bay Window Pros',
    phone: '727-265-1038',                    // update with real number
  };

  // ─── SYSTEM PROMPT ────────────────────────────────────────────────────────
  const SYSTEM_PROMPT = `You are a friendly, helpful assistant for Tampa Bay Window Pros, a window replacement company serving the Tampa Bay metro area in Florida.

Your job is to have a natural conversation that qualifies leads by collecting the following information (ask one question at a time, naturally):
1. What type of window service they need (hurricane impact, energy efficient, repair, replacement, etc.)
2. How many windows / which part of the home
3. Their city/location in Tampa Bay
4. Their timeline (urgency)
5. Their name
6. Their phone number
7. Their email (optional but encouraged)

Be warm, conversational, and helpful. Answer questions about windows, costs, and services honestly. 
When asked about cost, give realistic ranges (single window $300-$800, whole home $8,000-$20,000, impact windows cost more).
Mention that we offer free in-home estimates with no pressure.
Do NOT make up specific prices or guarantees you can't verify.
Keep responses concise — 2-3 sentences max per reply.
Once you have name + phone + service type, tell the user someone will call them within 24 hours and thank them.

At the END of your response, if you have collected name AND phone, include a special JSON block like this (on its own line):
LEAD_DATA:{"name":"John Smith","phone":"813-555-1234","email":"john@email.com","service":"Hurricane Windows","city":"Tampa","timeline":"ASAP","notes":"Full home replacement"}

Only include LEAD_DATA when you have at minimum: name and phone.`;

  // ─── STATE ────────────────────────────────────────────────────────────────
  let messages = [];
  let leadSubmitted = false;
  let isOpen = false;

  // ─── BUILD UI ─────────────────────────────────────────────────────────────
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
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
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

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────────
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ─── FUNCTIONS ────────────────────────────────────────────────────────────
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
      const reply = await callGroq(messages);
      typingDiv.remove();

      // Check for LEAD_DATA
      const leadMatch = reply.match(/LEAD_DATA:(\{.*\})/);
      let cleanReply = reply.replace(/LEAD_DATA:\{.*\}/, '').trim();

      appendMessage(cleanReply, 'bot');
      messages.push({ role: 'assistant', content: cleanReply });

      if (leadMatch && !leadSubmitted) {
        try {
          const leadData = JSON.parse(leadMatch[1]);
          await submitLead(leadData);
          leadSubmitted = true;
        } catch(e) { console.warn('Lead parse error:', e); }
      }
    } catch(err) {
      typingDiv.remove();
      appendMessage("Sorry, I had a connection issue. Please call us at " + CONFIG.phone + " or use the form on this page.", 'bot');
    }

    sendBtn.disabled = false;
    input.focus();
  }

  async function callGroq(msgs) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.groqApiKey}`
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...msgs
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });
      if (!res.ok) throw new Error('Groq failed');
      const data = await res.json();
      return data.choices[0].message.content;
    } catch(e) {
      // Fallback to Gemini
      return await callGemini(msgs);
    }
  }

  async function callGemini(msgs) {
    const prompt = msgs.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\nConversation:\n' + prompt + '\nAssistant:' }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
      })
    });
    if (!res.ok) throw new Error('Gemini also failed');
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  async function submitLead(leadData) {
    // Send to n8n webhook (which handles Google Sheets scoring)
    try {
      await fetch(CONFIG.n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'chatbot',
          timestamp: new Date().toISOString(),
          ...leadData
        })
      });
    } catch(e) {
      // Fallback: send via Web3Forms
      const formData = new FormData();
      formData.append('access_key', CONFIG.web3formsKey);
      formData.append('subject', `Chatbot Lead — ${leadData.name} — ${leadData.service}`);
      formData.append('name', leadData.name || '');
      formData.append('phone', leadData.phone || '');
      formData.append('email', leadData.email || '');
      formData.append('service', leadData.service || '');
      formData.append('city', leadData.city || '');
      formData.append('timeline', leadData.timeline || '');
      formData.append('notes', leadData.notes || '');
      formData.append('source', 'chatbot');
      await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData });
    }
  }

})();
