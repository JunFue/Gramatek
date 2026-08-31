# Gabay sa Pag-set up ng Gemini API Key (Gemini API Setup Guide)

Ang **Gramatek** ay gumagamit ng **Google Gemini 2.5 Flash** upang mabilis na makabuo ng mga de-kalidad na pagsusulit sa wikang Filipino at balarila mula sa mga paksa o mga in-upload na PDF na modyul/aralin.

---

## 📋 Mga Hakbang sa Pagkuha ng Libreng Gemini API Key

### Hakbang 1: Magpunta sa Google AI Studio
1. Buksan ang iyong web browser at pumunta sa [Google AI Studio API Key Portal](https://aistudio.google.com/app/apikey).
2. Mag-sign in gamit ang iyong Google account (Gmail / Google Workspace).

### Hakbang 2: Gumawa ng Bagong API Key
1. I-click ang asul na button na **"Create API key"** (o *"Get API key"*).
2. Piliin ang iyong Google Cloud Project o i-click ang **"Create API key in new project"**.
3. Kopyahin ang nabuong API key string (nagsisimula karaniwan sa `AIzaSy...`).

---

## ⚙️ Paglalagay ng API Key sa Gramatek

### Hakbang 3: Buksan o Lumikha ng `.env.local` File
Sa root directory ng iyong Gramatek project (`c:\Desktop\Gramatek\`), lumikha o buksan ang file na tinatawag na **`.env.local`**.

### Hakbang 4: Idagdag ang API Key Variable
Ilagay ang iyong kinopyang key sa file:

```env
# ==========================================
# SUPABASE CONFIGURATION
# ==========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# ==========================================
# GOOGLE GEMINI AI CONFIGURATION
# ==========================================
GEMINI_API_KEY=AIzaSyD_IyongTunayNaAPIKeyDito
```

> **Paalala:** Huwag lagyan ng panipi (`"`) o espasyo sa paligid ng `=` sign.

### Hakbang 5: I-restart ang Next.js Development Server
Upang mabasa ng Next.js ang bagong `.env.local`, kailangang i-restart ang server:
1. Sa iyong terminal / PowerShell kung saan tumatakbo ang `npm run dev`, pindutin ang `Ctrl + C` upang ihinto ito.
2. Patakbuhin muli ang:
   ```bash
   npm run dev
   ```

---

## 🎯 Paano Gamitin ang AI Question Generator

Kapag naka-configure na ang iyong `GEMINI_API_KEY`, may dalawang pangunahing lugar sa portal ng guro kung saan magagamit ang AI:

### 1. Sa Live Session Setup Wizard (`/educator/classrooms/[id]/live/setup`)
- Sa **Hakbang 2 (Mga Kard & Drafts)**, i-click ang button na:
  **`✨ Bumuo gamit ang AI (Gemini)`**
- Piliin kung nais mong bumuo mula sa **Paksa / Prompt** o mag-upload ng **PDF Module / Question Sheet**.
- Pagkatapos suriin ng AI, i-preview ang mga nabuong kard at i-click ang **"Idagdag ang Kard sa Sesyon"**.

### 2. Sa Quiz Builder (`/educator/quizzes/new` o `/educator/quizzes/[id]/edit`)
- Sa bandang itaas ng listahan ng mga kard o sa ibabang menu, i-click ang:
  **`✨ Bumuo gamit ang AI (Gemini)`**
- Awtomatikong idaragdag ng AI ang mga nabuong tanong sa iyong quiz deck kung saan maaari mo pa itong baguhin bago i-publish.

---

## 🚀 Mga Sinusuportahang Mode ng AI Generator

| Mode | Deskripsyon | Halimbawa |
|---|---|---|
| **Paksa / Prompt** | Maglagay ng paksa, antas ng baitang, at bilang ng tanong. | *"Mga Aspekto ng Pandiwa para sa Baitang 5, 5 tanong na multiple choice"* |
| **PDF Aralin / Modyul** | Mag-upload ng PDF ng kwento o aralin. Susuriin ng Gemini ang nilalaman at gagawa ng mga pagsusulit batay dito. | `Aralin_1_Pangngalan.pdf` |
| **PDF Question Sheet** | Mag-upload ng PDF na mayroon nang nakasulat na mga tanong at sagot. Aayusin ito ng AI sa tamang format ng kard. | `Exam_Reviewer_Tagalog.pdf` |

---

## 🔍 Paglutas sa mga Karaniwang Problema (Troubleshooting)

- **Error: "Hindi pa naka-configure ang GEMINI_API_KEY"**:
  - Tiyaking ang variable name sa `.env.local` ay eksaktong `GEMINI_API_KEY`.
  - Tiyaking na-restart mo ang `npm run dev`.
- **Error: "Tanging PDF files lamang ang suportado"**:
  - Siguraduhing `.pdf` format ang dokumentong ini-upload at mas mababa sa 20MB.
- **Quota / Rate Limit**:
  - Ang Gemini 2.5 Flash sa Google AI Studio ay may malaking libreng tier (hanggang 15 requests bawat minuto), na sapat para sa regular na paggamit ng guro sa silid-aralan.
