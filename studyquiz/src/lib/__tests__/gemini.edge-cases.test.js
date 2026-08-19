/**
 * Additional edge-case tests for src/lib/gemini.js
 *
 * Covers boundary conditions not in the primary gemini test file:
 * - Empty correct_answers with no correct_answer fallback
 * - Missing type defaults
 * - Missing explanation/difficulty defaults
 * - Mixed question types in a single response
 * - Whitespace-only correct_answer values
 */

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV, GEMINI_API_KEY: 'test-key' };
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

function geminiResponse(json) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }],
    }),
  };
}

describe('generateQuestions — edge cases', () => {
  test('defaults type to multiple_choice when type is missing', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          question_text: 'No type Q',
          choices: ['A', 'B', 'C', 'D'],
          correct_answers: ['A'],
          explanation: 'Test',
          difficulty: 'easy',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'mixed', difficulty: 'easy',
    });

    expect(result[0].type).toBe('multiple_choice');
  });

  test('defaults explanation to empty string when missing', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'multiple_choice',
          question_text: 'Q?',
          choices: ['A', 'B', 'C', 'D'],
          correct_answers: ['A'],
          difficulty: 'easy',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'mixed', difficulty: 'easy',
    });

    expect(result[0].explanation).toBe('');
  });

  test('defaults difficulty when missing from AI response', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'written',
          question_text: 'Explain this.',
          choices: null,
          correct_answers: ['Sample answer'],
          explanation: 'Test',
          // no difficulty field
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'written', difficulty: 'hard',
    });

    // Falls back to the requested difficulty
    expect(result[0].difficulty).toBe('hard');
  });

  test('handles empty correct_answers AND no correct_answer gracefully', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'multiple_choice',
          question_text: 'No answer Q',
          choices: ['A', 'B', 'C', 'D'],
          // No correct_answers, no correct_answer
          explanation: 'Test',
          difficulty: 'easy',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'mixed', difficulty: 'easy',
    });

    expect(result[0].correct_answers).toEqual([]);
    expect(result[0].correct_answer).toBe('');
  });

  test('handles mixed question types in single response', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'multiple_choice',
          question_text: 'MC question?',
          choices: ['Yes', 'No', 'Maybe', 'None'],
          correct_answers: ['Yes'],
          is_multi_select: false,
          explanation: 'MC',
          difficulty: 'easy',
        },
        {
          type: 'written',
          question_text: 'Written question?',
          choices: null,
          correct_answers: ['Full written answer'],
          is_multi_select: false,
          explanation: 'Written',
          difficulty: 'hard',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 2, type: 'mixed', difficulty: 'medium',
    });

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('multiple_choice');
    expect(result[0].choices).toEqual(['Yes', 'No', 'Maybe', 'None']);
    expect(result[1].type).toBe('written');
    expect(result[1].choices).toBeNull();
  });

  test('correct_answer joined with ||| for multi-select', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'multiple_choice',
          question_text: 'Multi select?',
          choices: ['A', 'B', 'C', 'D'],
          correct_answers: ['A', 'C', 'D'],
          is_multi_select: true,
          explanation: 'Test',
          difficulty: 'medium',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'mixed', difficulty: 'medium',
    });

    expect(result[0].correct_answer).toBe('A|||C|||D');
    expect(result[0].correct_answers).toEqual(['A', 'C', 'D']);
    expect(result[0].is_multi_select).toBe(true);
  });

  test('auto-detects multi-select when correct_answers has >1 items even if is_multi_select is false', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'multiple_choice',
          question_text: 'Implicit multi?',
          choices: ['X', 'Y', 'Z', 'W'],
          correct_answers: ['X', 'Y'],
          is_multi_select: false, // AI says false but 2 answers
          explanation: 'Test',
          difficulty: 'easy',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'mixed', difficulty: 'easy',
    });

    // Should be auto-detected as multi-select because correct_answers.length > 1
    expect(result[0].is_multi_select).toBe(true);
  });

  test('handles question_text being empty', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'multiple_choice',
          // no question_text
          choices: ['A', 'B', 'C', 'D'],
          correct_answers: ['A'],
          explanation: 'Test',
          difficulty: 'easy',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'mixed', difficulty: 'easy',
    });

    expect(result[0].question_text).toBe('');
  });

  test('handles choices being undefined for MC (defaults to empty array)', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'multiple_choice',
          question_text: 'No choices?',
          // no choices field
          correct_answers: ['A'],
          explanation: 'Test',
          difficulty: 'easy',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'mixed', difficulty: 'easy',
    });

    expect(result[0].choices).toEqual([]);
  });
});

describe('gradeWrittenAnswer — edge cases', () => {
  test('throws when API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const { gradeWrittenAnswer } = await import('@/lib/gemini');

    await expect(
      gradeWrittenAnswer({
        question: 'Q?',
        sampleAnswer: 'A',
        userAnswer: 'B',
      })
    ).rejects.toThrow('GEMINI_API_KEY is not configured');
  });

  test('throws when API returns non-OK status', async () => {
    const { gradeWrittenAnswer } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    });

    await expect(
      gradeWrittenAnswer({
        question: 'Q?',
        sampleAnswer: 'A',
        userAnswer: 'B',
      })
    ).rejects.toThrow('Gemini API error: 500');
  });

  test('throws when response has no content text', async () => {
    const { gradeWrittenAnswer } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [] } }],
      }),
    });

    await expect(
      gradeWrittenAnswer({
        question: 'Q?',
        sampleAnswer: 'A',
        userAnswer: 'B',
      })
    ).rejects.toThrow('No response from Gemini API');
  });
});

// ─── callGemini internals (via generateQuestions) ─────────

describe('callGemini — network & parsing edge cases', () => {
  test('throws when fetch itself rejects (network failure)', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockRejectedValueOnce(new Error('fetch failed'));

    await expect(
      generateQuestions({ notes: 'test', count: 1, type: 'mixed', difficulty: 'easy' })
    ).rejects.toThrow('fetch failed');
  });

  test('throws when AI returns malformed JSON text', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'NOT VALID JSON {[}' }] } }],
      }),
    });

    await expect(
      generateQuestions({ notes: 'test', count: 1, type: 'mixed', difficulty: 'easy' })
    ).rejects.toThrow(); // JSON.parse will throw SyntaxError
  });

  test('throws when candidates is null', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: null }),
    });

    await expect(
      generateQuestions({ notes: 'test', count: 1, type: 'mixed', difficulty: 'easy' })
    ).rejects.toThrow('No response from Gemini API');
  });

  test('throws when candidates[0] has no content', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [{}] }),
    });

    await expect(
      generateQuestions({ notes: 'test', count: 1, type: 'mixed', difficulty: 'easy' })
    ).rejects.toThrow('No response from Gemini API');
  });
});

describe('generateQuestions — fuzzy matching edge cases', () => {
  test('fuzzy-matches answers with leading/trailing whitespace', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'multiple_choice',
          question_text: 'Whitespace test?',
          choices: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answers: ['  Option A  '], // extra whitespace
          is_multi_select: false,
          explanation: 'Test',
          difficulty: 'easy',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'mixed', difficulty: 'easy',
    });

    expect(result[0].correct_answers).toEqual(['Option A']);
  });

  test('falls back to original answer when no choice matches at all', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'multiple_choice',
          question_text: 'No match test?',
          choices: ['X', 'Y', 'Z', 'W'],
          correct_answers: ['Completely Different'],
          is_multi_select: false,
          explanation: 'Test',
          difficulty: 'easy',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'mixed', difficulty: 'easy',
    });

    // Should keep the original since nothing matched
    expect(result[0].correct_answers).toEqual(['Completely Different']);
  });

  test('skips fuzzy matching for written questions (no choices)', async () => {
    const { generateQuestions } = await import('@/lib/gemini');

    global.fetch.mockResolvedValueOnce(
      geminiResponse([
        {
          type: 'written',
          question_text: 'Written Q?',
          choices: null,
          correct_answers: ['   Some answer with whitespace   '],
          is_multi_select: false,
          explanation: 'Test',
          difficulty: 'easy',
        },
      ])
    );

    const result = await generateQuestions({
      notes: 'test', count: 1, type: 'written', difficulty: 'easy',
    });

    // Written questions don't fuzzy-match — original is preserved
    expect(result[0].correct_answers).toEqual(['   Some answer with whitespace   ']);
  });
});
