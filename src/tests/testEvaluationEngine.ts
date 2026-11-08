// src/tests/testEvaluationEngine.ts
import assert from "assert";
import {
  evaluateMcq,
  evaluateMultipleSelect,
  evaluateSliderNumeric,
  evaluateDragDrop,
  evaluateFillBlank,
  evaluateTrueFalse,
  evaluateAnswers,
  QuestionForEvaluation,
} from "../services/quiz/evaluationEngine";
import { computeGrading } from "../services/assessmentService";

let totalTests = 0;
let passedTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
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
  const q: QuestionForEvaluation = {
    type: "mcq",
    marks: 2,
    options: ["Alpha", "Beta", "Gamma"],
    correct_answer: 1,
  };
  const res1 = evaluateMcq(q, 1);
  assert.strictEqual(res1.isCorrect, true);
  assert.strictEqual(res1.score, 2);

  const res2 = evaluateMcq(q, "1");
  assert.strictEqual(res2.isCorrect, true);
  assert.strictEqual(res2.score, 2);
});

test("MCQ: index answer matching text correct_answer", () => {
  const q: QuestionForEvaluation = {
    type: "mcq",
    marks: 3,
    options: ["Paris", "London", "Tokyo"],
    correct_answer: "Tokyo",
  };
  const res = evaluateMcq(q, 2);
  assert.strictEqual(res.isCorrect, true);
  assert.strictEqual(res.score, 3);
});

test("MCQ: text answer matching index correct_answer", () => {
  const q: QuestionForEvaluation = {
    type: "mcq",
    marks: 4,
    options: ["Mercury", "Venus", "Earth"],
    correct_answer: 0,
  };
  const res = evaluateMcq(q, "mercury");
  assert.strictEqual(res.isCorrect, true);
  assert.strictEqual(res.score, 4);
});

test("MCQ: whitespace and case insensitivity", () => {
  const q: QuestionForEvaluation = {
    type: "mcq",
    marks: 1,
    options: ["Option A", "Option B"],
    correct_answer: "Option B",
  };
  const res = evaluateMcq(q, "   option b   ");
  assert.strictEqual(res.isCorrect, true);
  assert.strictEqual(res.score, 1);
});

test("MCQ: wrong answer and empty answer", () => {
  const q: QuestionForEvaluation = {
    type: "mcq",
    marks: 5,
    options: ["A", "B", "C"],
    correct_answer: 1,
  };
  assert.strictEqual(evaluateMcq(q, 0).isCorrect, false);
  assert.strictEqual(evaluateMcq(q, 0).score, 0);
  assert.strictEqual(evaluateMcq(q, null).isCorrect, false);
  assert.strictEqual(evaluateMcq(q, "").isCorrect, false);
  assert.strictEqual(evaluateMcq(q, undefined).isCorrect, false);
});

// -----------------------------------------------------------
// 2. Multiple-Select Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 2. Multiple-Select Strategy (Partial Credit & Floor 0) ---");

test("Multiple-Select: all correct returns full marks", () => {
  const q: QuestionForEvaluation = {
    type: "multiple-select",
    marks: 4,
    options: ["A", "B", "C", "D"],
    correct_answer: [0, 2], // A and C
  };
  const res = evaluateMultipleSelect(q, [0, 2]);
  assert.strictEqual(res.isCorrect, true);
  assert.strictEqual(res.score, 4);
});

test("Multiple-Select: text choices normalized against index correct_answer", () => {
  const q: QuestionForEvaluation = {
    type: "multiple-select",
    marks: 2,
    options: ["Red", "Green", "Blue"],
    correct_answer: [0, 1],
  };
  const res = evaluateMultipleSelect(q, ["red", "green"]);
  assert.strictEqual(res.isCorrect, true);
  assert.strictEqual(res.score, 2);
});

test("Multiple-Select: partial credit with right-minus-wrong (1 right, 0 wrong)", () => {
  const q: QuestionForEvaluation = {
    type: "multiple-select",
    marks: 4,
    options: ["A", "B", "C", "D"],
    correct_answer: [0, 2], // 2 correct choices, 2 marks each
  };
  // User selects only 1 correct choice
  const res = evaluateMultipleSelect(q, [0]);
  assert.strictEqual(res.isCorrect, false);
  assert.strictEqual(res.score, 2); // 1/2 of 4 = 2 marks
});

test("Multiple-Select: partial credit with right-minus-wrong (2 right, 1 wrong)", () => {
  const q: QuestionForEvaluation = {
    type: "multiple-select",
    marks: 6,
    options: ["A", "B", "C", "D"],
    correct_answer: [0, 1, 2], // 3 correct choices
  };
  // User selects A (correct), B (correct), D (wrong penalty)
  // net = Math.max(0, 2 - 1) = 1. Earned = (1 / 3) * 6 = 2
  const res = evaluateMultipleSelect(q, [0, 1, 3]);
  assert.strictEqual(res.isCorrect, false);
  assert.strictEqual(res.score, 2);
});

test("Multiple-Select: floor at 0 (wrong choices exceed right choices)", () => {
  const q: QuestionForEvaluation = {
    type: "multiple-select",
    marks: 4,
    options: ["A", "B", "C", "D"],
    correct_answer: [0], // 1 correct choice
  };
  // User selects A (correct), B (wrong), C (wrong) -> net = max(0, 1 - 2) = 0
  const res = evaluateMultipleSelect(q, [0, 1, 2]);
  assert.strictEqual(res.isCorrect, false);
  assert.strictEqual(res.score, 0); // Must floor to 0, NEVER negative
});

test("Multiple-Select: empty / invalid answer gives 0", () => {
  const q: QuestionForEvaluation = {
    type: "multiple-select",
    marks: 4,
    options: ["A", "B"],
    correct_answer: [0, 1],
  };
  assert.strictEqual(evaluateMultipleSelect(q, []).score, 0);
  assert.strictEqual(evaluateMultipleSelect(q, null).score, 0);
});

// -----------------------------------------------------------
// 3. Slider & Numeric Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 3. Slider & Numeric Strategy (Tolerance Check) ---");

test("Slider/Numeric: exact target match with tolerance 0", () => {
  const q: QuestionForEvaluation = {
    type: "slider",
    marks: 3,
    correct_answer: 50,
    tolerance: 0,
  };
  const res1 = evaluateSliderNumeric(q, 50);
  assert.strictEqual(res1.isCorrect, true);
  assert.strictEqual(res1.score, 3);

  const res2 = evaluateSliderNumeric(q, 51);
  assert.strictEqual(res2.isCorrect, false);
  assert.strictEqual(res2.score, 0);
});

test("Slider/Numeric: within tolerance passes and earns marks", () => {
  const q: QuestionForEvaluation = {
    type: "numeric",
    marks: 5,
    correct_answer: 100,
    tolerance: 5, // allows [95, 105]
  };
  assert.strictEqual(evaluateSliderNumeric(q, 103).isCorrect, true);
  assert.strictEqual(evaluateSliderNumeric(q, 95).isCorrect, true);
  assert.strictEqual(evaluateSliderNumeric(q, 105).isCorrect, true);
  assert.strictEqual(evaluateSliderNumeric(q, 103).score, 5);

  // Outside tolerance
  assert.strictEqual(evaluateSliderNumeric(q, 94.9).isCorrect, false);
  assert.strictEqual(evaluateSliderNumeric(q, 105.1).isCorrect, false);
});

test("Slider/Numeric: decimal tolerance precision", () => {
  const q: QuestionForEvaluation = {
    type: "slider",
    marks: 2,
    correct_answer: 3.1415,
    tolerance: 0.01,
  };
  assert.strictEqual(evaluateSliderNumeric(q, 3.14).isCorrect, true);
  assert.strictEqual(evaluateSliderNumeric(q, "3.15").isCorrect, true);
  assert.strictEqual(evaluateSliderNumeric(q, 3.16).isCorrect, false);
});

test("Slider/Numeric: canonical solution format includes tolerance", () => {
  const q: QuestionForEvaluation = {
    type: "slider",
    marks: 2,
    correct_answer: 50,
    tolerance: 5,
  };
  const res = evaluateSliderNumeric(q, 49);
  assert.strictEqual(res.canonicalSolution, "50 (±5)");
});

// -----------------------------------------------------------
// 4. Drag-Drop Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 4. Drag-Drop Strategy (Strict Ordered Pair Matching) ---");

test("Drag-Drop: correct ordered pairs earn full marks", () => {
  const q: QuestionForEvaluation = {
    type: "drag-drop",
    marks: 6,
    dragItems: {
      items: ["France", "Germany", "Japan"],
      matches: ["Paris", "Berlin", "Tokyo"],
    },
  };
  // User submits matching array
  const res = evaluateDragDrop(q, ["Paris", "Berlin", "Tokyo"]);
  assert.strictEqual(res.isCorrect, true);
  assert.strictEqual(res.score, 6);
});

test("Drag-Drop: swapped pairs FAIL (proves not an unordered Set)", () => {
  const q: QuestionForEvaluation = {
    type: "drag-drop",
    marks: 6,
    dragItems: {
      items: ["France", "Germany"],
      matches: ["Paris", "Berlin"],
    },
  };
  // An unordered Set would say both "Paris" and "Berlin" exist.
  // But France -> Berlin, Germany -> Paris is WRONG!
  const res = evaluateDragDrop(q, ["Berlin", "Paris"]);
  assert.strictEqual(res.isCorrect, false);
  assert.strictEqual(res.score, 0); // 0 out of 2 pairs matched
});

test("Drag-Drop: object mapping input format and partial match", () => {
  const q: QuestionForEvaluation = {
    type: "drag-drop",
    marks: 4,
    dragItems: {
      items: ["A", "B", "C", "D"],
      matches: ["1", "2", "3", "4"],
    },
  };
  // User gets 2 pairs right, 2 wrong
  const res = evaluateDragDrop(q, {
    A: "1",
    B: "2",
    C: "wrong",
    D: "wrong",
  });
  assert.strictEqual(res.isCorrect, false);
  assert.strictEqual(res.score, 2); // 2/4 * 4 = 2 marks
});

test("Drag-Drop: tuple array input format", () => {
  const q: QuestionForEvaluation = {
    type: "drag-drop",
    marks: 3,
    dragItems: {
      items: ["Apple", "Banana", "Cherry"],
      matches: ["Red", "Yellow", "Red"],
    },
  };
  const res = evaluateDragDrop(q, [
    ["Apple", "Red"],
    ["Banana", "Yellow"],
    ["Cherry", "Red"],
  ]);
  assert.strictEqual(res.isCorrect, true);
  assert.strictEqual(res.score, 3);
});

// -----------------------------------------------------------
// 5. Fill-Blank Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 5. Fill-Blank Strategy (Trimming & Alternatives) ---");

test("Fill-Blank: trimming whitespace and case-insensitivity", () => {
  const q: QuestionForEvaluation = {
    type: "fill-blank",
    marks: 2,
    correct_answer: "mitochondria",
  };
  const res = evaluateFillBlank(q, "   Mitochondria   ");
  assert.strictEqual(res.isCorrect, true);
  assert.strictEqual(res.score, 2);
});

test("Fill-Blank: pipe-delimited alternatives", () => {
  const q: QuestionForEvaluation = {
    type: "fill-blank",
    marks: 3,
    correct_answer: "color | colour",
  };
  assert.strictEqual(evaluateFillBlank(q, "color").isCorrect, true);
  assert.strictEqual(evaluateFillBlank(q, "Colour").isCorrect, true);
  assert.strictEqual(evaluateFillBlank(q, "red").isCorrect, false);
});

test("Fill-Blank: array alternatives & options fallback", () => {
  const q: QuestionForEvaluation = {
    type: "fill-blank",
    marks: 2,
    correct_answer: ["gray", "grey"],
    options: ["silver"],
  };
  assert.strictEqual(evaluateFillBlank(q, "gray").isCorrect, true);
  assert.strictEqual(evaluateFillBlank(q, "grey").isCorrect, true);
  assert.strictEqual(evaluateFillBlank(q, "silver").isCorrect, true);
  assert.strictEqual(evaluateFillBlank(q, "black").isCorrect, false);
});

// -----------------------------------------------------------
// 6. True-False Strategy Tests
// -----------------------------------------------------------
console.log("\n--- 6. True-False Strategy (Boolean Normalization) ---");

test("True-False: boolean and string representations", () => {
  const qTrue: QuestionForEvaluation = {
    type: "true-false",
    marks: 1,
    correct_answer: true,
  };
  assert.strictEqual(evaluateTrueFalse(qTrue, true).isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qTrue, "true").isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qTrue, "True").isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qTrue, "t").isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qTrue, 1).isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qTrue, "yes").isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qTrue, false).isCorrect, false);
  assert.strictEqual(evaluateTrueFalse(qTrue, "false").isCorrect, false);

  const qFalse: QuestionForEvaluation = {
    type: "true-false",
    marks: 1,
    correct_answer: false,
  };
  assert.strictEqual(evaluateTrueFalse(qFalse, false).isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qFalse, "false").isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qFalse, "f").isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qFalse, 0).isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qFalse, "no").isCorrect, true);
  assert.strictEqual(evaluateTrueFalse(qFalse, true).isCorrect, false);
});

// -----------------------------------------------------------
// 7. Core evaluateAnswers Engine Integration
// -----------------------------------------------------------
console.log("\n--- 7. evaluateAnswers Engine & computeGrading ---");

test("evaluateAnswers: multi-type quiz batch evaluation and telemetry", () => {
  const questions: QuestionForEvaluation[] = [
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

  const result = evaluateAnswers(questions, answersMap);

  assert.strictEqual(result.totalQuestions, 6);
  assert.strictEqual(result.maxScore, 13); // 2 + 4 + 3 + 2 + 1 + 1 = 13
  assert.strictEqual(result.totalScore, 11); // 2 + 2 + 3 + 2 + 1 + 1 = 11
  assert.strictEqual(result.correctCount, 5); // q2 is partial, not 100% correct
  assert.strictEqual(result.totalTimeMs, 8000);
  assert.strictEqual(result.totalTimeSec, 8);
  assert.strictEqual(result.percent, 84.62); // (11 / 13) * 100 = 84.615...

  // Check formatted answers contain feedback and telemetry
  assert.strictEqual(result.formattedAnswers.length, 6);
  assert.strictEqual(result.formattedAnswers[0].score, 2);
  assert.strictEqual(result.formattedAnswers[0].max_score, 2);
  assert.strictEqual(result.formattedAnswers[0].feedback.explanation, "B is correct");
  assert.strictEqual(result.formattedAnswers[1].score, 2);
  assert.strictEqual(result.formattedAnswers[1].is_correct, false);

  // computeGrading produces identical output
  const gradingResult = computeGrading(questions, answersMap);
  assert.strictEqual(gradingResult.totalScore, result.totalScore);
  assert.strictEqual(gradingResult.percent, result.percent);
  assert.strictEqual(gradingResult.maxScore, result.maxScore);
});

test("evaluateAnswers: handles Map input and missing answers cleanly", () => {
  const questions: QuestionForEvaluation[] = [
    { _id: "q1", type: "mcq", marks: 5, correct_answer: "Yes" },
    { _id: "q2", type: "fill-blank", marks: 5, correct_answer: "No" },
  ];
  const map = new Map<string, any>();
  map.set("q1", "Yes"); // Unanswered q2

  const result = evaluateAnswers(questions, map);
  assert.strictEqual(result.totalScore, 5);
  assert.strictEqual(result.maxScore, 10);
  assert.strictEqual(result.correctCount, 1);
  assert.strictEqual(result.formattedAnswers[1].is_correct, false);
  assert.strictEqual(result.formattedAnswers[1].score, 0);
});

// -----------------------------------------------------------
// 8. Edge Case & Regression Tests (Discovered during review)
// -----------------------------------------------------------
console.log("--- 8. Edge Case & Deep Verification Tests ---");

test("MCQ: numeric options string vs index resolution", () => {
  const q: QuestionForEvaluation = {
    type: "mcq",
    marks: 1,
    options: ["1", "2", "3", "4"],
    correct_answer: "1", // author provided string "1" (option at index 0)
  };
  // User sends string "1" (matches option 0)
  assert.strictEqual(evaluateMcq(q, "1").isCorrect, true);
  // User sends index 0 (matches option 0)
  assert.strictEqual(evaluateMcq(q, 0).isCorrect, true);
  // User sends index 1 (option "2" - wrong!)
  assert.strictEqual(evaluateMcq(q, 1).isCorrect, false);
});

test("Multiple-Select: numeric options strings match option texts correctly", () => {
  const q: QuestionForEvaluation = {
    type: "multiple-select",
    marks: 4,
    options: ["1", "2", "3", "4"],
    correct_answer: [0, 1], // options "1" and "2"
  };
  // Strings ["1", "2"] should match options at indices 0 and 1
  const resStrings = evaluateMultipleSelect(q, ["1", "2"]);
  assert.strictEqual(resStrings.isCorrect, true);
  assert.strictEqual(resStrings.score, 4);

  // Numbers [0, 1] should also match
  const resIndices = evaluateMultipleSelect(q, [0, 1]);
  assert.strictEqual(resIndices.isCorrect, true);
  assert.strictEqual(resIndices.score, 4);

  // Strings ["2", "3"] should have partial credit / penalty
  const resWrong = evaluateMultipleSelect(q, ["2", "3"]);
  assert.strictEqual(resWrong.isCorrect, false);
});

test("Slider/Numeric: rejects booleans and arrays to prevent false positive 0/1", () => {
  const qZero: QuestionForEvaluation = {
    type: "numeric",
    marks: 5,
    correct_answer: 0,
    tolerance: 0,
  };
  // Boolean false should NOT evaluate to 0
  assert.strictEqual(evaluateSliderNumeric(qZero, false).isCorrect, false);
  assert.strictEqual(evaluateSliderNumeric(qZero, false).score, 0);

  // Array [0] should NOT evaluate to 0
  assert.strictEqual(evaluateSliderNumeric(qZero, [0]).isCorrect, false);
  assert.strictEqual(evaluateSliderNumeric(qZero, [0]).score, 0);

  // Valid number 0 or string "0" should match
  assert.strictEqual(evaluateSliderNumeric(qZero, 0).isCorrect, true);
  assert.strictEqual(evaluateSliderNumeric(qZero, "0").isCorrect, true);

  const qOne: QuestionForEvaluation = {
    type: "numeric",
    marks: 5,
    correct_answer: 1,
    tolerance: 0,
  };
  // Boolean true should NOT evaluate to 1
  assert.strictEqual(evaluateSliderNumeric(qOne, true).isCorrect, false);
  assert.strictEqual(evaluateSliderNumeric(qOne, true).score, 0);
  assert.strictEqual(evaluateSliderNumeric(qOne, 1).isCorrect, true);
});

test("Drag-Drop: handles match indices and object mappings", () => {
  const q: QuestionForEvaluation = {
    type: "drag-drop",
    marks: 2,
    dragItems: {
      items: ["France", "Germany"],
      matches: ["Paris", "Berlin"],
    },
  };
  // Indices array [0, 1]
  const resIndices = evaluateDragDrop(q, [0, 1]);
  assert.strictEqual(resIndices.isCorrect, true);
  assert.strictEqual(resIndices.score, 2);

  // Swapped indices [1, 0] must fail
  const resSwapped = evaluateDragDrop(q, [1, 0]);
  assert.strictEqual(resSwapped.isCorrect, false);
  assert.strictEqual(resSwapped.score, 0);

  // Tuples with indices
  const resTuples = evaluateDragDrop(q, [["France", 0], ["Germany", 1]]);
  assert.strictEqual(resTuples.isCorrect, true);
  assert.strictEqual(resTuples.score, 2);

  // Object with indices
  const resObj = evaluateDragDrop(q, { France: 0, Germany: 1 });
  assert.strictEqual(resObj.isCorrect, true);
  assert.strictEqual(resObj.score, 2);

  // Array of single-key objects
  const resDicts = evaluateDragDrop(q, [{ France: "Paris" }, { Germany: "Berlin" }]);
  assert.strictEqual(resDicts.isCorrect, true);
  assert.strictEqual(resDicts.score, 2);
});

test("True-False: options ['True', 'False'] with index 0 resolves to True", () => {
  const q: QuestionForEvaluation = {
    type: "true-false",
    marks: 2,
    options: ["True", "False"],
    correct_answer: true,
  };
  // User selects option 0 ("True")
  const res0 = evaluateTrueFalse(q, 0);
  assert.strictEqual(res0.isCorrect, true);
  assert.strictEqual(res0.score, 2);

  // User selects option 1 ("False")
  const res1 = evaluateTrueFalse(q, 1);
  assert.strictEqual(res1.isCorrect, false);
  assert.strictEqual(res1.score, 0);
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
    (Quiz as any).findById = async () => ({
      _id: fakeQuizId,
      title: "Calculus Test",
      subject: "Math",
    });

    (QuizQuestion as any).find = () => ({
      lean: async () => [
        {
          _id: fakeQId,
          type: "mcq",
          marks: 5,
          correct_answer: "A",
        },
      ],
    });

    (QuizSubmission as any).countDocuments = async () => 0;

    let savedData: any = null;
    (QuizSubmission as any).create = async (data: any) => {
      savedData = data;
      return { ...data, _id: "507f1f77bcf86cd799439014" };
    };

    const telemetry = { tabSwitches: 2, blurDurationMs: 3400 };
    await submitQuiz(
      fakeUserId,
      fakeQuizId,
      { [fakeQId]: "A" },
      45,
      { telemetry, deviceInfo: "Mozilla/5.0", ipAddress: "192.168.1.100" }
    );

    assert(savedData !== null);
    assert.strictEqual(savedData.device_info, JSON.stringify(telemetry));
    assert.strictEqual(savedData.ip_address, "192.168.1.100");
    assert.strictEqual(savedData.total_score, 5);
  } finally {
    (Quiz as any).findById = origQuizFindById;
    (QuizQuestion as any).find = origQuestionFind;
    (QuizSubmission as any).countDocuments = origSubmissionCount;
    (QuizSubmission as any).create = origSubmissionCreate;
  }
});

console.log("\n========================================================");
console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
console.log("========================================================\n");

process.exit(0);
