# CodeAgent — Mobile Agentic Coding Assistant

Phone-only, no-terminal dev workflow ke liye chat-based coding assistant. Chat mein bolo, files generate hoti hain, localStorage mein save, zip/download ho sakti hain, HTML/CSS/JS ka live preview milta hai.

## File Structure
```
codeagent/
├── api/
│   ├── chat.js        # Vercel serverless fn — OpenRouter proxy, structured JSON, retry+fallback
│   └── summarize.js   # Small summary endpoint used for folding/rolling summaries
├── public/
│   ├── index.html     # UI shell
│   ├── style.css      # dark WhatsApp-style theme
│   ├── app.js         # client logic: state, intent routing, diff-apply, zip, preview
│   └── js/            # extra client-side modules (optional)
├── package.json
├── vercel.json
└── README.md
```

## How it works
- **Chat**: messages localStorage me `chat:<projectId>` ke andar save hote hain.
- **Files**: `project:<projectId>` ke andar `{files: {path: content}, updatedAt}`.
- **Intent routing**: `app.js` ka `tryLocalIntent()` pehle regex se try karta hai (naya project, list files, delete file, clear chat, zip download) — agar match ho gaya to LLM call hoti hi nahi.
- **Token efficiency**: server ko sirf last 6 messages + rolling summary (client-side folded, no extra LLM call) + current file contents bheje jaate hain. Naye file ke liye LLM full content deta hai.
- **Fallback**: `api/chat.js` teen free models try karta hai order mein (Nemotron → Llama 3.3 → Gemini Flash), rate-limit/500 pe retry + next-model fallback, sab fail ho to graceful Hinglish error return karta hai.

## Deployment (Vercel, phone se)

1. **GitHub pe push karo** — chahe GitHub mobile app se ya browser file upload se, is poore folder ko ek naye repo mein daal do (`codeagent` naam se).

2. **Vercel pe import karo**:
   - vercel.com pe login (GitHub se)
   - "Add New → Project" → apna repo select karo
   - Framework preset: "Other" (auto-detect ho jayega, kuch change nahi karna)
   - Deploy se pehle ruk jao — pehle env var set karna hai (step 3)

3. **Environment Variable set karo** (Vercel dashboard → Project → Settings → Environment Variables):
   - Key: `OPENROUTER_API_KEY`
   - Value: apni OpenRouter key (openrouter.ai/keys se free banao, no card needed for free models)
   - Environment: Production + Preview dono select karo
   - Save karo, phir Deploy/Redeploy karo

4. **Done** — Vercel ek URL dega jaise `codeagent-xyz.vercel.app`. Wahi phone pe kholo, "Add to Home Screen" kar lo to app jaisa lagega.

## Phone se hi testing (bina laptop)
- Har git push pe Vercel auto-deploy karega (preview URL alag milega har branch/PR pe, main branch = production URL).
- Code edit: GitHub mobile app se directly file edit karo, ya termux/acode jaisa app use karo agar chaho, commit karo → Vercel khud build+deploy kar dega, kuch manual step nahi.
- Agar `api/chat.js` mein change kiya to bas commit+push — koi local server chalane ki zaroorat nahi, Vercel Preview URL pe turant test ho jayega.
- localStorage-based hai to different devices/browsers pe data sync nahi hoga — same phone, same browser use karo consistently.

## Notes / Limitations (jaan bujh kar simple rakha gaya hai)
- Diff-apply tab hi kaam karega jab LLM ka diya `find` snippet file mein exact match kare — agar model thoda wording badal de to edit skip ho sakta hai (console warning aati hai). Zyada complex edits may fail silently.
- Free OpenRouter models occasionally rate-limited/slow ho sakte hain — is wajah se 3-model fallback chain rakhi hai.
- No auth, no backend DB — sab kuch is user ke phone browser mein hi rehta hai. Agar chahiye future me multi-device sync, tab Supabase/Postgres add karna padega (abhi scope se bahar rakha gaya hai).
