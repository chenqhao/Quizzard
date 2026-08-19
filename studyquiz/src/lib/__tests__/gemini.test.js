/**
 * Tests for src/lib/gemini.js
 *
 * We mock the global `fetch` so no real network calls are made.
 */

// Save the original env so we can restore it
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV, GEMINI_API_KEY: 'test-api-key-123' };
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

// Helper: build a mock Gemini response
function geminiResponse(json) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }],
    }),
  };
}

// ─── generateQuestions ──────────────────────────────────────

describe('generateQuestions', () => {
  test('returns normalized question array with correct structure', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    const mockQuestions = [
      {
        type: 'multiple_choice',
        question_text: 'What is 2+2?',
        choices: ['3', '4', '5', '6'],
        correct_answers: ['4'],
        is_multi_select: false,
        explanation: 'Basic addition',
        difficulty: 'easy',
      },
    ];

    global.fetch.mockResolvedValueOnce(geminiResponse(mockQuestions));

    const result = await generateQuestions({
      notes: 'Math basics: 2+2=4',
      count: 1,
      type: 'multiple_choice',
      difficulty: 'easy',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'multiple_choice',
      question_text: 'What is 2+2?',
      choices: ['3', '4', '5', '6'],
      correct_answer: '4',
      correct_answers: ['4'],
      is_multi_select: false,
      explanation: 'Basic addition',
      difficulty: 'easy',
    });
  });

  test('normalizes old correct_answer string to correct_answers array', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    const mockQuestions = [
      {
        type: 'multiple_choice',
        question_text: 'Capital of France?',
        choices: ['Berlin', 'Paris', 'London', 'Rome'],
        correct_answer: 'Paris', // old format — no correct_answers
        explanation: 'Geography',
        difficulty: 'easy',
      },
    ];

    global.fetch.mockResolvedValueOnce(geminiResponse(mockQuestions));

    const result = await generateQuestions({
      notes: 'Capital of France is Paris',
      count: 1,
      type: 'multiple_choice',
      difficulty: 'easy',
    });

    expect(result[0].correct_answers).toEqual(['Paris']);
    expect(result[0].correct_answer).toBe('Paris');
  });

  test('sets is_multi_select true when multiple correct answers', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    const mockQuestions = [
      {
        type: 'multiple_choice',
        question_text: 'Which are prime?',
        choices: ['2', '3', '4', '6'],
        correct_answers: ['2', '3'],
        is_multi_select: true,
        explanation: 'Primes',
        difficulty: 'medium',
      },
    ];

    global.fetch.mockResolvedValueOnce(geminiResponse(mockQuestions));

    const result = await generateQuestions({
      notes: 'Primes: 2, 3, 5, 7',
      count: 1,
      type: 'multiple_choice',
      difficulty: 'medium',
    });

    expect(result[0].is_multi_select).toBe(true);
    expect(result[0].correct_answers).toEqual(['2', '3']);
    // correct_answer stores joined value
    expect(result[0].correct_answer).toBe('2|||3');
  });

  test('fuzzy-matches correct answers to choices (case-insensitive)', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    const mockQuestions = [
      {
        type: 'multiple_choice',
        question_text: 'Test?',
        choices: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answers: ['option a'], // lowercase mismatch
        is_multi_select: false,
        explanation: 'Test',
        difficulty: 'easy',
      },
    ];

    global.fetch.mockResolvedValueOnce(geminiResponse(mockQuestions));

    const result = await generateQuestions({
      notes: 'test notes',
      count: 1,
      type: 'multiple_choice',
      difficulty: 'easy',
    });

    // Should have been fuzzy-matched to the exact choice casing
    expect(result[0].correct_answers).toEqual(['Option A']);
  });

  test('sets written question choices to null', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    const mockQuestions = [
      {
        type: 'written',
        question_text: 'Explain gravity.',
        choices: null,
        correct_answers: ['Gravity is a fundamental force...'],
        is_multi_select: false,
        explanation: 'Physics',
        difficulty: 'hard',
      },
    ];

    global.fetch.mockResolvedValueOnce(geminiResponse(mockQuestions));

    const result = await generateQuestions({
      notes: 'Gravity notes',
      count: 1,
      type: 'written',
      difficulty: 'hard',
    });

    expect(result[0].type).toBe('written');
    expect(result[0].choices).toBeNull();
  });

  test('throws when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const { generateQuestions } = await import('@/lib/gemini');

    await expect(
      generateQuestions({ notes: 'test', count: 1, type: 'mixed', difficulty: 'easy' })
    ).rejects.toThrow('GEMINI_API_KEY is not configured');
  });

  test('throws when API returns non-OK response', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    });

    await expect(
      generateQuestions({ notes: 'test', count: 1, type: 'mixed', difficulty: 'easy' })
    ).rejects.toThrow('Gemini API error: 429');
  });

  test('throws when response has no candidates', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [] }),
    });

    await expect(
      generateQuestions({ notes: 'test', count: 1, type: 'mixed', difficulty: 'easy' })
    ).rejects.toThrow('No response from Gemini API');
  });

  test('throws when AI returns non-array response', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(geminiResponse({ not: 'an array' }));

    await expect(
      generateQuestions({ notes: 'test', count: 1, type: 'mixed', difficulty: 'easy' })
    ).rejects.toThrow('Invalid response format from AI');
  });
});

// ─── gradeWrittenAnswer ─────────────────────────────────────

describe('gradeWrittenAnswer', () => {
  test('returns grading result with expected shape', async () => {
    const { gradeWrittenAnswer } = await import('@/lib/gemini');

    const mockResult = {
      is_correct: true,
      score: 85,
      feedback: 'Good answer! You covered the key concepts.',
    };

    global.fetch.mockResolvedValueOnce(geminiResponse(mockResult));

    const result = await gradeWrittenAnswer({
      question: 'What is gravity?',
      sampleAnswer: 'Gravity is a force that attracts objects with mass.',
      userAnswer: 'Gravity pulls things toward earth.',
    });

    expect(result).toEqual(mockResult);
    expect(result.is_correct).toBe(true);
    expect(result.score).toBe(85);
    expect(typeof result.feedback).toBe('string');
  });

  test('calls Gemini API with correct prompt structure', async () => {
    const { gradeWrittenAnswer } = await import('@/lib/gemini');

    const mockResult = { is_correct: false, score: 30, feedback: 'Needs improvement' };
    global.fetch.mockResolvedValueOnce(geminiResponse(mockResult));

    await gradeWrittenAnswer({
      question: 'Test Q',
      sampleAnswer: 'Sample A',
      userAnswer: 'User A',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).toContain('key=test-api-key-123');

    const body = JSON.parse(options.body);
    const prompt = body.contents[0].parts[0].text;
    expect(prompt).toContain('Test Q');
    expect(prompt).toContain('Sample A');
    expect(prompt).toContain('User A');
  });
});
