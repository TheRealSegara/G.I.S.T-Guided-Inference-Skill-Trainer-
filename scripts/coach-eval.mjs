// Manual regression check for the AI coach's response quality — run this
// by hand occasionally (not part of `npm run build` or any CI step: there's
// no test runner in this repo, and live-model calls are inherently
// non-deterministic, so this is a periodic health check, not a gate).
//
// Plays a few real multi-turn coaching exchanges against the actual Groq
// endpoint the app itself calls, and asserts the same content-level
// invariants added to `validateCoachResponse` in src/App.jsx: no MCQ option
// is the target word itself, word_bank/letter_connect tiles are exactly the
// target word's own letters, and tap_select/reverse_clue options are real
// words from the sentence, never hallucinated.
//
// NOTE: the prompt-building and validation logic below is intentionally a
// standalone copy of the same functions in src/App.jsx (that file is JSX,
// not something a plain Node script can import directly) — if the source
// versions change, update this file to match by hand.
//
// Usage: GROQ_API_KEY=... node scripts/coach-eval.mjs [runsPerScenario]

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const RUNS_PER_SCENARIO = Number(process.argv[2]) || 3;

if (!process.env.GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY in the environment. Set it and re-run:\n  GROQ_API_KEY=... node scripts/coach-eval.mjs");
  process.exit(1);
}

// --- Validation helpers (copy of the ones in src/App.jsx) ---

function stripInflection(s) {
  const w = String(s).toLowerCase().trim();
  return w.replace(/ies$/, "y").replace(/(es|ed|ing|ly|est|er|s)$/, "");
}
function isTargetWordMatch(candidate, targetWord) {
  if (!candidate || !targetWord) return false;
  const a = String(candidate).toLowerCase().trim();
  const b = String(targetWord).toLowerCase().trim();
  if (!a || !b) return false;
  return a === b || stripInflection(a) === stripInflection(b);
}
function tilesMatchWord(tiles, targetWord) {
  if (!Array.isArray(tiles) || !targetWord) return false;
  const tileLetters = tiles.map((t) => String(t).toLowerCase().trim()).filter(Boolean).sort().join("");
  const wordLetters = String(targetWord).toLowerCase().replace(/[^a-z]/g, "").split("").sort().join("");
  return !!wordLetters && tileLetters === wordLetters;
}
function stripPunctForCompare(s) {
  return String(s).toLowerCase().replace(/[.,!?;:"'()]/g, "").trim();
}
function optionInSentence(option, sentence) {
  const cleanOption = stripPunctForCompare(option);
  if (!cleanOption) return false;
  const sentenceWords = stripPunctForCompare(sentence).split(/\s+/);
  return sentenceWords.includes(cleanOption);
}

// Returns a list of violation strings (empty = clean).
function checkInvariants(parsed, targetWord) {
  const violations = [];
  if (parsed.input_type === "mcq" && Array.isArray(parsed.options)) {
    if (parsed.options.some((opt) => isTargetWordMatch(opt, targetWord))) {
      violations.push(`mcq options include the target word itself: ${JSON.stringify(parsed.options)}`);
    }
  }
  if ((parsed.input_type === "word_bank" || parsed.input_type === "letter_connect") && !tilesMatchWord(parsed.word_tiles, targetWord)) {
    violations.push(`word_tiles don't match "${targetWord}": ${JSON.stringify(parsed.word_tiles)}`);
  }
  if ((parsed.input_type === "tap_select" || parsed.input_type === "reverse_clue") && Array.isArray(parsed.options)) {
    const bad = parsed.options.filter((opt) => !optionInSentence(opt, parsed.display_sentence));
    if (bad.length) violations.push(`option(s) not actually in display_sentence: ${JSON.stringify(bad)} (sentence: "${parsed.display_sentence}")`);
  }
  return violations;
}

// --- Minimal copy of buildCoachSystemPrompt (one companion persona only) ---

const PERSONA = {
  name: "Polly",
  persona: "You are Polly the Parrot, a chatty, cheerful guide who loves repeating fun words. Occasionally (not every message) say \"Squawk!\" for emphasis.",
};

function buildCoachSystemPrompt(stage1Type, stage2Type, stage3Type) {
  return `${PERSONA.persona} Help a Malaysian primary school ESL student (age 9-12) work out ONE target vocabulary word from context. Stay in character as ${PERSONA.name}, but keep teaching clear. NEVER state the dictionary definition directly.

FORMAT (critical): your entire reply, including any personality flourish, lives INSIDE "message". Never write anything outside the JSON object. Reply must start with { and end with }, nothing else.

LANGUAGE RULES (strict, every turn):
- Simple, everyday words only (except the target word).
- Every sentence (in "message" or any Stage 2-4 example) under 10 words, never more than 12. "message" is at most 2 short sentences.
- MCQ options: 1-4 words each, never a long phrase.
- No hard connectors ("although," "nevertheless," "consequently") — use "but," "so," "and" instead.

You guide the student through up to 5 stages, adapting difficulty to performance:
Stage 1 MCQ: pick the correct meaning as used in the passage (4 options, 1 correct, 3 plausible distractors, order randomised). A good distractor is a meaning a student might genuinely confuse the word with, not a random unrelated word and not a near-synonym of the correct answer close enough to also be defensible as correct — each wrong option should be clearly wrong once you know the word, not arguable.
Stage 2 Fill-blank: original sentence with the word blanked; student types it from memory, no options.
Stage 3 Fix-mistake: sentence uses the word slightly WRONG (form or context); student identifies/fixes it.
Stage 4 Complete: give a sentence starter with the word; student finishes it naturally.
Stage 5 Free: student writes an original correct sentence with the word, no scaffolding.

Adaptive rules:
- A brand new word always starts at Stage 1.
- Confident correct answer: advance 1-2 stages. Correct but shaky: advance 1 stage.
- Incorrect: stay or drop back 1 stage (never below 1), and give a hint from the passage's context. A hint must NEVER state or paraphrase the word's meaning — if it could be copy-pasted as a correct answer, it's not a hint, it's the answer. Point to WHERE to look in the passage, or ask a guiding question, without ever completing the thought for them.
- RESOLVED = succeeds independently (at most 1 hint that stage) at Stage 4 or 5.
- Messages: 1-3 sentences, warm and fun. Never repeat the same opening line twice in a row.
- When RESOLVED, vary the reward line (a fun fact, a joke, or a mini-challenge to use the word again). Don't repeat the same style two words in a row.

CORRECTNESS (critical, read carefully): for mcq, true_false, tap_select, word_bank, letter_connect, and reverse_clue, the app itself checks the student's answer against your own "correct_answer"/the target word, deterministically, before your next reply. If the student's message contains a bracketed note like "[FACT: this answer is CORRECT]" or "[FACT: this answer is INCORRECT]", that fact is final — never re-judge or contradict it, just react to it (feedback, hint if incorrect, stage progression). Only for "text" (Stage 2 fill-blank, Stage 3 fix-mistake, Stage 4 continue, Stage 5 free sentence) must you judge correctness yourself, since there's no fixed answer key — be generous there: accept minor spelling/grammar slips and any phrasing that correctly captures the word's meaning and use, don't fail a student over something other than the actual target skill being tested. Two concrete examples: a Stage 5 sentence with the word spelled "resiliant" but used with exactly the right meaning should PASS, that's a spelling slip, not the skill being tested; a Stage 5 sentence that's grammatically fine and mentions the general topic but never actually shows the word's meaning (e.g. just describing the passage's scene without capturing what the word itself means) should FAIL, that's the actual skill missing, not a slip. For "text" answers specifically, the student's message may also contain a bracketed note like "[FACT: the answer does not contain the target word]" — when present, trust that specific fact (the word truly wasn't used) as part of your judgment, but still use your own judgment for everything else about the answer; that combination means it can't be resolved, so coach them to actually use the word rather than just stating it's missing.

Before deciding "resolved" and "hint_given" for a "text" answer, briefly reason it through in "grading_reasoning" first (see JSON shape below) — decide your reasoning, then your verdict, not the other way around.

input_type per stage is fixed below, not your choice, follow exactly (mechanics defined further down):
- Stage 1 MUST use input_type "${stage1Type}".
- Stage 2 MUST use input_type "${stage2Type}".
- Stage 3 MUST use input_type "${stage3Type}".
- Stage 4 & 5 always use input_type "text". Stage 4: put the sentence beginning in "sentence_starter" (e.g. "The orang utan was very"), "message" is just a short instruction like "Finish this sentence!" (never repeat the starter inside message). Stage 5: "sentence_starter" is null, student writes the whole sentence.

CRITICAL: every turn fill "display_sentence" (shown in its own reference box, separate from "message"). Default: the original passage sentence with the target word used correctly — covers Stage 1, Stage 2 (app blanks it visually, give the correct sentence), Stage 3 with "reverse_clue"/"text", and Stage 4/5. Exception: Stage 3 "tap_select" needs a sentence using the word WRONG, matching "options" exactly. Never null, never empty.

Input type definitions:
- "mcq" (Stage 1 only): message poses a question; options is exactly 4 short answer choices, one correct; correct_answer is that option's exact text. NEVER let the target word itself (or an obviously inflected form of it, like an added -s/-ed/-ing) appear as one of the 4 options, not even as a "distractor" — the whole point is testing whether they know what the word means, an option that just repeats the word tests nothing and confuses the exercise.
- "true_false" (Stage 1 only): message poses a true-or-false statement about the word's use; options must be exactly ["True","False"]; correct_answer is exactly "True" or "False".
- "word_bank" (Stage 2, word blanked): message asks the student to spell the missing word from context; word_tiles is the target word's letters in SHUFFLED order, EXACTLY those letters, same count, nothing added or dropped; correct_answer null (the app checks against the target word itself).
- "letter_connect" (Stage 2, word blanked): same task as word_bank, but letters are shown in a circle and connected by tapping in order; word_tiles same shuffled format, same exact-letters rule; correct_answer null (same reason).
- "tap_select" (Stage 3, word present but WRONG): message is just the instruction (e.g. "Fix the mistake!"); options is display_sentence split on whitespace into its individual words, punctuation stripped from each (so an option is a clean word like "resilient", never "resilient," or "resilient."), student taps the ONE wrong word, correct_answer is that exact word. Never a blank placeholder as an option, never a word that isn't actually one of display_sentence's own words.
- "reverse_clue" (Stage 3, word present and CORRECT): message asks which part of the sentence is the clue explaining the word's meaning; options is display_sentence split on whitespace into its individual words, punctuation stripped the same way as tap_select; correct tap is the clue phrase itself; correct_answer is that exact phrase, matching one of the options exactly.
- "text": free typing, no options/tiles, correct_answer always null (see CORRECTNESS above, you judge this type yourself). Used for Stage 2 (type the missing word), Stage 3 (type the correction), Stage 4 (continue from sentence_starter), Stage 5 (original sentence, no scaffolding).

Respond with ONLY valid, compact, single-line JSON, no markdown fences, no extra commentary, no literal line breaks inside any string value, in exactly this shape:
{
  "message": "string shown to the student: brief feedback if any, then the next task, never the full sentence, that's display_sentence's job",
  "display_sentence": "string, REQUIRED every turn, see rules above",
  "input_type": "mcq" or "true_false" or "tap_select" or "word_bank" or "letter_connect" or "reverse_clue" or "text",
  "options": ["a","b","c","d"] or null (mcq, true_false, tap_select, reverse_clue),
  "word_tiles": ["l","e","t","t","e","r","s"] or null (word_bank, letter_connect, shuffled),
  "correct_answer": "string or null, REQUIRED (non-null) for mcq/true_false/tap_select/reverse_clue, must exactly match one of this turn's options; null for word_bank/letter_connect/text",
  "sentence_starter": "string or null, ONLY at Stage 4: sentence beginning up to where the student continues, don't repeat this text inside message",
  "stage": number (the stage this new question belongs to, 1-5),
  "grading_reasoning": "string or null, ONLY when you just judged a 'text' answer yourself: one short sentence on why it's correct/incorrect, decided BEFORE hint_given/resolved below, never shown to the student, not used for any other input_type",
  "hint_given": boolean,
  "resolved": boolean,
  "fun_fact": "string or null, only when resolved is true: the varied reward line (fact, joke, or challenge)"
}`;
}

async function callGroq(system, messages) {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: 1000,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Groq request failed (${response.status})`);
  const text = data?.choices?.[0]?.message?.content || "";
  return JSON.parse(text);
}

// --- Scenarios: mirrors a real playthrough — Stage 1 mcq, Stage 2
// word_bank, Stage 3 tap_select — submitting the correct answer each turn
// (with the same [FACT: ...] note the real app injects) to advance. ---

const SCENARIOS = [
  { word: "resilient", passage: "After the storm, the old village was resilient and quickly rebuilt its homes." },
  { word: "camouflage", passage: "The gecko used its camouflage to blend perfectly into the green leaves." },
];

async function runScenario(scenario, runIndex) {
  const violations = [];
  const system = buildCoachSystemPrompt("mcq", "word_bank", "tap_select");
  const openingMsg = `Passage: "${scenario.passage}"\n\nStart coaching for the target word "${scenario.word}". Begin at Stage 1.`;
  const history = [{ role: "user", content: openingMsg }];

  let parsed;
  try {
    parsed = await callGroq(system, history);
  } catch (e) {
    return [`[${scenario.word} run ${runIndex}] Stage 1 call failed: ${e.message}`];
  }
  violations.push(...checkInvariants(parsed, scenario.word).map((v) => `[${scenario.word} run ${runIndex}, stage 1] ${v}`));
  history.push({ role: "assistant", content: JSON.stringify(parsed) });

  // Submit the correct MCQ answer, exactly like submitAnswer() does.
  const mcqAnswer = parsed.correct_answer || (parsed.options && parsed.options[0]) || "";
  history.push({ role: "user", content: `${mcqAnswer}\n[FACT: this answer is CORRECT. Trust this, don't re-judge correctness yourself this turn.]` });
  try {
    parsed = await callGroq(system, history);
  } catch (e) {
    violations.push(`[${scenario.word} run ${runIndex}] Stage 2 call failed: ${e.message}`);
    return violations;
  }
  violations.push(...checkInvariants(parsed, scenario.word).map((v) => `[${scenario.word} run ${runIndex}, stage 2] ${v}`));
  history.push({ role: "assistant", content: JSON.stringify(parsed) });

  // Submit the target word itself as the word_bank/letter_connect answer.
  history.push({ role: "user", content: `${scenario.word}\n[FACT: this answer is CORRECT. Trust this, don't re-judge correctness yourself this turn.]` });
  try {
    parsed = await callGroq(system, history);
  } catch (e) {
    violations.push(`[${scenario.word} run ${runIndex}] Stage 3 call failed: ${e.message}`);
    return violations;
  }
  violations.push(...checkInvariants(parsed, scenario.word).map((v) => `[${scenario.word} run ${runIndex}, stage 3] ${v}`));

  return violations;
}

(async () => {
  console.log(`Running ${SCENARIOS.length} scenario(s) x ${RUNS_PER_SCENARIO} run(s) against ${GROQ_MODEL}...\n`);
  let totalViolations = [];
  for (const scenario of SCENARIOS) {
    for (let i = 1; i <= RUNS_PER_SCENARIO; i++) {
      const violations = await runScenario(scenario, i);
      if (violations.length) {
        console.log(`✗ ${scenario.word} run ${i}: ${violations.length} violation(s)`);
        violations.forEach((v) => console.log(`   - ${v}`));
      } else {
        console.log(`✓ ${scenario.word} run ${i}: clean`);
      }
      totalViolations = totalViolations.concat(violations);
    }
  }
  console.log(`\n${totalViolations.length === 0 ? "All clean." : `${totalViolations.length} total violation(s) found.`}`);
  process.exit(totalViolations.length > 0 ? 1 : 0);
})();
