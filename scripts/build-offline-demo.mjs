// Builds a SINGLE self-contained HTML file: the real production frontend
// (dist/assets/*.js + *.css, byte-for-byte what `npm run build` produces)
// inlined alongside a browser-side mock backend that patches window.fetch
// before the app boots. No Node, no npm install, no terminal, no server --
// just double-click the output file and open it in a browser.
//
// This is a straight port of scripts/local-demo-server.mjs's mock logic
// (same word content, same endpoint shapes) from Express route handlers to
// a fetch() interceptor, since there's no server process here to route
// requests through. Keep the two in sync if the mock logic changes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const assetsDir = path.join(distDir, "assets");

const jsFile = fs.readdirSync(assetsDir).find((f) => f.endsWith(".js"));
const cssFile = fs.readdirSync(assetsDir).find((f) => f.endsWith(".css"));
if (!jsFile || !cssFile) {
  console.error("Couldn't find built assets in dist/assets -- run `npm run build` first.");
  process.exit(1);
}
const appJs = fs.readFileSync(path.join(assetsDir, jsFile), "utf8");
const appCss = fs.readFileSync(path.join(assetsDir, cssFile), "utf8");

// ---------------------------------------------------------------------
// Mock bootstrap script, as a plain string (this runs in the browser, not
// in this Node build script) -- ported from scripts/local-demo-server.mjs.
// ---------------------------------------------------------------------
const mockScript = String.raw`
(function () {
  var TOKEN_TTL_MINUTES = 720;

  function makeToken(payload) {
    var full = Object.assign({}, payload, { exp: Date.now() + TOKEN_TTL_MINUTES * 60000 });
    return btoa(unescape(encodeURIComponent(JSON.stringify(full))));
  }
  function readToken(token) {
    if (typeof token !== "string") return null;
    try {
      var payload = JSON.parse(decodeURIComponent(escape(atob(token))));
      if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
      return payload;
    } catch (e) { return null; }
  }

  /* ---------------- Word content: the app's 4 real built-in passages ---------------- */
  var WORDS = {
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
    tiny: { meaning: "Very small", distractors: ["Very large", "Very loud", "Very old"], hint: "The passage compares the computer's size to your hand." }
  };
  var KNOWN_WORDS = Object.keys(WORDS);

  var COMPREHENSION_BY_PASSAGE = [
    { match: "Mei Ling", question: "Why was the little brother reluctant to walk into the forest at first?", options: ["He was scared and didn't want to go", "He was too tired to walk", "He didn't like his mother", "He wanted to go home"], correctAnswer: "He was scared and didn't want to go" },
    { match: "Aiman's village", question: "Why does Aiman's village have a festival?", options: ["To celebrate the harvest", "To welcome new students", "To open a new market", "To say goodbye to summer"], correctAnswer: "To celebrate the harvest" },
    { match: "Pet Show", question: "What is special about Ali's dog?", options: ["It can open doors by itself", "It can talk", "It can swim very fast", "It changes color"], correctAnswer: "It can open doors by itself" },
    { match: "robot show", question: "What can the robot do besides lifting heavy boxes?", options: ["Dance and sing songs", "Cook food", "Fly in the sky", "Read books aloud"], correctAnswer: "Dance and sing songs" }
  ];

  function findLiteralWord(text) {
    var m = /target word "([^"]+)"/.exec(text || "");
    return m ? m[1].toLowerCase() : null;
  }
  function pickDistinct(arr, n, exclude) {
    return arr.filter(function (w) { return w !== exclude; }).sort(function () { return Math.random() - 0.5; }).slice(0, n);
  }
  function extractPassageText(allMsgs) {
    var m = /Passage: "([\s\S]*?)"\n\nStart coaching/.exec(allMsgs) ||
      /Original passage: "([\s\S]*?)"\n\nTarget word/.exec(allMsgs) ||
      /Passage: "([\s\S]*?)"/.exec(allMsgs);
    return m ? m[1] : "";
  }
  function getSentenceContaining(text, word) {
    var sentences = text.match(/[^.!?]+[.!?]+/g) || (text ? [text] : []);
    var re = new RegExp("\\b" + word.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    for (var i = 0; i < sentences.length; i++) if (re.test(sentences[i])) return sentences[i];
    return text;
  }
  var STOPWORDS = {};
  ["about", "after", "again", "their", "there", "these", "those", "which", "while", "would", "could", "should", "because", "before", "between", "through", "though", "where", "when", "what", "were", "being", "doing", "having", "other", "really", "still", "every", "never", "always", "something", "someone", "anything", "around", "across", "toward", "towards", "during", "without", "within", "under", "above", "below", "first", "second", "third", "little", "great", "large", "quite"].forEach(function (w) { STOPWORDS[w] = true; });
  function extractRealWords(text) {
    var seen = {}, out = [];
    var matches = text.match(/[A-Za-z]{5,}/g) || [];
    for (var i = 0; i < matches.length; i++) {
      var w = matches[i].toLowerCase();
      if (STOPWORDS[w] || seen[w]) continue;
      seen[w] = true;
      out.push(w);
    }
    return out;
  }

  function mockClaude(system, messages) {
    var allMsgs = (messages || []).map(function (m) { return m.content; }).join("\n");
    var lastMsg = (messages && messages[messages.length - 1] && messages[messages.length - 1].content) || "";

    if (system.indexOf("You are the G.I.S.T. diagnostic engine") === 0) {
      var logMatch = /Log \(chronological, oldest first\):\n(\[[\s\S]*?\])\n\nWhole-passage/.exec(allMsgs);
      var log = [];
      try { log = logMatch ? JSON.parse(logMatch[1]) : []; } catch (e) { log = []; }
      var solved = log.filter(function (e) { return !e.skipped; });
      var struggled = solved.filter(function (e) { return (e.hintsUsed || 0) > 0 || (e.finalStage || 0) >= 4; });
      var easy = solved.filter(function (e) { return (e.hintsUsed || 0) === 0 && (e.finalStage || 0) < 4; });
      var compSplit = allMsgs.split("Whole-passage comprehension check:")[1] || "";
      var compMatch = /"correct":\s*(true|false|null)/.exec(compSplit);
      var compCorrect = compMatch ? compMatch[1] : "null";
      return {
        summary: struggled.length
          ? "Solid grasp of most words; " + struggled.length + " needed extra support and should be revisited."
          : "Strong session — every word resolved independently with no real struggle.",
        corePattern:
          "**" + easy.length + " of " + solved.length + " words resolved quickly and independently.**\n\n" +
          (easy.length ? "- " + easy.map(function (e) { return '"' + e.word + '"'; }).join(", ") + " resolved with no hints needed.\n" : "") +
          (struggled.length ? "- " + struggled.map(function (e) { return '"' + e.word + '"'; }).join(", ") + " needed more support — worth a quick revisit.\n" : "") +
          "- " + log.filter(function (e) { return e.skipped; }).length + " word(s) skipped this session.",
        howReliable:
          "**Answers were generally well-paced.**\n\n- " + log.filter(function (e) { return e.answeredAtFloor; }).length + " answer(s) landed right at the pacing floor, a possible guess.\n- " + (log.length - log.filter(function (e) { return e.answeredAtFloor; }).length) + " answer(s) took a realistic reading time.",
        storyUnderstandingNote:
          compCorrect === "true" ? "Passed the whole-passage comprehension check on the first try." :
          compCorrect === "false" ? "Missed the whole-passage comprehension check — worth checking they followed the story, not just the words." :
          "No comprehension check ran this session.",
        whatToTry:
          struggled.length
            ? "**Revisit " + struggled.map(function (e) { return '"' + e.word + '"'; }).join(", ") + " in a new sentence next lesson.**\n\n- Ask the student to use it out loud before writing it down.\n- Pair it with a concrete example from their own life."
            : "**Keep going at this pace — try a slightly harder passage next.**\n\n- This student is ready for less scaffolding."
      };
    }

    if (system.indexOf("A Malaysian primary school ESL student just worked out a vocabulary word") === 0) {
      var word = findLiteralWord(allMsgs) || KNOWN_WORDS[Math.floor(Math.random() * KNOWN_WORDS.length)];
      var w = WORDS[word] || WORDS[KNOWN_WORDS[Math.floor(Math.random() * KNOWN_WORDS.length)]];
      var distractors = pickDistinct(w.distractors, 3, null);
      var options = [w.meaning].concat(distractors).sort(function () { return Math.random() - 0.5; });
      return {
        sentence: 'Even in a totally different situation, everyone agreed the word "' + word + '" fit perfectly here too.',
        options: options,
        correctAnswer: w.meaning
      };
    }

    if (system.indexOf("A Malaysian primary school ESL student just finished working through 5 vocabulary words") === 0) {
      var found = null;
      for (var ci = 0; ci < COMPREHENSION_BY_PASSAGE.length; ci++) {
        if (allMsgs.indexOf(COMPREHENSION_BY_PASSAGE[ci].match) !== -1) { found = COMPREHENSION_BY_PASSAGE[ci]; break; }
      }
      found = found || COMPREHENSION_BY_PASSAGE[0];
      return { question: found.question, options: found.options, correctAnswer: found.correctAnswer };
    }

    if (system.indexOf("You help a teacher fix one word in a G.I.S.T. map") === 0) {
      var passageText1 = extractPassageText(allMsgs) || allMsgs;
      var alreadyChosenMatch = /Already chosen words \(don't repeat these\): (.*)/.exec(allMsgs);
      var alreadyChosen = {};
      (alreadyChosenMatch ? alreadyChosenMatch[1].split(",") : []).forEach(function (w2) { alreadyChosen[w2.trim().toLowerCase()] = true; });
      var realWords1 = extractRealWords(passageText1).filter(function (w2) { return !alreadyChosen[w2]; });
      var knownInPassage1 = realWords1.filter(function (w2) { return KNOWN_WORDS.indexOf(w2) !== -1; });
      var pickedWord = knownInPassage1[0] || realWords1[0] || KNOWN_WORDS[Math.floor(Math.random() * KNOWN_WORDS.length)];
      return { word: pickedWord, clueType: "inference", concreteness: "abstract" };
    }

    if (system.indexOf("You help a teacher turn their own reading passage") === 0) {
      var passageText2 = extractPassageText(allMsgs) || allMsgs;
      var realWords2 = extractRealWords(passageText2);
      var realWordSet = {};
      realWords2.forEach(function (w2) { realWordSet[w2] = true; });
      var knownInPassage2 = KNOWN_WORDS.filter(function (w2) { return realWordSet[w2]; });
      var otherRealWords = realWords2.filter(function (w2) { return KNOWN_WORDS.indexOf(w2) === -1; });
      var chosen = pickDistinct(knownInPassage2, 5, null);
      if (chosen.length < 5) chosen = chosen.concat(pickDistinct(otherRealWords, 5 - chosen.length, null));
      if (chosen.length < 5) chosen = chosen.concat(pickDistinct(KNOWN_WORDS, 5 - chosen.length, null));
      var picks = chosen.slice(0, 5).map(function (w2) { return { word: w2, clueType: "inference", concreteness: "abstract" }; });
      return {
        emoji: "📘",
        mission: "A new adventure awaits! Learn these 5 words to complete the story.",
        arrival: "You did it! Every word learned, story complete.",
        readabilityLevel: "about_right",
        readabilityNote: "Sentence length and vocabulary look appropriate for Year 4-6 ESL learners.",
        words: picks
      };
    }

    if (system.indexOf("Help a Malaysian primary school ESL student (age 9-12) work out ONE target vocabulary word") !== -1) {
      var word2 = findLiteralWord(allMsgs) || KNOWN_WORDS[Math.floor(Math.random() * KNOWN_WORDS.length)];
      var w2 = WORDS[word2];
      var isFirstTurn = messages.length <= 1;
      var wasCorrect = /\[FACT: this answer is CORRECT\./.test(lastMsg);

      if (!w2) {
        var passageText3 = extractPassageText(allMsgs);
        var sentence = getSentenceContaining(passageText3, word2);
        sentence = sentence ? sentence.trim() : "";
        if (!sentence) sentence = 'The passage uses "' + word2 + '" somewhere in the story.';
        var missingWordFact = /\[FACT: the answer does not contain the target word/.test(lastMsg);
        if (isFirstTurn) {
          return { message: "Let's work out what \"" + word2 + "\" means. Read this part carefully, then explain what you think it means in your own words.", display_sentence: sentence, input_type: "text", options: null, word_tiles: null, correct_answer: null, sentence_starter: null, stage: 1, grading_reasoning: null, hint_given: false, resolved: false, fun_fact: null };
        }
        if (missingWordFact) {
          return { message: 'Good try! Can you use the actual word "' + word2 + '" somewhere in your explanation this time?', display_sentence: sentence, input_type: "text", options: null, word_tiles: null, correct_answer: null, sentence_starter: null, stage: 1, grading_reasoning: null, hint_given: true, resolved: false, fun_fact: null };
        }
        return { message: "Nice thinking! That's a fair way to describe \"" + word2 + "\" based on how it's used here.", display_sentence: sentence, input_type: "text", options: null, word_tiles: null, correct_answer: null, sentence_starter: null, stage: 2, grading_reasoning: null, hint_given: false, resolved: true, fun_fact: null };
      }

      if (isFirstTurn) {
        var distractors2 = pickDistinct(w2.distractors, 3, null);
        var options2 = [w2.meaning].concat(distractors2).sort(function () { return Math.random() - 0.5; });
        return { message: "Let's figure out what \"" + word2 + "\" means here! Pick the best answer.", display_sentence: "The passage uses \"" + word2 + "\" — read the sentence carefully.", input_type: "mcq", options: options2, word_tiles: null, correct_answer: w2.meaning, sentence_starter: null, stage: 1, grading_reasoning: null, hint_given: false, resolved: false, fun_fact: null };
      }

      if (wasCorrect) {
        var neededHint = /Not quite!/.test(allMsgs);
        return { message: "Nice work, you've got it! \"" + word2 + "\" really does mean " + w2.meaning.toLowerCase() + ".", display_sentence: "The passage uses \"" + word2 + "\" — read the sentence carefully.", input_type: "mcq", options: [w2.meaning].concat(pickDistinct(w2.distractors, 3, null)), word_tiles: null, correct_answer: w2.meaning, sentence_starter: null, stage: neededHint ? 2 : 1, grading_reasoning: null, hint_given: false, resolved: true, fun_fact: "Great context-clue reading!" };
      }

      var distractors3 = pickDistinct(w2.distractors, 3, null);
      var options3 = [w2.meaning].concat(distractors3).sort(function () { return Math.random() - 0.5; });
      return { message: "Not quite! " + w2.hint, display_sentence: 'The passage uses "' + word2 + '" — read the sentence carefully.', input_type: "mcq", options: options3, word_tiles: null, correct_answer: w2.meaning, sentence_starter: null, stage: 1, grading_reasoning: null, hint_given: true, resolved: false, fun_fact: null };
    }

    return { message: "OK", display_sentence: "OK", input_type: "text", options: null, word_tiles: null, correct_answer: null, sentence_starter: null, stage: 1, hint_given: false, resolved: true, fun_fact: null };
  }

  /* ---------------- in-memory "database" (resets on page reload) ---------------- */
  var nextStudentId = 1, nextSessionId = 1;
  var students = [];
  var sessions = [];
  var quotaUsedToday = 0;

  function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), { status: status, headers: { "Content-Type": "application/json" } });
  }
  function getClaims(headersInit) {
    var headers = new Headers(headersInit || {});
    var auth = headers.get("authorization") || headers.get("Authorization") || "";
    var token = auth.indexOf("Bearer ") === 0 ? auth.slice(7) : null;
    return readToken(token);
  }

  var realFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var urlStr = typeof input === "string" ? input : (input && input.url) || "";
    var method = ((init && init.method) || (input && typeof input !== "string" && input.method) || "GET").toUpperCase();
    var u;
    try { u = new URL(urlStr, location.href); } catch (e) { return realFetch(input, init); }
    if (u.pathname.indexOf("/api/") !== 0) return realFetch(input, init);

    var headersInit = (init && init.headers) || (input && typeof input !== "string" && input.headers) || {};
    var bodyRaw = (init && init.body) || null;
    var body = {};
    try { body = bodyRaw ? JSON.parse(bodyRaw) : {}; } catch (e) {}

    return new Promise(function (resolve) {
      // Tiny artificial delay so loading states are visible, same as a real network call.
      setTimeout(function () {
        var pathname = u.pathname;

        if (pathname === "/api/auth" && method === "POST") {
          var code = typeof body.code === "string" ? body.code.trim() : "";
          if (!code) { resolve(jsonResponse(400, { error: "Missing access code" })); return; }
          var token = makeToken({ kind: "teacher", label: code.toUpperCase() });
          var claims0 = readToken(token);
          resolve(jsonResponse(200, { token: token, expiresAt: claims0.exp, dailyLimit: 999999 }));
          return;
        }

        if (pathname === "/api/claude" && method === "POST") {
          var claims1 = getClaims(headersInit);
          if (!claims1) { resolve(jsonResponse(401, { error: "Missing or expired access token", tokenInvalid: true })); return; }
          quotaUsedToday += 1;
          var reply = mockClaude(body.system || "", body.messages || []);
          resolve(jsonResponse(200, { content: [{ type: "text", text: JSON.stringify(reply) }], quota: { used: quotaUsedToday, limit: 999999, remaining: 999999 - quotaUsedToday, exceeded: false } }));
          return;
        }

        if (pathname === "/api/student-auth" && method === "POST") {
          var claims2 = getClaims(headersInit);
          if (!claims2) { resolve(jsonResponse(401, { error: "Missing or expired access token", tokenInvalid: true })); return; }
          var mode = body.mode, fullName = body.fullName, secret = body.secret, avatarConfig = body.avatarConfig, studentId = body.studentId;
          var nameKey = (fullName || "").trim().toLowerCase();
          if (mode === "signup") {
            var dup = students.some(function (s) { return s.label === claims2.label && s.fullNameKey === nameKey; });
            if (dup) { resolve(jsonResponse(409, { error: "That name is already registered. Try Returning Student instead." })); return; }
            var student = { id: String(nextStudentId++), fullName: fullName.trim(), fullNameKey: nameKey, secret: secret, avatarConfig: avatarConfig, label: claims2.label, createdAt: new Date().toISOString(), lastLoginAt: null };
            students.push(student);
            var stToken = makeToken({ kind: "student", studentId: student.id, label: claims2.label });
            var stClaims = readToken(stToken);
            resolve(jsonResponse(200, { token: stToken, expiresAt: stClaims.exp, student: { id: student.id, fullName: student.fullName, avatarConfig: student.avatarConfig } }));
            return;
          }
          if (mode === "login") {
            var found2 = students.find(function (s) { return s.label === claims2.label && s.fullNameKey === nameKey; });
            if (!found2 || JSON.stringify(found2.secret) !== JSON.stringify(secret)) { resolve(jsonResponse(401, { error: "Name or secret animals not recognized. Ask your teacher, or sign up as a new student." })); return; }
            found2.lastLoginAt = new Date().toISOString();
            var stToken2 = makeToken({ kind: "student", studentId: found2.id, label: claims2.label });
            var stClaims2 = readToken(stToken2);
            resolve(jsonResponse(200, { token: stToken2, expiresAt: stClaims2.exp, student: { id: found2.id, fullName: found2.fullName, avatarConfig: found2.avatarConfig } }));
            return;
          }
          if (mode === "reset") {
            var found3 = students.find(function (s) { return s.id === studentId && s.label === claims2.label; });
            if (!found3) { resolve(jsonResponse(404, { error: "Student not found" })); return; }
            found3.secret = secret;
            resolve(jsonResponse(200, { ok: true }));
            return;
          }
          resolve(jsonResponse(400, { error: "Invalid mode" }));
          return;
        }

        if (pathname === "/api/session" && method === "POST") {
          var claims3 = getClaims(headersInit);
          if (!claims3 || claims3.kind !== "student") { resolve(jsonResponse(403, { error: "Only a student session can save progress" })); return; }
          var session = { id: String(nextSessionId++), studentId: claims3.studentId, passageTitle: body.passageTitle, passageEmoji: body.passageEmoji, startedAt: body.startedAt, finishedAt: body.finishedAt, comprehensionResult: body.comprehensionResult, diagnosticReport: null, log: body.log, teacherNotes: null };
          sessions.push(session);
          resolve(jsonResponse(200, { ok: true, sessionId: session.id }));
          return;
        }

        if (pathname === "/api/session" && method === "GET") {
          var claims4 = getClaims(headersInit);
          if (!claims4 || claims4.kind === "student") { resolve(jsonResponse(403, { error: "Teacher access required" })); return; }
          var sessionId = u.searchParams.get("sessionId");
          var session2 = sessions.find(function (s) { return s.id === sessionId; });
          if (!session2) { resolve(jsonResponse(404, { error: "Session not found" })); return; }
          var studentForSession = students.find(function (s) { return s.id === session2.studentId; });
          resolve(jsonResponse(200, {
            session: { id: session2.id, studentId: session2.studentId, studentName: (studentForSession && studentForSession.fullName) || "Student", passageTitle: session2.passageTitle, passageEmoji: session2.passageEmoji, startedAt: session2.startedAt, finishedAt: session2.finishedAt, comprehensionResult: session2.comprehensionResult, diagnosticReport: session2.diagnosticReport, teacherNotes: session2.teacherNotes },
            log: session2.log || []
          }));
          return;
        }

        if (pathname === "/api/session" && method === "PATCH") {
          var claims5 = getClaims(headersInit);
          if (!claims5 || claims5.kind === "student") { resolve(jsonResponse(403, { error: "Teacher access required" })); return; }
          var session3 = sessions.find(function (s) { return s.id === body.sessionId; });
          if (!session3) { resolve(jsonResponse(404, { error: "Session not found" })); return; }
          session3.diagnosticReport = body.diagnosticReport;
          resolve(jsonResponse(200, { ok: true }));
          return;
        }

        if (pathname === "/api/session" && method === "DELETE") {
          var claims6 = getClaims(headersInit);
          if (!claims6 || claims6.kind === "student") { resolve(jsonResponse(403, { error: "Teacher access required" })); return; }
          var delSessionId = u.searchParams.get("sessionId");
          var idx1 = sessions.findIndex(function (s) { return s.id === delSessionId; });
          if (idx1 === -1) { resolve(jsonResponse(404, { error: "Session not found" })); return; }
          sessions.splice(idx1, 1);
          resolve(jsonResponse(200, { ok: true }));
          return;
        }

        if (pathname === "/api/teacher-roster" && method === "GET") {
          var claims7 = getClaims(headersInit);
          if (!claims7 || claims7.kind === "student") { resolve(jsonResponse(401, { error: "Missing or expired access token", tokenInvalid: true })); return; }
          var qStudentId = u.searchParams.get("studentId");
          if (qStudentId) {
            var studentDetail = students.find(function (s) { return s.id === qStudentId && s.label === claims7.label; });
            if (!studentDetail) { resolve(jsonResponse(404, { error: "Student not found" })); return; }
            var studentSessions = sessions.filter(function (s) { return s.studentId === qStudentId; });
            resolve(jsonResponse(200, {
              student: { id: studentDetail.id, fullName: studentDetail.fullName },
              sessions: studentSessions.map(function (s) { return { id: s.id, passageTitle: s.passageTitle, passageEmoji: s.passageEmoji, startedAt: s.startedAt, finishedAt: s.finishedAt, wordCount: (s.log || []).length, comprehensionCorrect: s.comprehensionResult ? (s.comprehensionResult.correct === undefined ? null : s.comprehensionResult.correct) : null }; })
            }));
            return;
          }
          var roster = students.filter(function (s) { return s.label === claims7.label; }).map(function (s) {
            var studentSessions2 = sessions.filter(function (sess) { return sess.studentId === s.id; });
            var lastSessionAt = null;
            studentSessions2.forEach(function (sess) { if (!lastSessionAt || sess.finishedAt > lastSessionAt) lastSessionAt = sess.finishedAt; });
            return { id: s.id, fullName: s.fullName, createdAt: s.createdAt, lastLoginAt: s.lastLoginAt, sessionCount: studentSessions2.length, lastSessionAt: lastSessionAt };
          });
          resolve(jsonResponse(200, { students: roster }));
          return;
        }

        if (pathname === "/api/teacher-roster" && method === "DELETE") {
          var claims8 = getClaims(headersInit);
          if (!claims8 || claims8.kind === "student") { resolve(jsonResponse(401, { error: "Missing or expired access token", tokenInvalid: true })); return; }
          var delStudentId = u.searchParams.get("studentId");
          var idx2 = students.findIndex(function (s) { return s.id === delStudentId && s.label === claims8.label; });
          if (idx2 === -1) { resolve(jsonResponse(404, { error: "Student not found" })); return; }
          students.splice(idx2, 1);
          for (var i = sessions.length - 1; i >= 0; i--) if (sessions[i].studentId === delStudentId) sessions.splice(i, 1);
          resolve(jsonResponse(200, { ok: true }));
          return;
        }

        resolve(jsonResponse(404, { error: "Not found" }));
      }, 120);
    });
  };
})();
`;

const outDir = path.join(root, "dist-offline");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "GIST-offline-demo.html");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>G.I.S.T. — Guided Inference Skill Trainer (offline demo)</title>
<style>
${appCss}
</style>
</head>
<body>
<div id="root"></div>
<script>${mockScript}</script>
<script type="module">
${appJs}
</script>
</body>
</html>
`;

fs.writeFileSync(outFile, html, "utf8");
console.log(`Built ${outFile} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
console.log("Just double-click that file (or drag it into a browser tab) -- no Node, no terminal, no install needed.");
