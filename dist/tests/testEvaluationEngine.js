"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/tests/testEvaluationEngine.ts
const assert_1 = __importDefault(require("assert"));
const evaluationEngine_1 = require("../services/quiz/evaluationEngine");
const assessmentService_1 = require("../services/assessmentService");
let totalTests = 0;
let passedTests = 0;
function test(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`  ✓ ${name}`);
    }
    catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    Error: ${err.message}`);
        throw err;
    }
}
console.log("\n========================================================");
console.log("RUNNING EVALUATION ENGINE & BACKEND QUIZ SUITE");
console.log("========================================================\n");
// -----------------------------------------------------------
// 1. MCQ Strategy Tests
// -----------------------------------------------------------
console.log("--- 1. MCQ Strategy (Index vs String & Normalization) ---");
test("MCQ: index vs index matching", () => {
    const q = {
        type: "mcq",
        marks: 2,
        options: ["Alpha", "Beta", "Gamma"],
        correct_answer: 1,
    };
    const res1 = (0, evaluationEngine_1.evaluateMcq)(q, 1);
    assert_1.default.strictEqual(res1.isCorrect, true);
    assert_1.default.strictEqual(res1.score, 2);
    const res2 = (0, evaluationEngine_1.evaluateMcq)(q, "1");
    assert_1.default.strictEqual(res2.isCorrect, true);
    assert_1.default.strictEqual(res2.score, 2);
});
test("MCQ: index answer matching text correct_answer", () => {
    const q = {
        type: "mcq",
        marks: 3,
        options: ["Paris", "London", "Tokyo"],
        correct_answer: "Tokyo",
    };
    const res = (0, evaluationEngine_1.evaluateMcq)(q, 2);
    assert_1.default.strictEqual(res.isCorrect, true);
    assert_1.default.strictEqual(res.score, 3);
});
test("MCQ: text answer matching index correct_answer", () => {
    const q = {
        type: "mcq",
        marks: 4,
        options: ["Mercury", "Venus", "Earth"],
        correct_answer: 0,
    };
    const res = (0, evaluationEngine_1.evaluateMcq)(q, "mercury");
    assert_1.default.strictEqual(res.isCorrect, true);
    assert_1.default.strictEqual(res.score, 4);
});
test("MCQ: whitespace and case insensitivity", () => {
    const q = {
        type: "mcq",
        marks: 1,
        options: ["Option A", "Option B"],
        correct_answer: "Option B",
    };
    const res = (0, evaluationEngine_1.evaluateMcq)(q, "   option b   ");
    assert_1.default.strictEqual(res.isCorrect, true);
    assert_1.default.strictEqual(res.score, 1);
});
test("MCQ: wrong answer and empty answer", () => {
    const q = {
        type: "mcq",
        marks: 5,
        options: ["A", "B", "C"],
        correct_answer: 1,
    };
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMcq)(q, 0).isCorrect, false);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMcq)(q, 0).score, 0);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMcq)(q, null).isCorrect, false);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMcq)(q, "").isCorrect, false);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMcq)(q, undefined).isCorrect, false);
});
// -----------------------------------------------------------
// 2. Multiple-Select Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 2. Multiple-Select Strategy (Partial Credit & Floor 0) ---");
test("Multiple-Select: all correct returns full marks", () => {
    const q = {
        type: "multiple-select",
        marks: 4,
        options: ["A", "B", "C", "D"],
        correct_answer: [0, 2], // A and C
    };
    const res = (0, evaluationEngine_1.evaluateMultipleSelect)(q, [0, 2]);
    assert_1.default.strictEqual(res.isCorrect, true);
    assert_1.default.strictEqual(res.score, 4);
});
test("Multiple-Select: text choices normalized against index correct_answer", () => {
    const q = {
        type: "multiple-select",
        marks: 2,
        options: ["Red", "Green", "Blue"],
        correct_answer: [0, 1],
    };
    const res = (0, evaluationEngine_1.evaluateMultipleSelect)(q, ["red", "green"]);
    assert_1.default.strictEqual(res.isCorrect, true);
    assert_1.default.strictEqual(res.score, 2);
});
test("Multiple-Select: partial credit with right-minus-wrong (1 right, 0 wrong)", () => {
    const q = {
        type: "multiple-select",
        marks: 4,
        options: ["A", "B", "C", "D"],
        correct_answer: [0, 2], // 2 correct choices, 2 marks each
    };
    // User selects only 1 correct choice
    const res = (0, evaluationEngine_1.evaluateMultipleSelect)(q, [0]);
    assert_1.default.strictEqual(res.isCorrect, false);
    assert_1.default.strictEqual(res.score, 2); // 1/2 of 4 = 2 marks
});
test("Multiple-Select: partial credit with right-minus-wrong (2 right, 1 wrong)", () => {
    const q = {
        type: "multiple-select",
        marks: 6,
        options: ["A", "B", "C", "D"],
        correct_answer: [0, 1, 2], // 3 correct choices
    };
    // User selects A (correct), B (correct), D (wrong penalty)
    // net = Math.max(0, 2 - 1) = 1. Earned = (1 / 3) * 6 = 2
    const res = (0, evaluationEngine_1.evaluateMultipleSelect)(q, [0, 1, 3]);
    assert_1.default.strictEqual(res.isCorrect, false);
    assert_1.default.strictEqual(res.score, 2);
});
test("Multiple-Select: floor at 0 (wrong choices exceed right choices)", () => {
    const q = {
        type: "multiple-select",
        marks: 4,
        options: ["A", "B", "C", "D"],
        correct_answer: [0], // 1 correct choice
    };
    // User selects A (correct), B (wrong), C (wrong) -> net = max(0, 1 - 2) = 0
    const res = (0, evaluationEngine_1.evaluateMultipleSelect)(q, [0, 1, 2]);
    assert_1.default.strictEqual(res.isCorrect, false);
    assert_1.default.strictEqual(res.score, 0); // Must floor to 0, NEVER negative
});
test("Multiple-Select: empty / invalid answer gives 0", () => {
    const q = {
        type: "multiple-select",
        marks: 4,
        options: ["A", "B"],
        correct_answer: [0, 1],
    };
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMultipleSelect)(q, []).score, 0);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMultipleSelect)(q, null).score, 0);
});
// -----------------------------------------------------------
// 3. Slider & Numeric Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 3. Slider & Numeric Strategy (Tolerance Check) ---");
test("Slider/Numeric: exact target match with tolerance 0", () => {
    const q = {
        type: "slider",
        marks: 3,
        correct_answer: 50,
        tolerance: 0,
    };
    const res1 = (0, evaluationEngine_1.evaluateSliderNumeric)(q, 50);
    assert_1.default.strictEqual(res1.isCorrect, true);
    assert_1.default.strictEqual(res1.score, 3);
    const res2 = (0, evaluationEngine_1.evaluateSliderNumeric)(q, 51);
    assert_1.default.strictEqual(res2.isCorrect, false);
    assert_1.default.strictEqual(res2.score, 0);
});
test("Slider/Numeric: within tolerance passes and earns marks", () => {
    const q = {
        type: "numeric",
        marks: 5,
        correct_answer: 100,
        tolerance: 5, // allows [95, 105]
    };
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(q, 103).isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(q, 95).isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(q, 105).isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(q, 103).score, 5);
    // Outside tolerance
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(q, 94.9).isCorrect, false);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(q, 105.1).isCorrect, false);
});
test("Slider/Numeric: decimal tolerance precision", () => {
    const q = {
        type: "slider",
        marks: 2,
        correct_answer: 3.1415,
        tolerance: 0.01,
    };
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(q, 3.14).isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(q, "3.15").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(q, 3.16).isCorrect, false);
});
test("Slider/Numeric: canonical solution format includes tolerance", () => {
    const q = {
        type: "slider",
        marks: 2,
        correct_answer: 50,
        tolerance: 5,
    };
    const res = (0, evaluationEngine_1.evaluateSliderNumeric)(q, 49);
    assert_1.default.strictEqual(res.canonicalSolution, "50 (±5)");
});
// -----------------------------------------------------------
// 4. Drag-Drop Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 4. Drag-Drop Strategy (Strict Ordered Pair Matching) ---");
test("Drag-Drop: correct ordered pairs earn full marks", () => {
    const q = {
        type: "drag-drop",
        marks: 6,
        dragItems: {
            items: ["France", "Germany", "Japan"],
            matches: ["Paris", "Berlin", "Tokyo"],
        },
    };
    // User submits matching array
    const res = (0, evaluationEngine_1.evaluateDragDrop)(q, ["Paris", "Berlin", "Tokyo"]);
    assert_1.default.strictEqual(res.isCorrect, true);
    assert_1.default.strictEqual(res.score, 6);
});
test("Drag-Drop: swapped pairs FAIL (proves not an unordered Set)", () => {
    const q = {
        type: "drag-drop",
        marks: 6,
        dragItems: {
            items: ["France", "Germany"],
            matches: ["Paris", "Berlin"],
        },
    };
    // An unordered Set would say both "Paris" and "Berlin" exist.
    // But France -> Berlin, Germany -> Paris is WRONG!
    const res = (0, evaluationEngine_1.evaluateDragDrop)(q, ["Berlin", "Paris"]);
    assert_1.default.strictEqual(res.isCorrect, false);
    assert_1.default.strictEqual(res.score, 0); // 0 out of 2 pairs matched
});
test("Drag-Drop: object mapping input format and partial match", () => {
    const q = {
        type: "drag-drop",
        marks: 4,
        dragItems: {
            items: ["A", "B", "C", "D"],
            matches: ["1", "2", "3", "4"],
        },
    };
    // User gets 2 pairs right, 2 wrong
    const res = (0, evaluationEngine_1.evaluateDragDrop)(q, {
        A: "1",
        B: "2",
        C: "wrong",
        D: "wrong",
    });
    assert_1.default.strictEqual(res.isCorrect, false);
    assert_1.default.strictEqual(res.score, 2); // 2/4 * 4 = 2 marks
});
test("Drag-Drop: tuple array input format", () => {
    const q = {
        type: "drag-drop",
        marks: 3,
        dragItems: {
            items: ["Apple", "Banana", "Cherry"],
            matches: ["Red", "Yellow", "Red"],
        },
    };
    const res = (0, evaluationEngine_1.evaluateDragDrop)(q, [
        ["Apple", "Red"],
        ["Banana", "Yellow"],
        ["Cherry", "Red"],
    ]);
    assert_1.default.strictEqual(res.isCorrect, true);
    assert_1.default.strictEqual(res.score, 3);
});
// -----------------------------------------------------------
// 5. Fill-Blank Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 5. Fill-Blank Strategy (Trimming & Alternatives) ---");
test("Fill-Blank: trimming whitespace and case-insensitivity", () => {
    const q = {
        type: "fill-blank",
        marks: 2,
        correct_answer: "mitochondria",
    };
    const res = (0, evaluationEngine_1.evaluateFillBlank)(q, "   Mitochondria   ");
    assert_1.default.strictEqual(res.isCorrect, true);
    assert_1.default.strictEqual(res.score, 2);
});
test("Fill-Blank: pipe-delimited alternatives", () => {
    const q = {
        type: "fill-blank",
        marks: 3,
        correct_answer: "color | colour",
    };
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateFillBlank)(q, "color").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateFillBlank)(q, "Colour").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateFillBlank)(q, "red").isCorrect, false);
});
test("Fill-Blank: array alternatives & options fallback", () => {
    const q = {
        type: "fill-blank",
        marks: 2,
        correct_answer: ["gray", "grey"],
        options: ["silver"],
    };
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateFillBlank)(q, "gray").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateFillBlank)(q, "grey").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateFillBlank)(q, "silver").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateFillBlank)(q, "black").isCorrect, false);
});
// -----------------------------------------------------------
// 6. True-False Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 6. True-False Strategy (Boolean Normalization) ---");
test("True-False: boolean and string representations", () => {
    const qTrue = {
        type: "true-false",
        marks: 1,
        correct_answer: true,
    };
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qTrue, true).isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qTrue, "true").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qTrue, "True").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qTrue, "t").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qTrue, 1).isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qTrue, "yes").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qTrue, false).isCorrect, false);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qTrue, "false").isCorrect, false);
    const qFalse = {
        type: "true-false",
        marks: 1,
        correct_answer: false,
    };
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qFalse, false).isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qFalse, "false").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qFalse, "f").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qFalse, 0).isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qFalse, "no").isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateTrueFalse)(qFalse, true).isCorrect, false);
});
// -----------------------------------------------------------
// 7. Core evaluateAnswers Engine Integration
// -----------------------------------------------------------
console.log("\n--- 7. evaluateAnswers Engine & computeGrading ---");
test("evaluateAnswers: multi-type quiz batch evaluation and telemetry", () => {
    const questions = [
        {
            _id: "q1",
            type: "mcq",
            marks: 2,
            options: ["A", "B", "C"],
            correct_answer: 1,
            explanation: "B is correct",
        },
        {
            _id: "q2",
            type: "multiple-select",
            marks: 4,
            options: ["X", "Y", "Z"],
            correct_answer: [0, 2],
            explanation: "X and Z are correct",
        },
        {
            _id: "q3",
            type: "slider",
            marks: 3,
            correct_answer: 25,
            tolerance: 2,
            explanation: "Between 23 and 27",
        },
        {
            _id: "q4",
            type: "drag-drop",
            marks: 2,
            dragItems: {
                items: ["Left"],
                matches: ["Right"],
            },
            explanation: "Left pairs with Right",
        },
        {
            _id: "q5",
            type: "fill-blank",
            marks: 1,
            correct_answer: "Oxygen",
            explanation: "O2 gas",
        },
        {
            _id: "q6",
            type: "true-false",
            marks: 1,
            correct_answer: true,
            explanation: "It is true",
        },
    ];
    const answersMap = {
        q1: { answer: 1, time_ms: 1500 }, // full (2)
        q2: { answer: [0], time_ms: 2000 }, // partial 1/2 of 4 = (2)
        q3: { answer: 26, time_ms: 1000 }, // within tolerance (3)
        q4: { answer: ["Right"], time_ms: 1500 }, // match (2)
        q5: { answer: "oxygen", time_ms: 1000 }, // match (1)
        q6: { answer: "true", time_ms: 1000 }, // match (1)
    };
    const result = (0, evaluationEngine_1.evaluateAnswers)(questions, answersMap);
    assert_1.default.strictEqual(result.totalQuestions, 6);
    assert_1.default.strictEqual(result.maxScore, 13); // 2 + 4 + 3 + 2 + 1 + 1 = 13
    assert_1.default.strictEqual(result.totalScore, 11); // 2 + 2 + 3 + 2 + 1 + 1 = 11
    assert_1.default.strictEqual(result.correctCount, 5); // q2 is partial, not 100% correct
    assert_1.default.strictEqual(result.totalTimeMs, 8000);
    assert_1.default.strictEqual(result.totalTimeSec, 8);
    assert_1.default.strictEqual(result.percent, 84.62); // (11 / 13) * 100 = 84.615...
    // Check formatted answers contain feedback and telemetry
    assert_1.default.strictEqual(result.formattedAnswers.length, 6);
    assert_1.default.strictEqual(result.formattedAnswers[0].score, 2);
    assert_1.default.strictEqual(result.formattedAnswers[0].max_score, 2);
    assert_1.default.strictEqual(result.formattedAnswers[0].feedback.explanation, "B is correct");
    assert_1.default.strictEqual(result.formattedAnswers[1].score, 2);
    assert_1.default.strictEqual(result.formattedAnswers[1].is_correct, false);
    // computeGrading produces identical output
    const gradingResult = (0, assessmentService_1.computeGrading)(questions, answersMap);
    assert_1.default.strictEqual(gradingResult.totalScore, result.totalScore);
    assert_1.default.strictEqual(gradingResult.percent, result.percent);
    assert_1.default.strictEqual(gradingResult.maxScore, result.maxScore);
});
test("evaluateAnswers: handles Map input and missing answers cleanly", () => {
    const questions = [
        { _id: "q1", type: "mcq", marks: 5, correct_answer: "Yes" },
        { _id: "q2", type: "fill-blank", marks: 5, correct_answer: "No" },
    ];
    const map = new Map();
    map.set("q1", "Yes"); // Unanswered q2
    const result = (0, evaluationEngine_1.evaluateAnswers)(questions, map);
    assert_1.default.strictEqual(result.totalScore, 5);
    assert_1.default.strictEqual(result.maxScore, 10);
    assert_1.default.strictEqual(result.correctCount, 1);
    assert_1.default.strictEqual(result.formattedAnswers[1].is_correct, false);
    assert_1.default.strictEqual(result.formattedAnswers[1].score, 0);
});
// -----------------------------------------------------------
// 8. Edge Case & Regression Tests (Discovered during review)
// -----------------------------------------------------------
console.log("--- 8. Edge Case & Deep Verification Tests ---");
test("MCQ: numeric options string vs index resolution", () => {
    const q = {
        type: "mcq",
        marks: 1,
        options: ["1", "2", "3", "4"],
        correct_answer: "1", // author provided string "1" (option at index 0)
    };
    // User sends string "1" (matches option 0)
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMcq)(q, "1").isCorrect, true);
    // User sends index 0 (matches option 0)
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMcq)(q, 0).isCorrect, true);
    // User sends index 1 (option "2" - wrong!)
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateMcq)(q, 1).isCorrect, false);
});
test("Multiple-Select: numeric options strings match option texts correctly", () => {
    const q = {
        type: "multiple-select",
        marks: 4,
        options: ["1", "2", "3", "4"],
        correct_answer: [0, 1], // options "1" and "2"
    };
    // Strings ["1", "2"] should match options at indices 0 and 1
    const resStrings = (0, evaluationEngine_1.evaluateMultipleSelect)(q, ["1", "2"]);
    assert_1.default.strictEqual(resStrings.isCorrect, true);
    assert_1.default.strictEqual(resStrings.score, 4);
    // Numbers [0, 1] should also match
    const resIndices = (0, evaluationEngine_1.evaluateMultipleSelect)(q, [0, 1]);
    assert_1.default.strictEqual(resIndices.isCorrect, true);
    assert_1.default.strictEqual(resIndices.score, 4);
    // Strings ["2", "3"] should have partial credit / penalty
    const resWrong = (0, evaluationEngine_1.evaluateMultipleSelect)(q, ["2", "3"]);
    assert_1.default.strictEqual(resWrong.isCorrect, false);
});
test("Slider/Numeric: rejects booleans and arrays to prevent false positive 0/1", () => {
    const qZero = {
        type: "numeric",
        marks: 5,
        correct_answer: 0,
        tolerance: 0,
    };
    // Boolean false should NOT evaluate to 0
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(qZero, false).isCorrect, false);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(qZero, false).score, 0);
    // Array [0] should NOT evaluate to 0
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(qZero, [0]).isCorrect, false);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(qZero, [0]).score, 0);
    // Valid number 0 or string "0" should match
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(qZero, 0).isCorrect, true);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(qZero, "0").isCorrect, true);
    const qOne = {
        type: "numeric",
        marks: 5,
        correct_answer: 1,
        tolerance: 0,
    };
    // Boolean true should NOT evaluate to 1
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(qOne, true).isCorrect, false);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(qOne, true).score, 0);
    assert_1.default.strictEqual((0, evaluationEngine_1.evaluateSliderNumeric)(qOne, 1).isCorrect, true);
});
test("Drag-Drop: handles match indices and object mappings", () => {
    const q = {
        type: "drag-drop",
        marks: 2,
        dragItems: {
            items: ["France", "Germany"],
            matches: ["Paris", "Berlin"],
        },
    };
    // Indices array [0, 1]
    const resIndices = (0, evaluationEngine_1.evaluateDragDrop)(q, [0, 1]);
    assert_1.default.strictEqual(resIndices.isCorrect, true);
    assert_1.default.strictEqual(resIndices.score, 2);
    // Swapped indices [1, 0] must fail
    const resSwapped = (0, evaluationEngine_1.evaluateDragDrop)(q, [1, 0]);
    assert_1.default.strictEqual(resSwapped.isCorrect, false);
    assert_1.default.strictEqual(resSwapped.score, 0);
    // Tuples with indices
    const resTuples = (0, evaluationEngine_1.evaluateDragDrop)(q, [["France", 0], ["Germany", 1]]);
    assert_1.default.strictEqual(resTuples.isCorrect, true);
    assert_1.default.strictEqual(resTuples.score, 2);
    // Object with indices
    const resObj = (0, evaluationEngine_1.evaluateDragDrop)(q, { France: 0, Germany: 1 });
    assert_1.default.strictEqual(resObj.isCorrect, true);
    assert_1.default.strictEqual(resObj.score, 2);
    // Array of single-key objects
    const resDicts = (0, evaluationEngine_1.evaluateDragDrop)(q, [{ France: "Paris" }, { Germany: "Berlin" }]);
    assert_1.default.strictEqual(resDicts.isCorrect, true);
    assert_1.default.strictEqual(resDicts.score, 2);
});
test("True-False: options ['True', 'False'] with index 0 resolves to True", () => {
    const q = {
        type: "true-false",
        marks: 2,
        options: ["True", "False"],
        correct_answer: true,
    };
    // User selects option 0 ("True")
    const res0 = (0, evaluationEngine_1.evaluateTrueFalse)(q, 0);
    assert_1.default.strictEqual(res0.isCorrect, true);
    assert_1.default.strictEqual(res0.score, 2);
    // User selects option 1 ("False")
    const res1 = (0, evaluationEngine_1.evaluateTrueFalse)(q, 1);
    assert_1.default.strictEqual(res1.isCorrect, false);
    assert_1.default.strictEqual(res1.score, 0);
});
test("submitQuiz: accepts and persists telemetry, deviceInfo, and ipAddress", async () => {
    const { submitQuiz } = require("../services/assessmentService");
    const { Quiz } = require("../models/Quiz");
    const { QuizQuestion } = require("../models/QuizQuestion");
    const { QuizSubmission } = require("../models/QuizSubmission");
    const origQuizFindById = Quiz.findById;
    const origQuestionFind = QuizQuestion.find;
    const origSubmissionCount = QuizSubmission.countDocuments;
    const origSubmissionCreate = QuizSubmission.create;
    const fakeQuizId = "507f1f77bcf86cd799439011";
    const fakeUserId = "507f1f77bcf86cd799439012";
    const fakeQId = "507f1f77bcf86cd799439013";
    try {
        Quiz.findById = async () => ({
            _id: fakeQuizId,
            title: "Calculus Test",
            subject: "Math",
        });
        QuizQuestion.find = () => ({
            lean: async () => [
                {
                    _id: fakeQId,
                    type: "mcq",
                    marks: 5,
                    correct_answer: "A",
                },
            ],
        });
        QuizSubmission.countDocuments = async () => 0;
        let savedData = null;
        QuizSubmission.create = async (data) => {
            savedData = data;
            return { ...data, _id: "507f1f77bcf86cd799439014" };
        };
        const telemetry = { tabSwitches: 2, blurDurationMs: 3400 };
        await submitQuiz(fakeUserId, fakeQuizId, { [fakeQId]: "A" }, 45, { telemetry, deviceInfo: "Mozilla/5.0", ipAddress: "192.168.1.100" });
        (0, assert_1.default)(savedData !== null);
        assert_1.default.strictEqual(savedData.device_info, JSON.stringify(telemetry));
        assert_1.default.strictEqual(savedData.ip_address, "192.168.1.100");
        assert_1.default.strictEqual(savedData.total_score, 5);
    }
    finally {
        Quiz.findById = origQuizFindById;
        QuizQuestion.find = origQuestionFind;
        QuizSubmission.countDocuments = origSubmissionCount;
        QuizSubmission.create = origSubmissionCreate;
    }
});
console.log("\n========================================================");
console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
console.log("========================================================\n");
process.exit(0);
