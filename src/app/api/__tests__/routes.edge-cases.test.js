/**
 * Additional edge-case tests for the generate and grade API routes.
 */

// ── Generate API edge cases ─────────────────────────────────

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init = {}) => ({
      status: init.status || 200,
      json: async () => body,
    })),
  },
}));

jest.mock('@/lib/gemini', () => ({
  generateQuestions: jest.fn(),
  gradeWrittenAnswer: jest.fn(),
}));

import { POST as generatePOST } from '@/app/api/generate/route';
import { POST as gradePOST } from '@/app/api/quiz/grade/route';
import { generateQuestions, gradeWrittenAnswer } from '@/lib/gemini';

function createRequest(body) {
  return { json: async () => body };
}

describe('POST /api/generate — edge cases', () => {
  afterEach(() => jest.clearAllMocks());

  test('accepts count of exactly 1 (lower boundary)', async () => {
    generateQuestions.mockResolvedValueOnce([{ type: 'written', question_text: 'Q' }]);

    const response = await generatePOST(
      createRequest({ notes: 'Some notes', count: 1, type: 'mixed', difficulty: 'easy' })
    );

    expect(response.status).toBe(200);
    expect(generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1 })
    );
  });

  test('accepts count of exactly 20 (upper boundary)', async () => {
    generateQuestions.mockResolvedValueOnce([]);

    const response = await generatePOST(
      createRequest({ notes: 'Some notes', count: 20, type: 'mixed', difficulty: 'easy' })
    );

    expect(response.status).toBe(200);
    expect(generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ count: 20 })
    );
  });

  test('handles notes with only newlines as non-empty', async () => {
    generateQuestions.mockResolvedValueOnce([]);

    const response = await generatePOST(
      createRequest({ notes: '\n\n\n', count: 1 })
    );

    // newlines only → trim → empty → should be 400
    expect(response.status).toBe(400);
  });

  test('handles notes with tabs as non-empty', async () => {
    generateQuestions.mockResolvedValueOnce([]);

    const response = await generatePOST(
      createRequest({ notes: '\t\t\t', count: 1 })
    );

    // tabs only → trim → empty → should be 400
    expect(response.status).toBe(400);
  });

  test('accepts very long notes', async () => {
    const longNotes = 'A'.repeat(50000);
    generateQuestions.mockResolvedValueOnce([]);

    const response = await generatePOST(
      createRequest({ notes: longNotes, count: 5 })
    );

    expect(response.status).toBe(200);
    expect(generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ notes: longNotes })
    );
  });

  test('passes specific type and difficulty through', async () => {
    generateQuestions.mockResolvedValueOnce([]);

    await generatePOST(
      createRequest({ notes: 'test', count: 3, type: 'written', difficulty: 'hard' })
    );

    expect(generateQuestions).toHaveBeenCalledWith({
      notes: 'test',
      count: 3,
      type: 'written',
      difficulty: 'hard',
    });
  });

  test('returns 400 for count as string "abc"', async () => {
    const response = await generatePOST(
      createRequest({ notes: 'Valid notes', count: 'abc' })
    );

    // NaN is not > 0, so count check fails
    expect(response.status).toBe(400);
  });
});

describe('POST /api/quiz/grade — edge cases', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns 400 when all fields are empty strings', async () => {
    const response = await gradePOST(
      createRequest({ question: '', sampleAnswer: '', userAnswer: '' })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  test('returns 400 when question is empty but others are set', async () => {
    const response = await gradePOST(
      createRequest({ question: '', sampleAnswer: 'answer', userAnswer: 'my answer' })
    );

    expect(response.status).toBe(400);
  });

  test('handles very long userAnswer without error', async () => {
    const longAnswer = 'B'.repeat(10000);
    gradeWrittenAnswer.mockResolvedValueOnce({
      is_correct: true,
      score: 100,
      feedback: 'Comprehensive!',
    });

    const response = await gradePOST(
      createRequest({
        question: 'Long answer test?',
        sampleAnswer: 'Expected',
        userAnswer: longAnswer,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.is_correct).toBe(true);
  });

  test('handles null values as missing', async () => {
    const response = await gradePOST(
      createRequest({ question: null, sampleAnswer: 'a', userAnswer: 'b' })
    );

    expect(response.status).toBe(400);
  });

  test('handles score of 0 in response correctly (falsy but valid)', async () => {
    gradeWrittenAnswer.mockResolvedValueOnce({
      is_correct: false,
      score: 0,
      feedback: 'Incorrect answer.',
    });

    const response = await gradePOST(
      createRequest({
        question: 'Q?',
        sampleAnswer: 'Correct answer',
        userAnswer: 'Wrong answer',
      })
    );
    const data = await response.json();

    expect(data.score).toBe(0);
    expect(data.is_correct).toBe(false);
  });

  test('handles is_correct being undefined in AI result (defaults to false)', async () => {
    gradeWrittenAnswer.mockResolvedValueOnce({
      score: 50,
      feedback: 'Partial',
      // is_correct not set
    });

    const response = await gradePOST(
      createRequest({
        question: 'Q?',
        sampleAnswer: 'A',
        userAnswer: 'B',
      })
    );
    const data = await response.json();

    expect(data.is_correct).toBe(false); // ?? false → false
  });
});

describe('POST /api/generate — malformed body & parsedCount', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns 500 when request.json() throws (malformed body)', async () => {
    const response = await generatePOST({
      json: async () => { throw new SyntaxError('Unexpected token'); },
    });

    expect(response.status).toBe(500);
  });

  test('uses parsedCount (not raw count) when count is a numeric string', async () => {
    generateQuestions.mockResolvedValueOnce([]);

    const response = await generatePOST(
      createRequest({ notes: 'Test notes', count: '5', type: 'mixed', difficulty: 'easy' })
    );

    expect(response.status).toBe(200);
    // parsedCount should be 5 (integer), not "5" (string)
    expect(generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ count: 5 })
    );
  });

  test('returns 400 for count as float 1.5', async () => {
    generateQuestions.mockResolvedValueOnce([]);

    const response = await generatePOST(
      createRequest({ notes: 'Test notes', count: 1.5 })
    );

    // parseInt(1.5, 10) === 1, which is valid
    expect(response.status).toBe(200);
    expect(generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1 })
    );
  });

  test('returns 400 when count is boolean true', async () => {
    const response = await generatePOST(
      createRequest({ notes: 'Valid notes', count: true })
    );

    // parseInt(true, 10) === NaN
    expect(response.status).toBe(400);
  });

  test('returns 400 when count is an empty object', async () => {
    const response = await generatePOST(
      createRequest({ notes: 'Valid notes', count: {} })
    );

    // parseInt({}, 10) === NaN
    expect(response.status).toBe(400);
  });
});

describe('POST /api/quiz/grade — malformed body', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns 200 with fallback when request.json() throws', async () => {
    const response = await gradePOST({
      json: async () => { throw new SyntaxError('Unexpected token'); },
    });

    // The catch block returns 200 with fallback grading
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.is_correct).toBe(false);
    expect(data.feedback).toContain('manual review');
  });

  test('returns 400 when only userAnswer is missing', async () => {
    const response = await gradePOST(
      createRequest({ question: 'Q?', sampleAnswer: 'A' })
    );

    expect(response.status).toBe(400);
  });

  test('returns 400 when only sampleAnswer is missing', async () => {
    const response = await gradePOST(
      createRequest({ question: 'Q?', userAnswer: 'B' })
    );

    expect(response.status).toBe(400);
  });

  test('returns 200 with fallback feedback when score is undefined', async () => {
    gradeWrittenAnswer.mockResolvedValueOnce({
      is_correct: true,
      // score missing
      feedback: 'Good job',
    });

    const response = await gradePOST(
      createRequest({ question: 'Q?', sampleAnswer: 'A', userAnswer: 'B' })
    );
    const data = await response.json();

    expect(data.score).toBe(0); // ?? 0
    expect(data.is_correct).toBe(true);
  });

  test('returns 200 with fallback feedback when feedback is undefined', async () => {
    gradeWrittenAnswer.mockResolvedValueOnce({
      is_correct: false,
      score: 20,
      // feedback missing
    });

    const response = await gradePOST(
      createRequest({ question: 'Q?', sampleAnswer: 'A', userAnswer: 'B' })
    );
    const data = await response.json();

    expect(data.feedback).toBe('Unable to grade automatically.');
  });
});
