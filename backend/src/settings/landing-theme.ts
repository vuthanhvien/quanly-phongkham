export interface LandingThemeOptions {
  accent?: string
  fontFamily?: string
  borderRadius?: number
  customCss?: string
}

export interface ThemePreset {
  key: string
  label: string
  description: string
  preview: { bg: string; surface: string; accent: string; ink: string }
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: 'warm-classic',
    label: 'Ấm & Cổ điển',
    description: 'Tone beige ấm áp, hiệu ứng kính mờ, font serif tinh tế',
    preview: { bg: '#f2e6d8', surface: 'rgba(255,247,238,0.88)', accent: '#bd4f2f', ink: '#22160f' },
  },
  {
    key: 'elegant-dark',
    label: 'Sang trọng Tối',
    description: 'Nền tối huyền bí, viền vàng gold, typography Cormorant',
    preview: { bg: '#0d0c14', surface: 'rgba(24,20,32,0.92)', accent: '#c9a96e', ink: '#f3ece4' },
  },
  {
    key: 'fresh-modern',
    label: 'Tươi & Hiện đại',
    description: 'Card trắng sạch, màu teal, font Inter phẳng không blur',
    preview: { bg: '#f0f4f8', surface: '#ffffff', accent: '#0ea5a0', ink: '#1a2332' },
  },
  {
    key: 'rose-premium',
    label: 'Rose Cao cấp',
    description: 'Hồng blush lãng mạn, glassmorphism đậm, bo góc lớn',
    preview: { bg: '#fde8ef', surface: 'rgba(255,245,249,0.9)', accent: '#d4547a', ink: '#2d1520' },
  },
  {
    key: 'bold-minimal',
    label: 'Đậm & Tối giản',
    description: 'Trắng tuyệt đối, viền accent, typography Space Grotesk mạnh mẽ',
    preview: { bg: '#ffffff', surface: '#ffffff', accent: '#111111', ink: '#111111' },
  },
]

function hexShade(hex: string, pct: number): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex
  const num = parseInt(clean, 16)
  const amt = Math.round(2.55 * pct)
  const r = Math.min(255, Math.max(0, (num >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '0,0,0'
  const num = parseInt(clean, 16)
  return `${(num >> 16) & 0xff},${(num >> 8) & 0xff},${num & 0xff}`
}

function warmClassic(opts: LandingThemeOptions): string {
  const accent = opts.accent ?? '#bd4f2f'
  const accentDark = hexShade(accent, -15)
  const accentRgb = hexToRgb(accent)
  const fontBody = opts.fontFamily ?? '"Avenir Next","Segoe UI Variable","Helvetica Neue",sans-serif'
  const fh = '"Iowan Old Style","Palatino Linotype",Georgia,serif'
  const r = opts.borderRadius ?? 24
  const radius = `${r}px`
  const radiusLg = `${Math.round(r * 1.2)}px`
  const radiusBtn = r < 16 ? radius : '999px'
  const radiusInput = `${Math.min(r, 16)}px`
  const radiusSm = `${Math.round(r * 0.75)}px`

  return `body{background:radial-gradient(circle at top left,rgba(239,198,156,.65),transparent 28%),radial-gradient(circle at 85% 10%,rgba(${accentRgb},.18),transparent 22%),linear-gradient(180deg,#f9f2e7 0%,#f2e6d8 52%,#efe2d4 100%);color:#22160f;font-family:${fontBody};}
.hero{border:1px solid rgba(255,255,255,.4);background:linear-gradient(145deg,rgba(255,247,238,.88),rgba(255,242,224,.68));border-radius:${radiusLg};box-shadow:0 32px 90px rgba(56,31,19,.12);backdrop-filter:blur(14px);}
.eyebrow{border-radius:999px;background:rgba(34,22,15,.06);color:#6d5747;}
.hero h1,.landing-title{font-family:${fh};color:#22160f;}
.hero p{color:#6d5747;}
.landing-block{border:1px solid rgba(34,22,15,.1);border-radius:${radius};background:rgba(255,250,243,.86);box-shadow:0 18px 48px rgba(56,31,19,.08);backdrop-filter:blur(12px);}
.landing-block p{color:#6d5747;}
.landing-media{border-radius:${radiusSm};background:rgba(34,22,15,.06);}
.landing-caption{color:#6d5747;}
.field-shell input,.field-shell textarea{border:1px solid rgba(34,22,15,.12);border-radius:${radiusInput};background:rgba(255,255,255,.72);color:#22160f;}
.field-shell input:focus,.field-shell textarea:focus{border-color:${accent};outline:none;}
.field-shell input::placeholder,.field-shell textarea::placeholder{color:#9d8072;}
.cta-button{border-radius:${radiusBtn};background:linear-gradient(135deg,${accent},${accentDark});color:#fff;font-weight:700;box-shadow:0 18px 30px rgba(${accentRgb},.24);transition:transform .18s ease,box-shadow .18s ease;}
.cta-button:hover{transform:translateY(-2px);box-shadow:0 24px 40px rgba(${accentRgb},.32);}
.feedback{border-radius:${radiusInput};}
.feedback.success{background:rgba(41,122,88,.1);color:#15553b;}
.feedback.error{background:rgba(175,51,44,.1);color:#8d241f;}
.empty-card{border:1px solid rgba(34,22,15,.1);border-radius:${radiusLg};background:#fff7ee;box-shadow:0 32px 90px rgba(56,31,19,.12);}
.empty-card h1{font-family:${fh};color:#22160f;}
.empty-card p{color:#6d5747;}
.chatbot-fab{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;box-shadow:0 8px 28px rgba(${accentRgb},.38);}
.chatbot-fab:hover{box-shadow:0 12px 36px rgba(${accentRgb},.46);transform:scale(1.08);}
.chatbot-panel{background:#fff7ee;border:1px solid rgba(255,255,255,.5);box-shadow:0 32px 80px rgba(56,31,19,.18);border-radius:${radius};}
.chatbot-header{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;}
.chatbot-avatar{background:rgba(255,255,255,.22);}
.chatbot-close{color:#fff;}
.chatbot-bubble{border-radius:18px;}
.chatbot-msg--assistant .chatbot-bubble{background:rgba(34,22,15,.06);color:#22160f;border-bottom-left-radius:4px;}
.chatbot-msg--user .chatbot-bubble{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;border-bottom-right-radius:4px;}
.chatbot-bubble--typing span{background:#6d5747;}
.chatbot-footer{border-top:1px solid rgba(34,22,15,.1);}
.chatbot-input{border:1px solid rgba(34,22,15,.12);border-radius:${radiusInput};background:rgba(255,255,255,.72);color:#22160f;}
.chatbot-input:focus{border-color:${accent};}
.chatbot-input::placeholder{color:#9d8072;}
.chatbot-send{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;}
`
}

function elegantDark(opts: LandingThemeOptions): string {
  const accent = opts.accent ?? '#c9a96e'
  const accentDark = hexShade(accent, -18)
  const accentRgb = hexToRgb(accent)
  const fontBody = opts.fontFamily ?? '"Montserrat","Segoe UI",Inter,sans-serif'
  const fh = '"Cormorant Garamond","Didot","Times New Roman",serif'
  const r = opts.borderRadius ?? 8
  const radius = `${r}px`
  const radiusLg = `${Math.round(r * 1.5)}px`
  const radiusBtn = `${r}px`
  const radiusInput = `${r}px`

  return `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;700&display=swap');
body{background:radial-gradient(ellipse at 20% 0%,rgba(60,40,90,.5),transparent 40%),radial-gradient(ellipse at 80% 100%,rgba(${accentRgb},.08),transparent 40%),linear-gradient(170deg,#0d0c14 0%,#110f1a 60%,#0a090f 100%);color:#f3ece4;font-family:${fontBody};}
.hero{border:1px solid rgba(${accentRgb},.28);background:linear-gradient(145deg,rgba(28,22,40,.9),rgba(18,14,28,.85));border-radius:${radiusLg};box-shadow:0 0 60px rgba(${accentRgb},.08),inset 0 1px 0 rgba(${accentRgb},.2);backdrop-filter:blur(20px);}
.eyebrow{border-radius:${radiusBtn};background:rgba(${accentRgb},.12);color:${accent};border:1px solid rgba(${accentRgb},.3);}
.hero h1,.landing-title{font-family:${fh};color:#f3ece4;letter-spacing:-.02em;}
.hero p{color:rgba(243,236,228,.68);}
.landing-block{border:1px solid rgba(${accentRgb},.18);border-radius:${radius};background:rgba(20,16,30,.88);box-shadow:0 20px 60px rgba(0,0,0,.4);backdrop-filter:blur(16px);}
.landing-block p{color:rgba(243,236,228,.72);}
.landing-media{border-radius:${radiusBtn};background:rgba(${accentRgb},.06);border:1px solid rgba(${accentRgb},.12);}
.landing-caption{color:rgba(243,236,228,.55);}
.field-shell input,.field-shell textarea{border:1px solid rgba(${accentRgb},.25);border-radius:${radiusInput};background:rgba(255,255,255,.05);color:#f3ece4;}
.field-shell input:focus,.field-shell textarea:focus{border-color:${accent};outline:none;background:rgba(255,255,255,.08);}
.field-shell input::placeholder,.field-shell textarea::placeholder{color:rgba(243,236,228,.35);}
.cta-button{border-radius:${radiusBtn};background:linear-gradient(135deg,${accent},${accentDark});color:#0d0c14;font-weight:700;box-shadow:0 8px 32px rgba(${accentRgb},.3);transition:transform .18s ease,box-shadow .18s ease;}
.cta-button:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(${accentRgb},.42);}
.feedback{border-radius:${radiusInput};}
.feedback.success{background:rgba(40,110,80,.18);color:#5ec99a;}
.feedback.error{background:rgba(180,60,60,.18);color:#f08080;}
.empty-card{border:1px solid rgba(${accentRgb},.22);border-radius:${radiusLg};background:rgba(20,16,30,.92);box-shadow:0 0 80px rgba(0,0,0,.5);}
.empty-card h1{font-family:${fh};color:#f3ece4;}
.empty-card p{color:rgba(243,236,228,.68);}
.chatbot-fab{background:linear-gradient(135deg,${accent},${accentDark});color:#0d0c14;box-shadow:0 8px 28px rgba(${accentRgb},.4);}
.chatbot-fab:hover{box-shadow:0 12px 36px rgba(${accentRgb},.56);transform:scale(1.08);}
.chatbot-panel{background:#110f1a;border:1px solid rgba(${accentRgb},.25);box-shadow:0 32px 80px rgba(0,0,0,.6);border-radius:${radius};}
.chatbot-header{background:linear-gradient(135deg,${accent},${accentDark});color:#0d0c14;}
.chatbot-avatar{background:rgba(13,12,20,.3);}
.chatbot-close{color:#0d0c14;}
.chatbot-bubble{border-radius:${radius};}
.chatbot-msg--assistant .chatbot-bubble{background:rgba(255,255,255,.07);color:#f3ece4;border-bottom-left-radius:2px;}
.chatbot-msg--user .chatbot-bubble{background:linear-gradient(135deg,${accent},${accentDark});color:#0d0c14;border-bottom-right-radius:2px;}
.chatbot-bubble--typing span{background:rgba(${accentRgb},.6);}
.chatbot-footer{border-top:1px solid rgba(${accentRgb},.15);}
.chatbot-input{border:1px solid rgba(${accentRgb},.2);border-radius:${radiusInput};background:rgba(255,255,255,.05);color:#f3ece4;}
.chatbot-input:focus{border-color:${accent};}
.chatbot-input::placeholder{color:rgba(243,236,228,.35);}
.chatbot-send{background:linear-gradient(135deg,${accent},${accentDark});color:#0d0c14;}
`
}

function freshModern(opts: LandingThemeOptions): string {
  const accent = opts.accent ?? '#0ea5a0'
  const accentDark = hexShade(accent, -15)
  const accentRgb = hexToRgb(accent)
  const fontBody = opts.fontFamily ?? 'Inter,"Segoe UI Variable","Segoe UI",system-ui,sans-serif'
  const fh = fontBody
  const r = opts.borderRadius ?? 16
  const radius = `${r}px`
  const radiusLg = `${Math.round(r * 1.25)}px`
  const radiusBtn = `${Math.round(r * 0.75)}px`
  const radiusInput = `${r}px`
  const radiusSm = `${Math.round(r * 0.5)}px`

  return `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
body{background:#f0f4f8;color:#1a2332;font-family:${fontBody};}
.hero{border:0;border-left:4px solid ${accent};background:#ffffff;border-radius:0 ${radiusLg} ${radiusLg} 0;box-shadow:0 4px 32px rgba(0,0,0,.08);}
.eyebrow{border-radius:${radiusBtn};background:rgba(${accentRgb},.1);color:${accent};font-weight:700;}
.hero h1,.landing-title{font-family:${fh};color:#111827;letter-spacing:-.03em;}
.hero p{color:#4b5563;}
.landing-block{border:1px solid rgba(0,0,0,.07);border-radius:${radius};background:#ffffff;box-shadow:0 4px 24px rgba(0,0,0,.06);}
.landing-block p{color:#4b5563;}
.landing-media{border-radius:${radiusSm};background:#e5ebf0;border:1px solid rgba(0,0,0,.06);}
.landing-caption{color:#6b7280;}
.field-shell input,.field-shell textarea{border:1.5px solid #d1d5db;border-radius:${radiusInput};background:#f9fafb;color:#1a2332;}
.field-shell input:focus,.field-shell textarea:focus{border-color:${accent};outline:none;background:#fff;box-shadow:0 0 0 3px rgba(${accentRgb},.12);}
.field-shell input::placeholder,.field-shell textarea::placeholder{color:#9ca3af;}
.cta-button{border-radius:${radiusBtn};background:${accent};color:#fff;font-weight:600;box-shadow:0 4px 18px rgba(${accentRgb},.3);transition:background .16s,transform .16s,box-shadow .16s;}
.cta-button:hover{background:${accentDark};transform:translateY(-1px);box-shadow:0 6px 24px rgba(${accentRgb},.4);}
.feedback{border-radius:${radiusBtn};}
.feedback.success{background:rgba(16,185,129,.1);color:#065f46;}
.feedback.error{background:rgba(239,68,68,.1);color:#991b1b;}
.empty-card{border:1px solid rgba(0,0,0,.08);border-radius:${radiusLg};background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.08);}
.empty-card h1{font-family:${fh};color:#111827;}
.empty-card p{color:#4b5563;}
.chatbot-fab{background:${accent};color:#fff;box-shadow:0 6px 24px rgba(${accentRgb},.36);}
.chatbot-fab:hover{background:${accentDark};box-shadow:0 10px 30px rgba(${accentRgb},.44);transform:scale(1.06);}
.chatbot-panel{background:#fff;border:1px solid rgba(0,0,0,.1);box-shadow:0 24px 60px rgba(0,0,0,.14);border-radius:${radius};}
.chatbot-header{background:${accent};color:#fff;}
.chatbot-avatar{background:rgba(255,255,255,.22);}
.chatbot-close{color:#fff;}
.chatbot-bubble{border-radius:${radiusBtn};}
.chatbot-msg--assistant .chatbot-bubble{background:#f3f4f6;color:#1a2332;border-bottom-left-radius:4px;}
.chatbot-msg--user .chatbot-bubble{background:${accent};color:#fff;border-bottom-right-radius:4px;}
.chatbot-bubble--typing span{background:#9ca3af;}
.chatbot-footer{border-top:1px solid #e5e7eb;}
.chatbot-input{border:1.5px solid #d1d5db;border-radius:${radiusInput};background:#f9fafb;color:#1a2332;}
.chatbot-input:focus{border-color:${accent};box-shadow:0 0 0 2px rgba(${accentRgb},.12);}
.chatbot-input::placeholder{color:#9ca3af;}
.chatbot-send{background:${accent};color:#fff;}
`
}

function rosePremium(opts: LandingThemeOptions): string {
  const accent = opts.accent ?? '#d4547a'
  const accentDark = hexShade(accent, -18)
  const accentRgb = hexToRgb(accent)
  const fontBody = opts.fontFamily ?? '"DM Sans","Helvetica Neue",Arial,sans-serif'
  const fh = '"Cormorant Garamond","Georgia","Times New Roman",serif'
  const r = opts.borderRadius ?? 36
  const radius = `${r}px`
  const radiusLg = `${Math.round(r * 1.1)}px`
  const radiusBtn = r < 20 ? radius : '999px'
  const radiusInput = `${Math.min(r, 20)}px`
  const radiusSm = `${Math.round(r * 0.7)}px`

  return `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap');
body{background:radial-gradient(ellipse at 0% 0%,rgba(255,200,215,.8),transparent 35%),radial-gradient(ellipse at 100% 80%,rgba(${accentRgb},.22),transparent 40%),linear-gradient(160deg,#fff5f8 0%,#ffe8f0 50%,#fde0ea 100%);color:#2d1520;font-family:${fontBody};}
.hero{border:1px solid rgba(255,255,255,.6);background:linear-gradient(145deg,rgba(255,245,249,.92),rgba(255,230,240,.78));border-radius:${radiusLg};box-shadow:0 32px 80px rgba(${accentRgb},.14);backdrop-filter:blur(18px);}
.eyebrow{border-radius:999px;background:rgba(${accentRgb},.1);color:${accent};}
.hero h1,.landing-title{font-family:${fh};color:#1a0810;letter-spacing:-.02em;}
.hero p{color:rgba(45,21,32,.65);}
.landing-block{border:1px solid rgba(${accentRgb},.14);border-radius:${radius};background:rgba(255,245,249,.88);box-shadow:0 18px 50px rgba(${accentRgb},.1);backdrop-filter:blur(14px);}
.landing-block p{color:rgba(45,21,32,.7);}
.landing-media{border-radius:${radiusSm};background:rgba(${accentRgb},.07);}
.landing-caption{color:rgba(45,21,32,.55);}
.field-shell input,.field-shell textarea{border:1px solid rgba(${accentRgb},.2);border-radius:${radiusInput};background:rgba(255,255,255,.8);color:#2d1520;}
.field-shell input:focus,.field-shell textarea:focus{border-color:${accent};outline:none;box-shadow:0 0 0 3px rgba(${accentRgb},.12);}
.field-shell input::placeholder,.field-shell textarea::placeholder{color:rgba(45,21,32,.38);}
.cta-button{border-radius:${radiusBtn};background:linear-gradient(135deg,${accent},${accentDark});color:#fff;font-weight:700;box-shadow:0 16px 32px rgba(${accentRgb},.28);transition:transform .2s ease,box-shadow .2s ease;}
.cta-button:hover{transform:translateY(-2px);box-shadow:0 22px 44px rgba(${accentRgb},.36);}
.feedback{border-radius:${radiusInput};}
.feedback.success{background:rgba(34,120,80,.1);color:#145c3a;}
.feedback.error{background:rgba(${accentRgb},.12);color:${accentDark};}
.empty-card{border:1px solid rgba(${accentRgb},.18);border-radius:${radiusLg};background:rgba(255,245,249,.95);box-shadow:0 32px 80px rgba(${accentRgb},.14);}
.empty-card h1{font-family:${fh};color:#1a0810;}
.empty-card p{color:rgba(45,21,32,.65);}
.chatbot-fab{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;box-shadow:0 8px 28px rgba(${accentRgb},.42);}
.chatbot-fab:hover{box-shadow:0 12px 36px rgba(${accentRgb},.52);transform:scale(1.08);}
.chatbot-panel{background:#fff5f8;border:1px solid rgba(${accentRgb},.2);box-shadow:0 32px 80px rgba(${accentRgb},.18);border-radius:${radius};}
.chatbot-header{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;}
.chatbot-avatar{background:rgba(255,255,255,.25);}
.chatbot-close{color:#fff;}
.chatbot-bubble{border-radius:${radiusInput};}
.chatbot-msg--assistant .chatbot-bubble{background:rgba(${accentRgb},.08);color:#2d1520;border-bottom-left-radius:4px;}
.chatbot-msg--user .chatbot-bubble{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;border-bottom-right-radius:4px;}
.chatbot-bubble--typing span{background:rgba(${accentRgb},.5);}
.chatbot-footer{border-top:1px solid rgba(${accentRgb},.12);}
.chatbot-input{border:1px solid rgba(${accentRgb},.2);border-radius:${radiusInput};background:rgba(255,255,255,.8);color:#2d1520;}
.chatbot-input:focus{border-color:${accent};box-shadow:0 0 0 2px rgba(${accentRgb},.12);}
.chatbot-input::placeholder{color:rgba(45,21,32,.38);}
.chatbot-send{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;}
`
}

function boldMinimal(opts: LandingThemeOptions): string {
  const accent = opts.accent ?? '#111111'
  const accentRgb = hexToRgb(accent)
  const fontBody = opts.fontFamily ?? '"Space Grotesk","Helvetica Neue",Arial,system-ui,sans-serif'
  const fh = fontBody
  const r = opts.borderRadius ?? 0
  const radius = `${r}px`
  const radiusBtn = `${r}px`
  const radiusInput = `${r}px`

  return `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');
body{background:#ffffff;color:#111111;font-family:${fontBody};}
.hero{border:0;border-bottom:3px solid ${accent};background:transparent;border-radius:0;box-shadow:none;}
.eyebrow{border-radius:${radiusBtn};background:#111111;color:#ffffff;letter-spacing:.08em;}
.hero h1,.landing-title{font-family:${fh};color:#111111;letter-spacing:-.04em;}
.hero p{color:#444444;}
.landing-block{border:0;border-left:3px solid ${accent};border-radius:${radius};background:#ffffff;box-shadow:none;}
.landing-block p{color:#444444;}
.landing-media{border-radius:${radius};background:#f5f5f5;border:1px solid #e0e0e0;}
.landing-caption{color:#666666;}
.field-shell input,.field-shell textarea{border:2px solid #111111;border-radius:${radiusInput};background:#ffffff;color:#111111;}
.field-shell input:focus,.field-shell textarea:focus{border-color:${accent};outline:none;box-shadow:4px 4px 0 ${accent};}
.field-shell input::placeholder,.field-shell textarea::placeholder{color:#999999;}
.cta-button{border-radius:${radiusBtn};background:${accent};color:${accent === '#111111' ? '#ffffff' : (hexToRgb(accent).split(',').map(Number).reduce((a,b)=>a+b,0)/3<128?'#ffffff':'#111111')};font-weight:700;box-shadow:4px 4px 0 rgba(${accentRgb},.3);transition:transform .14s ease,box-shadow .14s ease;}
.cta-button:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 rgba(${accentRgb},.4);}
.feedback{border-radius:${radiusBtn};}
.feedback.success{background:transparent;color:#1a7a4a;border-left:3px solid #1a7a4a;}
.feedback.error{background:transparent;color:#c0392b;border-left:3px solid #c0392b;}
.empty-card{border:2px solid #111111;border-radius:${radius};background:#ffffff;box-shadow:6px 6px 0 ${accent};}
.empty-card h1{font-family:${fh};color:#111111;}
.empty-card p{color:#444444;}
.chatbot-fab{background:${accent};color:${accent === '#111111' ? '#fff' : '#fff'};box-shadow:4px 4px 0 rgba(${accentRgb},.35);}
.chatbot-fab:hover{box-shadow:6px 6px 0 rgba(${accentRgb},.45);transform:translate(-1px,-1px);}
.chatbot-panel{background:#ffffff;border:2px solid #111111;box-shadow:8px 8px 0 rgba(${accentRgb},.25);border-radius:${radius};}
.chatbot-header{background:${accent};color:#ffffff;}
.chatbot-avatar{background:rgba(255,255,255,.2);}
.chatbot-close{color:#ffffff;}
.chatbot-bubble{border-radius:${radiusBtn};}
.chatbot-msg--assistant .chatbot-bubble{background:#f5f5f5;color:#111111;border:1px solid #e0e0e0;border-bottom-left-radius:0;}
.chatbot-msg--user .chatbot-bubble{background:${accent};color:#ffffff;border-bottom-right-radius:0;}
.chatbot-bubble--typing span{background:#666666;}
.chatbot-footer{border-top:2px solid #111111;}
.chatbot-input{border:2px solid #cccccc;border-radius:${radiusInput};background:#ffffff;color:#111111;}
.chatbot-input:focus{border-color:${accent};outline:none;}
.chatbot-input::placeholder{color:#999999;}
.chatbot-send{background:${accent};color:#ffffff;}
`
}

export function generateLandingThemeCss(themeKey: string, opts: LandingThemeOptions = {}): string {
  const generators: Record<string, (o: LandingThemeOptions) => string> = {
    'warm-classic': warmClassic,
    'elegant-dark': elegantDark,
    'fresh-modern': freshModern,
    'rose-premium': rosePremium,
    'bold-minimal': boldMinimal,
  }
  const gen = generators[themeKey] ?? generators['warm-classic']
  const base = gen(opts)
  return opts.customCss ? `${base}\n/* Custom CSS */\n${opts.customCss}` : base
}
