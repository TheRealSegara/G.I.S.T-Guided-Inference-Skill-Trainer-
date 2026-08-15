// Local-only demo backend for rehearsal/insurance purposes — NOT used by
// the deployed app in any way (Vercel uses api/*.js directly; server.js is
// the separate real Cloud-Run-style backend). This file exists so the
// exact real production frontend (npm run build's dist/ output, byte for
// byte what's deployed) can be played through completely offline: no
// Groq key, no Supabase project, no daily quota, no network dependency at
// all. Every response shape below matches the real handlers in api/*.js
// exactly, so the frontend needs zero code changes to talk to this instead.
//
// Word content below is hand-written to be genuinely accurate for the
// app's 4 real built-in passages (not placeholder text), so play-throughs
// of "Start Playing" read the same as the real thing. Anything outside
// that known set (e.g. a custom Level Maker passage) falls back to a
// generic-but-coherent mock rather than failing.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signToken, verifyToken } from "../api/_auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");

// Local-only secret — never read from a real env var, never touches the
// real deployed AUTH_SECRET, so there's zero chance of cross-contamination.
const SECRET = "local-demo-only-not-a-real-secret";
const TOKEN_TTL_MINUTES = 720;

/* ---------------- Word content: the app's 4 real built-in passages ---------------- */
const WORDS = {
  reluctant: { meaning: "Unwilling; hesitant", distractors: ["Very excited", "Completely confused", "Extremely brave"], hint: "Think about how the little brother acted before he saw the orang utan." },
  enormous: { meaning: "Very big; huge", distractors: ["Very small", "Very fast", "Very colourful"], hint: "The passage compares its size to something else nearby." },
  curious: { meaning: "Eager to know more", distractors: ["Feeling sleepy", "Feeling angry", "Feeling bored"], hint: "Think about why he kept asking questions." },
  damp: { meaning: "Slightly wet", distractors: ["Very hot", "Completely dry", "Very cold"], hint: "The passage explains why the fur felt this way — it had just rained." },
  gentle: { meaning: "Kind and calm", distractors: ["Loud and rough", "Fast and messy", "Shy and quiet"], hint: "The ranger contrasts how they look with how they actually behave." },
  bustling: { meaning: "Busy and lively", distractors: ["Quiet and empty", "Slow and sleepy", "Dark and scary"], hint: "Think about the stalls and children running everywhere." },
  delighted: { meaning: "Very pleased", distractors: ["Very worried", "Very confused", "Very tired"], hint: "Think about grandmother's big smile." },
  fragrant: { meaning: "Smelling sweet", distractors: ["Tasting sour", "Feeling rough", "Sounding loud"], hint: "The passage describes the pandan leaves' smell." },
  exhausted: { meaning: "Extremely tired", distractors: ["Extremely happy", "Extremely hungry", "Extremely proud"], hint: "Think about a full day of cooking and welcoming guests." },
  generous: { meaning: "Willing to share freely", distractors: ["Unwilling to share", "Quick to argue", "Slow to answer"], hint: "Think about how the neighbours treat anyone who walks by." },
  brave: { meaning: "Not afraid", distractors: ["Very shy", "Very silly", "Very sleepy"], hint: "Mei says spiders look scary, but are actually this." },
  camouflage: { meaning: "Colouring that helps hide", distractors: ["A loud sound", "A fast movement", "A sweet smell"], hint: "Think about how a gecko can change color." },
  timid: { meaning: "Shy and easily scared", distractors: ["Bold and loud", "Playful and silly", "Angry and mean"], hint: "Think about what the cat does when guests come." },
  clever: { meaning: "Quick to learn and understand", distractors: ["Slow to learn", "Hard to see", "Easy to scare"], hint: "Think about how the dog can open doors by itself." },
  playful: { meaning: "Full of fun", distractors: ["Full of worry", "Full of anger", "Full of silence"], hint: "Think about the rabbit jumping and running all day." },
  invented: { meaning: "Created something new", distractors: ["Broke something old", "Found something lost", "Copied something else"], hint: "Think about what the scientist did to make the robot." },
  powerful: { meaning: "Very strong", distractors: ["Very weak", "Very quiet", "Very slow"], hint: "Think about the robot lifting heavy boxes easily." },
  careful: { meaning: "Paying close attention", distractors: ["Not paying attention", "Moving very fast", "Making a lot of noise"], hint: "Think about how the robot never drops anything." },
  amazing: { meaning: "Causing great wonder", distractors: ["Causing boredom", "Causing confusion", "Causing worry"], hint: "Think about how everyone reacted to the robot dancing and singing." },
  tiny: { meaning: "Very small", distractors: ["Very large", "Very loud", "Very old"], hint: "The passage compares the computer's size to your hand." },
};
const KNOWN_WORDS = Object.keys(WORDS);

const COMPREHENSION_BY_PASSAGE = [
  { match: "Mei Ling", question: "Why was the little brother reluctant to walk into the forest at first?", options: ["He was scared and didn't want to go", "He was too tired to walk", "He didn't like his mother", "He wanted to go home"], correctAnswer: "He was scared and didn't want to go" },
  { match: "Aiman's village", question: "Why does Aiman's village have a festival?", options: ["To celebrate the harvest", "To welcome new students", "To open a new market", "To say goodbye to summer"], correctAnswer: "To celebrate the harvest" },
  { match: "Pet Show", question: "What is special about Ali's dog?", options: ["It can open doors by itself", "It can talk", "It can swim very fast", "It changes color"], correctAnswer: "It can open doors by itself" },
  { match: "robot show", question: "What can the robot do besides lifting heavy boxes?", options: ["Dance and sing songs", "Cook food", "Fly in the sky", "Read books aloud"], correctAnswer: "Dance and sing songs" },
];

function findWord(text) {
  const m = /target word "([^"]+)"/.exec(text || "");
  const word = m ? m[1].toLowerCase() : null;
  return word && WORDS[word] ? word : null;
}

// The literal target word from the request, regardless of whether it's one
// of our 20 curated words -- used so a custom Level Maker word never gets
// silently swapped for an unrelated known word (that would show the wrong
// word's MCQ options while the passage/tap target says something else).
function findLiteralWord(text) {
  const m = /target word "([^"]+)"/.exec(text || "");
  return m ? m[1].toLowerCase() : null;
}

function pickDistinct(arr, n, exclude) {
  return arr.filter((w) => w !== exclude).sort(() => Math.random() - 0.5).slice(0, n);
}

// The real frontend always sends the full passage text alongside the target
// word (see submitAnswer/startWord's opening message and the transfer-test
// call in src/App.jsx), so it's recoverable from the message history on
// every turn -- this lets the generic fallback below quote real passage
// content instead of inventing anything.
function extractPassageText(allMsgs) {
  const m =
    /Passage: "([\s\S]*?)"\n\nStart coaching/.exec(allMsgs) ||
    /Original passage: "([\s\S]*?)"\n\nTarget word/.exec(allMsgs) ||
    /Passage: "([\s\S]*?)"/.exec(allMsgs);
  return m ? m[1] : "";
}

function getSentenceContaining(text, word) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || (text ? [text] : []);
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return sentences.find((s) => re.test(s)) || text;
}

const STOPWORDS = new Set(["about", "after", "again", "their", "there", "these", "those", "which", "while", "would", "could", "should", "because", "before", "between", "through", "though", "where", "when", "what", "were", "being", "doing", "having", "other", "really", "still", "every", "never", "always", "something", "someone", "anything", "around", "across", "toward", "towards", "during", "without", "within", "under", "above", "below", "first", "second", "third", "little", "great", "large", "quite"]);

// Real words (5+ letters, not a stopword) that literally appear in a pasted
// passage -- used so the Level Maker mock never picks a word the student
// can't actually tap in their own text.
function extractRealWords(text) {
  const seen = new Set();
  const out = [];
  for (const raw of text.match(/[A-Za-z]{5,}/g) || []) {
    const w = raw.toLowerCase();
    if (STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

/* ---------------- /api/claude mock ---------------- */
function mockClaude(system, messages) {
  const allMsgs = (messages || []).map((m) => m.content).join("\n");
  const lastMsg = (messages && messages[messages.length - 1] && messages[messages.length - 1].content) || "";

  // Diagnostic engine — reads the REAL log the client sends, so this is
  // a genuine (if simple) analysis of real data, not scripted content.
  if (system.startsWith("You are the G.I.S.T. diagnostic engine")) {
    const logMatch = /Log \(chronological, oldest first\):\n(\[[\s\S]*?\])\n\nWhole-passage/.exec(allMsgs);
    let log = [];
    try { log = logMatch ? JSON.parse(logMatch[1]) : []; } catch (e) { log = []; }
    const solved = log.filter((e) => !e.skipped);
    const struggled = solved.filter((e) => (e.hintsUsed || 0) > 0 || (e.finalStage || 0) >= 4);
    const easy = solved.filter((e) => (e.hintsUsed || 0) === 0 && (e.finalStage || 0) < 4);
    const compMatch = /"correct":\s*(true|false|null)/.exec(allMsgs.split("Whole-passage comprehension check:")[1] || "");
    const compCorrect = compMatch ? compMatch[1] : "null";
    return {
      summary: struggled.length
        ? `Solid grasp of most words; ${struggled.length} needed extra support and should be revisited.`
        : "Strong session — every word resolved independently with no real struggle.",
      corePattern:
        `**${easy.length} of ${solved.length} words resolved quickly and independently.**\n\n` +
        (easy.length ? `- ${easy.map((e) => `"${e.word}"`).join(", ")} resolved with no hints needed.\n` : "") +
        (struggled.length ? `- ${struggled.map((e) => `"${e.word}"`).join(", ")} needed more support — worth a quick revisit.\n` : "") +
        `- ${log.filter((e) => e.skipped).length} word(s) skipped this session.`,
      howReliable:
        `**Answers were generally well-paced.**\n\n- ${log.filter((e) => e.answeredAtFloor).length} answer(s) landed right at the pacing floor, a possible guess.\n- ${log.length - log.filter((e) => e.answeredAtFloor).length} answer(s) took a realistic reading time.`,
      storyUnderstandingNote:
        compCorrect === "true" ? "Passed the whole-passage comprehension check on the first try." :
        compCorrect === "false" ? "Missed the whole-passage comprehension check — worth checking they followed the story, not just the words." :
        "No comprehension check ran this session.",
      whatToTry:
        struggled.length
          ? `**Revisit ${struggled.map((e) => `"${e.word}"`).join(", ")} in a new sentence next lesson.**\n\n- Ask the student to use it out loud before writing it down.\n- Pair it with a concrete example from their own life.`
          : "**Keep going at this pace — try a slightly harder passage next.**\n\n- This student is ready for less scaffolding.",
    };
  }

  // Transfer test -- only reachable for a word that was just coached, so
  // the literal word is always present; for a custom Level Maker word with
  // no curated dictionary entry, borrow another word's meaning/distractor
  // shape (self-consistent MCQ, just not a real definition) rather than
  // fail this rare, low-stakes secondary check.
  if (system.startsWith("A Malaysian primary school ESL student just worked out a vocabulary word")) {
    const word = findLiteralWord(allMsgs) || KNOWN_WORDS[Math.floor(Math.random() * KNOWN_WORDS.length)];
    const w = WORDS[word] || WORDS[KNOWN_WORDS[Math.floor(Math.random() * KNOWN_WORDS.length)]];
    const distractors = pickDistinct(w.distractors, 3, null);
    const options = [w.meaning, ...distractors].sort(() => Math.random() - 0.5);
    return {
      sentence: `Even in a totally different situation, everyone agreed the word "${word}" fit perfectly here too.`,
      options,
      correctAnswer: w.meaning,
    };
  }

  // Comprehension check
  if (system.startsWith("A Malaysian primary school ESL student just finished working through 5 vocabulary words")) {
    const found = COMPREHENSION_BY_PASSAGE.find((c) => allMsgs.includes(c.match)) || COMPREHENSION_BY_PASSAGE[0];
    return { question: found.question, options: found.options, correctAnswer: found.correctAnswer };
  }

  // Single-word regen (Level Maker "swap this word") -- same "must actually
  // be in the passage" requirement as the Level Maker itself (the client
  // double-checks this with makerText.includes(parsed.word), see
  // src/App.jsx's regenerateWord, and silently no-ops the swap if it fails).
  if (system.startsWith("You help a teacher fix one word in a G.I.S.T. map")) {
    const passageText = extractPassageText(allMsgs) || allMsgs;
    const alreadyChosenMatch = /Already chosen words \(don't repeat these\): (.*)/.exec(allMsgs);
    const alreadyChosen = new Set((alreadyChosenMatch ? alreadyChosenMatch[1].split(",") : []).map((w) => w.trim().toLowerCase()));
    const realWords = extractRealWords(passageText).filter((w) => !alreadyChosen.has(w));
    const knownInPassage = realWords.filter((w) => KNOWN_WORDS.includes(w));
    const word = knownInPassage[0] || realWords[0] || KNOWN_WORDS[Math.floor(Math.random() * KNOWN_WORDS.length)];
    return { word, clueType: "inference", concreteness: "abstract" };
  }

  // Level Maker — picks words that actually appear in the pasted passage
  // (required: the real app's word-tap targets are matched against the
  // literal passage text, see tilesMatchWord/optionInSentence in
  // src/App.jsx, so a word absent from the text can never be tapped).
  // Prefers the 20 curated words when the teacher's passage happens to
  // include any of them (richest coaching content), then fills any
  // remaining slots with other real words pulled straight from the text.
  if (system.startsWith("You help a teacher turn their own reading passage")) {
    const passageText = extractPassageText(allMsgs) || allMsgs;
    const realWords = extractRealWords(passageText);
    const realWordSet = new Set(realWords);
    const knownInPassage = KNOWN_WORDS.filter((w) => realWordSet.has(w));
    const otherRealWords = realWords.filter((w) => !KNOWN_WORDS.includes(w));
    const chosen = [...pickDistinct(knownInPassage, 5, null)];
    if (chosen.length < 5) chosen.push(...pickDistinct(otherRealWords, 5 - chosen.length, null));
    // Passage genuinely too short/repetitive for 5 distinct real words --
    // extremely unlikely once the app's own "80-150 words" guidance is
    // followed, but fall back to curated words rather than return fewer
    // than 5 (the real app always expects exactly SESSION_WORD_COUNT).
    if (chosen.length < 5) chosen.push(...pickDistinct(KNOWN_WORDS, 5 - chosen.length, null));
    const picks = chosen.slice(0, 5).map((word) => ({ word, clueType: "inference", concreteness: "abstract" }));
    return {
      emoji: "📘",
      mission: "A new adventure awaits! Learn these 5 words to complete the story.",
      arrival: "You did it! Every word learned, story complete.",
      readabilityLevel: "about_right",
      readabilityNote: "Sentence length and vocabulary look appropriate for Year 4-6 ESL learners.",
      words: picks,
    };
  }

  // Coach — the core loop. Uses the "[FACT: this answer is ...]" tag the
  // real frontend already includes in the student's message (see
  // buildCoachSystemPrompt's CORRECTNESS section) to know the verdict
  // without needing any real language understanding.
  if (system.includes("Help a Malaysian primary school ESL student (age 9-12) work out ONE target vocabulary word")) {
    // Always coach the LITERAL requested word, never a swapped-in unrelated
    // one -- a mismatch here would show MCQ content for a different word
    // than the one actually tapped in the passage, which is far more
    // confusing than the generic-but-honest fallback below.
    const word = findLiteralWord(allMsgs) || KNOWN_WORDS[Math.floor(Math.random() * KNOWN_WORDS.length)];
    const w = WORDS[word];
    const isFirstTurn = messages.length <= 1;
    // Real tag has trailing text before the closing bracket (see
    // submitAnswer in src/App.jsx: "...CORRECT. Trust this, don't
    // re-judge..."), so match the prefix only, not the full bracket.
    const wasCorrect = /\[FACT: this answer is CORRECT\./.test(lastMsg);
    const wasIncorrect = /\[FACT: this answer is INCORRECT\./.test(lastMsg);

    // A word from a custom Level Maker passage that isn't one of the 20
    // curated ones -- no hand-written meaning/distractors exist for it, so
    // fall back to a "text" exchange grounded in the real sentence pulled
    // from the passage, rather than either crashing or silently coaching
    // the wrong word.
    if (!w) {
      const passageText = extractPassageText(allMsgs);
      const sentence = getSentenceContaining(passageText, word).trim() || `The passage uses "${word}" somewhere in the story.`;
      const missingWordFact = /\[FACT: the answer does not contain the target word/.test(lastMsg);
      if (isFirstTurn) {
        return {
          message: `Let's work out what "${word}" means. Read this part carefully, then explain what you think it means in your own words.`,
          display_sentence: sentence,
          input_type: "text",
          options: null,
          word_tiles: null,
          correct_answer: null,
          sentence_starter: null,
          stage: 1,
          grading_reasoning: null,
          hint_given: false,
          resolved: false,
          fun_fact: null,
        };
      }
      if (missingWordFact) {
        return {
          message: `Good try! Can you use the actual word "${word}" somewhere in your explanation this time?`,
          display_sentence: sentence,
          input_type: "text",
          options: null,
          word_tiles: null,
          correct_answer: null,
          sentence_starter: null,
          stage: 1,
          grading_reasoning: null,
          hint_given: true,
          resolved: false,
          fun_fact: null,
        };
      }
      // No curated dictionary entry to grade against -- accept any genuine
      // attempt that actually used the target word.
      return {
        message: `Nice thinking! That's a fair way to describe "${word}" based on how it's used here.`,
        display_sentence: sentence,
        input_type: "text",
        options: null,
        word_tiles: null,
        correct_answer: null,
        sentence_starter: null,
        stage: 2,
        grading_reasoning: null,
        hint_given: false,
        resolved: true,
        fun_fact: null,
      };
    }

    if (isFirstTurn) {
      const distractors = pickDistinct(w.distractors, 3, null);
      const options = [w.meaning, ...distractors].sort(() => Math.random() - 0.5);
      return {
        message: `Let's figure out what "${word}" means here! Pick the best answer.`,
        display_sentence: `The passage uses "${word}" — read the sentence carefully.`,
        input_type: "mcq",
        options,
        word_tiles: null,
        correct_answer: w.meaning,
        sentence_starter: null,
        stage: 1,
        grading_reasoning: null,
        hint_given: false,
        resolved: false,
        fun_fact: null,
      };
    }

    if (wasCorrect) {
      // Stage reflects whether a hint was needed earlier in THIS word's
      // exchange, not a fixed number -- the diagnostic engine (below)
      // classifies "struggled" words by finalStage>=4 || hintsUsed>0, so a
      // hardcoded stage here would silently contradict the At A Glance
      // panel, which reads hintsUsed straight from the real client-side log.
      const neededHint = /Not quite!/.test(allMsgs);
      return {
        message: `Nice work, you've got it! "${word}" really does mean ${w.meaning.toLowerCase()}.`,
        display_sentence: `The passage uses "${word}" — read the sentence carefully.`,
        input_type: "mcq",
        options: [w.meaning, ...pickDistinct(w.distractors, 3, null)],
        word_tiles: null,
        correct_answer: w.meaning,
        sentence_starter: null,
        stage: neededHint ? 2 : 1,
        grading_reasoning: null,
        hint_given: false,
        resolved: true,
        fun_fact: "Great context-clue reading!",
      };
    }

    // Wrong (or unrecognized) answer — give the real hint, stay at Stage 1.
    const distractors = pickDistinct(w.distractors, 3, null);
    const options = [w.meaning, ...distractors].sort(() => Math.random() - 0.5);
    return {
      message: `Not quite! ${w.hint}`,
      display_sentence: `The passage uses "${word}" — read the sentence carefully.`,
      input_type: "mcq",
      options,
      word_tiles: null,
      correct_answer: w.meaning,
      sentence_starter: null,
      stage: 1,
      grading_reasoning: null,
      hint_given: true,
      resolved: false,
      fun_fact: null,
    };
  }

  return { message: "OK", display_sentence: "OK", input_type: "text", options: null, word_tiles: null, correct_answer: null, sentence_starter: null, stage: 1, hint_given: false, resolved: true, fun_fact: null };
}

/* ---------------- in-memory "database" ---------------- */
let nextStudentId = 1;
let nextSessionId = 1;
const students = []; // { id, fullName, fullNameKey, secret, avatarConfig, label }
const sessions = []; // { id, studentId, passageTitle, passageEmoji, startedAt, finishedAt, comprehensionResult, diagnosticReport, log }
let quotaUsedToday = 0;

const app = express();
app.use(express.json({ limit: "2mb" }));

app.post("/api/auth", (req, res) => {
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!code) return res.status(400).json({ error: "Missing access code" });
  const exp = Date.now() + TOKEN_TTL_MINUTES * 60_000;
  const token = signToken({ kind: "teacher", label: code.toUpperCase(), exp }, SECRET);
  return res.status(200).json({ token, expiresAt: exp, dailyLimit: 999999 });
});

app.post("/api/claude", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(token, SECRET);
  if (!claims) return res.status(401).json({ error: "Missing or expired access token", tokenInvalid: true });
  quotaUsedToday += 1;
  const reply = mockClaude(req.body.system || "", req.body.messages || []);
  return res.status(200).json({
    content: [{ type: "text", text: JSON.stringify(reply) }],
    quota: { used: quotaUsedToday, limit: 999999, remaining: 999999 - quotaUsedToday, exceeded: false },
  });
});

app.post("/api/student-auth", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const teacherToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(teacherToken, SECRET);
  if (!claims) return res.status(401).json({ error: "Missing or expired access token", tokenInvalid: true });

  const { mode, fullName, secret, avatarConfig, studentId } = req.body || {};
  const nameKey = (fullName || "").trim().toLowerCase();

  if (mode === "signup") {
    if (students.some((s) => s.label === claims.label && s.fullNameKey === nameKey)) {
      return res.status(409).json({ error: "That name is already registered. Try Returning Student instead." });
    }
    const student = { id: String(nextStudentId++), fullName: fullName.trim(), fullNameKey: nameKey, secret, avatarConfig, label: claims.label, createdAt: new Date().toISOString(), lastLoginAt: null };
    students.push(student);
    const exp = Date.now() + TOKEN_TTL_MINUTES * 60_000;
    const stToken = signToken({ kind: "student", studentId: student.id, label: claims.label, exp }, SECRET);
    return res.status(200).json({ token: stToken, expiresAt: exp, student: { id: student.id, fullName: student.fullName, avatarConfig: student.avatarConfig } });
  }

  if (mode === "login") {
    const student = students.find((s) => s.label === claims.label && s.fullNameKey === nameKey);
    if (!student || JSON.stringify(student.secret) !== JSON.stringify(secret)) {
      return res.status(401).json({ error: "Name or secret animals not recognized. Ask your teacher, or sign up as a new student." });
    }
    student.lastLoginAt = new Date().toISOString();
    const exp = Date.now() + TOKEN_TTL_MINUTES * 60_000;
    const stToken = signToken({ kind: "student", studentId: student.id, label: claims.label, exp }, SECRET);
    return res.status(200).json({ token: stToken, expiresAt: exp, student: { id: student.id, fullName: student.fullName, avatarConfig: student.avatarConfig } });
  }

  if (mode === "reset") {
    const student = students.find((s) => s.id === studentId && s.label === claims.label);
    if (!student) return res.status(404).json({ error: "Student not found" });
    student.secret = secret;
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Invalid mode" });
});

app.post("/api/session", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(token, SECRET);
  if (!claims || claims.kind !== "student") return res.status(403).json({ error: "Only a student session can save progress" });
  const { passageTitle, passageEmoji, startedAt, finishedAt, comprehensionResult, log } = req.body || {};
  const session = { id: String(nextSessionId++), studentId: claims.studentId, passageTitle, passageEmoji, startedAt, finishedAt, comprehensionResult, diagnosticReport: null, log, teacherNotes: null };
  sessions.push(session);
  return res.status(200).json({ ok: true, sessionId: session.id });
});

app.get("/api/session", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(token, SECRET);
  if (!claims || claims.kind === "student") return res.status(403).json({ error: "Teacher access required" });
  const session = sessions.find((s) => s.id === req.query.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const student = students.find((s) => s.id === session.studentId);
  return res.status(200).json({
    session: { id: session.id, studentId: session.studentId, studentName: student?.fullName || "Student", passageTitle: session.passageTitle, passageEmoji: session.passageEmoji, startedAt: session.startedAt, finishedAt: session.finishedAt, comprehensionResult: session.comprehensionResult, diagnosticReport: session.diagnosticReport, teacherNotes: session.teacherNotes },
    log: session.log || [],
  });
});

app.patch("/api/session", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(token, SECRET);
  if (!claims || claims.kind === "student") return res.status(403).json({ error: "Teacher access required" });
  const session = sessions.find((s) => s.id === req.body.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  session.diagnosticReport = req.body.diagnosticReport;
  return res.status(200).json({ ok: true });
});

app.delete("/api/session", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(token, SECRET);
  if (!claims || claims.kind === "student") return res.status(403).json({ error: "Teacher access required" });
  const idx = sessions.findIndex((s) => s.id === req.query.sessionId);
  if (idx === -1) return res.status(404).json({ error: "Session not found" });
  sessions.splice(idx, 1);
  return res.status(200).json({ ok: true });
});

app.get("/api/teacher-roster", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(token, SECRET);
  if (!claims || claims.kind === "student") return res.status(401).json({ error: "Missing or expired access token", tokenInvalid: true });

  const studentId = req.query.studentId;
  if (studentId) {
    const student = students.find((s) => s.id === studentId && s.label === claims.label);
    if (!student) return res.status(404).json({ error: "Student not found" });
    const studentSessions = sessions.filter((s) => s.studentId === studentId);
    return res.status(200).json({
      student: { id: student.id, fullName: student.fullName },
      sessions: studentSessions.map((s) => ({ id: s.id, passageTitle: s.passageTitle, passageEmoji: s.passageEmoji, startedAt: s.startedAt, finishedAt: s.finishedAt, wordCount: (s.log || []).length, comprehensionCorrect: s.comprehensionResult?.correct ?? null })),
    });
  }

  const roster = students.filter((s) => s.label === claims.label).map((s) => {
    const studentSessions = sessions.filter((sess) => sess.studentId === s.id);
    const lastSessionAt = studentSessions.reduce((latest, sess) => (!latest || sess.finishedAt > latest ? sess.finishedAt : latest), null);
    return { id: s.id, fullName: s.fullName, createdAt: s.createdAt, lastLoginAt: s.lastLoginAt, sessionCount: studentSessions.length, lastSessionAt };
  });
  return res.status(200).json({ students: roster });
});

app.delete("/api/teacher-roster", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(token, SECRET);
  if (!claims || claims.kind === "student") return res.status(401).json({ error: "Missing or expired access token", tokenInvalid: true });
  const idx = students.findIndex((s) => s.id === req.query.studentId && s.label === claims.label);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });
  students.splice(idx, 1);
  for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i].studentId === req.query.studentId) sessions.splice(i, 1);
  return res.status(200).json({ ok: true });
});

app.use(express.static(distDir));
app.get("*", (req, res) => res.sendFile(path.join(distDir, "index.html")));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`G.I.S.T. local demo server (no Groq, no Supabase, no quota) running at http://localhost:${port}`);
  console.log(`Enter ANY access code on the gate screen — it always works.`);
});
