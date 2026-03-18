# 🔧 n8n Setup Guide — Tampa Bay Window Pros
## Business Oracle | Step-by-Step Connection Instructions

---

## BEFORE YOU START

Make sure n8n is running:
1. Open Terminal on your Mac Mini
2. Run: `N8N_SECURE_COOKIE=false n8n start`
3. Open browser to: `http://localhost:5678`
4. Create your n8n account (first time only)

---

## STEP 1: Add Your Google Sheets Credential

1. In n8n, click **Settings** (gear icon, bottom left)
2. Click **Credentials** → **Add Credential**
3. Search for **Google Sheets OAuth2**
4. Click **Connect with Google** and sign into your Google account
5. Grant all requested permissions
6. Name it: `Google Sheets`
7. Click **Save**

---

## STEP 2: Add Your Groq API Key as a Header Credential

1. **Settings** → **Credentials** → **Add Credential**
2. Search **HTTP Header Auth**
3. Name: `Groq API Key`
4. Header Name: `Authorization`
5. Header Value: `Bearer YOUR_GROQ_API_KEY` ← paste your actual key here
6. Save

---

## STEP 3: Import Workflow 01 — Lead Intake & Scoring

1. Click **Workflows** in the left sidebar
2. Click **Add Workflow** → **Import from File**
3. Select: `n8n-workflows/01-lead-intake-scoring.json`
4. Once imported, click on the **Add to Google Sheets** node
5. In the `documentId` field, paste your Google Sheet URL
6. Click on the **Email HOT Alert** node
7. Update `toEmail` with your real email address
8. Click **Save** (top right)
9. Click **Activate** toggle (top right) — turns green when active

**Test it:**
- Copy the webhook URL from the **Lead Webhook** node
- Open Terminal and run:
```
curl -X POST YOUR_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","phone":"813-555-1234","email":"test@test.com","service":"Hurricane Impact Windows","timeline":"ASAP","city":"Tampa","source":"test"}'
```
- Check your Google Sheet — a new row should appear with score and HOT/WARM/COLD rating

---

## STEP 4: Import Workflow 02 — Web3Forms to Sheets

1. Import `n8n-workflows/02-web3forms-to-sheets.json`
2. Update the Google Sheet URL in the **Append to Sheets** node
3. Save and Activate
4. Copy the webhook URL from the **Web3Forms Webhook** node
5. Log into web3forms.com → Your form → Settings → **Notification Webhook URL**
6. Paste the n8n webhook URL there and save

---

## STEP 5: Import Workflow 03 — Reddit Content Agent

1. Import `n8n-workflows/03-reddit-content-agent.json`
2. In the **Generate Comment (Groq)** node:
   - Find the Authorization header
   - Replace `YOUR_GROQ_API_KEY` with your actual Groq key
3. Update the Google Sheet URL in the **Log to Sheets** node
4. Add a new tab to your Google Sheet named: `Reddit Queue`
5. Add headers in row 1: `Timestamp | Subreddit | Topic | Comment | Status`
6. Save and Activate

**How it works:** Every 6 hours, it generates a Reddit comment and saves it to the Reddit Queue tab. Check the tab daily and post the comments manually on Reddit.

---

## STEP 6: Import Workflow 04 — Facebook Content Agent

1. Import `n8n-workflows/04-facebook-content-agent.json`
2. Update the Groq API key in the **Generate Post** node header
3. Update the Google Sheet URL
4. Add a new tab to your Google Sheet named: `Facebook Queue`
5. Add headers in row 1: `Date | Type | Post Content | Char Count | Status`
6. Save and Activate

**How it works:** Every morning at 9 AM, it generates a Facebook post and saves it to the Facebook Queue tab. Copy posts into PilotPoster Chrome extension.

---

## STEP 7: Update the Chatbot with Your Real Keys

Open `chatbot/chatbot.js` in a text editor and replace:
- `YOUR_GROQ_API_KEY` → your Groq API key from Notes
- `YOUR_GEMINI_API_KEY` → your Gemini API key from Notes
- `YOUR_WEB3FORMS_KEY` → your Web3Forms access key from Notes
- `http://localhost:5678/webhook/window-lead` → paste the actual webhook URL from Workflow 01

---

## STEP 8: Update Web3Forms Key in All Landing Pages

You need to replace `YOUR_WEB3FORMS_KEY` in:
- `index.html`
- All 21 files in `landing-pages/`

**Quick way (Terminal):**
```bash
cd /path/to/your/tampabaywindowpros/folder
find . -name "*.html" -exec sed -i '' 's/YOUR_WEB3FORMS_KEY/YOUR_ACTUAL_KEY/g' {} \;
```
Replace `YOUR_ACTUAL_KEY` with your actual Web3Forms key.

---

## STEP 9: Deploy to GitHub Pages

1. Open **GitHub Desktop**
2. Your repo should be: `tampabaywindowpros.github.io`
3. Drag all files from the `tampabaywindowpros` folder into your repo folder
4. In GitHub Desktop: you'll see all new files listed
5. Add commit message: `Initial launch — 21 landing pages + chatbot + n8n workflows`
6. Click **Commit to main**
7. Click **Push origin**
8. Wait 2-3 minutes, then visit: `https://tampabaywindowpros.github.io`

---

## STEP 10: Submit Sitemap to Google Search Console

1. Go to: `https://search.google.com/search-console`
2. Add property: `https://tampabaywindowpros.github.io`
3. Verify ownership (HTML tag method — add to your index.html `<head>`)
4. After verification, go to **Sitemaps**
5. Submit: `https://tampabaywindowpros.github.io/sitemap.xml`

---

## GOOGLE SHEET SETUP

Your sheet is named: **Business Oracle — Lead Dashboard**

Make sure **Sheet1** has these headers in Row 1 (exactly):
```
A: Timestamp
B: Name
C: Phone
D: Email
E: Address/City
F: Service
G: Timeline
H: Source
I: Notes
J: Score
K: Rating
L: Follow-Up Status
M: Call Notes
N: HOT/WARM/COLD
```

Conditional formatting on column N (already done per your notes):
- HOT = Green background
- WARM = Yellow background
- COLD = Gray background

---

## SYSTEM HEALTH CHECK

Once everything is running, verify daily:
- n8n is still running (check localhost:5678)
- Google Sheet is receiving new leads
- Facebook Queue tab has fresh posts to use
- Reddit Queue has comments to post

**n8n stays running as long as your Mac Mini is on and not sleeping.**
Your sleep prevention settings (from the setup doc) ensure it stays awake.

---

## QUICK REFERENCE — All Webhook URLs

After importing workflows, copy these URLs from n8n and save them:

| Workflow | Webhook URL | Used For |
|----------|-------------|---------|
| 01 - Lead Intake | (from n8n) | Chatbot lead submissions |
| 02 - Web3Forms | (from n8n) | Landing page form submissions |

---

*Setup complete! Your fully automated lead generation system is live.*
*Business Oracle — Tampa Bay Window Pros*
