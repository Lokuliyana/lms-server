"use strict";
// src/services/quiz/evaluationEngine.ts
/**
 * Quiz Evaluation Engine (DRY "LESS Functions" Architecture)
 *
 * Provides pure strategy dispatchers for all 6 question types:
 * 1. mcq: Normalized index vs string matching against options
 * 2. multiple-select: Partial credit with right-minus-wrong, floor 0
 * 3. slider & numeric: Numerical tolerance check using question.tolerance
 * 4. drag-drop: Strict ordered pair matching (not unordered Set)
 * 5. fill-blank: Whitespace and case-insensitive trimming, alternatives support
 * 6. true-false: Boolean normalization (true/false, "true"/"false", 1/0, "t"/"f")
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVALUATION_STRATEGIES = void 0;
exports.evaluateMcq = evaluateMcq;
exports.evaluateMultipleSelect = evaluateMultipleSelect;
exports.evaluateSliderNumeric = evaluateSliderNumeric;
exports.evaluateDragDrop = evaluateDragDrop;
exports.evaluateFillBlank = evaluateFillBlank;
exports.evaluateTrueFalse = evaluateTrueFalse;
exports.evaluateAnswers = evaluateAnswers;
// -------------------------------------------------------------
// Strategy 1: MCQ (normalized index vs string matching)
// -------------------------------------------------------------
function evaluateMcq(q, userAnswer) {
    const marks = Number(q.marks) || 1;
    const options = Array.isArray(q.options) ? q.options : [];
    const rawCorrect = q.correct_answer;
    let canonicalText = "";
    let canonicalIndex = undefined;
    if (rawCorrect !== undefined && rawCorrect !== null) {
        if (options.length > 0) {
            if (typeof rawCorrect === "number") {
                if (rawCorrect >= 0 && rawCorrect < options.length) {
                    canonicalIndex = rawCorrect;
                    canonicalText = options[rawCorrect];
                }
                else {
                    canonicalText = String(rawCorrect);
                }
            }
            else {
                const rawCorrectStr = String(rawCorrect).trim();
                // Check if string matches an option text first
                const optIdx = options.findIndex((opt) => String(opt).trim().toLowerCase() === rawCorrectStr.toLowerCase());
                if (optIdx !== -1) {
                    canonicalIndex = optIdx;
                    canonicalText = options[optIdx];
                }
                else if (/^\d+$/.test(rawCorrectStr)) {
                    const idx = Number(rawCorrectStr);
                    if (idx >= 0 && idx < options.length) {
                        canonicalIndex = idx;
                        canonicalText = options[idx];
                    }
                    else {
                        canonicalText = rawCorrectStr;
                    }
                }
                else {
                    canonicalText = rawCorrectStr;
                }
            }
        }
        else {
            canonicalText = String(rawCorrect).trim();
        }
    }
    const canonicalSolution = canonicalText ||
        (canonicalIndex !== undefined ? String(canonicalIndex) : String(rawCorrect ?? ""));
    if (userAnswer === undefined ||
        userAnswer === null ||
        String(userAnswer).trim() === "") {
        return { isCorrect: false, score: 0, canonicalSolution };
    }
    // 1. If user provided a numeric index
    if (typeof userAnswer === "number" && options.length > 0) {
        if (canonicalIndex !== undefined && userAnswer === canonicalIndex) {
            return { isCorrect: true, score: marks, canonicalSolution };
        }
        if (rawCorrect !== undefined &&
            userAnswer >= 0 &&
            userAnswer < options.length &&
            String(options[userAnswer]).trim().toLowerCase() === String(rawCorrect).trim().toLowerCase()) {
            return { isCorrect: true, score: marks, canonicalSolution };
        }
        return { isCorrect: false, score: 0, canonicalSolution };
    }
    const userStr = String(userAnswer).trim();
    // 2. If userStr matches option text
    if (options.length > 0) {
        const uOptIdx = options.findIndex((opt) => String(opt).trim().toLowerCase() === userStr.toLowerCase());
        if (uOptIdx !== -1) {
            if (canonicalIndex !== undefined && uOptIdx === canonicalIndex) {
                return { isCorrect: true, score: marks, canonicalSolution };
            }
            if (canonicalText &&
                String(options[uOptIdx]).trim().toLowerCase() === canonicalText.trim().toLowerCase()) {
                return { isCorrect: true, score: marks, canonicalSolution };
            }
            return { isCorrect: false, score: 0, canonicalSolution };
        }
    }
    // 3. Direct trimmed case-insensitive string match
    if (rawCorrect !== undefined &&
        userStr.toLowerCase() === String(rawCorrect).trim().toLowerCase()) {
        return { isCorrect: true, score: marks, canonicalSolution };
    }
    if (canonicalText &&
        userStr.toLowerCase() === canonicalText.trim().toLowerCase()) {
        return { isCorrect: true, score: marks, canonicalSolution };
    }
    // 4. If userStr is numeric index and did not match any option text above
    if (options.length > 0 && /^\d+$/.test(userStr)) {
        const uIdx = Number(userStr);
        if (canonicalIndex !== undefined && uIdx === canonicalIndex) {
            return { isCorrect: true, score: marks, canonicalSolution };
        }
        if (uIdx >= 0 &&
            uIdx < options.length &&
            rawCorrect !== undefined &&
            String(options[uIdx]).trim().toLowerCase() === String(rawCorrect).trim().toLowerCase()) {
            return { isCorrect: true, score: marks, canonicalSolution };
        }
    }
    return { isCorrect: false, score: 0, canonicalSolution };
}
// -------------------------------------------------------------
// Strategy 2: Multiple-Select (partial credit with right-minus-wrong, floor 0)
// -------------------------------------------------------------
function evaluateMultipleSelect(q, userAnswer) {
    const marks = Number(q.marks) || 1;
    const options = Array.isArray(q.options) ? q.options : [];
    const parseChoices = (raw) => {
        if (raw === undefined || raw === null)
            return [];
        if (Array.isArray(raw))
            return raw;
        if (typeof raw === "string") {
            const trimmed = raw.trim();
            if (!trimmed)
                return [];
            if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed))
                        return parsed;
                }
                catch { }
            }
            return trimmed
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        }
        return [raw];
    };
    const rawCorrectArr = parseChoices(q.correct_answer);
    const rawUserArr = parseChoices(userAnswer);
    const normalizeChoice = (choice) => {
        if (choice === undefined || choice === null)
            return "";
        if (typeof choice === "number" && options.length > 0) {
            if (choice >= 0 && choice < options.length) {
                return `idx:${choice}`;
            }
        }
        const str = String(choice).trim();
        if (options.length > 0) {
            // Prioritize matching option text first to prevent collision with digit options like ["1", "2", "3"]
            const foundIdx = options.findIndex((o) => String(o).trim().toLowerCase() === str.toLowerCase());
            if (foundIdx !== -1) {
                return `idx:${foundIdx}`;
            }
            if (/^\d+$/.test(str)) {
                const idx = Number(str);
                if (idx >= 0 && idx < options.length) {
                    return `idx:${idx}`;
                }
            }
        }
        return `str:${str.toLowerCase()}`;
    };
    const correctSet = new Set();
    for (const c of rawCorrectArr) {
        const norm = normalizeChoice(c);
        if (norm)
            correctSet.add(norm);
    }
    const userSet = new Set();
    for (const u of rawUserArr) {
        const norm = normalizeChoice(u);
        if (norm)
            userSet.add(norm);
    }
    const canonicalSolution = rawCorrectArr
        .map((c) => {
        if (options.length > 0 && typeof c === "number" && c >= 0 && c < options.length) {
            return options[c];
        }
        if (options.length > 0 && /^\d+$/.test(String(c).trim())) {
            const idx = Number(String(c).trim());
            if (idx >= 0 && idx < options.length)
                return options[idx];
        }
        return String(c);
    })
        .join(", ");
    const totalCorrect = correctSet.size;
    if (totalCorrect === 0) {
        return { isCorrect: false, score: 0, canonicalSolution };
    }
    let matchCount = 0;
    let wrongCount = 0;
    for (const u of userSet) {
        if (correctSet.has(u)) {
            matchCount++;
        }
        else {
            wrongCount++;
        }
    }
    // Right-minus-wrong formula with floor of 0
    const netCorrect = Math.max(0, matchCount - wrongCount);
    const earned = totalCorrect > 0 ? (netCorrect / totalCorrect) * marks : 0;
    const score = Number(earned.toFixed(2));
    const isCorrect = score === marks && wrongCount === 0 && matchCount === totalCorrect;
    return { isCorrect, score, canonicalSolution };
}
// -------------------------------------------------------------
// Strategy 3: Slider & Numeric (tolerance check using tolerance field)
// -------------------------------------------------------------
function evaluateSliderNumeric(q, userAnswer) {
    const marks = Number(q.marks) || 1;
    const tolerance = Math.max(0, Number(q.tolerance) || 0);
    const rawCorrect = q.correct_answer;
    const canonicalNum = Number(rawCorrect);
    let canonicalSolution = rawCorrect !== undefined && rawCorrect !== null ? String(rawCorrect) : "";
    if (!isNaN(canonicalNum) && tolerance > 0) {
        canonicalSolution = `${canonicalNum} (±${tolerance})`;
    }
    // Reject undefined, null, empty string, booleans, and non-primitive objects/arrays
    if (userAnswer === undefined ||
        userAnswer === null ||
        typeof userAnswer === "boolean" ||
        Array.isArray(userAnswer) ||
        typeof userAnswer === "object" ||
        String(userAnswer).trim() === "") {
        return { isCorrect: false, score: 0, canonicalSolution };
    }
    const userNum = Number(userAnswer);
    if (isNaN(userNum) ||
        isNaN(canonicalNum) ||
        !Number.isFinite(userNum) ||
        !Number.isFinite(canonicalNum)) {
        const isMatch = String(userAnswer).trim().toLowerCase() ===
            String(rawCorrect).trim().toLowerCase();
        return {
            isCorrect: isMatch,
            score: isMatch ? marks : 0,
            canonicalSolution,
        };
    }
    const diff = Math.abs(userNum - canonicalNum);
    const isCorrect = diff <= tolerance + 1e-9;
    const score = isCorrect ? marks : 0;
    return { isCorrect, score, canonicalSolution };
}
// -------------------------------------------------------------
// Strategy 4: Drag-Drop (ordered pair matching, not unordered Set)
// -------------------------------------------------------------
function evaluateDragDrop(q, userAnswer) {
    const marks = Number(q.marks) || 1;
    const expectedPairs = [];
    const matchesPool = Array.isArray(q.dragItems?.matches) ? q.dragItems.matches : [];
    // Extract expected pairs from dragItems or correct_answer
    if (q.dragItems &&
        Array.isArray(q.dragItems.items) &&
        Array.isArray(q.dragItems.matches) &&
        q.dragItems.items.length > 0) {
        const items = q.dragItems.items;
        const matches = q.dragItems.matches;
        const len = Math.min(items.length, matches.length);
        for (let i = 0; i < len; i++) {
            expectedPairs.push({
                item: String(items[i] || "").trim(),
                expectedMatch: String(matches[i] || "").trim(),
                expectedMatchIndex: i,
            });
        }
    }
    else if (Array.isArray(q.correct_answer) &&
        q.correct_answer.length > 0) {
        for (let i = 0; i < q.correct_answer.length; i++) {
            const entry = q.correct_answer[i];
            if (Array.isArray(entry) && entry.length >= 2) {
                expectedPairs.push({
                    item: String(entry[0] || "").trim(),
                    expectedMatch: String(entry[1] || "").trim(),
                });
            }
            else if (entry && typeof entry === "object") {
                const item = entry.item || entry.source || entry.id || entry.left || String(i);
                const match = entry.match || entry.target || entry.value || entry.right || "";
                expectedPairs.push({
                    item: String(item).trim(),
                    expectedMatch: String(match).trim(),
                });
            }
            else {
                const matchStr = String(entry).trim();
                let expMatch = matchStr;
                let expIdx = undefined;
                if (matchesPool.length > 0 && /^\d+$/.test(matchStr)) {
                    const idx = Number(matchStr);
                    if (idx >= 0 && idx < matchesPool.length) {
                        expMatch = String(matchesPool[idx]).trim();
                        expIdx = idx;
                    }
                }
                const itemText = (q.dragItems?.items && q.dragItems.items.length > i)
                    ? String(q.dragItems.items[i]).trim()
                    : String(i);
                expectedPairs.push({
                    item: itemText,
                    expectedMatch: expMatch,
                    expectedMatchIndex: expIdx,
                });
            }
        }
    }
    else if (q.correct_answer &&
        typeof q.correct_answer === "object" &&
        !Array.isArray(q.correct_answer)) {
        for (const [key, val] of Object.entries(q.correct_answer)) {
            expectedPairs.push({
                item: String(key).trim(),
                expectedMatch: String(val).trim(),
            });
        }
    }
    const canonicalSolution = expectedPairs.length > 0
        ? expectedPairs.map((p) => `${p.item} → ${p.expectedMatch}`).join(", ")
        : String(q.correct_answer ?? "");
    const totalPairs = expectedPairs.length;
    if (totalPairs === 0 ||
        userAnswer === undefined ||
        userAnswer === null) {
        return { isCorrect: false, score: 0, canonicalSolution };
    }
    // Extract user answer for a given item and pair index
    const findUserMatchForItem = (item, index) => {
        if (Array.isArray(userAnswer)) {
            // Check if userAnswer is an array of primitives aligned by items
            const isPrimitiveArray = userAnswer.every((el) => typeof el === "string" || typeof el === "number");
            if (isPrimitiveArray) {
                if (userAnswer.length > index) {
                    return userAnswer[index];
                }
                return undefined;
            }
            // User provided array of tuples or objects
            for (const entry of userAnswer) {
                if (Array.isArray(entry) && entry.length >= 2) {
                    if (String(entry[0]).trim().toLowerCase() === item.toLowerCase()) {
                        return entry[1];
                    }
                }
                else if (entry && typeof entry === "object") {
                    const entryItem = entry.item ?? entry.source ?? entry.left ?? entry.id;
                    if (entryItem !== undefined && String(entryItem).trim().toLowerCase() === item.toLowerCase()) {
                        return entry.match ?? entry.target ?? entry.right ?? entry.value;
                    }
                    // Single-key dictionary: e.g. { "France": "Paris" } or { "France": 0 }
                    const keys = Object.keys(entry);
                    if (keys.length === 1 && keys[0].trim().toLowerCase() === item.toLowerCase()) {
                        return entry[keys[0]];
                    }
                }
            }
            return undefined;
        }
        if (typeof userAnswer === "object" && userAnswer !== null) {
            if (item in userAnswer) {
                return userAnswer[item];
            }
            const lower = item.toLowerCase();
            for (const [k, v] of Object.entries(userAnswer)) {
                if (k.toLowerCase() === lower) {
                    return v;
                }
            }
        }
        return undefined;
    };
    const isMatchValid = (userMatch, pair) => {
        if (userMatch === undefined || userMatch === null)
            return false;
        const userStr = String(userMatch).trim();
        if (!userStr)
            return false;
        // 1. Direct string comparison against expectedMatch
        if (userStr.toLowerCase() === pair.expectedMatch.toLowerCase()) {
            return true;
        }
        // 2. User provided numeric index (e.g. 0, "0"), resolve against matchesPool
        if (matchesPool.length > 0 && /^\d+$/.test(userStr)) {
            const idx = Number(userStr);
            if (idx >= 0 && idx < matchesPool.length) {
                if (String(matchesPool[idx]).trim().toLowerCase() === pair.expectedMatch.toLowerCase()) {
                    return true;
                }
                if (pair.expectedMatchIndex !== undefined && idx === pair.expectedMatchIndex) {
                    return true;
                }
            }
        }
        // 3. Expected match was numeric index and user provided match string
        if (matchesPool.length > 0 && /^\d+$/.test(pair.expectedMatch)) {
            const expIdx = Number(pair.expectedMatch);
            if (expIdx >= 0 && expIdx < matchesPool.length) {
                if (String(matchesPool[expIdx]).trim().toLowerCase() === userStr.toLowerCase()) {
                    return true;
                }
            }
        }
        return false;
    };
    let matchCount = 0;
    for (let i = 0; i < totalPairs; i++) {
        const pair = expectedPairs[i];
        const userMatch = findUserMatchForItem(pair.item, i);
        if (isMatchValid(userMatch, pair)) {
            matchCount++;
        }
    }
    const isCorrect = matchCount === totalPairs && totalPairs > 0;
    const score = totalPairs > 0 ? Number(((matchCount / totalPairs) * marks).toFixed(2)) : 0;
    return { isCorrect, score, canonicalSolution };
}
// -------------------------------------------------------------
// Strategy 5: Fill-Blank (case/whitespace trimming, alternatives)
// -------------------------------------------------------------
function evaluateFillBlank(q, userAnswer) {
    const marks = Number(q.marks) || 1;
    const rawCorrect = q.correct_answer;
    const options = Array.isArray(q.options) ? q.options : [];
    const alternatives = [];
    const addAlt = (val) => {
        if (val === undefined || val === null)
            return;
        if (Array.isArray(val)) {
            val.forEach(addAlt);
            return;
        }
        const str = String(val).trim();
        if (!str)
            return;
        if (str.includes("|")) {
            str.split("|").forEach(addAlt);
            return;
        }
        alternatives.push(str);
    };
    addAlt(rawCorrect);
    options.forEach(addAlt);
    const canonicalSolution = alternatives.length > 0 ? alternatives.join(" | ") : String(rawCorrect ?? "");
    if (userAnswer === undefined ||
        userAnswer === null ||
        (Array.isArray(userAnswer) && userAnswer.length === 0) ||
        String(userAnswer).trim() === "") {
        return { isCorrect: false, score: 0, canonicalSolution };
    }
    const rawUserStr = Array.isArray(userAnswer) && userAnswer.length === 1
        ? String(userAnswer[0])
        : String(userAnswer);
    const normUser = rawUserStr.trim().toLowerCase();
    const isMatch = alternatives.some((alt) => alt.trim().toLowerCase() === normUser);
    return {
        isCorrect: isMatch,
        score: isMatch ? marks : 0,
        canonicalSolution,
    };
}
// -------------------------------------------------------------
// Strategy 6: True-False (boolean normalization)
// -------------------------------------------------------------
function evaluateTrueFalse(q, userAnswer) {
    const marks = Number(q.marks) || 1;
    const rawCorrect = q.correct_answer;
    const options = Array.isArray(q.options) ? q.options : [];
    const parseBool = (val) => {
        if (typeof val === "boolean")
            return val;
        if (val === undefined || val === null)
            return null;
        // Check if val is an option index when options exist
        if (options.length >= 2 &&
            (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(val.trim())))) {
            const idx = Number(val);
            if (idx >= 0 && idx < options.length) {
                const optStr = String(options[idx]).trim().toLowerCase();
                if (["true", "t", "yes", "correct"].includes(optStr))
                    return true;
                if (["false", "f", "no", "incorrect"].includes(optStr))
                    return false;
            }
        }
        if (typeof val === "number") {
            if (val === 1)
                return true;
            if (val === 0)
                return false;
        }
        if (typeof val === "string") {
            const s = val.trim().toLowerCase();
            if (["true", "t", "1", "yes"].includes(s))
                return true;
            if (["false", "f", "0", "no"].includes(s))
                return false;
        }
        return null;
    };
    const correctBool = parseBool(rawCorrect);
    const canonicalSolution = correctBool !== null
        ? correctBool
            ? "True"
            : "False"
        : String(rawCorrect ?? "");
    if (userAnswer === undefined ||
        userAnswer === null ||
        String(userAnswer).trim() === "") {
        return { isCorrect: false, score: 0, canonicalSolution };
    }
    const userBool = parseBool(userAnswer);
    if (userBool !== null && correctBool !== null) {
        const isCorrect = userBool === correctBool;
        return { isCorrect, score: isCorrect ? marks : 0, canonicalSolution };
    }
    const isMatch = String(userAnswer).trim().toLowerCase() ===
        String(rawCorrect).trim().toLowerCase();
    return { isCorrect: isMatch, score: isMatch ? marks : 0, canonicalSolution };
}
// -------------------------------------------------------------
// Strategy Dispatcher Registry
// -------------------------------------------------------------
exports.EVALUATION_STRATEGIES = {
    mcq: evaluateMcq,
    "multiple-select": evaluateMultipleSelect,
    slider: evaluateSliderNumeric,
    numeric: evaluateSliderNumeric,
    "drag-drop": evaluateDragDrop,
    "fill-blank": evaluateFillBlank,
    "true-false": evaluateTrueFalse,
};
// -------------------------------------------------------------
// Core Engine: evaluateAnswers
// -------------------------------------------------------------
/**
 * Evaluates a set of questions against an answers map.
 *
 * @param questions - Array of question definitions
 * @param answersMap - Plain object or Map keyed by question ID (ObjectId string or ID)
 * @returns EvaluationResult containing formatted answers, scores, feedback, and telemetry
 */
function evaluateAnswers(questions, answersMap) {
    const safeQuestions = Array.isArray(questions) ? questions : [];
    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    let totalTimeMs = 0;
    const formattedAnswers = [];
    for (const q of safeQuestions) {
        const qMarks = Number(q.marks) || 1;
        maxScore += qMarks;
        const qId = q._id || q.id;
        const qIdStr = qId ? qId.toString() : "";
        // Extract raw entry from answersMap
        let raw;
        if (answersMap instanceof Map) {
            raw = answersMap.get(qIdStr) ?? answersMap.get(qId);
        }
        else if (answersMap && typeof answersMap === "object") {
            raw = answersMap[qIdStr] ?? answersMap[qId];
        }
        let userAnswer = raw;
        let timeMs = 0;
        if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
            if ("answer" in raw) {
                userAnswer = raw.answer;
            }
            if (typeof raw.time_ms === "number") {
                timeMs = Math.max(0, raw.time_ms);
            }
        }
        const type = (q.type || "mcq").toLowerCase().trim();
        const strategy = exports.EVALUATION_STRATEGIES[type] || evaluateMcq;
        const evalResult = strategy(q, userAnswer);
        const earnedMarks = Math.max(0, Math.min(qMarks, evalResult.score));
        const isCorrect = evalResult.isCorrect;
        if (isCorrect) {
            correctCount += 1;
        }
        totalScore += earnedMarks;
        totalTimeMs += timeMs;
        formattedAnswers.push({
            question_id: qId,
            answer: userAnswer,
            is_correct: isCorrect,
            score: earnedMarks,
            max_score: qMarks,
            time_ms: timeMs,
            feedback: {
                correct_answer: q.correct_answer,
                canonical_solution: evalResult.canonicalSolution,
                explanation: q.explanation || "",
            },
        });
    }
    totalScore = Number(totalScore.toFixed(2));
    const percent = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(2)) : 0;
    const totalTimeSec = Math.round(totalTimeMs / 1000);
    return {
        formattedAnswers,
        totalScore,
        maxScore,
        correctCount,
        totalQuestions: safeQuestions.length,
        totalTimeSec,
        totalTimeMs,
        percent,
    };
}
