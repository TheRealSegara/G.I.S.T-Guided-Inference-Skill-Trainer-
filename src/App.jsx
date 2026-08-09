import React, { useState, useEffect, useRef } from "react";
import { Sparkles, RotateCcw, ArrowRight, GraduationCap, ChevronLeft, Trophy, Footprints, Play, Wrench } from "lucide-react";

/* ---------------- Fonts ---------------- */
const FontImport = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;700;800&family=Patrick+Hand&display=swap');
    .font-display { font-family: 'Baloo 2', cursive; }
    .font-hand { font-family: 'Patrick Hand', cursive; }
    .font-body { font-family: 'Nunito', sans-serif; }
    .dot-trail {
      background-image: radial-gradient(rgba(16,185,129,0.15) 2px, transparent 2px);
      background-size: 14px 14px;
    }
    @keyframes stepIn { from { opacity:0; transform: translateY(8px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
    .step-in { animation: stepIn 0.28s ease-out both; }
    @keyframes bounce-in { 0% { transform: scale(0.7); opacity:0;} 60% { transform: scale(1.08); opacity:1;} 100% { transform: scale(1);} }
    .bounce-in { animation: bounce-in 0.4s ease-out; }
    @keyframes float { 0%,100% { transform: translateY(0) rotate(var(--r,0deg)); } 50% { transform: translateY(-10px) rotate(var(--r,0deg)); } }
    .float-slow { animation: float 5s ease-in-out infinite; }
    .float-med { animation: float 3.5s ease-in-out infinite; }
    @keyframes wiggle { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
    .wiggle { animation: wiggle 2.2s ease-in-out infinite; }
    .sticker-title { color: #78350f; text-shadow: 3px 3px 0 #fde68a, 5px 5px 0 rgba(120,53,15,0.15); }
    @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin-slow { animation: spin-slow 90s linear infinite; }
    @keyframes confettiFall {
      0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(var(--rot, 360deg)); opacity: 0.9; }
    }
    .confetti-piece { animation-name: confettiFall; animation-timing-function: ease-in; animation-fill-mode: forwards; }
    @keyframes companionBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    .companion-bob { animation: companionBob 2.4s ease-in-out infinite; }
    @keyframes companionGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.6); } 50% { box-shadow: 0 0 0 10px rgba(251,191,36,0); } }
    .companion-speaking { animation: companionGlow 1s ease-out infinite; }
    @keyframes sparklePop {
      0% { transform: translate(0,0) scale(0.3); opacity: 0; }
      30% { opacity: 1; }
      100% { transform: translate(var(--sx,0), var(--sy,0)) scale(1); opacity: 0; }
    }
    .sparkle-piece { animation: sparklePop 0.7s ease-out forwards; }
    .parchment-card {
      background-image: radial-gradient(ellipse at center, rgba(217,119,6,0.04) 0%, rgba(217,119,6,0.09) 100%);
    }
    /* Buttons/inputs across the app use focus:outline-none with only a
       border-color change as a substitute; this restores a strong,
       keyboard-only focus indicator on top of that without touching every
       component's className. */
    :focus-visible {
      outline: 3px solid #2563eb !important;
      outline-offset: 2px !important;
    }
    @media (prefers-reduced-motion: reduce) {
      .step-in, .bounce-in, .float-slow, .float-med, .wiggle, .spin-slow,
      .confetti-piece, .companion-bob, .companion-speaking, .sparkle-piece {
        animation: none !important;
      }
    }
  `}</style>
);

const DECOR_ITEMS = ["🧭", "📍", "⛰️", "🌴", "⛵", "🗺️", "✨", "⭐", "🦋", "🎈"];
function FloatingDecor({ density = 6 }) {
  const items = Array.from({ length: density }).map((_, i) => ({
    emoji: DECOR_ITEMS[i % DECOR_ITEMS.length],
    top: `${8 + ((i * 37) % 80)}%`,
    left: `${5 + ((i * 53) % 90)}%`,
    size: 20 + ((i * 13) % 20),
    delay: `${(i * 0.6) % 3}s`,
    cls: i % 2 === 0 ? "float-slow" : "float-med",
  }));
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-40" aria-hidden="true">
      {items.map((it, i) => (
        <span
          key={i}
          className={`absolute ${it.cls}`}
          style={{ top: it.top, left: it.left, fontSize: it.size, animationDelay: it.delay }}
        >
          {it.emoji}
        </span>
      ))}
    </div>
  );
}

const CONFETTI_COLORS = ["#f59e0b", "#0d9488", "#e11d48", "#2563eb", "#84cc16", "#a855f7"];
function Confetti({ count = 40 }) {
  const pieces = Array.from({ length: count }).map((_, i) => ({
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${Math.random() * 0.6}s`,
    duration: `${2.2 + Math.random() * 1.4}s`,
    size: 6 + Math.random() * 6,
    rot: `${180 + Math.random() * 540}deg`,
    round: Math.random() > 0.5,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }} aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animationDelay: p.delay,
            animationDuration: p.duration,
            "--rot": p.rot,
          }}
        />
      ))}
    </div>
  );
}

function PersistentCompanion({ avatarConfig, size = "text-6xl" }) {
  const companionEmoji = ANIMAL_COMPANIONS.find((c) => c.id === avatarConfig.companion)?.emoji || "🦜";
  const speaking = useIsSpeaking();
  return (
    <div
      className="fixed bottom-4 left-4 z-40 companion-bob pointer-events-none select-none"
      aria-hidden="true"
    >
      <span
        className={`${size} inline-block rounded-full bg-white ${speaking ? "companion-speaking" : ""}`}
        style={{ border: "3px solid #f59e0b", boxShadow: "0 5px 0 0 #b45309", padding: "0.15em 0.2em", lineHeight: 1 }}
      >
        {companionEmoji}
      </span>
    </div>
  );
}

function Sparkle({ count = 8 }) {
  const pieces = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const dist = 30 + Math.random() * 20;
    return {
      sx: `${Math.cos(angle) * dist}px`,
      sy: `${Math.sin(angle) * dist}px`,
      delay: `${Math.random() * 0.1}s`,
    };
  });
  return (
    <span className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 30 }}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="sparkle-piece absolute left-1/2 top-1/2 text-sm"
          style={{ "--sx": p.sx, "--sy": p.sy, animationDelay: p.delay }}
        >
          ✨
        </span>
      ))}
    </span>
  );
}

/* ---------------- Content data ---------------- */
function PaperGrain() {
  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.5, mixBlendMode: "multiply" }} aria-hidden="true">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.30  0 0 0 0 0.12  0 0 0 0.45 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

function CompassRose({ size = 220, spin = false, className = "" }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={`${className} ${spin ? "spin-slow" : ""}`} aria-hidden="true">
      <circle cx="100" cy="100" r="94" fill="none" stroke="#92400e" strokeWidth="2" opacity="0.55" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="#92400e" strokeWidth="1" opacity="0.4" />
      <g opacity="0.6">
        <polygon points="100,8 111,100 100,192 89,100" fill="#b45309" />
        <polygon points="8,100 100,89 192,100 100,111" fill="#b45309" />
      </g>
      <g opacity="0.35" transform="rotate(45 100 100)">
        <polygon points="100,28 106,100 100,172 94,100" fill="#b45309" />
        <polygon points="28,100 100,94 172,100 100,106" fill="#b45309" />
      </g>
      <circle cx="100" cy="100" r="7" fill="#78350f" />
      <text x="100" y="26" textAnchor="middle" fontSize="15" fontWeight="800" fill="#78350f" fontFamily="Baloo 2, cursive">N</text>
      <text x="100" y="182" textAnchor="middle" fontSize="15" fontWeight="800" fill="#78350f" fontFamily="Baloo 2, cursive">S</text>
      <text x="17" y="105" textAnchor="middle" fontSize="15" fontWeight="800" fill="#78350f" fontFamily="Baloo 2, cursive">W</text>
      <text x="183" y="105" textAnchor="middle" fontSize="15" fontWeight="800" fill="#78350f" fontFamily="Baloo 2, cursive">E</text>
    </svg>
  );
}

function ScreenFrame() {
  return (
    <div className="fixed inset-0" style={{ zIndex: 9999, pointerEvents: "none" }}>
      <div
        className="absolute inset-0"
        style={{
          border: "9px solid #b45309",
          boxShadow: "inset 0 0 0 3px #78350f, inset 0 0 30px rgba(120,53,15,0.22)",
        }}
      />
      <div className="absolute -top-2 -left-2 opacity-30"><CompassRose size={46} /></div>
      <div className="absolute -top-2 -right-2 opacity-30"><CompassRose size={46} /></div>
      <div className="absolute -bottom-2 -left-2 opacity-30"><CompassRose size={46} /></div>
      <div className="absolute -bottom-2 -right-2 opacity-30"><CompassRose size={46} /></div>
    </div>
  );
}

const DECKLE = {
  borderRadius: "255px 18px 225px 18px / 18px 225px 18px 255px",
  border: "3px solid #b45309",
  boxShadow: "7px 7px 0 rgba(120,53,15,0.16)",
};

// Lighter, fully-rounded card style for student-facing screens, no torn edge, brighter border
const KID_CARD = {
  borderRadius: "32px",
  border: "3px solid #fb923c",
  boxShadow: "0 6px 0 0 #f97316",
};

function CompassWatermark() {
  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden" style={{ opacity: 0.06 }} aria-hidden="true">
      <CompassRose size={640} spin />
    </div>
  );
}

const AVATAR_HEADS = [
  { id: "child", base: "🧒", label: "Explorer" },
  { id: "girl", base: "👧", label: "Explorer" },
  { id: "boy", base: "👦", label: "Explorer" },
];

const SKIN_TONES = [
  { id: "default", mod: "", label: "Default" },
  { id: "light", mod: "🏻", label: "Light" },
  { id: "medlight", mod: "🏼", label: "Medium-light" },
  { id: "medium", mod: "🏽", label: "Medium" },
  { id: "meddark", mod: "🏾", label: "Medium-dark" },
  { id: "dark", mod: "🏿", label: "Dark" },
];

const BADGE_COLORS = [
  { id: "khaki", label: "Khaki", gradient: "linear-gradient(135deg,#e5decf,#a8a878)" },
  { id: "red", label: "Red", gradient: "linear-gradient(135deg,#fca5a5,#dc2626)" },
  { id: "blue", label: "Blue", gradient: "linear-gradient(135deg,#93c5fd,#2563eb)" },
  { id: "purple", label: "Purple", gradient: "linear-gradient(135deg,#c4b5fd,#7c3aed)" },
  { id: "green", label: "Green", gradient: "linear-gradient(135deg,#86efac,#16a34a)" },
  { id: "orange", label: "Orange", gradient: "linear-gradient(135deg,#fdba74,#ea580c)" },
  { id: "teal", label: "Teal", gradient: "linear-gradient(135deg,#5eead4,#0d9488)" },
  { id: "pink", label: "Pink", gradient: "linear-gradient(135deg,#f9a8d4,#db2777)" },
];

const ACCESSORY_STICKERS = [
  { id: "backpack", emoji: "🎒", label: "Backpack" },
  { id: "cap", emoji: "🧢", label: "Cap" },
  { id: "sunglasses", emoji: "🕶️", label: "Sunglasses" },
  { id: "binoculars", emoji: "🔭", label: "Binoculars" },
  { id: "compass", emoji: "🧭", label: "Compass" },
  { id: "boots", emoji: "🥾", label: "Boots" },
  { id: "camera", emoji: "📷", label: "Camera" },
  { id: "none", emoji: "", label: "No Gear" },
];

const ANIMAL_COMPANIONS = [
  { id: "orangutan", emoji: "🦧", label: "Orang Utan" },
  { id: "tiger", emoji: "🐯", label: "Tiger" },
  { id: "parrot", emoji: "🦜", label: "Parrot" },
  { id: "turtle", emoji: "🐢", label: "Turtle" },
  { id: "butterfly", emoji: "🦋", label: "Butterfly" },
  { id: "monkey", emoji: "🐒", label: "Monkey" },
  { id: "owl", emoji: "🦉", label: "Owl" },
  { id: "gecko", emoji: "🦎", label: "Gecko" },
];

const DEFAULT_AVATAR_CONFIG = { head: "child", skinTone: "🏽", badge: "khaki", accessory: "backpack", companion: "parrot" };

function composeAvatarEmoji(config) {
  const head = AVATAR_HEADS.find((h) => h.id === config.head) || AVATAR_HEADS[0];
  return head.base + (config.skinTone || "");
}

function AvatarDisplay({ config, size = 80 }) {
  const badge = BADGE_COLORS.find((b) => b.id === config.badge) || BADGE_COLORS[0];
  const accessory = ACCESSORY_STICKERS.find((a) => a.id === config.accessory);
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size, background: badge.gradient, border: "3px solid white", boxShadow: "0 4px 0 0 rgba(0,0,0,0.12)" }}
    >
      <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{composeAvatarEmoji(config)}</span>
      {accessory && accessory.emoji && (
        <span
          className="absolute rounded-full bg-white flex items-center justify-center"
          style={{
            bottom: -size * 0.05,
            right: -size * 0.05,
            width: size * 0.42,
            height: size * 0.42,
            fontSize: size * 0.24,
            border: "2px solid white",
            boxShadow: "0 2px 0 0 rgba(0,0,0,0.15)",
          }}
        >
          {accessory.emoji}
        </span>
      )}
    </div>
  );
}

const MAP_THEMES = [
  { name: "amber", gradient: "linear-gradient(135deg,#fde68a,#fbbf24)", border: "#d97706", soft: "#fef3c7", text: "#92400e" },
  { name: "teal", gradient: "linear-gradient(135deg,#99f6e4,#2dd4bf)", border: "#0d9488", soft: "#ccfbf1", text: "#0f766e" },
  { name: "emerald", gradient: "linear-gradient(135deg,#a7f3d0,#34d399)", border: "#059669", soft: "#d1fae5", text: "#065f46" },
  { name: "rust", gradient: "linear-gradient(135deg,#fed7aa,#fb923c)", border: "#c2410c", soft: "#ffedd5", text: "#9a3412" },
  { name: "gold", gradient: "linear-gradient(135deg,#fde047,#facc15)", border: "#ca8a04", soft: "#fef9c3", text: "#854d0e" },
  { name: "brick", gradient: "linear-gradient(135deg,#fca5a5,#f87171)", border: "#b91c1c", soft: "#fee2e2", text: "#991b1b" },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const BUILT_IN_MAP_THEME_NAMES = {
  "A Trip to the Sanctuary": "emerald",
  "The Kampung Festival": "gold",
  "Pet Show Day": "rust",
  "The Robot Show": "teal",
};

function getMapTheme(idOrTitle) {
  const forced = BUILT_IN_MAP_THEME_NAMES[idOrTitle];
  if (forced) return MAP_THEMES.find((t) => t.name === forced) || MAP_THEMES[0];
  return MAP_THEMES[hashString(idOrTitle) % MAP_THEMES.length];
}

// Fixed at 3 (not adjustable) to keep a session's AI-call cost predictable
// and comfortably within Gemini's free-tier daily quota. Applies both to
// how many target words a student session covers and how many words a
// teacher's custom map generates.
const SESSION_WORD_COUNT = 3;

// AI calls only retry on a malformed/unparseable response, not on
// network or auth/quota failures (see NON_RETRYABLE_STATUSES below).
// Kept low since every retry is a real AI-quota call, not a free retry.
const MAX_RETRY_ATTEMPTS = 2;

// If a word hasn't resolved after this many student answers, auto-reveal
// it via the same free fallback Skip uses, instead of letting a stuck
// word consume an unbounded number of AI calls.
const STUCK_WORD_LIMIT = 4;

// Rough typical-case AI calls for one full session: ~2 calls per word
// (opening + one answer that resolves it) across SESSION_WORD_COUNT
// words, plus the transfer test, comprehension check, and diagnostic
// report. Deliberately the typical case, not STUCK_WORD_LIMIT's worst
// case — using the worst case here would make this check nearly always
// block, since it'd exceed most of DAILY_QUOTA_PER_CODE's default on
// its own. Used to decide whether there's enough quota left today to
// reasonably start a new session, not a hard guarantee it'll finish.
const SESSION_COST_ESTIMATE = SESSION_WORD_COUNT * 2 + 3;

const PASSAGES = {
  orangutan: {
    title: "A Trip to the Sanctuary",
    emoji: "🌴",
    mission: "The ranger needs your help! Learn these 3 words so you can tell your little brother the whole story before bedtime.",
    arrival: "You made it! Now you know the sanctuary's secret words, your brother is going to love this story tonight.",
    text: `Last Saturday, Mei Ling went to a wildlife park in Sarawak. At first, her little brother was reluctant to walk into the forest. He held his mother's hand tightly and did not want to go. Then he saw an enormous orang utan in a tree. It was very big, almost as big as a car! He forgot to feel scared. Now he felt curious. He asked question after question about the animal. The orang utan's fur felt damp. It had just rained, so everything outside was wet. The ranger said orang utans look big and strong. But they are actually gentle. They are calm and kind, and they do not hurt people.`,
    words: [
      { word: "reluctant", clueType: "contrast", concreteness: "abstract" },
      { word: "enormous", clueType: "definition", concreteness: "concrete" },
      { word: "curious", clueType: "example", concreteness: "abstract" },
      { word: "damp", clueType: "inference", concreteness: "concrete" },
      { word: "gentle", clueType: "contrast", concreteness: "abstract" },
    ],
  },
  kampung: {
    title: "The Kampung Festival",
    emoji: "🎋",
    mission: "The festival is starting! Crack these 3 words before the rice cakes are ready, so you can help Aiman welcome the guests.",
    arrival: "The rice cakes are ready and so are you! You've learned every word in the village today.",
    text: `Every year, Aiman's village has a small festival. It is a harvest festival. The kampung becomes bustling. Many visitors come. There are food stalls and children running everywhere. Aiman's grandmother looks delighted. She smiles a big smile when the rice cakes are ready. The rice cakes smell fragrant. The sweet smell of pandan leaves fills the air. By evening, after cooking and welcoming guests all day, the family feels exhausted. They worked hard, so now they feel very tired. But they are also happy. The neighbours are generous too. They share their food freely with anyone who walks by.`,
    words: [
      { word: "bustling", clueType: "example", concreteness: "abstract" },
      { word: "delighted", clueType: "definition", concreteness: "abstract" },
      { word: "fragrant", clueType: "inference", concreteness: "concrete" },
      { word: "exhausted", clueType: "contrast", concreteness: "abstract" },
      { word: "generous", clueType: "example", concreteness: "abstract" },
    ],
  },
  petshow: {
    title: "Pet Show Day",
    emoji: "🐾",
    mission: "Help Mei and her friends show off their pets! Learn these 3 words before the judges arrive.",
    arrival: "The judges loved every pet! You solved every word, just like a true pet show champion.",
    text: `Today is Pet Show day at school. Many pupils bring their pets. Mei has a small spider. Spiders can look scary, but she says they are brave hunters. Some animals use camouflage. Camouflage helps them hide from enemies. A gecko can change color like this. Ali's cat is very timid. It hides under the chair when guests come. But Ali's dog is clever. It can open doors by itself! Siti's rabbit is playful. It jumps and runs around the room all day.`,
    words: [
      { word: "brave", clueType: "contrast", concreteness: "abstract" },
      { word: "camouflage", clueType: "definition", concreteness: "abstract" },
      { word: "timid", clueType: "inference", concreteness: "abstract" },
      { word: "clever", clueType: "example", concreteness: "abstract" },
      { word: "playful", clueType: "example", concreteness: "abstract" },
    ],
  },
  robot: {
    title: "The Robot Show",
    emoji: "🤖",
    mission: "The science fair starts soon! Learn these 3 words to explain how the amazing robot works.",
    arrival: "The robot show was a huge success, and so are you! Every word explained, every clue solved.",
    text: `Last week, the school had a robot show. A scientist invented a new robot. She built it from small metal parts. The robot looks powerful. It can lift heavy boxes easily. But the robot is also careful. It never drops anything. Everyone said the robot was amazing. It can dance and sing songs too! Inside the robot is a tiny computer, smaller than your hand. The computer helps the robot think and move.`,
    words: [
      { word: "invented", clueType: "definition", concreteness: "abstract" },
      { word: "powerful", clueType: "example", concreteness: "abstract" },
      { word: "careful", clueType: "contrast", concreteness: "abstract" },
      { word: "amazing", clueType: "example", concreteness: "abstract" },
      { word: "tiny", clueType: "definition", concreteness: "concrete" },
    ],
  },
};

const STAGE_LABELS = {
  1: "Multiple Choice",
  2: "Fill the Blank",
  3: "Fix the Mistake",
  4: "Finish the Sentence",
  5: "Free Sentence",
};

const STAGE_COLORS = {
  1: "bg-emerald-400",
  2: "bg-teal-400",
  3: "bg-amber-400",
  4: "bg-orange-400",
  5: "bg-rose-400",
};

const STAGE_INSTRUCTIONS = {
  1: { icon: "🧭", text: "Pick the best answer" },
  2: { icon: "📍", text: "Type the missing word" },
  3: { icon: "🛠️", text: "Find and fix the mistake" },
  4: { icon: "🗺️", text: "Finish the sentence" },
  5: { icon: "🚩", text: "Write your own sentence" },
};

const INPUT_TYPE_INSTRUCTIONS = {
  mcq: { icon: "👉", text: "Pick the best answer" },
  true_false: { icon: "🤔", text: "True or false?" },
  tap_select: { icon: "👆", text: "Tap the right word" },
  word_bank: { icon: "🔤", text: "Tap the letters to spell it" },
  letter_connect: { icon: "🔗", text: "Connect the letters to spell it" },
  reverse_clue: { icon: "🕵️", text: "Tap the clue that helped you" },
  text: { icon: "✍️", text: "Type your answer" },
};

const STAGE_GRADIENTS = {
  1: "linear-gradient(135deg,#34d399,#10b981)",
  2: "linear-gradient(135deg,#22d3ee,#0891b2)",
  3: "linear-gradient(135deg,#fbbf24,#d97706)",
  4: "linear-gradient(135deg,#fb923c,#ea580c)",
  5: "linear-gradient(135deg,#f472b6,#db2777)",
};

/* ---------------- Prompts ---------------- */
const COMPANION_PERSONAS = {
  orangutan: { name: "Ori", persona: "You are Ori the Orang Utan, a gentle and curious guide. You love swinging from one idea to the next. Occasionally (not every message) say \"Ooh ooh!\" when something is exciting.", description: "Gentle and curious. Loves swinging into new ideas.", color: { gradient: "linear-gradient(135deg,#fde68a,#d6a35c)", border: "#92400e", soft: "#fef3c7", text: "#78350f" } },
  tiger: { name: "Tiger", persona: "You are Tiger, a bold, confident guide who loves cheering the student on. Occasionally (not every message) say \"Rawr!\" when praising a good answer.", description: "Bold and confident. Cheers you on loudly.", color: { gradient: "linear-gradient(135deg,#fdba74,#fb923c)", border: "#c2410c", soft: "#ffedd5", text: "#9a3412" } },
  parrot: { name: "Polly", persona: "You are Polly the Parrot, a chatty, cheerful guide who loves repeating fun words. Occasionally (not every message) say \"Squawk!\" for emphasis.", description: "Chatty and cheerful. Always has something to say.", color: { gradient: "linear-gradient(135deg,#86efac,#4ade80)", border: "#15803d", soft: "#dcfce7", text: "#166534" } },
  turtle: { name: "Shelly", persona: "You are Shelly the Turtle, a calm, patient guide. You often remind the student there's no rush and to take their time.", description: "Calm and patient. Never rushes you.", color: { gradient: "linear-gradient(135deg,#99f6e4,#2dd4bf)", border: "#0d9488", soft: "#ccfbf1", text: "#0f766e" } },
  butterfly: { name: "Flutter", persona: "You are Flutter the Butterfly, a light, gentle, encouraging guide. Your phrasing is soft and airy, like fluttering from one clue to the next.", description: "Light and gentle. Floats from clue to clue.", color: { gradient: "linear-gradient(135deg,#bae6fd,#7dd3fc)", border: "#0369a1", soft: "#e0f2fe", text: "#075985" } },
  monkey: { name: "Momo", persona: "You are Momo the Monkey, a playful, energetic guide who loves a bit of mischief and fun.", description: "Playful and energetic. Loves a bit of mischief.", color: { gradient: "linear-gradient(135deg,#fde047,#eab308)", border: "#a16207", soft: "#fef9c3", text: "#854d0e" } },
  owl: { name: "Ollie", persona: "You are Ollie the Owl, a wise, calm guide. Occasionally (not every message) say \"Hoo\" thoughtfully before a tip.", description: "Wise and thoughtful. Gives clever tips.", color: { gradient: "linear-gradient(135deg,#d6d3d1,#a8a29e)", border: "#57534e", soft: "#f5f5f4", text: "#44403c" } },
  gecko: { name: "Gizmo", persona: "You are Gizmo the Gecko, a quick-witted, clever guide who loves sneaky tricks and clever clues, a bit like camouflage for words.", description: "Quick and clever. A master of sneaky clues.", color: { gradient: "linear-gradient(135deg,#bef264,#a3e635)", border: "#4d7c0f", soft: "#ecfccb", text: "#3f6212" } },
};

function buildCoachSystemPrompt(companionId, stage1Type, stage2Type, stage3Type) {
  const c = COMPANION_PERSONAS[companionId] || COMPANION_PERSONAS.parrot;
  return `${c.persona} You are a warm, playful, encouraging guide helping a Malaysian primary school ESL student (age 9-12) work out the meaning of ONE target vocabulary word from context. Stay in character as ${c.name} throughout, but don't let the character quirks get in the way of clear teaching. You NEVER state the dictionary definition directly, at any point.

CRITICAL FORMAT RULE: Your entire reply, including any catchphrase or personality flourish, must live INSIDE the "message" field of the JSON object below. Never write anything, not even a single word of roleplay, greeting, or catchphrase, before or after the JSON object. Your reply must start with { and end with }, nothing else.

LANGUAGE RULES (strict, follow every turn):
- Write like you're talking to a Year 4-6 ESL learner. Use only simple, everyday words (aside from the target word itself).
- Every sentence you write, in "message" or in any Stage 2-4 example sentence, must be short: under 10 words, never more than 12. The "message" field is at most 2 short sentences total.
- MCQ options must be short, 1-4 words each, never a long phrase.
- No difficult connector words like "although," "nevertheless," or "consequently." Use "but," "so," and "and" instead.

You guide the student through up to 5 stages, adapting difficulty based on how they perform:
Stage 1 - MCQ: multiple choice, pick the correct meaning as used in the passage (exactly 4 options, 1 correct, 3 plausible distractors, order randomised).
Stage 2 - Fill in the blank: show the original sentence with the target word replaced by a blank; student types the missing word from memory, no options given.
Stage 3 - Correct the mistake: show a sentence using the target word slightly WRONG (wrong form or wrong context); student identifies or fixes the mistake.
Stage 4 - Sentence completion: give a sentence starter using the target word; student completes it naturally.
Stage 5 - Free sentence: student writes an original sentence correctly using the target word, no scaffolding.

Adaptive rules:
- A brand new word always starts at Stage 1.
- If the student answers quickly and confidently correct, advance 1-2 stages.
- If correct but shaky, advance by 1 stage.
- If incorrect, stay at the current stage or drop back 1 stage (never below 1), and give a hint drawn from the passage's context. A hint must NEVER state or closely paraphrase the word's meaning, even indirectly, if your hint could be copy-pasted as a correct answer choice, it is not a hint, it is the answer, and that is not allowed. Instead, point to WHERE in the passage to look (a specific nearby phrase or clue) or ask a guiding question, without ever completing the thought for them.
- The word is RESOLVED once the student succeeds independently (at most 1 hint used at that stage) at Stage 4 or Stage 5.
- Keep messages short (1-3 sentences), warm, encouraging, and fun. Never repeat the same opening line twice in a row.
- When a word is RESOLVED, vary the reward line: a short fun fact about the word, a silly one-line joke using it, or a playful mini-challenge to use it again later today. Don't repeat the same style two words in a row.

The input_type for each stage is assigned below, not left to your choice, follow it exactly, this is how real variety happens across words in the session. Each type's full mechanics are defined once in the list further down.
- Stage 1 MUST use input_type "${stage1Type}".
- Stage 2 MUST use input_type "${stage2Type}".
- Stage 3 MUST use input_type "${stage3Type}".
- Stage 4 and Stage 5 MUST use input_type "text" always. At Stage 4, put the sentence beginning in "sentence_starter" (e.g. "The orang utan was very") and keep "message" as just a short instruction like "Finish this sentence!", never repeat the starter text inside "message". At Stage 5, "sentence_starter" must be null, the student writes the whole sentence themselves.

CRITICAL: every turn, fill "display_sentence" with the sentence shown to the student in a dedicated reference box, separate from "message". Default rule: always the original passage sentence containing the target word, used correctly, this covers Stage 1, Stage 2 (the app blanks the word out visually itself, give the correct sentence here), Stage 3 with "reverse_clue" or "text", and Stage 4/5. ONE exception: Stage 3 with "tap_select" instead needs a sentence using the target word WRONG, matching the words in "options" exactly, since that's what the student taps from. Never null, never empty.

Input type definitions:
- "mcq" (Stage 1 only): message poses a question; options is an array of exactly 4 short answer choices, one correct.
- "true_false" (Stage 1 only): message poses a true-or-false statement about how the target word is used; options must be exactly ["True","False"].
- "word_bank" (Stage 2 only, target word is ABSENT/blanked): message asks the student to spell the missing word from context; word_tiles is an array of the individual letters of the target word in SHUFFLED order.
- "letter_connect" (Stage 2 only, target word is ABSENT/blanked): same task as word_bank, but the letters are shown arranged in a circle and the student connects them in order by tapping; word_tiles uses the exact same shuffled-letters format as word_bank.
- "tap_select" (Stage 3 only, target word IS present but used WRONG): message is just the instruction (e.g. "Fix the mistake!"); options is the display_sentence's words split individually, so the student taps the ONE incorrect word. Never include a blank placeholder as an option.
- "reverse_clue" (Stage 3 only, target word IS present and used CORRECTLY): message asks which part of the sentence is the actual clue explaining the word's meaning; options is display_sentence's words split individually, and the correct tap is the clue phrase itself, not an error.
- "text": free typing, no options or tiles. Used for Stage 2 (type the missing word), Stage 3 (type the correction), Stage 4 (continue from sentence_starter), and Stage 5 (write an original sentence with no scaffolding).

Respond with ONLY valid, compact, single-line JSON, no markdown fences, no extra commentary before or after, and no literal line breaks inside any string value, in exactly this shape:
{
  "message": "string shown to the student: brief feedback if any, then the next task, never the full sentence, that's display_sentence's job",
  "display_sentence": "string, REQUIRED every turn, see rules above",
  "input_type": "mcq" or "true_false" or "tap_select" or "word_bank" or "letter_connect" or "reverse_clue" or "text",
  "options": ["a","b","c","d"] or null (used for mcq, true_false, tap_select, and reverse_clue),
  "word_tiles": ["l","e","t","t","e","r","s"] or null (used for word_bank and letter_connect, shuffled),
  "sentence_starter": "string or null, ONLY at Stage 4: the sentence beginning up to where the student continues from, do not repeat this text inside message",
  "stage": number (the stage this new question belongs to, 1-5),
  "hint_given": boolean,
  "resolved": boolean,
  "fun_fact": "string or null, only when resolved is true: the varied reward line described above (fact, joke, or challenge)"
}`;
}

const TRANSFER_TEST_SYSTEM_PROMPT = `A Malaysian primary school ESL student just worked out a vocabulary word inside one specific passage. Now you test whether they truly understand it, not just that specific sentence, by dropping the same word into a brand-new sentence they have never seen, about a different everyday situation, then asking what it means there.

Write ONE new short sentence (under 15 words) using the target word correctly and naturally, about a different topic than the original passage. Then write an MCQ with 4 short options (1-4 words each) for what the word means in this new sentence, one correct.

Respond with ONLY valid JSON, no markdown fences, no extra text, in exactly this shape:
{
  "sentence": "the new sentence using the word",
  "options": ["a","b","c","d"],
  "correctAnswer": "the exact text of the correct option"
}`;

const COMPREHENSION_SYSTEM_PROMPT = `A Malaysian primary school ESL student just finished working through 5 vocabulary words from a passage. Now check whether they actually followed the story itself, not just the individual words, with one comprehension question about the passage as a whole (a main event, a reason something happened, or what a character did), not about any single vocabulary word.

Write ONE short question and an MCQ with 4 short options (1-6 words each), one correct, testing overall understanding of the passage.

Respond with ONLY valid JSON, no markdown fences, no extra text, in exactly this shape:
{
  "question": "the comprehension question",
  "options": ["a","b","c","d"],
  "correctAnswer": "the exact text of the correct option"
}`;

const SINGLE_WORD_REGEN_PROMPT = `You help a teacher fix one word in a G.I.S.T. map. You are given a passage and a list of words already chosen as targets, do not repeat any of them. Pick ONE different word from the passage that is present exactly as written, meaningfully challenging but inferable for a Year 4-6 ESL learner, with a genuine context clue nearby (contrast, definition, example, or inference).

Respond with ONLY valid JSON, no markdown fences, no extra text, in exactly this shape:
{"word": "exact spelling from the passage", "clueType": "contrast", "concreteness": "abstract"}`;

const LEVEL_MAKER_SYSTEM_PROMPT = (wordCount) => `You help a teacher turn their own reading passage into a G.I.S.T. map for Malaysian primary school (Year 4-6) ESL students. You are given a passage the teacher wrote or pasted themselves.

Sometimes the teacher's message will end with a line starting "Required words:", listing specific words they want used as targets, in order. If that line is present, you MUST use those exact words as the first entries in your "words" array, in the order given, spelled exactly as the teacher wrote them (correct capitalization to match how the word actually appears in the passage if needed, but don't change the word itself). Only pick your own additional words to fill any remaining slots if fewer than ${wordCount} were given. If no such line is present, pick all ${wordCount} yourself.

Pick exactly ${wordCount} target vocabulary words total. Each one must:
- Be present in the passage EXACTLY as written (same spelling and form), copy it precisely, don't change tense or add/remove letters.
- Be meaningfully challenging but inferable from context for a Year 4-6 ESL learner, not too easy, not too obscure.
- Have a genuine context clue nearby in the passage (a contrast word like "but", a definition-like explanation, an illustrative example, or something the reader can infer from surrounding detail). Don't pick a word with no real clue around it. This still applies to teacher-required words, tag them with whatever clueType actually fits the context, even if imperfect.

Across the ${wordCount} words, aim for a mix of clueType values (contrast, definition, example, inference) and a mix of concreteness values (abstract, concrete), don't make them all the same type if the passage offers variety.

Also assess the passage's overall readability for a Year 4-6 Malaysian ESL learner specifically (not a native speaker), considering sentence length, vocabulary difficulty, and idea complexity:
- "readabilityLevel": one of "too_easy", "about_right", "too_hard".
- "readabilityNote": one short plain sentence explaining why, specific to this passage (e.g. mention actual sentence complexity or vocabulary if relevant), not generic.

Also write:
- "emoji": one single emoji that fits the passage's theme.
- "mission": one upbeat sentence framing why the student is doing this, in an adventurous, kid-friendly voice, similar to "Help ___ by learning these ${wordCount} words before ___!"
- "arrival": one upbeat sentence for after they finish, tying back to the mission.

Respond with ONLY valid, compact JSON, no markdown fences, no extra text, in exactly this shape:
{
  "emoji": "single emoji",
  "mission": "string",
  "arrival": "string",
  "readabilityLevel": "too_easy" or "about_right" or "too_hard",
  "readabilityNote": "string",
  "words": [
    {"word": "exact spelling from the passage", "clueType": "contrast", "concreteness": "abstract"}
  ]
}
The "words" array must have exactly ${wordCount} entries.`;

const DIAGNOSTIC_SYSTEM_PROMPT = `You are the G.I.S.T. diagnostic engine. G.I.S.T. is purely an assessment tool, it exists to reveal what a student understands, not to be the thing they get taught with again. You read a log of a Malaysian primary school ESL student's completed vocabulary coaching session and produce five separate pieces of teacher-facing output.

Each log entry contains: the word, its clueType (contrast, definition, example, or inference), its concreteness (abstract or concrete), the stage the student needed to reach to resolve it (1-5, higher means they needed more support), how many hints they used, whether the word was skipped, whether they reported seeing the word before ("priorKnowledge": yes/no/not_sure), how they say they got it ("gotItVia": knew/clues/guessed), which clue phrase they identified as helping them (if any), how long they took to answer in seconds ("timeToAnswerSec"), and, for at most one word this session, a transfer test result (whether they could use the word correctly in a brand-new sentence, "transferPassed": true/false/null). You are also given the whole-passage comprehension check result (correct or incorrect) and the question/answer involved. You may also be given optional teacher notes about the session's context (e.g. "right after recess," "usually stronger with reading"), factor these in wherever relevant, they explain circumstances the log alone can't show, they don't override what the data actually shows.

Entries are listed in chronological order, oldest first, so you can also see how the student's response time and hint use changed across the session, not just which words were hard.

THE MOST IMPORTANT RULE, applies to every part: NEVER use internal category labels as if the reader already knows them. Words like "clue type," "contrast clue," "concreteness," "reliability," "transfer test," "prior knowledge" are labels for you to reason with, never words to hand the teacher. Translate every pattern into what it actually means in plain language. Instead of "struggled with contrast-clue words," write something like "when the sentence explains a word directly, they work it out easily, but when the clue is more indirect, like the word 'but' signaling a contrast, they lose the thread." Instead of "the transfer test passed," write "when we changed the sentence completely, they still got it right, real proof they understand the word itself, not just that one sentence." If you catch yourself typing one of the banned labels above into a field a teacher reads, stop and rewrite it in plain words.

HARD RULES for all parts, not optional:
- Never write generic praise or filler with no evidence behind it. Banned phrases include (but are not limited to): "did well overall," "great effort," "good job," "struggled a bit," "some words," "certain areas," "keep practicing." If you catch yourself about to write something a teacher could have guessed without seeing the log, stop and replace it with an actual data point.
- Every claim about a pattern must name the specific word(s) it's based on, by name, not just the category. A claim without a named word attached is not allowed.
- Wrap the specific words and key evidence in double asterisks like **careful** or **needed a lot of support**, so they can be visually emphasised. Only bold genuine evidence, not random words.
- When describing how much support a word needed, use plain difficulty tiers, "solved independently," "needed some support," "needed a lot of support", never a bare hint count as a number, that belongs to the app's own summary table, not your prose.
- Treat skipped words separately: name any skipped words as needing direct teacher follow-up, don't fold them into pattern analysis.
- If the log is too short for a confident pattern (fewer than 3 non-skipped entries), say so plainly in whichever section it affects, and just report what happened with those specific words instead of generalising.

FORMAT RULES for all parts, not optional, this creates real visual hierarchy instead of a wall of text:
- Each field (except storyUnderstandingNote) must be written as: ONE short bolded headline sentence on its own line, then a blank line, then 2-4 bullet points, each on its own line starting with "- ". Use literal "\\n" characters in the JSON string for line breaks, never write it all as one flowing paragraph.
- Each bullet must be short, one specific point, one piece of evidence. Don't write a bullet longer than one sentence.
- storyUnderstandingNote is short enough (1-2 sentences) to stay as plain text, no bullets needed there, but the bold-evidence rule still applies.

PART 1 — "coreProblem" (headline + up to 3 bullets):
- Headline: describe this student the way you'd describe them to another teacher, not a word-category scorecard. Fuse two things into one read: the specific word-level pattern (which kind of clue trips them up, in plain words) AND the session-level arc, did their hint use or response time get better or worse as the session went on, did skips cluster near the end (a fatigue signal, different from a difficulty signal), did they seem to engage less over time. Only claim a session-level arc if the data actually supports it (roughly 4+ non-skipped entries with real variation), otherwise stick to the word-level pattern alone.
- Bullets: enough specific named-word evidence to justify the headline, plus one bullet naming a genuine strength held to the same evidence standard, so this reads as "here is exactly where the gap is and isn't," not a blanket verdict.
- If the data genuinely doesn't support a single clear pattern, say so plainly as the headline instead of manufacturing one, and give fewer bullets.

PART 2 — "whatThisMeans" (headline + 2-3 bullets):
- This section answers "so what does this actually mean for how this student reads," not a restatement of the pattern. Explain significance, not more evidence, that belongs in Part 1.
- Do NOT predict future performance or readiness for harder material, that's not something one session can responsibly support, stay anchored to what this session's pattern reveals about how this student currently processes context clues, nothing beyond that.
- Example shape (write your own, don't copy this): "This means when a word's meaning is spelled out for them, they're confident, but when they have to infer it from a signal word like 'but' or 'however,' that's a genuinely different skill they haven't built yet, not a vocabulary gap."

PART 3 — "howReliable" (headline + 2-4 bullets):
- Headline: one plain-language verdict on how much a teacher should trust this session's correct answers overall.
- Bullets: compare what a student claimed beforehand against what they actually did, and name any mismatch specifically in plain terms (e.g. "said they'd never seen 'exhausted' before, then said afterward they already knew it, worth a quick check with them directly"); note which correct answers are backed by real evidence versus which ones aren't (a fast guess that happened to be right isn't the same as reasoning it out); if a sentence-swap check ran this session, describe its result as the strongest single piece of evidence available, in plain words, not as a named test.

PART 4 — "storyUnderstandingNote" (1-2 sentences, plain text):
- Given the comprehension check result, write a short line connecting it back to the vocabulary work, made clear that this tests following the actual story, not just knowing individual words.

PART 5 — "whatToTry" (headline + 2-3 bullets):
- Headline: the one real classroom teaching action for the teacher's next actual lesson, completely independent of G.I.S.T. or any app. Never mention the game, an app stage, or an interaction type, G.I.S.T. only assesses, it doesn't reteach.
- Bullets: why this action, referencing the specific word(s) and the plain-language pattern from Parts 1 and 2, not generic ("give more vocabulary practice" is not acceptable); end the final bullet with one short, ready-to-use line the teacher could say out loud to the student right now, in quotation marks.

Respond with ONLY valid JSON, no markdown fences, no extra text, in exactly this shape:
{
  "coreProblem": "string",
  "whatThisMeans": "string",
  "howReliable": "string",
  "storyUnderstandingNote": "string",
  "whatToTry": "string"
}`;

/* ---------------- Access gate (auth) ---------------- */
// Lightweight module-level bridge between the App component's auth state
// and callClaude(), which is a plain function outside React so it can't
// read hooks directly. App() keeps these in sync via useEffect.
const AUTH_STORAGE_KEY = "gist_auth";
let currentAuthToken = null;
let onAuthInvalidated = null;

function loadCachedAuth() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveCachedAuth(token, expiresAt) {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, expiresAt }));
  } catch (e) {
    /* sessionStorage unavailable (e.g. private browsing); token just won't persist across reloads */
  }
}

function clearCachedAuth() {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}

/* ---------------- Quota tracking (client-side, per-device estimate) ---------------- */
// The real quota is enforced server-side (api/_claudeHandler.js) no
// matter what this cache says — this exists only to drive a "X of Y
// used today" indicator and to block starting a new session when there
// isn't enough budget left to finish one. It's a same-device estimate,
// not a global count: Vercel's serverless functions don't share memory
// across invocations, so there's no way to ask the server "what's the
// real total" without that ask itself costing a real call. Seeded from
// dailyLimit on /api/auth, corrected by the authoritative numbers in
// every /api/claude response after that.
const QUOTA_STORAGE_KEY = "gist_quota";
const quotaListeners = new Set();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadQuotaCache() {
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.date !== todayKey()) return null; // new day, stale
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveQuotaCache(fields) {
  try {
    const existing = loadQuotaCache() || { used: 0, limit: null };
    const merged = { date: todayKey(), used: existing.used, limit: existing.limit, ...fields };
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(merged));
    quotaListeners.forEach((fn) => fn(merged));
  } catch (e) {
    /* localStorage unavailable (e.g. private browsing); indicator just won't persist */
  }
}

function useQuotaStatus() {
  const [status, setStatus] = useState(() => loadQuotaCache());
  useEffect(() => {
    quotaListeners.add(setStatus);
    return () => quotaListeners.delete(setStatus);
  }, []);
  return status; // null (unknown yet) | { date, used, limit }
}

/* ---------------- API helper ---------------- */
async function callClaude(systemPrompt, messages) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {}),
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  if (response.status === 401) onAuthInvalidated?.();
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (data?.quota) saveQuotaCache({ used: data.quota.used, limit: data.quota.limit });
    const err = new Error(
      response.status === 401
        ? "Access code session expired, please re-enter your code"
        : data?.error || "API request failed"
    );
    err.status = response.status;
    throw err;
  }
  const data = await response.json();
  if (data?.quota) saveQuotaCache({ used: data.quota.used, limit: data.quota.limit });
  const textBlocks = (data.content || []).filter((b) => b.type === "text").map((b) => b.text);
  return textBlocks.join("");
}

// Failures the server can't resolve by simply being asked again: retrying
// just delays showing the real message (or, for 401, spams /api/claude
// with an already-invalidated token). Only network hiccups and malformed
// JSON responses are worth a retry.
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 429]);

function safeParseJSON(raw) {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

  // Attempt 1: parse as-is
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    /* fall through */
  }

  // Attempt 2: extract the outermost {...} block in case of stray prose before/after
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = cleaned.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch (e) {
      /* fall through */
    }
    // Attempt 3: escape stray literal newlines/tabs sitting inside string values
    try {
      const repaired = slice.replace(/"((?:[^"\\]|\\.)*)"/g, (m, inner) =>
        `"${inner.replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t")}"`
      );
      return JSON.parse(repaired);
    } catch (e) {
      /* fall through */
    }
  }
  return null;
}

async function callClaudeWithRetry(systemPrompt, messages, attempts = MAX_RETRY_ATTEMPTS) {
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const raw = await callClaude(systemPrompt, messages);
      const parsed = safeParseJSON(raw);
      if (parsed) return parsed;
      lastError = new Error("Response wasn't valid JSON");
    } catch (e) {
      lastError = e;
      if (NON_RETRYABLE_STATUSES.has(e.status)) break;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
    }
  }
  throw lastError || new Error("Couldn't get a response, please try again");
}


/* ---------------- UI atoms ---------------- */
const BigButton = ({ children, onClick, disabled, variant = "solid", className = "", silent = false }) => {
  const base = "font-display font-800 text-sm px-6 py-3 rounded-full transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-1 active:scale-95";
  const variantStyles = {
    solid: { background: "linear-gradient(180deg,#fbbf24,#d97706)", color: "white", boxShadow: "0 5px 0 0 #92400e" },
    outline: { background: "white", color: "#059669", border: "3px solid #34d399", boxShadow: "0 4px 0 0 #a7f3d0" },
    ghost: { background: "transparent", color: "#78716c", boxShadow: "none" },
  };
  return (
    <button
      onClick={(e) => { if (!silent) SFX.click(); if (onClick) onClick(e); }}
      disabled={disabled}
      className={`${base} ${className}`}
      style={disabled ? { ...variantStyles[variant], boxShadow: "none" } : variantStyles[variant]}
      onMouseDown={(e) => { if (!disabled && variant !== "ghost") e.currentTarget.style.boxShadow = "none"; }}
      onMouseUp={(e) => { if (!disabled && variant !== "ghost") e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow; }}
      onMouseLeave={(e) => { if (!disabled && variant !== "ghost") e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow; }}
    >
      {children}
    </button>
  );
};

const AvatarBadge = ({ config, size = "w-14 h-14", pixelSize = 56 }) => (
  <div className={size}>
    <AvatarDisplay config={config} size={pixelSize} />
  </div>
);

/* ---------------- Setup Screen ---------------- */
function SetupScreen({ onBegin, customPassages, onSaveCustomPassage, onViewDemoReport, bilingual, onToggleBilingual }) {
  const [mode, setMode] = useState(null); // null (main menu) | "tour" | "play" | "maker"
  const [step, setStep] = useState(1);
  const [studentId, setStudentId] = useState("");
  const [avatarConfig, setAvatarConfig] = useState(DEFAULT_AVATAR_CONFIG);
  const [passageId, setPassageId] = useState(null);

  // Unknown status (null, e.g. localStorage unavailable) fails open:
  // better to let a session start than block on missing information we
  // have no way to obtain otherwise.
  const quotaStatus = useQuotaStatus();
  const canAffordSession =
    !quotaStatus || quotaStatus.limit == null || quotaStatus.limit - quotaStatus.used >= SESSION_COST_ESTIMATE;

  const [makerText, setMakerText] = useState("");
  const [makerTitle, setMakerTitle] = useState("");
  const [makerResult, setMakerResult] = useState(null); // { emoji, mission, arrival, words, readabilityLevel, readabilityNote }
  const [makerGenerating, setMakerGenerating] = useState(false);
  const [makerError, setMakerError] = useState(null);
  const [makerSaved, setMakerSaved] = useState(false);
  const [makerWords, setMakerWords] = useState(["", "", ""]);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);

  const allPassages = { ...PASSAGES, ...Object.fromEntries(customPassages.map((p) => [p.id, p])) };

  async function generateMakerLevel() {
    if (!makerText.trim()) return;
    SFX.click();
    setMakerGenerating(true);
    setMakerError(null);
    setMakerResult(null);
    const chosenWords = makerWords.map((w) => w.trim()).filter(Boolean);
    const userContent = chosenWords.length
      ? `${makerText.trim()}\n\nRequired words: use exactly these words for the target list, in this order, spelled exactly as I've written them here: ${chosenWords.join(", ")}. If fewer than ${SESSION_WORD_COUNT} are given, pick your own good words to fill the remaining slots.`
      : makerText.trim();
    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const raw = await callClaude(LEVEL_MAKER_SYSTEM_PROMPT(SESSION_WORD_COUNT), [{ role: "user", content: userContent }]);
        const parsed = safeParseJSON(raw);
        if (parsed && Array.isArray(parsed.words) && parsed.words.length === SESSION_WORD_COUNT) {
          const validated = parsed.words.map((w) => ({
            ...w,
            foundInText: makerText.toLowerCase().includes(String(w.word || "").toLowerCase()),
          }));
          setMakerResult({
            emoji: parsed.emoji || "📖",
            mission: parsed.mission || "",
            arrival: parsed.arrival || "",
            readabilityLevel: parsed.readabilityLevel || null,
            readabilityNote: parsed.readabilityNote || "",
            words: validated,
          });
          setMakerGenerating(false);
          return;
        }
        lastError = new Error("Unexpected response format");
      } catch (e) {
        lastError = e;
        if (NON_RETRYABLE_STATUSES.has(e.status)) break;
      }
    }
    setMakerError(`Couldn't generate the map just now. ${lastError ? lastError.message : ""} Try again.`);
    setMakerGenerating(false);
  }

  async function regenerateSingleWord(index) {
    if (!makerResult) return;
    SFX.tap();
    setRegeneratingIndex(index);
    const otherWords = makerResult.words.filter((_, i) => i !== index).map((w) => w.word);
    try {
      const raw = await callClaude(SINGLE_WORD_REGEN_PROMPT, [
        { role: "user", content: `Passage: "${makerText.trim()}"\n\nAlready chosen words (don't repeat these): ${otherWords.join(", ")}` },
      ]);
      const parsed = safeParseJSON(raw);
      if (parsed && parsed.word) {
        const foundInText = makerText.toLowerCase().includes(String(parsed.word).toLowerCase());
        setMakerResult((prev) => ({
          ...prev,
          words: prev.words.map((w, i) => (i === index ? { ...parsed, foundInText } : w)),
        }));
      }
    } catch (e) {
      /* keep the existing word if this fails */
    }
    setRegeneratingIndex(null);
  }

  function saveMakerLevel() {
    if (!makerResult || !makerTitle.trim()) return;
    SFX.tap();
    const id = "custom-" + makerTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) + "-" + Date.now().toString(36).slice(-4);
    const newPassage = {
      title: makerTitle.trim(),
      emoji: makerResult.emoji,
      mission: makerResult.mission,
      arrival: makerResult.arrival,
      text: makerText.trim(),
      words: makerResult.words.map(({ word, clueType, concreteness }) => ({ word, clueType, concreteness })),
    };
    onSaveCustomPassage(id, newPassage);
    setPassageId(id);
    setMakerText("");
    setMakerTitle("");
    setMakerResult(null);
    setMakerWordCount(5);
    setMakerWords(["", "", "", "", ""]);
    setMakerSaved(true);
  }

  function resetMakerAndGoMenu() {
    setMode(null);
    setMakerSaved(false);
    setMakerText("");
    setMakerTitle("");
    setMakerResult(null);
    setMakerError(null);
  }

  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-2.5 rounded-full transition-all ${
            n === step ? "w-8 bg-orange-400" : n < step ? "w-2.5 bg-emerald-400" : "w-2.5 bg-stone-200"
          }`}
        />
      ))}
    </div>
  );

  const CompanionGrid = ({ selected, onSelect }) => (
    <div className="grid grid-cols-4 gap-2.5">
      {ANIMAL_COMPANIONS.map((a) => {
        const persona = COMPANION_PERSONAS[a.id];
        const isSelected = selected === a.id;
        return (
          <button
            key={a.id}
            onClick={() => { SFX.tap(); onSelect(a.id); }}
            className={`flex flex-col items-center text-center gap-1 p-3 rounded-2xl transition-all ${
              isSelected ? "scale-[1.03]" : "hover:opacity-90"
            }`}
            style={{
              borderWidth: "3px",
              borderColor: persona?.color?.border,
              background: isSelected ? persona?.color?.gradient : persona?.color?.soft,
            }}
          >
            <span className="text-3xl shrink-0">{a.emoji}</span>
            <p className="font-display font-800 text-sm" style={{ color: persona?.color?.text }}>{persona?.name || a.label}</p>
            <p className="font-body text-[10px] leading-snug" style={{ color: persona?.color?.text, opacity: 0.75 }}>{persona?.description || a.label}</p>
          </button>
        );
      })}
    </div>
  );

  const Header = () => (
    <div className="text-center mb-4 relative z-10">
      <div className="flex justify-center mb-1"><CompassRose size={84} /></div>
      <h1 className="font-display text-7xl font-800 sticker-title mb-1">G.I.S.T.</h1>
      <p className="font-hand text-2xl text-amber-800 bg-white inline-block px-4 py-1 -rotate-2" style={{ borderRadius: "40px 8px 40px 8px", border: "2px solid #b45309" }}>chart your word-clue adventure!</p>
    </div>
  );

  const Footer = () => (
    <p className="font-body text-xs text-stone-500 text-center mt-8 leading-relaxed relative z-10 bg-white/70 rounded-xl py-2">
      For use during class or after-school sessions, with your teacher there to help. 🧑‍🏫
    </p>
  );

  /* -------- Main menu -------- */
  if (!mode) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 step-in min-h-screen flex flex-col justify-center relative">
        <FloatingDecor density={7} />
        <Header />
        <div className="relative z-10 bg-white p-2" style={DECKLE}>
          <div className="grid grid-cols-2">
            {/* Student panel */}
            <div className="p-8 flex flex-col items-center text-center rounded-2xl" style={{ background: "#FEF3D7" }}>
              <p className="font-display font-800 text-sm uppercase tracking-wide text-amber-700 mb-2">For Students</p>
              <span className="text-5xl mb-3">🔍</span>
              <p className="font-body text-sm text-stone-600 leading-relaxed mb-5 max-w-[220px]">
                Choose a map and work through the words with your coach, tapping, spelling, and typing your way to each answer.
              </p>
              <BigButton onClick={() => { setMode("play"); setStep(1); }}>
                <Play className="inline w-4 h-4 mr-1.5 fill-current" /> Start Playing
              </BigButton>
            </div>

            {/* Divider */}
            <div className="absolute left-1/2 top-8 bottom-8 w-px bg-stone-200" />

            {/* Teacher panel */}
            <div className="p-8 flex flex-col items-center text-center rounded-2xl" style={{ background: "#F1EFEA" }}>
              <p className="font-display font-800 text-sm uppercase tracking-wide text-stone-500 mb-2">For Teachers</p>
              <span className="text-5xl mb-3">🧑‍🏫</span>
              <p className="font-body text-sm text-stone-600 leading-relaxed mb-5 max-w-[240px]">
                Paste any passage and G.I.S.T. picks the target words for you, ready in under a minute for your student to play.
              </p>
              <BigButton variant="outline" onClick={() => { setMode("maker"); setMakerSaved(false); }}>
                <Wrench className="inline w-4 h-4 mr-1.5" /> Create a Custom Map
              </BigButton>
              {onViewDemoReport && (
                <button
                  onClick={() => { SFX.tap(); onViewDemoReport(); }}
                  className="mt-3 font-body text-xs text-stone-400 underline hover:text-stone-600"
                >
                  🔦 See a sample report
                </button>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* -------- Level maker (reachable from menu, or from the map-picker step) -------- */
  if (mode === "maker") {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 step-in min-h-screen flex flex-col justify-center relative">
        <FloatingDecor density={7} />

        {makerSaved ? (
          <div className="bg-white p-8 step-in relative z-10 text-center" style={DECKLE}>
            <p className="text-5xl mb-4">✅</p>
            <label className="font-display font-800 text-xl text-stone-700 block mb-2 text-center">Map saved!</label>
            <p className="font-body text-sm text-stone-500 mb-6">It's ready for a student to play. Hand over the device and tap Start Playing.</p>
            <div className="flex items-center justify-center gap-3">
              <BigButton variant="ghost" onClick={resetMakerAndGoMenu}>
                <ChevronLeft className="inline w-4 h-4 mr-1" /> Main menu
              </BigButton>
              <BigButton onClick={() => { setMakerSaved(false); setMode("play"); setStep(1); }}>
                <Play className="inline w-4 h-4 mr-1.5 fill-current" /> Start Playing <ArrowRight className="inline w-4 h-4 ml-1" />
              </BigButton>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 step-in relative z-10" style={DECKLE}>
            <p className="text-4xl text-center mb-4">🛠️</p>
            <label className="font-display font-800 text-xl text-stone-700 block mb-2 text-center">Create your own map</label>
            <p className="font-body text-xs text-stone-500 text-center mb-5">Paste a passage (about 80-150 words). The AI will pick {SESSION_WORD_COUNT} good target words with real context clues.</p>

            <label className="font-display font-700 text-xs uppercase tracking-wide text-amber-700 block mb-2">Map title</label>
            <input
              value={makerTitle}
              onChange={(e) => setMakerTitle(e.target.value)}
              placeholder="e.g. A Day at the Market"
              className="w-full bg-amber-50 rounded-2xl border-2 border-amber-300 px-4 py-3 font-body text-stone-700 mb-4 focus:outline-none focus:border-amber-500"
            />

            <label className="font-display font-700 text-xs uppercase tracking-wide text-amber-700 block mb-2">Passage text</label>
            <textarea
              value={makerText}
              onChange={(e) => setMakerText(e.target.value)}
              placeholder="Paste or write your passage here…"
              rows={6}
              className="w-full bg-amber-50 rounded-2xl border-2 border-amber-300 px-4 py-3 font-body text-sm text-stone-700 focus:outline-none focus:border-amber-500"
            />
            {(() => {
              const wc = makerText.trim() ? makerText.trim().split(/\s+/).length : 0;
              const good = wc >= 80 && wc <= 150;
              const color = wc === 0 ? "text-stone-400" : good ? "text-emerald-600" : "text-amber-600";
              return (
                <p className={`font-body text-[11px] mb-4 text-right ${color}`}>
                  {wc} word{wc === 1 ? "" : "s"} {wc > 0 && !good && (wc < 80 ? "· a bit short, aim for 80-150" : "· a bit long, aim for 80-150")}
                  {good && " · good length"}
                </p>
              );
            })()}

            <div className="flex items-center gap-3 mb-4 bg-amber-50 rounded-2xl px-4 py-3" style={{ border: "2px solid #b45309" }}>
              <p className="font-display font-800 text-2xl text-amber-800">{SESSION_WORD_COUNT}</p>
              <div>
                <p className="font-display font-700 text-xs uppercase tracking-wide text-amber-700">Target Words</p>
                <p className="font-body text-[11px] text-stone-500">Fixed at {SESSION_WORD_COUNT} to keep each map's AI usage predictable</p>
              </div>
            </div>

            <label className="font-display font-700 text-xs uppercase tracking-wide text-amber-700 block mb-1">Words to highlight (optional)</label>
            <p className="font-body text-[11px] text-stone-400 mb-2">Pick specific words yourself, or leave any box blank and the AI will choose good ones for you.</p>
            <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${SESSION_WORD_COUNT}, minmax(0, 1fr))` }}>
              {makerWords.map((w, i) => (
                <input
                  key={i}
                  value={w}
                  onChange={(e) => setMakerWords((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                  placeholder={`Word ${i + 1}`}
                  className="w-full bg-amber-50 rounded-xl border-2 border-amber-300 px-2 py-2 font-body text-xs sm:text-sm text-stone-700 text-center focus:outline-none focus:border-amber-500"
                />
              ))}
            </div>

            <div className="text-center mb-4">
              <BigButton onClick={generateMakerLevel} disabled={!makerText.trim() || makerGenerating}>
                {makerGenerating ? "Reading your passage…" : "✨ Generate words & details"}
              </BigButton>
            </div>

            {makerError && <p className="font-body text-xs text-rose-600 text-center mb-4" aria-live="polite">{makerError}</p>}

            {makerResult && (
              <div className="mb-4 p-4 rounded-2xl bg-teal-50 step-in" style={{ border: "2px solid #0d9488" }}>
                {makerResult.readabilityLevel && (
                  <div
                    className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl"
                    style={{
                      background: makerResult.readabilityLevel === "about_right" ? "#d1fae5" : "#fef3c7",
                      border: `2px solid ${makerResult.readabilityLevel === "about_right" ? "#059669" : "#d97706"}`,
                    }}
                  >
                    <span className="text-lg">{makerResult.readabilityLevel === "about_right" ? "✅" : makerResult.readabilityLevel === "too_easy" ? "🟢" : "🔴"}</span>
                    <div>
                      <p className="font-display font-800 text-xs uppercase tracking-wide text-stone-700">
                        {makerResult.readabilityLevel === "about_right" ? "Right for Year 4-6" : makerResult.readabilityLevel === "too_easy" ? "May be too easy" : "May be too hard"}
                      </p>
                      {makerResult.readabilityNote && <p className="font-body text-xs text-stone-600">{makerResult.readabilityNote}</p>}
                    </div>
                  </div>
                )}
                <p className="font-body text-xs text-stone-600 mb-2"><strong>Mission:</strong> {makerResult.mission}</p>
                <p className="font-body text-xs text-stone-600 mb-3"><strong>Arrival:</strong> {makerResult.arrival}</p>
                <p className="font-display font-700 text-xs uppercase tracking-wide text-teal-700 mb-2">{makerResult.words.length} target words</p>
                <div className="flex flex-wrap gap-2">
                  {makerResult.words.map((w, i) => (
                    <span
                      key={i}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-display font-700 text-xs ${w.foundInText ? "bg-white text-stone-700" : "bg-rose-100 text-rose-600"}`}
                      style={{ border: `2px solid ${w.foundInText ? "#0d9488" : "#e11d48"}` }}
                    >
                      <span title={w.foundInText ? `${w.clueType} · ${w.concreteness}` : "Not found in your passage text"}>
                        {regeneratingIndex === i ? "…" : w.word} {!w.foundInText && regeneratingIndex !== i && "⚠️"}
                      </span>
                      <button
                        onClick={() => regenerateSingleWord(i)}
                        disabled={regeneratingIndex !== null}
                        className="hover:scale-125 transition-all disabled:opacity-30"
                        title="Reroll just this word"
                      >
                        🔄
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
              <BigButton
                variant="ghost"
                onClick={() => {
                  setMakerResult(null);
                  setMakerError(null);
                  setMode(null);
                }}
              >
                <ChevronLeft className="inline w-4 h-4 mr-1" /> Cancel
              </BigButton>
              {makerResult && (
                <BigButton variant="ghost" onClick={generateMakerLevel} disabled={makerGenerating}>
                  🔄 Regenerate
                </BigButton>
              )}
              <BigButton onClick={saveMakerLevel} disabled={!makerResult || !makerTitle.trim() || regeneratingIndex !== null}>
                💾 Save map
              </BigButton>
            </div>
          </div>
        )}
        <Footer />
      </div>
    );
  }

  /* -------- First-time tour, shown after setup is complete, right before play begins -------- */
  if (mode === "tour") {
    return (
      <TourScreen
        avatarConfig={avatarConfig}
        passage={allPassages[passageId]}
        onDone={() => onBegin(studentId.trim(), avatarConfig, passageId, SESSION_WORD_COUNT)}
        bilingual={bilingual}
        onToggleBilingual={onToggleBilingual}
      />
    );
  }

  /* -------- Play flow (4 steps) -------- */
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <div className="max-w-5xl mx-auto w-full px-6 pt-7 pb-8 flex-1 flex flex-col min-h-0 step-in relative">
        <FloatingDecor density={7} />

        <StepDots />

        <div className="flex-1 min-h-0 flex flex-col justify-center">

      {step === 1 && (
        <div className="bg-white p-8 step-in relative z-10 max-w-md mx-auto w-full" style={DECKLE}>
          <p className="text-4xl text-center mb-4">👋</p>
          <label className="font-display font-800 text-xl text-stone-700 block mb-4 text-center">What's your name or class number?</label>
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="e.g. Year4-Aiman"
            className="w-full bg-amber-50 rounded-2xl border-2 border-amber-300 px-4 py-4 font-body text-xl text-stone-700 text-center focus:outline-none focus:border-amber-500 placeholder:text-stone-400"
            autoFocus
          />
          <div className="flex items-center justify-center gap-3 mt-6">
            <BigButton variant="ghost" onClick={() => setMode(null)}>
              <ChevronLeft className="inline w-4 h-4 mr-1" /> Main menu
            </BigButton>
            <BigButton onClick={() => studentId.trim() && setStep(2)} disabled={!studentId.trim()}>
              Next <ArrowRight className="inline w-4 h-4 ml-1" />
            </BigButton>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 step-in relative z-10" style={KID_CARD}>
          <div className="flex items-center gap-3 mb-5 bg-white rounded-2xl px-5 py-3" style={{ border: "2px solid #b45309" }}>
            <span className="text-3xl">🐾</span>
            <div>
              <p className="font-display font-800 text-xl text-stone-700 leading-tight">Pick your animal companion</p>
              <p className="font-body text-xs text-stone-400">This animal will be your coach for the whole adventure</p>
            </div>
          </div>
          <CompanionGrid selected={avatarConfig.companion} onSelect={(id) => setAvatarConfig((c) => ({ ...c, companion: id }))} />
          <div className="flex items-center justify-center gap-3 mt-6">
            <BigButton variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="inline w-4 h-4 mr-1" /> Back
            </BigButton>
            <BigButton onClick={() => avatarConfig.companion && setStep(3)} disabled={!avatarConfig.companion}>
              Next <ArrowRight className="inline w-4 h-4 ml-1" />
            </BigButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step-in relative z-10 max-h-full overflow-y-auto">
          <label className="font-display font-800 text-xl text-stone-700 block mb-3 text-center bg-white/70 rounded-xl py-1.5">Build your explorer</label>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4" style={KID_CARD}>
              <div className="flex justify-center mb-3">
                <AvatarDisplay config={avatarConfig} size={80} />
              </div>

              <div className="mb-3">
                <p className="font-display font-700 text-sm uppercase tracking-wide text-amber-700 mb-2 text-center">Who are you?</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {AVATAR_HEADS.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => { SFX.tap(); setAvatarConfig((c) => ({ ...c, head: h.id })); }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-xl border-3 transition-all ${
                        avatarConfig.head === h.id ? "border-amber-600 scale-110 bg-amber-50" : "border-stone-200 opacity-70"
                      }`}
                      style={{ borderWidth: "3px" }}
                      title={h.label}
                    >
                      {h.base + (avatarConfig.skinTone || "")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-display font-700 text-sm uppercase tracking-wide text-amber-700 mb-2 text-center">Skin tone</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {SKIN_TONES.map((tone) => {
                    const head = AVATAR_HEADS.find((h) => h.id === avatarConfig.head) || AVATAR_HEADS[0];
                    return (
                      <button
                        key={tone.id}
                        onClick={() => { SFX.tap(); setAvatarConfig((c) => ({ ...c, skinTone: tone.mod })); }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-3 transition-all ${
                          avatarConfig.skinTone === tone.mod ? "border-amber-600 scale-110 bg-amber-50" : "border-stone-200 opacity-70"
                        }`}
                        style={{ borderWidth: "3px" }}
                        title={tone.label}
                      >
                        {head.base + tone.mod}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 flex flex-col flex-1 justify-center" style={KID_CARD}>
              <p className="font-display font-700 text-sm uppercase tracking-wide text-amber-700 mb-6 text-center">Badge color</p>
              <div className="grid grid-cols-4 gap-6 justify-items-center">
                {BADGE_COLORS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { SFX.tap(); setAvatarConfig((c) => ({ ...c, badge: b.id })); }}
                    className={`w-16 h-16 rounded-full transition-all active:scale-90 ${
                      avatarConfig.badge === b.id ? "scale-110" : "opacity-60 hover:opacity-100"
                    }`}
                    style={{ background: b.gradient, border: avatarConfig.badge === b.id ? "4px solid #b45309" : "4px solid white", boxShadow: avatarConfig.badge === b.id ? "0 3px 0 0 #92400e" : "0 3px 0 0 rgba(120,53,15,0.25)" }}
                    title={b.label}
                  />
                ))}
              </div>
              <p className="font-hand text-xl text-stone-400 text-center mt-6">{BADGE_COLORS.find((b) => b.id === avatarConfig.badge)?.label}</p>
            </div>

            <div className="bg-white p-6 flex flex-col flex-1 justify-center" style={KID_CARD}>
              <p className="font-display font-700 text-sm uppercase tracking-wide text-amber-700 mb-6 text-center">Gear</p>
              <div className="grid grid-cols-4 gap-6 justify-items-center">
                {ACCESSORY_STICKERS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { SFX.tap(); setAvatarConfig((c) => ({ ...c, accessory: a.id })); }}
                    className={`w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl transition-all active:scale-90 ${
                      avatarConfig.accessory === a.id ? "border-amber-600 scale-110 bg-amber-50" : "border-stone-200 opacity-60 hover:opacity-100"
                    }`}
                    style={{ borderWidth: "4px", boxShadow: avatarConfig.accessory === a.id ? "0 3px 0 0 #b45309" : "0 3px 0 0 #e7e5e4" }}
                    title={a.label}
                  >
                    {a.emoji || "🚫"}
                  </button>
                ))}
              </div>
              <p className="font-hand text-sm text-stone-400 text-center mt-2">{ACCESSORY_STICKERS.find((a) => a.id === avatarConfig.accessory)?.label}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <BigButton variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="inline w-4 h-4 mr-1" /> Back
            </BigButton>
            <BigButton onClick={() => setStep(4)}>
              Next <ArrowRight className="inline w-4 h-4 ml-1" />
            </BigButton>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white p-6 sm:p-8 step-in relative z-10 max-h-full overflow-y-auto" style={KID_CARD}>
          <div className="flex items-center gap-3 mb-5 bg-white rounded-2xl px-5 py-3" style={{ border: "2px solid #b45309" }}>
            <span className="text-3xl">🗺️</span>
            <div>
              <p className="font-display font-800 text-xl text-stone-700 leading-tight">Choose your map</p>
              <p className="font-body text-xs text-stone-400">Pick where your adventure happens today</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(allPassages).map(([id, p], i, arr) => {
              const isLastOdd = arr.length % 2 === 1 && i === arr.length - 1;
              const theme = getMapTheme(p.title);
              const isSelected = passageId === id;
              return (
                <button
                  key={id}
                  onClick={() => { SFX.tap(); setPassageId(id); }}
                  className={`rounded-2xl transition-all ${isLastOdd ? "col-span-2 flex items-center gap-3 text-left p-3" : "flex flex-col items-center text-center gap-1 p-3"} ${
                    isSelected ? "scale-[1.02]" : "hover:opacity-90"
                  }`}
                  style={{
                    borderWidth: "3px",
                    borderColor: theme.border,
                    background: isSelected ? theme.gradient : theme.soft,
                  }}
                >
                  <span className="text-3xl shrink-0">{p.emoji}</span>
                  <div>
                    <p className="font-display font-800 text-sm" style={{ color: theme.text }}>{p.title}</p>
                    <p className="font-body text-[10px] leading-snug" style={{ color: theme.text, opacity: 0.75 }}>{SESSION_WORD_COUNT} tricky words{id.startsWith("custom-") ? " · custom" : ""}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {passageId && allPassages[passageId] && (
            <div className="flex items-center gap-3 mt-4 bg-amber-50 rounded-2xl px-4 py-3 step-in" style={{ border: "2px solid #b45309" }}>
              <p className="font-display font-800 text-2xl text-amber-800">{SESSION_WORD_COUNT}</p>
              <div>
                <p className="font-display font-700 text-sm uppercase tracking-wide text-amber-700">Words Today</p>
                <p className="font-body text-[11px] text-stone-500">Fixed at {SESSION_WORD_COUNT} to keep each session's AI usage predictable</p>
              </div>
            </div>
          )}

          {!canAffordSession && (
            <p className="font-body text-xs text-rose-600 text-center mt-4" aria-live="polite">
              Today's practice sessions are full on this device. Come back tomorrow, or ask your teacher about the quota!
            </p>
          )}

          <div className="flex items-center justify-center gap-3 mt-6">
            <BigButton variant="ghost" onClick={() => setStep(3)}>
              <ChevronLeft className="inline w-4 h-4 mr-1" /> Back
            </BigButton>
            <BigButton onClick={() => passageId && setMode("tour")} disabled={!passageId || !canAffordSession}>
              Start my adventure <ArrowRight className="inline w-4 h-4 ml-1" />
            </BigButton>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Progress Trail ---------------- */
const TRAIL_POINTS = [[70, 90], [325, 30], [590, 92], [855, 26], [1120, 86]];

function trailPath(points) {
  return points
    .map((p, i) => {
      if (i === 0) return `M${p[0]},${p[1]}`;
      const prev = points[i - 1];
      const midX = (prev[0] + p[0]) / 2;
      const bend = i % 2 === 0 ? -34 : 34;
      return `Q${midX},${prev[1] + bend} ${p[0]},${p[1]}`;
    })
    .join(" ");
}

function ProgressTrail({ words, solvedWords, avatarConfig, totalMilestone }) {
  const solvedCount = solvedWords.length;
  const points = TRAIL_POINTS.slice(0, words.length);
  const pathD = trailPath(points);
  const stoneColors = ["#16a34a", "#0e7490", "#b45309", "#c2410c", "#be185d"];

  return (
    <div className="mb-6 bg-white p-5" style={DECKLE}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-display font-800 text-sm text-amber-800 flex items-center gap-1">
          <Footprints className="w-4 h-4" /> The Trail
        </p>
        <p className="font-body text-xs font-800 text-stone-500">{solvedCount} / {words.length} found</p>
      </div>
      <svg viewBox="0 0 1190 120" className="w-full" style={{ height: 130 }} preserveAspectRatio="xMidYMid meet">
        <path d={pathD} fill="none" stroke="#d6b370" strokeWidth="7" strokeLinecap="round" />
        <path d={pathD} fill="none" stroke="#78716c" strokeWidth="1.5" strokeDasharray="1 10" strokeLinecap="round" opacity="0.5" />
        {points.map((p, i) => {
          const solved = i < solvedCount;
          const isCurrent = i === solvedCount;
          return (
            <g key={i}>
              {isCurrent && (
                <text x={p[0] - 40} y={p[1] + 6} textAnchor="middle" fontSize="34" className="bounce-in">
                  {composeAvatarEmoji(avatarConfig)}
                </text>
              )}
              <circle cx={p[0]} cy={p[1]} r="17" fill={solved ? stoneColors[i % stoneColors.length] : "#e7e5e4"} stroke="white" strokeWidth="3.5" />
              <text x={p[0]} y={p[1] + 6} textAnchor="middle" fontSize="15" fontWeight="800" fill={solved ? "white" : "#a8a29e"}>
                {solved ? "✓" : i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      {totalMilestone && (
        <div className="flex items-center justify-center gap-2 mt-2 step-in bounce-in">
          <span
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shrink-0"
            style={{ border: "3px solid #f59e0b", boxShadow: "0 3px 0 0 #b45309" }}
          >
            {totalMilestone.emoji}
          </span>
          <div className="text-left">
            <p className="font-display font-800 text-base text-amber-700 leading-tight">{totalMilestone.title}</p>
            <p className="font-body text-xs text-stone-500 leading-tight">{totalMilestone.subtitle}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Passage Screen ---------------- */
function PassageScreen({ passage, solvedWords, onPickWord, onOpenTeacher, avatarConfig, totalLogCount, streakMsg, studentId, log, sessionStartedAt, revealedCount, onRevealNext }) {
  const milestone =
    totalLogCount >= 20 ? { emoji: "🏆", title: "Legendary Explorer", subtitle: "20+ words solved!" } :
    totalLogCount >= 10 ? { emoji: "🗺️", title: "Map Master", subtitle: "10+ words solved!" } :
    totalLogCount >= 5 ? { emoji: "🧭", title: "Trail Blazer", subtitle: "5+ words solved!" } : null;

  const highlightWords = (text, keyPrefix) => {
    const parts = [];
    let remaining = text;
    let key = 0;
    passage.words.forEach((w) => {
      const idx = remaining.toLowerCase().indexOf(w.word.toLowerCase());
      if (idx === -1) return;
      parts.push(<span key={`${keyPrefix}t${key++}`}>{remaining.slice(0, idx)}</span>);
      const matched = remaining.slice(idx, idx + w.word.length);
      const solved = solvedWords.includes(w.word);
      parts.push(
        <button
          key={`${keyPrefix}w${key++}-${solved}`}
          onClick={() => { if (!solved) { SFX.select(); unlockSpeechOnce(); onPickWord(w); } }}
          className={`font-display font-800 px-2 py-0.5 rounded-full transition-all inline-block ${
            solved
              ? "bg-emerald-100 text-emerald-700 line-through decoration-2 rotate-0 bounce-in"
              : "text-stone-800 hover:scale-110 -rotate-1"
          }`}
          style={!solved ? { background: "linear-gradient(135deg,#fde68a,#fdba74)", boxShadow: "0 3px 0 0 #d97706" } : {}}
        >
          {matched}
        </button>
      );
      remaining = remaining.slice(idx + w.word.length);
    });
    parts.push(<span key={`${keyPrefix}t${key++}`}>{remaining}</span>);
    return parts;
  };

  const sentences = passage.text.match(/[^.!?]+[.!?]+/g) || [passage.text];

  const renderPassage = () => {
    return sentences.map((sentence, i) => {
      if (i < revealedCount) {
        return (
          <p key={i} className="mb-3 last:mb-0 step-in flex items-start gap-1.5" style={{ breakInside: "avoid" }}>
            <span>{highlightWords(sentence.trim(), `s${i}-`)}</span>
            <button
              onClick={() => speak(sentence.trim())}
              className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-xs"
              title="Read this sentence aloud"
              aria-label="Read this sentence aloud"
            >
              🔊
            </button>
          </p>
        );
      }
      if (i === revealedCount) {
        return (
          <button
            key={i}
            onClick={() => { SFX.pageTurn(); onRevealNext(); }}
            className="w-full text-left mb-3 px-4 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 transition-all font-hand text-lg text-stone-400 italic step-in"
            style={{ breakInside: "avoid" }}
          >
            🔒 tap to reveal the next part of the story…
          </button>
        );
      }
      return null;
    });
  };

  const theme = getMapTheme(passage.title);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 step-in relative">
      <FloatingDecor density={5} />
      <PersistentCompanion avatarConfig={avatarConfig} />
      {/* pl-14/pr-14 clear the fixed close (X) and sound-toggle buttons
          pinned at top-4 left-4 / top-4 right-4 (same overlap fixed on
          TeacherScreen: this row's title and "Teacher view" button would
          otherwise sit underneath them). */}
      <div className="flex items-center gap-2 mb-5 relative z-10 pl-14 pr-14">
        <CompassRose size={36} />
        <p className="font-display font-800 text-xl sticker-title">G.I.S.T.</p>
        <SessionTimer startedAt={sessionStartedAt} className="ml-auto font-mono text-xs text-stone-500 bg-white rounded-full px-3 py-1.5 border-2 border-stone-300" />
        <button onClick={() => { SFX.tap(); onOpenTeacher(); }} className="flex items-center gap-1 font-display font-700 text-xs text-stone-600 hover:text-stone-800 bg-white rounded-full px-3 py-1.5 border-2 border-stone-300 shadow-sm">
          <GraduationCap className="w-3.5 h-3.5" /> Teacher view
        </button>
      </div>

      <div className="relative z-10">
      <ProgressTrail words={passage.words} solvedWords={solvedWords} avatarConfig={avatarConfig} totalMilestone={milestone} />

      {streakMsg && (
        <div className="border-4 border-emerald-300 bg-emerald-50 text-emerald-700 font-hand text-lg px-4 py-3 mb-6 rounded-2xl text-center step-in bounce-in">
          {streakMsg}
        </div>
      )}

      {passage.mission && solvedWords.length < passage.words.length && (
        <div className="mb-6 p-4 rounded-2xl flex items-start gap-2" style={{ background: theme.soft, border: `2px dashed ${theme.border}` }}>
          <span className="text-2xl shrink-0">🎯</span>
          <p className="font-hand text-lg leading-snug" style={{ color: theme.text }}>{passage.mission}</p>
        </div>
      )}

      <div className="bg-white p-6" style={{ ...DECKLE, borderColor: theme.border }}>
        <h2 className="font-display text-2xl font-800 mb-4 flex items-center gap-2" style={{ color: theme.text }}>
          <span className="text-3xl">{passage.emoji}</span> {passage.title}
        </h2>
        <div className="font-body text-lg leading-9 text-stone-700" style={{ columnCount: 2, columnGap: "2.5rem" }}>{renderPassage()}</div>
      </div>
      <p className="font-hand text-lg text-stone-600 mt-4 text-center bg-white/70 rounded-xl py-1.5">
        {revealedCount < sentences.length ? "📖 Read on, then tap a marked spot you don't know!" : "👆 Tap a marked spot you don't know!"}
      </p>

      {solvedWords.length === passage.words.length && (
        <div className="mt-8 p-6 text-center step-in bounce-in" style={{ ...DECKLE, background: "linear-gradient(135deg,#fef3c7,#fed7aa)" }}>
          <Trophy className="w-10 h-10 mx-auto mb-2 text-orange-500" />
          <p className="font-display text-2xl font-800 text-stone-700">Adventure complete! 🎉</p>
          {passage.arrival && <p className="font-hand text-xl text-amber-700 mt-2">{passage.arrival}</p>}
          <p className="font-body text-xs text-stone-500 mt-3">Ask your teacher to check your report card.</p>
        </div>
      )}
      </div>
    </div>
  );
}

/* ---------------- Sound effects (synthesized, no audio files needed) ---------------- */
let audioCtx = null;
let soundEnabled = true;

function getAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, startOffset, duration, type = "sine", volume = 0.18) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  } catch (e) {
    /* audio unsupported, fail silently */
  }
}

const SFX = {
  click: () => playTone(400, 0, 0.08, "sine", 0.035),
  tap: () => playTone(620, 0, 0.05, "sine", 0.03),
  remove: () => playTone(260, 0, 0.07, "sine", 0.035),
  select: () => { playTone(700, 0, 0.05, "sine", 0.04); playTone(920, 0.045, 0.07, "sine", 0.035); },
  pageTurn: () => { playTone(320, 0, 0.06, "triangle", 0.04); playTone(220, 0.05, 0.09, "triangle", 0.03); },
  correct: () => { playTone(523.25, 0, 0.12); playTone(783.99, 0.09, 0.18); },
  hint: () => playTone(340, 0, 0.22, "sine", 0.12),
  resolved: () => { playTone(523.25, 0, 0.1); playTone(659.25, 0.1, 0.1); playTone(783.99, 0.2, 0.28); },
  milestone: () => { playTone(523.25, 0, 0.1); playTone(659.25, 0.1, 0.1); playTone(783.99, 0.2, 0.1); playTone(1046.5, 0.3, 0.4); },
  trophy: () => { playTone(523.25, 0, 0.1); playTone(659.25, 0.09, 0.1); playTone(783.99, 0.18, 0.1); playTone(1046.5, 0.27, 0.15); playTone(1318.51, 0.4, 0.4); },
  reportReady: () => { playTone(659.25, 0, 0.12); playTone(987.77, 0.1, 0.25, "sine", 0.14); },
};

/* ---------------- Ambient background music (generative, original, no audio files) ---------------- */
// A short, cheerful, singsong melody in C major that loops. Simple and memorable rather than abstract.
const SCALE_C = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]; // C D E F G A B C5
const BEAT = 0.4; // seconds per beat, gentle skipping pace
const MELODY_PHRASE = [
  { n: 0, d: 1 }, { n: 2, d: 1 }, { n: 4, d: 1 }, { n: 2, d: 1 },
  { n: 3, d: 1 }, { n: 1, d: 1 }, { n: 0, d: 2 }, { n: -1, d: 1 },
  { n: 4, d: 1 }, { n: 4, d: 1 }, { n: 5, d: 1 }, { n: 4, d: 1 },
  { n: 2, d: 1 }, { n: 0, d: 1 }, { n: 0, d: 2 }, { n: -1, d: 1.5 },
];
let musicRunning = false;
let musicTimer = null;
let melodyIndex = 0;

function playMelodyNote(freq, beats, volume) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const dur = beats * BEAT;
  try {
    const t0 = ctx.currentTime;

    // Fundamental: warm sine, natural percussive decay (music-box / glockenspiel character)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = freq;
    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.0001, t0);
    gain1.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t0);
    osc1.stop(t0 + dur + 0.05);

    // Soft bright overtone one octave up, quiet, fades faster, adds a gentle sparkle without buzz
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.0001, t0);
    gain2.gain.linearRampToValueAtTime(volume * 0.22, t0 + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t0);
    osc2.stop(t0 + dur * 0.55 + 0.05);
  } catch (e) {
    /* audio unsupported, fail silently */
  }
}

function scheduleNextAmbientNote() {
  if (!musicRunning) return;
  const step = MELODY_PHRASE[melodyIndex];
  if (soundEnabled && step.n >= 0) {
    playMelodyNote(SCALE_C[step.n], step.d, 0.04);
  }
  const gap = step.d * BEAT;
  melodyIndex = (melodyIndex + 1) % MELODY_PHRASE.length;
  musicTimer = setTimeout(scheduleNextAmbientNote, gap * 1000);
}

function startBackgroundMusic() {
  if (musicRunning) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  musicRunning = true;
  melodyIndex = 0;
  scheduleNextAmbientNote();
}

function stopBackgroundMusic() {
  musicRunning = false;
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
}

function setSoundEnabledGlobal(next) {
  soundEnabled = next;
  if (next) {
    SFX.click();
    startBackgroundMusic();
  } else {
    stopBackgroundMusic();
  }
}

function SessionTimer({ startedAt, className = "" }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!startedAt) return null;
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return <span className={className}>⏱ {mm}:{ss}</span>;
}

function SoundToggle({ soundOn, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full bg-white flex items-center justify-center text-lg"
      style={{ border: "3px solid #b45309", boxShadow: "0 3px 0 0 #92400e" }}
      title={soundOn ? "Mute sound" : "Unmute sound"}
      aria-label={soundOn ? "Mute sound" : "Unmute sound"}
    >
      {soundOn ? "🔊" : "🔇"}
    </button>
  );
}

function CloseButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-4 z-50 w-11 h-11 rounded-full bg-white flex items-center justify-center text-lg text-stone-500"
      style={{ border: "3px solid #b45309", boxShadow: "0 3px 0 0 #92400e" }}
      title="Close G.I.S.T."
      aria-label="Close G.I.S.T."
    >
      ✕
    </button>
  );
}

function CloseConfirmModal({ onCancel, onConfirm, screen, studentId }) {
  const inActiveSession = screen === "passage" || screen === "coach" || screen === "comprehension" || screen === "teacher";
  const atRecap = screen === "recap";

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6" style={{ zIndex: 1000 }}>
      <div className="absolute inset-0" style={{ background: "rgba(41,37,36,0.55)", backdropFilter: "blur(4px)" }} onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-confirm-heading"
        className="relative bg-white p-6 sm:p-8 text-center max-w-sm w-full step-in"
        style={{ borderRadius: "32px", border: "3px solid #b45309", boxShadow: "0 6px 0 0 #92400e" }}
      >
        <p className="text-4xl mb-3">🧭</p>
        <p id="close-confirm-heading" className="font-display font-800 text-xl text-stone-700 mb-2">Are you sure you want to close G.I.S.T.?</p>
        <p className="font-body text-sm text-stone-500 mb-6">
          {inActiveSession
            ? `${studentId ? `${studentId}'s` : "This"} session is still in progress. All progress will be lost and can't be recovered.`
            : atRecap
              ? `Make sure your teacher has downloaded ${studentId ? `${studentId}'s` : "the"} results first, this session's data won't be saved once you close.`
              : "Any progress in this session won't be saved once you close."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <BigButton variant="ghost" onClick={onCancel}>
            Cancel
          </BigButton>
          <BigButton variant="outline" onClick={onConfirm}>
            Yes, close
          </BigButton>
        </div>
      </div>
    </div>
  );
}

function ClosedScreen() {
  return (
    <div className="max-w-md mx-auto px-6 py-10 step-in relative min-h-screen flex flex-col justify-center text-center">
      <p className="text-6xl mb-4">🧭</p>
      <p className="font-display font-800 text-2xl text-stone-700 mb-2">G.I.S.T. is now closed</p>
      <p className="font-body text-sm text-stone-500">You can close this tab now.</p>
    </div>
  );
}

let speechUnlocked = false;
function unlockSpeechOnce() {
  if (speechUnlocked) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const utter = new SpeechSynthesisUtterance("");
    utter.volume = 0;
    synth.speak(utter);
    speechUnlocked = true;
  } catch (e) {
    /* speech synthesis unsupported, fail silently */
  }
}

function pickWarmVoice() {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  if (!voices.length) return null;
  const preferredNames = [
    "Samantha",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Google UK English Female",
    "Karen",
    "Moira",
    "Google US English",
  ];
  for (const name of preferredNames) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  const enVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  return enVoices[0] || voices[0] || null;
}

const speakingListeners = new Set();
function notifySpeaking(isSpeaking) {
  speakingListeners.forEach((fn) => fn(isSpeaking));
}
function useIsSpeaking() {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    speakingListeners.add(setSpeaking);
    return () => speakingListeners.delete(setSpeaking);
  }, []);
  return speaking;
}

function speak(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickWarmVoice();
    if (voice) utter.voice = voice;
    utter.rate = 0.94;
    utter.pitch = 1.08;
    utter.volume = 1;
    utter.onstart = () => notifySpeaking(true);
    utter.onend = () => notifySpeaking(false);
    utter.onerror = () => notifySpeaking(false);
    synth.speak(utter);
  } catch (e) {
    /* speech synthesis unsupported, fail silently */
  }
}

/* ---------------- Coach Screen ---------------- */
function WordBankWidget({ tiles, onSubmit }) {
  const [used, setUsed] = useState([]);
  const building = used.map((i) => tiles[i]).join("");

  function tapTile(i) {
    if (used.includes(i)) return;
    SFX.tap();
    setUsed((u) => [...u, i]);
  }
  function removeLast() {
    SFX.remove();
    setUsed((u) => u.slice(0, -1));
  }

  return (
    <div className="step-in">
      <div className="flex items-center justify-center gap-1.5 mb-4 min-h-[3.25rem] flex-wrap">
        {used.length === 0 && <span className="font-hand text-stone-400 text-lg">tap the letters below...</span>}
        {used.map((i, idx) => (
          <span
            key={idx}
            className="w-11 h-11 flex items-center justify-center bg-teal-50 rounded-lg font-display font-800 text-xl uppercase bounce-in"
            style={{ border: "3px solid #0d9488" }}
          >
            {tiles[i]}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {tiles.map((letter, i) => {
          const isUsed = used.includes(i);
          return (
            <button
              key={i}
              disabled={isUsed}
              onClick={() => tapTile(i)}
              className={`w-11 h-11 rounded-lg font-display font-800 text-xl uppercase transition-all hover:scale-105 ${
                isUsed ? "bg-teal-100 text-teal-700 scale-90" : "bg-amber-100 text-stone-800"
              }`}
              style={{ border: `3px solid ${isUsed ? "#0d9488" : "#b45309"}` }}
            >
              {letter}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-3">
        <BigButton silent variant="ghost" onClick={removeLast} disabled={used.length === 0}>
          ⌫ Remove
        </BigButton>
        <BigButton onClick={() => onSubmit(building)} disabled={used.length === 0}>
          Submit
        </BigButton>
      </div>
    </div>
  );
}

function LetterConnectWidget({ tiles, onSubmit }) {
  const [used, setUsed] = useState([]);
  const building = used.map((i) => tiles[i]).join("");
  const n = tiles.length;
  const size = 230;
  const cx = size / 2;
  const cy = size / 2;
  const r = Math.min(95, 55 + n * 4);

  const positions = tiles.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  function tapTile(i) {
    if (used.includes(i)) return;
    SFX.tap();
    setUsed((u) => [...u, i]);
  }
  function removeLast() {
    SFX.remove();
    setUsed((u) => u.slice(0, -1));
  }

  return (
    <div className="step-in flex flex-col items-center">
      <div className="mb-3 min-h-[2.75rem] flex items-center justify-center flex-wrap gap-1">
        {used.length === 0 && <span className="font-hand text-stone-400 text-lg">connect the letters below...</span>}
        {used.map((i, idx) => (
          <span
            key={idx}
            className="w-9 h-9 flex items-center justify-center bg-teal-50 rounded-lg font-display font-800 text-lg uppercase bounce-in"
            style={{ border: "3px solid #0d9488" }}
          >
            {tiles[i]}
          </span>
        ))}
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none">
          {used.slice(1).map((idx, k) => {
            const from = positions[used[k]];
            const to = positions[idx];
            return (
              <line
                key={k}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#0d9488"
                strokeWidth="5"
                strokeLinecap="round"
                className="step-in"
              />
            );
          })}
        </svg>
        {tiles.map((letter, i) => {
          const isUsed = used.includes(i);
          const pos = positions[i];
          return (
            <button
              key={i}
              disabled={isUsed}
              onClick={() => tapTile(i)}
              className={`absolute w-11 h-11 rounded-full font-display font-800 text-lg uppercase flex items-center justify-center transition-all hover:scale-110 ${
                isUsed ? "bg-teal-100 text-teal-700 scale-90" : "bg-amber-100 text-stone-800"
              }`}
              style={{
                left: pos.x,
                top: pos.y,
                transform: "translate(-50%, -50%)",
                border: `3px solid ${isUsed ? "#0d9488" : "#b45309"}`,
                zIndex: 2,
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-4">
        <BigButton silent variant="ghost" onClick={removeLast} disabled={used.length === 0}>
          ⌫ Remove
        </BigButton>
        <BigButton onClick={() => onSubmit(building)} disabled={used.length === 0}>
          Submit
        </BigButton>
      </div>
    </div>
  );
}


const STAGE1_CYCLE = ["mcq", "true_false"];
const STAGE2_CYCLE = ["word_bank", "text", "letter_connect"]; // word is absent (blank) here, nothing to tap
const STAGE3_CYCLE = ["tap_select", "text", "reverse_clue"]; // a wrong word is present here, tappable, or clue-recognition

function CoachScreen({ passage, targetWord, avatarConfig, onWordResolved, onBack, soundOn, onToggleSound, wordIndex, isTransferWord }) {
  const mapTheme = getMapTheme(passage.title);
  const stage1Type = STAGE1_CYCLE[wordIndex % STAGE1_CYCLE.length];
  const stage2Type = STAGE2_CYCLE[wordIndex % STAGE2_CYCLE.length];
  const stage3Type = STAGE3_CYCLE[(wordIndex + 1) % STAGE3_CYCLE.length];
  const [history, setHistory] = useState([]);
  const [display, setDisplay] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState(null);
  const [stageReached, setStageReached] = useState(1);
  const [wordDone, setWordDone] = useState(false);
  const hintsUsedRef = useRef(0);
  const exchangeCountRef = useRef(0);
  const scrollRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);

  // Reflection flow state
  const [prePhase, setPrePhase] = useState("prior"); // "prior" | "coaching"
  const [priorKnowledge, setPriorKnowledge] = useState(null);
  const [postPhase, setPostPhase] = useState(null); // null | "gotItVia" | "whichClue" | "transfer"
  const [gotItVia, setGotItVia] = useState(null);
  const [clueIdentified, setClueIdentified] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferData, setTransferData] = useState(null);
  const [transferPassed, setTransferPassed] = useState(null);
  const wordStartRef = useRef(null);
  const resolvedBaseRef = useRef(null);
  const [pacingElapsed, setPacingElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      if (wordStartRef.current && !wordDone) {
        setPacingElapsed(Math.floor((Date.now() - wordStartRef.current) / 1000));
      }
    }, 5000);
    return () => clearInterval(t);
  }, [wordDone]);

  const clueOptions = splitIntoChunks(getSentenceContaining(passage.text, targetWord.word));
  const contextSentence = getSentenceContaining(passage.text, targetWord.word);

  // No AI call here on purpose: this used to ask the model for a
  // one-sentence explanation, but the always-available fallback below
  // already fits the moment (the guided approach didn't work, hand off
  // to the teacher) just as well, for zero AI-quota cost.
  //
  // stageOverride: the auto-skip path (submitAnswer, below) calls this
  // right after a response comes back but before setCurrent(parsed) has
  // committed, so reading `current.stage` here would capture the stale,
  // pre-response value. Passing the stage explicitly avoids depending on
  // React state timing. The manual Skip button (no argument) doesn't
  // have this problem, since `current` is already up to date whenever a
  // student can see and click it.
  function skipWord(stageOverride) {
    SFX.click();
    const revealText = `"${targetWord.word}" — ask your teacher to explain this one together!`;
    setDisplay((d) => [...d, { from: "coach", text: revealText, revealed: true }]);
    if (soundEnabled) setTimeout(() => speak(revealText), 300);
    setCurrent(null);
    setWordDone(true);
    setTimeout(() => {
      onWordResolved({
        word: targetWord.word,
        clueType: targetWord.clueType,
        concreteness: targetWord.concreteness,
        finalStage: stageOverride ?? (current ? current.stage : 1),
        hintsUsed: hintsUsedRef.current,
        funFact: null,
        revealedMeaning: revealText,
        skipped: true,
        solvedAt: Date.now(),
        passageTitle: passage.title,
        priorKnowledge,
        gotItVia: null,
        clueIdentified: null,
        transferPassed: null,
        timeToAnswerSec: wordStartRef.current ? Math.round((Date.now() - wordStartRef.current) / 1000) : null,
      });
    }, 2200);
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [display, postPhase, transferData]);

  function handlePriorAnswer(value) {
    SFX.tap();
    setPriorKnowledge(value);
    setPrePhase("coaching");
    wordStartRef.current = Date.now();
    startWord();
  }

  async function startWord() {
    unlockSpeechOnce();
    setLoading(true);
    setError(null);
    const openingMsg = `Passage: "${passage.text}"\n\nStart coaching for the target word "${targetWord.word}". Begin at Stage 1.`;
    const msgs = [{ role: "user", content: openingMsg }];
    try {
      const parsed = await callClaudeWithRetry(buildCoachSystemPrompt(avatarConfig.companion, stage1Type, stage2Type, stage3Type), msgs);
      setHistory([...msgs, { role: "assistant", content: JSON.stringify(parsed) }]);
      setCurrent(parsed);
      setStageReached(parsed.stage || 1);
      setDisplay([{ from: "coach", text: parsed.message, hint: parsed.hint_given, stage: parsed.stage }]);
      if (parsed.hint_given) hintsUsedRef.current += 1;
      if (soundEnabled) setTimeout(() => speak(parsed.message), 300);
    } catch (e) {
      setError(`Oops, your coach got stuck! ${e && e.message ? e.message : ""} Try again.`);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(answerText) {
    if (!current) return;
    SFX.click();
    setDisplay((d) => [...d, { from: "student", text: answerText }]);
    setLoading(true);
    setError(null);
    const newHistory = [...history, { role: "user", content: answerText }];
    try {
      const parsed = await callClaudeWithRetry(buildCoachSystemPrompt(avatarConfig.companion, stage1Type, stage2Type, stage3Type), newHistory);
      const updatedHistory = [...newHistory, { role: "assistant", content: JSON.stringify(parsed) }];
      setHistory(updatedHistory);
      if (parsed.hint_given) hintsUsedRef.current += 1;
      setStageReached(parsed.stage || 1);

      if (parsed.resolved) {
        SFX.resolved();
        setDisplay((d) => [...d, { from: "coach", text: parsed.message, hint: parsed.hint_given, stage: parsed.stage, resolved: true, funFact: parsed.fun_fact }]);
        setCurrent(null);
        if (soundEnabled) setTimeout(() => speak(parsed.message), 350);
        resolvedBaseRef.current = {
          word: targetWord.word,
          clueType: targetWord.clueType,
          concreteness: targetWord.concreteness,
          finalStage: parsed.stage,
          hintsUsed: hintsUsedRef.current,
          funFact: parsed.fun_fact,
          skipped: false,
          solvedAt: Date.now(),
          passageTitle: passage.title,
        };
        setTimeout(() => setPostPhase("gotItVia"), 1400);
      } else {
        exchangeCountRef.current += 1;
        if (exchangeCountRef.current >= STUCK_WORD_LIMIT) {
          // This word has gone STUCK_WORD_LIMIT exchanges without
          // resolving; auto-reveal via the same free fallback Skip uses
          // rather than let a genuinely stuck student keep spending AI
          // calls on a word that isn't landing. Pass parsed.stage
          // explicitly, see the stageOverride comment on skipWord().
          skipWord(parsed.stage || 1);
          return;
        }
        if (parsed.hint_given) { SFX.hint(); } else { SFX.correct(); }
        setDisplay((d) => [...d, { from: "coach", text: parsed.message, hint: parsed.hint_given, stage: parsed.stage }]);
        setCurrent(parsed);
        if (soundEnabled) setTimeout(() => speak(parsed.message), 350);
      }
      setTextInput("");
    } catch (e) {
      setError(`Oops, your coach got stuck! ${e && e.message ? e.message : ""} Try again.`);
    } finally {
      setLoading(false);
    }
  }

  function handleGotItVia(value) {
    SFX.tap();
    setGotItVia(value);
    if (value === "clues") {
      setPostPhase("whichClue");
    } else {
      proceedAfterReflection(value, null);
    }
  }

  function handleWhichClue(chunk) {
    SFX.tap();
    setClueIdentified(chunk);
    proceedAfterReflection("clues", chunk);
  }

  function proceedAfterReflection(gotItViaValue, clueValue) {
    if (isTransferWord) {
      setPostPhase("transfer");
      runTransferTest(gotItViaValue, clueValue);
    } else {
      finalizeWord(gotItViaValue, clueValue, null);
    }
  }

  async function runTransferTest(gotItViaValue, clueValue) {
    setTransferLoading(true);
    try {
      const raw = await callClaude(TRANSFER_TEST_SYSTEM_PROMPT, [
        { role: "user", content: `Original passage: "${passage.text}"\n\nTarget word: "${targetWord.word}"` },
      ]);
      const parsed = safeParseJSON(raw);
      if (parsed && parsed.sentence && Array.isArray(parsed.options)) {
        setTransferData(parsed);
      } else {
        finalizeWord(gotItViaValue, clueValue, null);
      }
    } catch (e) {
      finalizeWord(gotItViaValue, clueValue, null);
    } finally {
      setTransferLoading(false);
    }
  }

  function handleTransferAnswer(opt, gotItViaValue, clueValue) {
    SFX.click();
    const passed = transferData && opt === transferData.correctAnswer;
    setTransferPassed(passed);
    SFX[passed ? "resolved" : "hint"]();
    setTimeout(() => finalizeWord(gotItViaValue, clueValue, passed), 1800);
  }

  function finalizeWord(gotItViaValue, clueValue, transferResult) {
    const base = resolvedBaseRef.current || {
      word: targetWord.word,
      clueType: targetWord.clueType,
      concreteness: targetWord.concreteness,
      finalStage: stageReached,
      hintsUsed: hintsUsedRef.current,
      funFact: null,
      skipped: false,
      solvedAt: Date.now(),
      passageTitle: passage.title,
    };
    setWordDone(true);
    onWordResolved({
      ...base,
      priorKnowledge,
      gotItVia: gotItViaValue,
      clueIdentified: clueValue,
      transferPassed: transferResult,
      timeToAnswerSec: wordStartRef.current ? Math.round((Date.now() - wordStartRef.current) / 1000) : null,
    });
  }

  const companionEmoji = ANIMAL_COMPANIONS.find((c) => c.id === avatarConfig.companion)?.emoji || "🦜";
  const instr = current ? (INPUT_TYPE_INSTRUCTIONS[current.input_type] || STAGE_INSTRUCTIONS[current.stage]) : null;

  const StageTracker = () => (
    <div className="flex items-center justify-center gap-1.5 shrink-0">
      {[1, 2, 3, 4, 5].map((n) => {
        const done = wordDone || n < stageReached;
        const active = !wordDone && n === stageReached;
        return (
          <React.Fragment key={n}>
            {n > 1 && <div className="w-3 h-0.5 rounded-full" style={{ background: done ? "#0d9488" : "#d6d3d1" }} />}
            <div
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-display font-800 text-[10px] sm:text-xs shrink-0"
              style={{
                background: done ? "#0d9488" : "white",
                color: done ? "white" : active ? "#0d9488" : "#a8a29e",
                border: active ? "3px solid #0d9488" : done ? "none" : "2px solid #d6d3d1",
              }}
            >
              {done ? "✓" : n}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  const ReflectionButton = ({ children, onClick, ms }) => (
    <button
      onClick={onClick}
      className="w-full text-left px-5 py-3.5 bg-white rounded-2xl font-body font-800 text-lg text-stone-700 transition-all hover:scale-[1.02] active:scale-95"
      style={{ border: "3px solid #0d9488", boxShadow: "0 3px 0 0 #0f766e" }}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <PersistentCompanion avatarConfig={avatarConfig} size="text-4xl" />
      <div className="max-w-4xl mx-auto w-full px-5 pt-6 pb-3 flex-1 flex flex-col min-h-0 step-in">
        {/* Header card */}
        <div className="relative bg-white p-3 pl-14 mb-3 shrink-0" style={{ ...DECKLE, borderColor: mapTheme.border }}>
          {wordDone && <Sparkle count={10} />}
          <div
            className="absolute -top-3 -left-3 z-20 bg-white rounded-2xl p-1"
            style={{ border: `3px solid ${mapTheme.border}`, boxShadow: `0 3px 0 0 ${mapTheme.text}` }}
          >
            <AvatarDisplay config={avatarConfig} size={44} />
          </div>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-display text-2xl sm:text-3xl font-800 text-stone-700 leading-tight">"{targetWord.word}"</p>
              <p className="font-hand text-base sm:text-lg text-orange-500 leading-tight">{(COMPANION_PERSONAS[avatarConfig.companion] || COMPANION_PERSONAS.parrot).name} is tracking this word with you!</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 relative">
              <button
                onClick={skipWord}
                disabled={loading || transferLoading}
                className="flex items-center gap-1 font-body text-xs text-stone-500 bg-white rounded-full px-3 py-2.5 hover:text-stone-700 disabled:opacity-40"
                style={{ border: "2px solid #d6d3d1" }}
                title="Skip this word and ask your teacher for help"
              >
                🙋 Skip
              </button>
              <button
                onClick={() => { SFX.tap(); setShowSettings((s) => !s); }}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg"
                style={{ border: "3px solid #b45309", boxShadow: "0 3px 0 0 #92400e" }}
                title="Settings"
                aria-label="Settings"
              >
                ⚙️
              </button>
              <button
                onClick={onBack}
                className="flex items-center gap-1 font-display font-700 text-sm text-stone-600 bg-white rounded-full px-3 py-2.5"
                style={{ border: "3px solid #b45309", boxShadow: "0 3px 0 0 #92400e" }}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {showSettings && (
                <div
                  className="absolute top-12 right-0 z-30 bg-white rounded-2xl p-4 step-in"
                  style={{ border: "3px solid #b45309", boxShadow: "0 4px 0 0 #92400e", minWidth: "200px" }}
                >
                  <p className="font-display font-800 text-sm text-stone-600 mb-3">⚙️ Settings</p>
                  <button
                    onClick={() => onToggleSound(!soundOn)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-amber-50"
                    style={{ border: "2px solid #b45309" }}
                  >
                    <span className="font-body font-700 text-sm text-stone-700">Sound</span>
                    <span className="text-xl">{soundOn ? "🔊 On" : "🔇 Off"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-stone-100">
            <p className="font-display font-700 text-sm uppercase tracking-wide text-stone-400">
              {wordDone ? "Word complete!" : prePhase === "prior" ? "Getting ready…" : `Stage ${stageReached} of 5`}
            </p>
            <StageTracker />
          </div>
          {pacingElapsed > 60 && !wordDone && (
            <p className="font-body text-[11px] text-stone-400 text-center mt-2 step-in">⏱ Taking a bit longer than usual, that's okay!</p>
          )}
        </div>

        {/* Single unified box */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-white p-5 sm:p-7 space-y-3"
          style={{ ...DECKLE, maxHeight: "calc(100dvh - 225px)" }}
        >
          {prePhase === "prior" && (
            <div className="text-center py-4 step-in">
              <p className="text-5xl mb-3">🤔</p>
              <p className="font-hand text-2xl text-stone-500 mb-6">
                Have you seen the word "{targetWord.word}" before?
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <ReflectionButton onClick={() => handlePriorAnswer("no")}>🆕 No, it's new to me</ReflectionButton>
                <ReflectionButton onClick={() => handlePriorAnswer("not_sure")}>🤷 Not sure</ReflectionButton>
                <ReflectionButton onClick={() => handlePriorAnswer("yes")}>✅ Yes, I know it</ReflectionButton>
              </div>
            </div>
          )}

          {prePhase === "coaching" && (
            <>
              {display.map((m, i) => (
                <div key={i} className={`flex ${m.from === "student" ? "justify-end" : "justify-start items-end gap-1.5"} step-in`}>
                  {m.from === "coach" && (
                    <span className="text-xl sm:text-2xl shrink-0 mb-1" title={(COMPANION_PERSONAS[avatarConfig.companion] || COMPANION_PERSONAS.parrot).name}>
                      {companionEmoji}
                    </span>
                  )}
                  <div
                    className={`max-w-[85%] px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border-2 ${
                      m.from === "student"
                        ? "text-white border-teal-600"
                        : m.revealed
                        ? "text-stone-700 border-rose-300"
                        : m.resolved
                        ? "text-emerald-900 border-emerald-400"
                        : m.hint
                        ? "text-stone-700 border-amber-400 border-dashed"
                        : "text-stone-700 border-sky-300"
                    }`}
                    style={{
                      background:
                        m.from === "student"
                          ? "linear-gradient(135deg,#2dd4bf,#0d9488)"
                          : m.revealed
                          ? "linear-gradient(135deg,#fce7f3,#fbcfe8)"
                          : m.resolved
                          ? "linear-gradient(135deg,#d1fae5,#a7f3d0)"
                          : m.hint
                          ? "linear-gradient(135deg,#fef9c3,#fde68a)"
                          : "linear-gradient(135deg,#e0f2fe,#bae6fd)",
                    }}
                  >
                    {m.from === "coach" && (
                      <p className="font-display font-800 text-sm uppercase tracking-wide text-stone-500 mb-1.5">
                        {(COMPANION_PERSONAS[avatarConfig.companion] || COMPANION_PERSONAS.parrot).name}
                      </p>
                    )}
                    {m.hint && !m.resolved && <p className="font-hand text-lg sm:text-xl text-amber-600 mb-1">💡 here's a hint —</p>}
                    {m.revealed && <p className="font-hand text-lg sm:text-xl text-rose-500 mb-1">📖 here's the answer —</p>}
                    <div className="flex items-start gap-2">
                      <p className="font-body text-lg sm:text-xl leading-relaxed">{m.text}</p>
                      {m.from === "coach" && (
                        <button
                          onClick={() => speak(m.text)}
                          className="shrink-0 mt-0.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-stone-200 flex items-center justify-center hover:border-teal-400 hover:bg-teal-50"
                          title="Read aloud"
                          aria-label="Read this message aloud"
                        >
                          🔊
                        </button>
                      )}
                    </div>
                    {m.resolved && m.funFact && (
                      <p className="font-body text-sm mt-2 pt-2 border-t border-emerald-300 text-emerald-700 flex items-start gap-1">
                        <Sparkles className="inline w-3.5 h-3.5 mt-0.5 shrink-0" /> {m.funFact}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start items-end gap-1.5">
                  <span className="text-xl sm:text-2xl shrink-0 mb-1">{companionEmoji}</span>
                  <div className="px-5 py-3.5 rounded-2xl bg-sky-50 border-2 border-sky-200">
                    <p className="font-hand text-lg text-stone-400">{(COMPANION_PERSONAS[avatarConfig.companion] || COMPANION_PERSONAS.parrot).name} is thinking… 🤔</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="border-2 border-rose-300 bg-rose-50 text-rose-600 font-body text-sm px-4 py-3 rounded-2xl flex items-center justify-between gap-2 step-in" aria-live="polite">
                  {error}
                  <BigButton variant="ghost" onClick={() => (history.length <= 1 ? startWord() : submitAnswer(display[display.length - 1]?.text || ""))}>
                    Retry
                  </BigButton>
                </div>
              )}

              {postPhase === null && !loading && current && (() => {
                const raw = (current.display_sentence && current.display_sentence.trim()) || contextSentence;
                const blank = current.stage === 2;
                return (
                  <div
                    className="px-5 py-4 rounded-2xl bg-white step-in"
                    style={{ border: "3px solid #0d9488", boxShadow: "0 4px 0 0 #0f766e" }}
                  >
                    <p className="font-display font-800 text-sm uppercase tracking-wide text-teal-700 mb-1.5">
                      📖 From the passage{blank ? " — word hidden, this stage tests recall!" : ""}
                    </p>
                    <p className="font-body text-lg sm:text-xl text-stone-800 italic leading-snug font-700">
                      {raw.split(new RegExp(`(${targetWord.word})`, "i")).map((part, i) =>
                        part.toLowerCase() === targetWord.word.toLowerCase() ? (
                          blank ? (
                            <strong key={i} className="text-stone-400 not-italic tracking-widest">▬▬▬▬▬</strong>
                          ) : (
                            <strong key={i} className="text-amber-700 not-italic font-800">{part}</strong>
                          )
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </p>
                  </div>
                );
              })()}

              {postPhase === null && !loading && instr && (
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-2.5 step-in border-4 border-white"
                  style={{ background: STAGE_GRADIENTS[current.stage] }}
                >
                  <span className="text-2xl sm:text-3xl">{instr.icon}</span>
                  <p className="font-display font-800 text-lg sm:text-xl text-white leading-tight" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.15)" }}>
                    {instr.text}
                  </p>
                </div>
              )}

              {postPhase === null && !loading && current && current.input_type === "mcq" && current.options && (
                <div className="grid grid-cols-1 gap-3 step-in">
                  {current.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => submitAnswer(opt)}
                      className="text-left px-4 py-3.5 bg-white rounded-2xl hover:scale-[1.02] font-body font-800 text-lg sm:text-xl text-stone-700 transition-all"
                      style={{ border: "3px solid #e7e5e4", boxShadow: "0 3px 0 0 #d6d3d1" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2dd4bf"; e.currentTarget.style.boxShadow = "0 3px 0 0 #0d9488"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e7e5e4"; e.currentTarget.style.boxShadow = "0 3px 0 0 #d6d3d1"; }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {postPhase === null && !loading && current && current.input_type === "true_false" && current.options && (
                <div className="grid grid-cols-2 gap-3 step-in">
                  {current.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => submitAnswer(opt)}
                      className="py-5 sm:py-7 rounded-2xl font-display font-800 text-xl sm:text-3xl text-white transition-all hover:scale-105"
                      style={{
                        background: opt.toLowerCase() === "true" ? "linear-gradient(180deg,#34d399,#059669)" : "linear-gradient(180deg,#fb7185,#e11d48)",
                        boxShadow: opt.toLowerCase() === "true" ? "0 5px 0 0 #065f46" : "0 5px 0 0 #9f1239",
                      }}
                    >
                      {opt.toLowerCase() === "true" ? "👍 " : "👎 "}{opt}
                    </button>
                  ))}
                </div>
              )}

              {postPhase === null && !loading && current && (current.input_type === "tap_select" || current.input_type === "reverse_clue") && current.options && (
                <div className="flex flex-wrap gap-3 justify-center step-in">
                  {current.options.map((word, i) => (
                    <button
                      key={i}
                      onClick={() => submitAnswer(word)}
                      className="px-4 py-2.5 bg-white rounded-full font-display font-700 text-lg sm:text-xl text-stone-700 transition-all hover:scale-110"
                      style={{ border: current.input_type === "reverse_clue" ? "3px solid #0d9488" : "3px solid #b45309", boxShadow: current.input_type === "reverse_clue" ? "0 3px 0 0 #0f766e" : "0 3px 0 0 #92400e" }}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              )}

              {postPhase === null && !loading && current && current.input_type === "word_bank" && current.word_tiles && (
                <WordBankWidget key={current.stage + "-" + current.word_tiles.join("")} tiles={current.word_tiles} onSubmit={submitAnswer} />
              )}

              {postPhase === null && !loading && current && current.input_type === "letter_connect" && current.word_tiles && (
                <LetterConnectWidget key={current.stage + "-" + current.word_tiles.join("")} tiles={current.word_tiles} onSubmit={submitAnswer} />
              )}

              {postPhase === null && !loading && current && current.input_type === "text" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!textInput.trim()) return;
                    const fullAnswer = current.sentence_starter
                      ? `${current.sentence_starter} ${textInput.trim()}`.trim()
                      : textInput.trim();
                    submitAnswer(fullAnswer);
                  }}
                  className="flex flex-col gap-2 step-in"
                >
                  {current.sentence_starter && (
                    <div
                      className="flex items-center flex-wrap gap-2 bg-stone-50 rounded-2xl px-4 py-4"
                      style={{ border: "3px solid #e7e5e4" }}
                    >
                      <span className="font-body text-lg sm:text-xl text-stone-500 italic">{current.sentence_starter}</span>
                      <input
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="...finish it here"
                        className="flex-1 min-w-[100px] bg-transparent font-body text-lg sm:text-xl text-stone-700 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  )}
                  {!current.sentence_starter && (
                    <input
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type your answer…"
                      className="w-full bg-white rounded-2xl border-3 border-stone-200 px-4 py-3.5 font-body text-lg sm:text-xl text-stone-700 focus:outline-none focus:border-teal-400"
                      style={{ borderWidth: "3px" }}
                      autoFocus
                    />
                  )}
                  <BigButton
                    silent
                    onClick={() => {
                      if (!textInput.trim()) return;
                      const fullAnswer = current.sentence_starter
                        ? `${current.sentence_starter} ${textInput.trim()}`.trim()
                        : textInput.trim();
                      submitAnswer(fullAnswer);
                    }}
                    disabled={!textInput.trim()}
                  >
                    Send
                  </BigButton>
                </form>
              )}

              {postPhase === "gotItVia" && (
                <div className="text-center py-4 step-in">
                  <p className="font-hand text-2xl text-teal-600 mb-4">
                    How did you get it?
                  </p>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <ReflectionButton onClick={() => handleGotItVia("knew")}>💡 I already knew it</ReflectionButton>
                    <ReflectionButton onClick={() => handleGotItVia("clues")}>🔍 I used the clues</ReflectionButton>
                    <ReflectionButton onClick={() => handleGotItVia("guessed")}>🎲 I guessed</ReflectionButton>
                  </div>
                </div>
              )}

              {postPhase === "whichClue" && (
                <div className="text-center py-4 step-in">
                  <p className="font-hand text-2xl text-teal-600 mb-4">Which part gave it away?</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {clueOptions.map((chunk, i) => (
                      <button
                        key={i}
                        onClick={() => handleWhichClue(chunk)}
                        className="px-4 py-2.5 bg-white rounded-full font-display font-700 text-lg text-stone-700 transition-all hover:scale-110"
                        style={{ border: "3px solid #0d9488", boxShadow: "0 3px 0 0 #0f766e" }}
                      >
                        {chunk}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {postPhase === "transfer" && (
                <div className="step-in">
                  {transferLoading && (
                    <p className="font-hand text-2xl text-stone-400 text-center py-4">One more check, a brand-new sentence… 🧭</p>
                  )}
                  {!transferLoading && transferData && transferPassed === null && (
                    <>
                      <p className="font-hand text-xl text-teal-600 text-center mb-3">Same word, new sentence, what does it mean here?</p>
                      <div className="mb-4 p-4 rounded-2xl bg-teal-50" style={{ border: "3px solid #0d9488" }}>
                        <p className="font-body text-lg sm:text-xl text-stone-700">{transferData.sentence}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {transferData.options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => handleTransferAnswer(opt, gotItVia, clueIdentified)}
                            className="text-left px-4 py-3 bg-white rounded-2xl hover:scale-[1.02] font-body font-800 text-lg text-stone-700 transition-all"
                            style={{ border: "3px solid #e7e5e4", boxShadow: "0 3px 0 0 #d6d3d1" }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {transferPassed !== null && (
                    <div
                      className="text-center p-5 rounded-2xl step-in bounce-in"
                      style={{ background: transferPassed ? "#d1fae5" : "#fee2e2", border: `3px solid ${transferPassed ? "#059669" : "#e11d48"}` }}
                    >
                      <p className="font-display font-800 text-xl text-stone-700">
                        {transferPassed ? "🎉 Nailed it in a brand-new sentence!" : "That's okay, this one was tricky in a new sentence."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Teacher Screen ---------------- */
function BoldText({ text, className = "" }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="text-amber-800">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function renderInlineBold(text, boldColorClass) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className={boldColorClass}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function RichReportText({ text, className = "", boldColorClass = "text-inherit" }) {
  if (!text) return null;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let seenHeadline = false;
  return (
    <div className={className}>
      {lines.map((line, i) => {
        const isBullet = /^[-•]\s*/.test(line);
        const content = line.replace(/^[-•]\s*/, "");
        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2 mt-1.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
              <p className="text-[0.92em] leading-snug">{renderInlineBold(content, boldColorClass)}</p>
            </div>
          );
        }
        const isFirstHeadline = !seenHeadline;
        if (isFirstHeadline) seenHeadline = true;
        return (
          <p
            key={i}
            className={isFirstHeadline ? "font-display font-800 text-[1.08em] leading-snug mb-1" : "text-[0.95em] leading-relaxed mt-1.5"}
          >
            {renderInlineBold(content, boldColorClass)}
          </p>
        );
      })}
    </div>
  );
}

function stripBoldMarkers(text) {
  return (text || "").replace(/\*\*([^*]+)\*\*/g, "$1");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function getSentenceContaining(text, word) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const found = sentences.find((s) => s.toLowerCase().includes(word.toLowerCase()));
  return (found || sentences[0] || text).trim();
}

function splitIntoChunks(sentence) {
  return sentence
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function boldToHtml(text) {
  if (!text) return "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let seenHeadline = false;
  let html = "";
  let inList = false;
  lines.forEach((line) => {
    const isBullet = /^[-•]\s*/.test(line);
    const content = escapeHtml(line.replace(/^[-•]\s*/, "")).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    if (isBullet) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${content}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      const isFirstHeadline = !seenHeadline;
      if (isFirstHeadline) seenHeadline = true;
      html += `<p class="${isFirstHeadline ? "headline" : ""}">${content}</p>`;
    }
  });
  if (inList) html += "</ul>";
  return html;
}

function buildReportHtml(studentId, log, summary) {
  const rows = log
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.word)}</td><td style="text-transform:capitalize">${escapeHtml(e.clueType)}</td><td>${e.finalStage} — ${escapeHtml(STAGE_LABELS[e.finalStage])}</td><td>${e.hintsUsed}</td><td>${e.skipped ? "Skipped" : ""}</td></tr>`
    )
    .join("");
  const sections = summary
    ? [
        { label: "🎯 The Core Problem", text: summary.coreProblem, cls: "core" },
        { label: "💭 What This Actually Means", text: summary.whatThisMeans, cls: "" },
        { label: "🧠 How Reliable Is This", text: summary.howReliable, cls: "" },
        { label: "📖 Story Understanding", text: summary.storyUnderstandingNote, cls: "" },
        { label: "💡 What To Try in Class", text: summary.whatToTry, cls: "rec" },
      ]
    : [];
  const sectionsHtml = sections
    .filter((s) => s.text)
    .map((s) => `<div class="summary ${s.cls}"><h2>${s.label}</h2>${boldToHtml(s.text)}</div>`)
    .join("");
  return `<!DOCTYPE html>
<html>
<head>
<title>G.I.S.T. Report — ${escapeHtml(studentId)}</title>
<meta charset="utf-8" />
<meta name="color-scheme" content="light" />
<style>
  :root { color-scheme: light; }
  html, body { background: #fdfaf3; }
  body { font-family: Georgia, 'Times New Roman', serif; padding: 40px; color: #2a1a0f; max-width: 800px; margin: 0 auto; }
  h1 { color: #92400e; margin-bottom: 4px; }
  p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #ffffff; }
  th, td { border: 1px solid #d6b370; padding: 8px 12px; text-align: left; font-size: 14px; background: #ffffff; color: #2a1a0f; }
  th { background: #fef3c7; }
  .summary { margin-top: 16px; padding: 16px; border: 2px dashed #0d9488; background: #f0fdfa; color: #2a1a0f; line-height: 1.7; font-size: 15px; }
  .summary.core { border-color: #dc2626; background: #fee2e2; border-width: 3px; }
  .summary.rec { border-color: #d97706; background: #fffbeb; }
  .summary h2 { font-size: 15px; margin: 0 0 8px 0; }
  .summary p { margin: 8px 0; }
  .summary p.headline { font-weight: 700; font-size: 1.1em; margin-top: 0; }
  .summary ul { margin: 4px 0 10px 0; padding-left: 20px; }
  .summary li { margin: 3px 0; }
  .hint { margin-top: 30px; font-size: 12px; color: #92400e; }
</style>
</head>
<body>
  <h1>G.I.S.T. — Explorer's Field Journal</h1>
  <p><strong>Student / Class:</strong> ${escapeHtml(studentId)}</p>
  <p><strong>Words logged this session:</strong> ${log.length}</p>
  ${sectionsHtml}
  <table>
    <thead><tr><th>Word</th><th>Clue Type</th><th>Stage Reached</th><th>Hints</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">No words logged yet.</td></tr>'}</tbody>
  </table>
  <p class="hint">Opened this file in your browser? Use your browser's own Print or Save-as-PDF option (usually Ctrl+P or Cmd+P) to print or save it.</p>
</body>
</html>`;
}

function downloadReport(studentId, log, summary) {
  try {
    const html = buildReportHtml(studentId, log, summary);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GIST-report-${(studentId || "student").trim().replace(/\s+/g, "_")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) {
    return false;
  }
}


/* ---------------- Comprehension Screen ---------------- */
function ComprehensionScreen({ passage, avatarConfig, onDone }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [correct, setCorrect] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const raw = await callClaude(COMPREHENSION_SYSTEM_PROMPT, [{ role: "user", content: `Passage: "${passage.text}"` }]);
        const parsed = safeParseJSON(raw);
        if (parsed && parsed.question && Array.isArray(parsed.options)) {
          setData(parsed);
        } else {
          onDone({ ran: false });
        }
      } catch (e) {
        onDone({ ran: false });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, []);

  function handleAnswer(opt) {
    SFX.click();
    const isCorrect = data && opt === data.correctAnswer;
    setAnswer(opt);
    setCorrect(isCorrect);
    SFX[isCorrect ? "resolved" : "hint"]();
    setTimeout(() => {
      onDone({ ran: true, correct: isCorrect, question: data.question, studentAnswer: opt, correctAnswer: data.correctAnswer });
    }, 2200);
  }

  const companion = COMPANION_PERSONAS[avatarConfig.companion] || COMPANION_PERSONAS.parrot;
  const companionEmoji = ANIMAL_COMPANIONS.find((c) => c.id === avatarConfig.companion)?.emoji || "🦜";

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <PersistentCompanion avatarConfig={avatarConfig} size="text-4xl" />
      <div className="max-w-3xl mx-auto w-full px-5 pt-6 pb-3 flex-1 flex flex-col min-h-0 step-in">
        {/* Header card, matching CoachScreen's identity */}
        <div className="relative bg-white p-3 pl-14 mb-3 shrink-0" style={DECKLE}>
          <div
            className="absolute -top-3 -left-3 z-20 bg-white rounded-2xl p-1"
            style={{ border: "3px solid #b45309", boxShadow: "0 3px 0 0 #92400e" }}
          >
            <AvatarDisplay config={avatarConfig} size={44} />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-800 text-stone-700 leading-tight">📖 One Last Check</p>
          <p className="font-hand text-base sm:text-lg text-orange-500 leading-tight">Did you follow the whole story, {passage.title}?</p>
        </div>

        {/* Single unified box, matching CoachScreen */}
        <div
          className="flex-1 overflow-y-auto bg-white p-5 sm:p-7 space-y-4"
          style={{ ...DECKLE, maxHeight: "calc(100dvh - 145px)" }}
        >
          {loading && (
            <div className="flex justify-start items-end gap-1.5 step-in">
              <span className="text-xl sm:text-2xl shrink-0 mb-1">{companionEmoji}</span>
              <div className="px-5 py-3.5 rounded-2xl bg-sky-50 border-2 border-sky-200">
                <p className="font-hand text-lg text-stone-400">{companion.name} is thinking of a question… 🧭</p>
              </div>
            </div>
          )}

          {!loading && data && (
            <div className="flex justify-start items-end gap-1.5 step-in">
              <span className="text-xl sm:text-2xl shrink-0 mb-1">{companionEmoji}</span>
              <div className="max-w-[85%] px-5 py-3.5 rounded-2xl bg-sky-50 border-2 border-sky-300">
                <p className="font-display font-800 text-sm uppercase tracking-wide text-stone-500 mb-1.5">{companion.name}</p>
                <p className="font-body text-lg sm:text-xl leading-relaxed text-stone-700">{data.question}</p>
              </div>
            </div>
          )}

          {!loading && data && answer === null && (
            <div className="grid grid-cols-1 gap-3 step-in">
              {data.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  className="text-left px-5 py-4 bg-white rounded-2xl hover:scale-[1.02] font-body font-800 text-lg sm:text-xl text-stone-700 transition-all"
                  style={{ border: "3px solid #e7e5e4", boxShadow: "0 3px 0 0 #d6d3d1" }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {!loading && data && answer !== null && (
            <div className="grid grid-cols-1 gap-3 step-in">
              {data.options.map((opt, i) => {
                const isCorrectOpt = opt === data.correctAnswer;
                const isChosen = opt === answer;
                const showState = isCorrectOpt || isChosen;
                return (
                  <div
                    key={i}
                    className="relative text-left px-5 py-4 rounded-2xl font-body font-800 text-lg sm:text-xl transition-all flex items-center justify-between"
                    style={{
                      border: `3px solid ${isCorrectOpt ? "#059669" : isChosen ? "#e11d48" : "#e7e5e4"}`,
                      background: isCorrectOpt ? "#d1fae5" : isChosen ? "#fee2e2" : "white",
                      color: showState ? "#292524" : "#78716c",
                      boxShadow: `0 3px 0 0 ${isCorrectOpt ? "#065f46" : isChosen ? "#9f1239" : "#d6d3d1"}`,
                    }}
                  >
                    {opt}
                    {isCorrectOpt && <span>✓</span>}
                    {isChosen && !isCorrectOpt && <span>✗</span>}
                    {isChosen && isCorrectOpt && <Sparkle />}
                  </div>
                );
              })}
            </div>
          )}

          {answer !== null && (
            <div
              className="text-center p-5 rounded-2xl step-in bounce-in"
              style={{ background: correct ? "#d1fae5" : "#fee2e2", border: `3px solid ${correct ? "#059669" : "#e11d48"}` }}
            >
              <p className="font-display font-800 text-xl text-stone-700">
                {correct ? "🎉 You followed the whole story!" : "That's okay, stories can be tricky!"}
              </p>
              {!correct && (
                <p className="font-body text-sm text-stone-600 mt-2">The answer was: <strong>{data.correctAnswer}</strong></p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Student Recap Screen ---------------- */
function RecapScreen({ studentId, log, avatarConfig, comprehensionResult, onFinish }) {
  const solved = log.filter((e) => !e.skipped);
  const independent = solved.filter((e) => e.hintsUsed === 0);
  const withHelp = solved.filter((e) => e.hintsUsed > 0);
  const skipped = log.filter((e) => e.skipped);
  const realInference = solved.filter((e) => e.gotItVia === "clues");
  const clueTypeCounts = {};
  independent.forEach((e) => { clueTypeCounts[e.clueType] = (clueTypeCounts[e.clueType] || 0) + 1; });
  const bestClueType = Object.entries(clueTypeCounts).sort((a, b) => b[1] - a[1])[0];
  const transferWord = log.find((e) => e.transferPassed !== null && e.transferPassed !== undefined);

  const companion = COMPANION_PERSONAS[avatarConfig.companion] || COMPANION_PERSONAS.parrot;
  const companionEmoji = ANIMAL_COMPANIONS.find((c) => c.id === avatarConfig.companion)?.emoji || "🦜";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 step-in relative min-h-screen flex flex-col justify-center">
      <FloatingDecor density={6} />
      <Confetti />
      <div className="bg-white p-6 sm:p-8 relative z-10 text-center" style={DECKLE}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <AvatarDisplay config={avatarConfig} size={64} />
          <span className="text-5xl">{companionEmoji}</span>
        </div>
        <p className="font-display font-800 text-3xl text-stone-700 mt-2 mb-1">
          Great adventure, {studentId}!
        </p>
        <p className="font-hand text-xl text-orange-500 mb-6">
          Here's what you got good at today
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5 text-left step-in" style={{ animationDelay: "0.1s" }}>
          <div className="p-4 rounded-2xl bg-emerald-50" style={{ border: "3px solid #34d399" }}>
            <p className="font-display font-800 text-2xl text-emerald-700">{independent.length}</p>
            <p className="font-body text-xs text-stone-500">words solved on your own</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50" style={{ border: "3px solid #fbbf24" }}>
            <p className="font-display font-800 text-2xl text-amber-700">{withHelp.length}</p>
            <p className="font-body text-xs text-stone-500">words solved with a hint</p>
          </div>
        </div>

        {bestClueType && (
          <div className="mb-4 p-4 rounded-2xl bg-teal-50 text-left step-in" style={{ border: "3px solid #0d9488", animationDelay: "0.2s" }}>
            <p className="font-body text-base text-stone-700">
              🌟 You're great at spotting <b className="font-display">{bestClueType[0]}</b> clues!
            </p>
          </div>
        )}

        {realInference.length > 0 && (
          <div className="mb-4 p-4 rounded-2xl bg-sky-50 text-left step-in" style={{ border: "3px solid #7dd3fc", animationDelay: "0.3s" }}>
            <p className="font-body text-base text-stone-700">
              🔍 You used context clues (not guessing!) on <b>{realInference.length}</b> word{realInference.length === 1 ? "" : "s"} today.
            </p>
          </div>
        )}

        {transferWord && (
          <div className="mb-4 p-4 rounded-2xl text-left step-in" style={{ background: transferWord.transferPassed ? "#d1fae5" : "#fef3c7", border: `3px solid ${transferWord.transferPassed ? "#059669" : "#d97706"}`, animationDelay: "0.4s" }}>
            <p className="font-body text-base text-stone-700">
              {transferWord.transferPassed
                ? <>🏆 You used <b>"{transferWord.word}"</b> correctly even in a brand-new sentence!</>
                : <>💪 <b>"{transferWord.word}"</b> in a new sentence was tricky, keep practicing that one!</>}
            </p>
          </div>
        )}

        {comprehensionResult && comprehensionResult.ran && (
          <div className="mb-4 p-4 rounded-2xl text-left step-in" style={{ background: comprehensionResult.correct ? "#d1fae5" : "#fee2e2", border: `3px solid ${comprehensionResult.correct ? "#059669" : "#e11d48"}`, animationDelay: "0.5s" }}>
            <p className="font-body text-base text-stone-700">
              {comprehensionResult.correct ? "📖 You followed the whole story too!" : "📖 The story itself was a bit tricky, ask your teacher about it!"}
            </p>
          </div>
        )}

        {skipped.length > 0 && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-50 text-left step-in" style={{ border: "3px solid #fb7185", animationDelay: "0.6s" }}>
            <p className="font-body text-base text-stone-700">
              🙋 {skipped.length} word{skipped.length === 1 ? "" : "s"} you asked your teacher about, that's a smart move when something's tricky!
            </p>
          </div>
        )}

        <p className="font-hand text-lg text-stone-500 my-4">{companion.name} says: nice work today, explorer!</p>

        <BigButton onClick={onFinish}>
          Back to the map <ArrowRight className="inline w-4 h-4 ml-1" />
        </BigButton>
      </div>
    </div>
  );
}

function computeAtAGlance(log) {
  const solved = log.filter((e) => !e.skipped);
  const independent = solved.filter((e) => e.hintsUsed === 0).length;
  const withHelp = solved.filter((e) => e.hintsUsed > 0).length;
  const skipped = log.filter((e) => e.skipped);
  const clueTypes = ["contrast", "definition", "example", "inference"];
  const breakdown = clueTypes
    .map((ct) => {
      const words = log.filter((e) => e.clueType === ct && !e.skipped);
      const indep = words.filter((e) => e.hintsUsed === 0).length;
      return { type: ct, total: words.length, independent: indep };
    })
    .filter((b) => b.total > 0);
  return { total: log.length, independent, withHelp, skipped, breakdown };
}

const SAMPLE_LOG = [
  { word: "brave", clueType: "contrast", concreteness: "abstract", finalStage: 2, hintsUsed: 0, skipped: false, priorKnowledge: "no", gotItVia: "clues", clueIdentified: "but she says they are", transferPassed: null, timeToAnswerSec: 18, passageTitle: "Pet Show Day", solvedAt: Date.now() - 500000 },
  { word: "camouflage", clueType: "definition", concreteness: "abstract", finalStage: 4, hintsUsed: 1, skipped: false, priorKnowledge: "not_sure", gotItVia: "clues", clueIdentified: "helps them hide from enemies", transferPassed: true, timeToAnswerSec: 35, passageTitle: "Pet Show Day", solvedAt: Date.now() - 400000 },
  { word: "timid", clueType: "inference", concreteness: "abstract", finalStage: 1, hintsUsed: 0, skipped: false, priorKnowledge: "no", gotItVia: "guessed", clueIdentified: null, transferPassed: null, timeToAnswerSec: 6, passageTitle: "Pet Show Day", solvedAt: Date.now() - 300000 },
  { word: "clever", clueType: "example", concreteness: "abstract", finalStage: 5, hintsUsed: 0, skipped: false, priorKnowledge: "yes", gotItVia: "knew", clueIdentified: null, transferPassed: null, timeToAnswerSec: 4, passageTitle: "Pet Show Day", solvedAt: Date.now() - 200000 },
  { word: "playful", clueType: "example", concreteness: "abstract", finalStage: 1, hintsUsed: 0, skipped: true, revealedMeaning: "\"playful\" means enjoying fun and games.", priorKnowledge: "no", gotItVia: null, clueIdentified: null, transferPassed: null, timeToAnswerSec: 22, passageTitle: "Pet Show Day", solvedAt: Date.now() - 100000 },
];

const SAMPLE_COMPREHENSION = {
  ran: true,
  correct: true,
  question: "Why was Ali's dog considered clever?",
  studentAnswer: "It could open doors by itself",
  correctAnswer: "It could open doors by itself",
};

function TourScreen({ avatarConfig, passage, onDone, bilingual, onToggleBilingual }) {
  const [page, setPage] = useState(0);
  const [revealDemo, setRevealDemo] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState(null);
  const companion = COMPANION_PERSONAS[avatarConfig.companion] || COMPANION_PERSONAS.parrot;
  const companionEmoji = ANIMAL_COMPANIONS.find((c) => c.id === avatarConfig.companion)?.emoji || "🦜";
  const totalPages = 7;

  const practiceData = {
    sentence: "The lion was very fierce and roared loudly.",
    word: "fierce",
    question: "What does \"fierce\" mean here?",
    options: ["Wild and scary", "Very calm and gentle", "Sleepy and tired", "Small and quiet"],
    correctAnswer: "Wild and scary",
  };

  function handlePracticeAnswer(opt) {
    if (practiceAnswer) return;
    SFX.click();
    setPracticeAnswer(opt);
    SFX[opt === practiceData.correctAnswer ? "resolved" : "hint"]();
  }

  const Bi = ({ en, ms, className = "font-body text-base text-stone-600 leading-relaxed" }) => (
    <p className={className}>
      {en}
      {bilingual && ms && <span className="block font-body text-stone-400 mt-1" style={{ fontSize: "0.78em" }}>{ms}</span>}
    </p>
  );

  const pages = [
    // Page 1: Meet your coach
    {
      emoji: companionEmoji,
      title: `Meet ${companion.name}!`,
      titleMs: `Jom kenali ${companion.name}!`,
      body: (
        <>
          <Bi
            en={`${companion.name} will be your coach for this whole adventure, guiding you to work out each tricky word yourself.`}
            ms={`${companion.name} akan menjadi jurulatih anda sepanjang pengembaraan ini, membantu anda memahami setiap perkataan sukar sendiri.`}
            className="font-body text-base text-stone-600 leading-relaxed mb-3"
          />
          <div className="flex items-start gap-1.5 justify-start max-w-xs mx-auto mb-3">
            <span className="text-xl shrink-0">{companionEmoji}</span>
            <div className="px-3 py-2.5 rounded-2xl bg-sky-50 text-left" style={{ border: "2px solid #7dd3fc" }}>
              <p className="font-display font-800 text-[9px] uppercase tracking-wide text-stone-500 mb-0.5">{companion.name}</p>
              <p className="font-body text-xs sm:text-sm text-stone-700">
                Let's figure out what this word means together!
                {bilingual && <span className="block text-stone-400 mt-0.5" style={{ fontSize: "0.85em" }}>Jom kita fikirkan bersama apa maksud perkataan ini!</span>}
              </p>
            </div>
          </div>
          <Bi
            en={`${companion.name} will never just tell you the answer, you'll always get there through clues and questions!`}
            ms={`${companion.name} tidak akan terus bagi jawapan, anda akan sampai ke situ melalui petunjuk dan soalan!`}
          />
        </>
      ),
    },
    // Page 2: Read the story first, genuinely tappable demo
    {
      emoji: passage?.emoji || "📖",
      title: passage ? `Read "${passage.title}" first` : "Read the story first",
      titleMs: "Baca cerita dahulu",
      body: (
        <>
          <Bi
            en="The story appears one part at a time. Try tapping the locked part below!"
            ms="Cerita akan muncul sedikit demi sedikit. Cuba ketik bahagian berkunci di bawah!"
            className="font-body text-base text-stone-600 leading-relaxed mb-3"
          />
          <div className="text-left max-w-xs mx-auto mb-3 space-y-1.5">
            <div className="px-3 py-2 rounded-xl bg-white font-body text-xs text-stone-600" style={{ border: "2px solid #e7e5e4" }}>
              The robot was very{" "}
              <span className="font-display font-800 px-2 py-0.5 rounded-full inline-block" style={{ background: "linear-gradient(135deg,#fde68a,#fdba74)", boxShadow: "0 2px 0 0 #d97706" }}>
                amazing
              </span>
              .
            </div>
            {!revealDemo ? (
              <button
                onClick={() => { SFX.pageTurn(); setRevealDemo(true); }}
                className="w-full text-left px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition-all font-hand text-xs text-stone-400 italic"
              >
                🔒 tap to reveal the next part…
              </button>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-white step-in bounce-in font-body text-xs text-stone-600" style={{ border: "2px solid #e7e5e4" }}>
                It could even{" "}
                <span className="font-display font-800 px-2 py-0.5 rounded-full inline-block" style={{ background: "linear-gradient(135deg,#fde68a,#fdba74)", boxShadow: "0 2px 0 0 #d97706" }}>
                  invent
                </span>{" "}
                new games!
              </div>
            )}
          </div>
          <Bi
            en="Tricky words light up once you've read their sentence, that's when you can tap them to start solving."
            ms="Perkataan sukar akan menyala selepas anda baca ayatnya, itu masa anda boleh ketik untuk mula menyelesaikannya."
          />
        </>
      ),
    },
    // Page 3 (NEW): How am I doing? — explains the reflection prompts before they're encountered live
    {
      emoji: "🤔",
      title: "How am I doing?",
      titleMs: "Macam mana prestasi saya?",
      body: (
        <>
          <Bi
            en="Sometimes your coach asks how you got an answer."
            ms="Kadang-kadang jurulatih anda akan tanya macam mana anda dapat jawapan itu."
            className="font-body text-base text-stone-600 leading-relaxed mb-3"
          />
          <div className="flex flex-col gap-1.5 max-w-xs mx-auto mb-3">
            <div className="px-3 py-1.5 rounded-xl bg-white font-body text-[11px] text-stone-600 text-left" style={{ border: "2px solid #0d9488" }}>💡 I already knew it</div>
            <div className="px-3 py-1.5 rounded-xl bg-white font-body text-[11px] text-stone-600 text-left" style={{ border: "2px solid #0d9488" }}>🔍 I used the clues</div>
            <div className="px-3 py-1.5 rounded-xl bg-white font-body text-[11px] text-stone-600 text-left" style={{ border: "2px solid #0d9488" }}>🎲 I guessed</div>
          </div>
          <Bi
            en="There's no wrong answer to that question, just be honest!"
            ms="Tiada jawapan yang salah untuk soalan itu, jujur sahaja!"
          />
        </>
      ),
    },
    // Page 4 (NEW): Questions can change — explains stage adaptation
    {
      emoji: "🎯",
      title: "Questions can change",
      titleMs: "Soalan boleh berubah",
      body: (
        <>
          <Bi
            en="Get it right away? Questions might get trickier."
            ms="Dapat betul terus? Soalan mungkin jadi lebih mencabar."
            className="font-body text-base text-stone-600 leading-relaxed mb-3"
          />
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="w-7 h-7 rounded-full bg-teal-600 text-white font-display font-800 text-xs flex items-center justify-center">
                {n}
              </div>
            ))}
          </div>
          <Bi
            en="Need a hint? They'll get easier. Your coach adjusts just for you!"
            ms="Perlukan bantuan? Ia akan jadi lebih mudah. Jurulatih anda sesuaikan khas untuk anda!"
          />
        </>
      ),
    },
    // Page 5: A playable practice question, fixed and instant, so it's identical every time
    {
      emoji: "🎮",
      title: `Try "${practiceData.word}"!`,
      titleMs: `Cuba "${practiceData.word}"!`,
      body: (
        <div className="text-left">
          <div className="mb-3 px-3 py-2.5 rounded-xl bg-white font-body text-xs sm:text-sm text-stone-700 italic" style={{ border: "2px solid #0d9488" }}>
            {practiceData.sentence}
          </div>
          <p className="font-body text-sm sm:text-base text-stone-700 mb-2.5">{practiceData.question}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {practiceData.options.map((opt, i) => {
              const isCorrect = opt === practiceData.correctAnswer;
              const isChosen = opt === practiceAnswer;
              const answered = !!practiceAnswer;
              return (
                <button
                  key={i}
                  onClick={() => handlePracticeAnswer(opt)}
                  className="text-left px-3 py-2 rounded-xl font-body text-xs sm:text-sm transition-all"
                  style={{
                    border: `2px solid ${answered && isCorrect ? "#059669" : answered && isChosen ? "#e11d48" : "#e7e5e4"}`,
                    background: answered && isCorrect ? "#d1fae5" : answered && isChosen ? "#fee2e2" : "white",
                    color: answered && !isCorrect && !isChosen ? "#a8a29e" : "#292524",
                  }}
                >
                  {opt} {answered && isCorrect && "✓"} {answered && isChosen && !isCorrect && "✗"}
                </button>
              );
            })}
          </div>
          {practiceAnswer && (
            <p className="font-hand text-base text-teal-600 mt-3 text-center step-in">
              Nice! That's exactly how it'll feel when you play for real.
              {bilingual && <span className="block font-body text-stone-400 mt-1" style={{ fontSize: "0.7em" }}>Bagus! Begitulah rasanya apabila anda bermain nanti.</span>}
            </p>
          )}
        </div>
      ),
    },
    // Page 6 (NEW): More ways to answer — a quick heads-up, not a full lesson
    {
      emoji: "🎲",
      title: "More ways to answer",
      titleMs: "Lebih banyak cara untuk jawab",
      body: (
        <>
          <Bi
            en="Sometimes you'll type, sometimes you'll tap letters, sometimes true or false!"
            ms="Kadang-kadang anda taip, kadang-kadang ketik huruf, kadang-kadang betul atau salah!"
            className="font-body text-base text-stone-600 leading-relaxed mb-3"
          />
          <div className="flex items-center justify-center gap-3 mb-3 text-2xl">
            <span>👉</span>
            <span>✍️</span>
            <span>🔤</span>
            <span>🤔</span>
            <span>🕵️</span>
          </div>
          <Bi
            en="Your coach mixes it up to keep things fun."
            ms="Jurulatih anda ubah-ubah supaya seronok."
          />
        </>
      ),
    },
    // Page 7: Finishing up
    {
      emoji: "🏁",
      title: "Finishing up",
      titleMs: "Hampir selesai",
      body: (
        <>
          <Bi
            en="Once you've solved every word, there's one more question about the whole story, then you'll see what you did well!"
            ms="Selepas anda selesaikan semua perkataan, ada satu lagi soalan tentang keseluruhan cerita, kemudian anda akan lihat apa yang anda kuasai!"
            className="font-body text-base text-stone-600 leading-relaxed mb-3"
          />
          <div className="flex gap-2 justify-center mb-3">
            <div className="px-4 py-2 rounded-xl bg-emerald-50 text-center" style={{ border: "2px solid #34d399" }}>
              <p className="font-display font-800 text-lg text-emerald-700 leading-none">3</p>
              <p className="font-body text-[9px] text-stone-500">solved alone</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-50 text-center" style={{ border: "2px solid #fbbf24" }}>
              <p className="font-display font-800 text-lg text-amber-700 leading-none">2</p>
              <p className="font-body text-[9px] text-stone-500">with a hint</p>
            </div>
          </div>
          <Bi
            en={<>Stuck on a word? Tap <b>"🙋 Skip"</b> anytime to ask your teacher for help, that's always okay.</>}
            ms="Tersekat pada satu perkataan? Ketik &quot;🙋 Skip&quot; bila-bila masa untuk minta bantuan guru, itu sentiasa okay."
          />
        </>
      ),
    },
  ];

  const current = pages[page];

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 step-in relative min-h-screen flex flex-col justify-center">
      <FloatingDecor density={5} />
      <div className="bg-white p-6 sm:p-8 relative z-10 text-center max-h-[92dvh] overflow-y-auto" style={DECKLE}>
        <button
          onClick={onDone}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white font-display font-700 text-xs text-stone-500 hover:text-stone-700 hover:border-stone-400 transition-all"
          style={{ border: "2px solid #d6d3d1" }}
        >
          Skip tutorial ✕
        </button>

        {onToggleBilingual && (
          <button
            onClick={onToggleBilingual}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center rounded-full bg-white overflow-hidden font-display font-800 text-xs"
            style={{ border: "3px solid #b45309", boxShadow: "0 3px 0 0 #92400e" }}
            title={bilingual ? "Turn off Bahasa Malaysia support" : "Turn on Bahasa Malaysia support"}
          >
            <span className={`px-2.5 py-1.5 ${!bilingual ? "bg-amber-400 text-white" : "text-stone-400"}`}>EN</span>
            <span className={`px-2.5 py-1.5 ${bilingual ? "bg-amber-400 text-white" : "text-stone-400"}`}>BM</span>
          </button>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6 flex-wrap">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={`h-2.5 rounded-full transition-all ${
                i === page ? "w-8 bg-orange-400" : i < page ? "w-2.5 bg-emerald-400" : "w-2.5 bg-stone-200"
              }`}
            />
          ))}
        </div>

        <span className="text-5xl">{current.emoji}</span>
        <p className="font-display font-800 text-2xl text-stone-700 mt-2 mb-4">
          {current.title}
          {bilingual && current.titleMs && <span className="block font-body font-400 text-base text-stone-400 mt-0.5">{current.titleMs}</span>}
        </p>

        <div className="min-h-[200px] flex flex-col justify-center mb-6">{current.body}</div>

        <div className="flex items-center justify-center gap-3">
          {page > 0 && (
            <BigButton variant="ghost" onClick={() => { SFX.tap(); setPage((p) => p - 1); }}>
              <ChevronLeft className="inline w-4 h-4 mr-1" /> Back
            </BigButton>
          )}
          {page < totalPages - 1 ? (
            <BigButton onClick={() => { SFX.tap(); setPage((p) => p + 1); }}>
              Next <ArrowRight className="inline w-4 h-4 ml-1" />
            </BigButton>
          ) : (
            <BigButton onClick={onDone}>
              Let's start! <ArrowRight className="inline w-4 h-4 ml-1" />
            </BigButton>
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherScreen({ studentId, log, onBack, onReset, sessionStartedAt, comprehensionResult, isDemo = false }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState("");
  const quotaStatus = useQuotaStatus();

  async function handleDownload() {
    SFX.tap();
    setDownloading(true);
    const ok = downloadReport(studentId, log, summary);
    if (!ok) alert("Couldn't download the report. Please try again.");
    setDownloading(false);
  }

  async function generateSummary() {
    setLoading(true);
    setError(null);
    setSummary(null);
    const logForModel = log.map(({ word, clueType, concreteness, finalStage, hintsUsed, skipped, priorKnowledge, gotItVia, clueIdentified, transferPassed, timeToAnswerSec }) => ({
      word, clueType, concreteness, finalStage, hintsUsed, skipped: !!skipped,
      priorKnowledge: priorKnowledge || null,
      gotItVia: gotItVia || null,
      clueIdentified: clueIdentified || null,
      transferPassed: transferPassed === undefined ? null : transferPassed,
      timeToAnswerSec: timeToAnswerSec || null,
    }));
    const comprehensionForModel = comprehensionResult && comprehensionResult.ran
      ? { correct: comprehensionResult.correct, question: comprehensionResult.question }
      : { correct: null, question: null, note: "No comprehension check ran this session." };
    const userMsg = {
      role: "user",
      content: `Student: ${studentId}\nLog (chronological, oldest first):\n${JSON.stringify(logForModel, null, 2)}\n\nWhole-passage comprehension check:\n${JSON.stringify(comprehensionForModel, null, 2)}${teacherNotes.trim() ? `\n\nTeacher notes about this session's context: ${teacherNotes.trim()}` : ""}`,
    };
    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const raw = await callClaude(DIAGNOSTIC_SYSTEM_PROMPT, [userMsg]);
        const parsed = safeParseJSON(raw);
        if (parsed && parsed.coreProblem) {
          setSummary({
            coreProblem: parsed.coreProblem,
            whatThisMeans: parsed.whatThisMeans || "",
            howReliable: parsed.howReliable || "",
            storyUnderstandingNote: parsed.storyUnderstandingNote || "",
            whatToTry: parsed.whatToTry || "",
          });
          SFX.reportReady();
          setLoading(false);
          return;
        }
        lastError = new Error("Response wasn't in the expected format");
      } catch (e) {
        lastError = e;
        if (NON_RETRYABLE_STATUSES.has(e.status)) break;
      }
    }
    setError(`Couldn't generate the summary just now. ${lastError ? lastError.message : ""} Try again.`);
    setLoading(false);
  }

  const glance = computeAtAGlance(log);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 step-in relative">
      <FloatingDecor density={4} />
      {/* pl-14/pr-14 clear the fixed close (X) and sound-toggle buttons
          pinned at top-4 left-4 / top-4 right-4, which otherwise overlap
          this row's Back button and "Teacher view" label on every screen
          that reaches TeacherScreen (both a real post-session report and
          the sample report from the main menu). */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2 relative z-10 pl-14 pr-14">
        <button onClick={onBack} className="flex items-center gap-1 font-display font-700 text-xs text-stone-400 hover:text-stone-600 bg-white rounded-full px-3 py-1.5 border-2 border-stone-200">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex items-center gap-2">
          <SessionTimer startedAt={sessionStartedAt} className="font-mono text-xs text-stone-500 bg-white rounded-full px-3 py-1.5 border-2 border-stone-200" />
          <button onClick={() => setShowHelp((s) => !s)} className="font-display font-700 text-xs text-stone-500 bg-white rounded-full px-3 py-1.5 border-2 border-stone-200">
            ℹ️ How this works
          </button>
          <span className="flex items-center gap-1 font-display font-700 text-xs text-stone-500">
            <GraduationCap className="w-3.5 h-3.5" /> Teacher view
          </span>
        </div>
      </div>

      {quotaStatus && quotaStatus.limit != null && (() => {
        const remaining = Math.max(0, quotaStatus.limit - quotaStatus.used);
        const tone = remaining <= 0 ? "text-rose-600" : remaining < SESSION_COST_ESTIMATE ? "text-amber-700" : "text-stone-500";
        return (
          <p className={`font-body text-[11px] mb-4 relative z-10 pl-14 ${tone}`}>
            🔋 {remaining} of {quotaStatus.limit} AI turns left today on this device
            {remaining < SESSION_COST_ESTIMATE && remaining > 0 ? " — getting low, may not cover a full session" : ""}
          </p>
        );
      })()}

      {showHelp && (
        <div className="mb-6 p-4 rounded-2xl bg-sky-50 border-2 border-sky-200 step-in font-body text-sm text-stone-700 leading-relaxed">
          <p className="mb-2"><strong>How to use this:</strong> this is a one-time session view. The student plays through a map during a supervised session, and every word attempt is logged automatically.</p>
          <p className="mb-2">Tap "Generate diagnostic summary" for a full evidence-based report, then "Download results" to save a copy, opens in any browser and can be printed to PDF from there if needed. This screen's data isn't stored anywhere once you leave the session.</p>
          <p>Colors mean something: <b>blue</b> boxes are counted directly from the log, no AI involved. <b>Amber</b> boxes are AI-written analysis. The <b>red</b> box is the single headline diagnosis, built from the amber boxes' evidence.</p>
        </div>
      )}

      {isDemo && (
        <div className="mb-5 px-4 py-3 rounded-2xl relative z-10 step-in flex items-center gap-2" style={{ background: "#fef3c7", border: "3px solid #d97706" }}>
          <span className="text-xl">🔦</span>
          <p className="font-body text-sm text-amber-900">
            <strong>This is a sample report</strong> with made-up data, showing what a real diagnostic looks like. No student actually played this session.
          </p>
        </div>
      )}

      <h2 className="font-display text-3xl font-800 text-stone-700 mb-1 flex items-center gap-2 relative z-10">📔 Explorer's Field Journal</h2>
      <p className="font-body text-xs text-stone-500 mb-4 relative z-10">Student / Class: {studentId} · {log.length} landmark{log.length === 1 ? "" : "s"} logged this session</p>

      <div className="mb-5 relative z-10">
        <label className="font-display font-700 text-xs uppercase tracking-wide text-stone-500 block mb-1.5">📝 Notes about this session (optional)</label>
        <textarea
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          placeholder="e.g. right after recess, usually stronger with reading, had a rough morning…"
          rows={2}
          className="w-full bg-white rounded-2xl border-2 border-stone-200 px-4 py-2.5 font-body text-sm text-stone-700 focus:outline-none focus:border-teal-400"
        />
      </div>

      <div className="text-center mb-6 relative z-10">
        <BigButton onClick={generateSummary} disabled={log.length === 0 || loading}>
          {loading ? "Analysing…" : "🔎 Generate diagnostic summary"}
        </BigButton>
        {error && <p className="font-body text-xs text-rose-600 mt-3" aria-live="polite">{error}</p>}
      </div>

      {summary && (
        <div className="relative z-10 mb-6 space-y-4 step-in">
          {/* Legend */}
          <div className="flex items-center justify-center gap-5 flex-wrap font-display font-800 text-[11px] uppercase tracking-wide text-stone-500">
            <span className="flex items-center gap-1.5"><i className="inline-block w-3.5 h-3.5 rounded" style={{ background: "#dbeafe", border: "2px solid #2563eb" }} /> Counted directly</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-3.5 h-3.5 rounded" style={{ background: "#fef3c7", border: "2px solid #d97706" }} /> AI-analyzed</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-3.5 h-3.5 rounded" style={{ background: "#fee2e2", border: "2px solid #dc2626" }} /> Headline diagnosis</span>
          </div>

          {/* 1. Core Problem */}
          <div className="p-6 rounded-3xl text-center" style={{ background: "#fee2e2", border: "4px solid #dc2626" }}>
            <p className="font-display font-800 text-xs uppercase tracking-wide text-red-800 mb-2">🎯 The Core Problem</p>
            <RichReportText text={summary.coreProblem} className="text-red-900" boldColorClass="text-red-950 font-800" />
          </div>

          {/* 2. What This Actually Means */}
          <div className="p-6 rounded-3xl text-center" style={{ background: "#ffedd5", border: "4px solid #c2410c" }}>
            <p className="font-display font-800 text-xs uppercase tracking-wide text-orange-900 mb-2">💭 What This Actually Means</p>
            <RichReportText text={summary.whatThisMeans} className="text-orange-950" boldColorClass="text-orange-950 font-800" />
          </div>

          {/* 3 + Story Understanding: At a Glance / Story Understanding */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl" style={{ background: "#dbeafe", border: "3px solid #2563eb" }}>
              <p className="font-display font-800 text-xs uppercase tracking-wide text-blue-800 mb-3">📊 At a Glance</p>
              <div className="space-y-1.5 font-body text-sm text-blue-900">
                <div className="flex justify-between items-center border-b border-blue-200 pb-1"><span>Solved independently</span><b className="font-display text-xl leading-none">{glance.independent}</b></div>
                <div className="flex justify-between items-center border-b border-blue-200 pb-1"><span>Needed hints</span><b className="font-display text-xl leading-none">{glance.withHelp}</b></div>
                <div className="flex justify-between items-center"><span>Skipped</span><b className="font-display text-xl leading-none">{glance.skipped.length}</b></div>
              </div>
              {glance.skipped.length > 0 && (
                <p className="mt-3 text-xs font-body text-rose-700 bg-rose-100 rounded-xl px-3 py-2">
                  ⚠️ Needed direct answers: {glance.skipped.map((e) => e.word).join(", ")}
                </p>
              )}
              {glance.breakdown.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200 space-y-1">
                  {glance.breakdown.map((b) => (
                    <div key={b.type} className="flex justify-between text-xs font-body text-blue-800 capitalize">
                      <span>{b.type} clues</span><span>{b.independent}/{b.total} independent</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 rounded-3xl" style={{ background: "#dbeafe", border: "3px solid #2563eb" }}>
              <p className="font-display font-800 text-xs uppercase tracking-wide text-blue-800 mb-2">📖 Story Understanding</p>
              <p className="font-body text-sm text-blue-900 mb-2">
                Comprehension check: {comprehensionResult && comprehensionResult.ran ? (comprehensionResult.correct ? <b>Correct ✓</b> : <b>Incorrect ✗</b>) : <i>Not run this session</i>}
              </p>
              <BoldText text={summary.storyUnderstandingNote} className="font-body text-sm leading-relaxed text-blue-900" />
            </div>
          </div>

          {/* 4. How Reliable Is This */}
          <div className="p-6 rounded-3xl" style={{ background: "#fef3c7", border: "4px solid #d97706" }}>
            <p className="font-display font-800 text-xs uppercase tracking-wide text-amber-800 mb-2">🧠 How Reliable Is This</p>
            <RichReportText text={summary.howReliable} className="text-amber-900" boldColorClass="text-amber-950 font-800" />
          </div>

          {/* 5. What To Try */}
          <div className="p-6 rounded-3xl" style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "4px solid #d97706" }}>
            <p className="font-display font-800 text-xs uppercase tracking-wide text-amber-800 mb-2">💡 What To Try in Class</p>
            <RichReportText text={summary.whatToTry} className="text-amber-900" boldColorClass="text-amber-950 font-800" />
          </div>

          <div className="text-center">
            <BigButton
              variant="outline"
              onClick={handleDownload}
              disabled={log.length === 0 || downloading}
            >
              {downloading ? "Preparing…" : "⬇️ Download results"}
            </BigButton>
          </div>
        </div>
      )}

      {(() => {
        const distinctMaps = [...new Set(log.map((e) => e.passageTitle).filter(Boolean))];
        const showMapColumn = distinctMaps.length > 1;
        return (
          <div className="bg-white border-4 rounded-2xl mb-6 overflow-hidden relative z-10" style={{ borderColor: "#b45309" }}>
            <table className="w-full text-left">
              <thead className="bg-amber-50 border-b-2 border-amber-300">
                <tr>
                  <th className="font-display font-700 text-[11px] uppercase tracking-wide text-stone-500 px-4 py-3">Word</th>
                  {showMapColumn && <th className="font-display font-700 text-[11px] uppercase tracking-wide text-stone-500 px-4 py-3">Map</th>}
                  <th className="font-display font-700 text-[11px] uppercase tracking-wide text-stone-500 px-4 py-3">Clue Type</th>
                  <th className="font-display font-700 text-[11px] uppercase tracking-wide text-stone-500 px-4 py-3">Stage Reached</th>
                  <th className="font-display font-700 text-[11px] uppercase tracking-wide text-stone-500 px-4 py-3">Hints</th>
                </tr>
              </thead>
              <tbody>
                {log.length === 0 && (
                  <tr><td colSpan={showMapColumn ? 5 : 4} className="px-4 py-8 text-center font-hand text-lg text-stone-400">No words logged yet. Have the student solve a few words first!</td></tr>
                )}
                {log.map((entry, i) => (
                  <tr key={i} className={`border-b border-amber-100 last:border-0 ${entry.skipped ? "bg-rose-50" : ""}`}>
                    <td className="px-4 py-3 font-display font-700 text-stone-700">
                      {entry.word}
                      {entry.skipped && <span className="ml-2 font-body font-700 text-[10px] uppercase text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">Skipped</span>}
                    </td>
                    {showMapColumn && <td className="px-4 py-3 font-body text-xs text-stone-600">{entry.passageTitle || "—"}</td>}
                    <td className="px-4 py-3 font-body text-xs text-stone-600 capitalize">{entry.clueType}</td>
                    <td className="px-4 py-3 font-body text-xs text-stone-600">{entry.finalStage} — {STAGE_LABELS[entry.finalStage]}</td>
                    <td className="px-4 py-3 font-body text-xs text-stone-600">{entry.hintsUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      <div className="mt-10 pt-6 border-t-2 border-stone-200 flex items-center justify-between flex-wrap gap-2 relative z-10">
        <p className="font-body text-[11px] text-stone-400">Clears this session's log. Print or save your results first if you need them.</p>
        <BigButton variant="ghost" onClick={onReset}>
          <RotateCcw className="inline w-3 h-3 mr-1" /> Clear session
        </BigButton>
      </div>
    </div>
  );
}

/* ---------------- Access Gate Screen ---------------- */
function AccessGateScreen({ onUnlocked }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Couldn't verify that code, please try again.");
        return;
      }
      if (data.dailyLimit) saveQuotaCache({ limit: data.dailyLimit });
      onUnlocked(data.token, data.expiresAt);
    } catch (e) {
      setError("Couldn't reach the server, check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-8 step-in min-h-screen flex flex-col justify-center relative">
      <FloatingDecor density={5} />
      <div className="text-center mb-4 relative z-10">
        <div className="flex justify-center mb-1"><CompassRose size={84} /></div>
        <h1 className="font-display text-6xl font-800 sticker-title mb-1">G.I.S.T.</h1>
      </div>
      <div className="relative z-10 bg-white p-8" style={DECKLE}>
        <p className="font-display font-800 text-sm uppercase tracking-wide text-stone-500 mb-2 text-center">Access Code</p>
        <p className="font-body text-sm text-stone-600 leading-relaxed mb-5 text-center">
          Ask your teacher or school for the code to unlock G.I.S.T.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter access code"
          aria-label="Access code"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          className="w-full bg-amber-50 rounded-2xl border-2 border-amber-300 px-4 py-4 font-body text-xl text-stone-700 text-center focus:outline-none focus:border-amber-500 placeholder:text-stone-400"
        />
        {error && <p className="font-body text-xs text-red-600 text-center mt-3" aria-live="polite">{error}</p>}
        <div className="flex justify-center mt-6">
          <BigButton onClick={handleSubmit} disabled={!code.trim() || loading}>
            {loading ? "Checking…" : "Unlock"}
          </BigButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [studentId, setStudentId] = useState("");
  const [avatarConfig, setAvatarConfig] = useState(DEFAULT_AVATAR_CONFIG);
  const [passageId, setPassageId] = useState("orangutan");
  const [customPassages, setCustomPassages] = useState([]);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [transferWordId, setTransferWordId] = useState(null);
  const [activeWordCount, setActiveWordCount] = useState(null);
  const [comprehensionResult, setComprehensionResult] = useState(null);
  const [log, setLog] = useState([]);
  const [solvedWords, setSolvedWords] = useState([]);
  const [activeWord, setActiveWord] = useState(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [streakMsg, setStreakMsg] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [appClosed, setAppClosed] = useState(false);
  const [bilingual, setBilingual] = useState(false);
  const [revealedCount, setRevealedCount] = useState(1);
  const [authInfo, setAuthInfo] = useState(() => loadCachedAuth());

  useEffect(() => {
    currentAuthToken = authInfo?.token || null;
  }, [authInfo]);

  useEffect(() => {
    onAuthInvalidated = () => { clearCachedAuth(); setAuthInfo(null); };
    return () => { onAuthInvalidated = null; };
  }, []);

  useEffect(() => {
    const unlock = () => { unlockSpeechOnce(); if (soundEnabled) startBackgroundMusic(); document.removeEventListener("pointerdown", unlock); };
    document.addEventListener("pointerdown", unlock);
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);

  const isFirstScreenRef = useRef(true);
  useEffect(() => {
    if (isFirstScreenRef.current) { isFirstScreenRef.current = false; return; }
    SFX.pageTurn();
  }, [screen]);

  const fullPassage = PASSAGES[passageId] || customPassages.find((p) => p.id === passageId);
  const passage = fullPassage
    ? { ...fullPassage, words: fullPassage.words.slice(0, activeWordCount || fullPassage.words.length) }
    : null;

  function handleSaveCustomPassage(id, passageData) {
    setCustomPassages((prev) => [...prev, { id, ...passageData }]);
  }

  function handleBegin(name, config, pId, wordCount) {
    setStudentId(name);
    setAvatarConfig(config);
    setPassageId(pId);
    setLog([]);
    setSolvedWords([]);
    setSessionStartedAt(Date.now());
    setRevealedCount(1);
    const chosenPassage = PASSAGES[pId] || customPassages.find((p) => p.id === pId);
    const count = chosenPassage && chosenPassage.words ? Math.min(wordCount || chosenPassage.words.length, chosenPassage.words.length) : null;
    setActiveWordCount(count);
    const sessionWords = chosenPassage && chosenPassage.words ? chosenPassage.words.slice(0, count || chosenPassage.words.length) : [];
    if (sessionWords.length) {
      const pick = sessionWords[Math.floor(Math.random() * sessionWords.length)];
      setTransferWordId(pick.word);
    } else {
      setTransferWordId(null);
    }
    setScreen("passage");
  }

  function handleWordResolved(entry) {
    const newLog = [...log, entry];
    setLog(newLog);
    setSolvedWords((s) => [...s, entry.word]);
    const total = newLog.length;
    const nowSolvedInPassage = [...solvedWords, entry.word];
    const passageComplete = passage.words.every((w) => nowSolvedInPassage.includes(w.word));
    if (passageComplete) {
      setTimeout(() => SFX.trophy(), 400);
    } else if ([5, 10, 20].includes(total)) {
      setTimeout(() => SFX.milestone(), 300);
    }
    setStreakMsg(
      entry.skipped
        ? `👍 No worries, "${entry.word}" is marked for your teacher to help with. On to the next one!`
        : `🎉 Word #${total} solved! You reached Stage ${entry.finalStage}: ${STAGE_LABELS[entry.finalStage]}.`
    );
    setActiveWord(null);
    if (passageComplete) {
      setScreen("comprehension");
    } else {
      setScreen("passage");
    }
    setTimeout(() => setStreakMsg(null), 6000);
  }

  function handleReset() {
    setLog([]);
    setSolvedWords([]);
  }

  if (!authInfo) {
    return (
      <div className="min-h-screen text-stone-700" style={{ fontFamily: "ui-sans-serif, system-ui", background: "linear-gradient(180deg,#FFF6DE 0%,#FFE9AD 55%,#FFDD85 100%)" }}>
        <FontImport />
        <PaperGrain />
        <ScreenFrame />
        <AccessGateScreen
          onUnlocked={(token, expiresAt) => {
            saveCachedAuth(token, expiresAt);
            setAuthInfo({ token, expiresAt });
          }}
        />
      </div>
    );
  }

  if (appClosed) {
    return (
      <div className="min-h-screen text-stone-700" style={{ fontFamily: "ui-sans-serif, system-ui", background: "linear-gradient(180deg,#FFF6DE 0%,#FFE9AD 55%,#FFDD85 100%)" }}>
        <FontImport />
        <PaperGrain />
        <ScreenFrame />
        <ClosedScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-stone-700" style={{ fontFamily: "ui-sans-serif, system-ui", background: "linear-gradient(180deg,#FFF6DE 0%,#FFE9AD 55%,#FFDD85 100%)" }}>
      <FontImport />
      <PaperGrain />
      <CompassWatermark />
      <ScreenFrame />
      <CloseButton onClick={() => setShowCloseConfirm(true)} />
      {showCloseConfirm && (
        <CloseConfirmModal
          screen={screen}
          studentId={studentId}
          onCancel={() => setShowCloseConfirm(false)}
          onConfirm={() => {
            setShowCloseConfirm(false);
            try { window.close(); } catch (e) { /* window.close() is unreliable in sandboxed contexts, the fallback screen below handles this */ }
            setAppClosed(true);
          }}
        />
      )}
      {screen !== "coach" && (
        <SoundToggle soundOn={soundOn} onToggle={() => { const next = !soundOn; setSoundOn(next); setSoundEnabledGlobal(next); }} />
      )}
      {screen === "setup" && <SetupScreen onBegin={handleBegin} customPassages={customPassages} onSaveCustomPassage={handleSaveCustomPassage} onViewDemoReport={() => setScreen("demo-report")} bilingual={bilingual} onToggleBilingual={() => setBilingual((b) => !b)} />}
      {screen === "demo-report" && (
        <TeacherScreen
          studentId="Sample Student"
          log={SAMPLE_LOG}
          onBack={() => setScreen("setup")}
          onReset={() => setScreen("setup")}
          sessionStartedAt={Date.now() - 600000}
          comprehensionResult={SAMPLE_COMPREHENSION}
          isDemo
        />
      )}
      {screen === "passage" && (
        <PassageScreen
          passage={passage}
          solvedWords={solvedWords}
          onPickWord={(w) => {
            setActiveWord(w);
            setWordIndex(solvedWords.length);
            setScreen("coach");
          }}
          onOpenTeacher={() => setScreen("teacher")}
          avatarConfig={avatarConfig}
          totalLogCount={log.length}
          streakMsg={streakMsg}
          studentId={studentId}
          log={log}
          sessionStartedAt={sessionStartedAt}
          revealedCount={revealedCount}
          onRevealNext={() => setRevealedCount((n) => n + 1)}
        />
      )}
      {screen === "coach" && activeWord && (
        <CoachScreen
          passage={passage}
          targetWord={activeWord}
          avatarConfig={avatarConfig}
          onWordResolved={handleWordResolved}
          onBack={() => setScreen("passage")}
          soundOn={soundOn}
          onToggleSound={(next) => { setSoundOn(next); setSoundEnabledGlobal(next); }}
          wordIndex={wordIndex}
          isTransferWord={activeWord && transferWordId === activeWord.word}
        />
      )}
      {screen === "comprehension" && (
        <ComprehensionScreen
          passage={passage}
          avatarConfig={avatarConfig}
          onDone={(result) => { setComprehensionResult(result); setScreen("recap"); }}
        />
      )}
      {screen === "recap" && (
        <RecapScreen
          studentId={studentId}
          log={log}
          avatarConfig={avatarConfig}
          comprehensionResult={comprehensionResult}
          onFinish={() => setScreen("passage")}
        />
      )}
      {screen === "teacher" && (
        <TeacherScreen studentId={studentId} log={log} onBack={() => setScreen("passage")} onReset={handleReset} sessionStartedAt={sessionStartedAt} comprehensionResult={comprehensionResult} />
      )}
    </div>
  );
}
