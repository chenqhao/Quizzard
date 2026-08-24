/**
 * Tests for src/app/api/quiz/grade/route.js
 *
 * We mock next/server and @/lib/gemini to avoid needing the Web Request API.
 */

// Mock next/server before any imports
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init = {}) => ({
      status: init.status || 200,
      json: async () => body,
    })),
  },
}));

// Mock the Gemini module
jest.mock('@/lib/gemini', () => ({
  gradeWrittenAnswer: jest.fn(),
}));

import { POST } from '@/app/api/quiz/grade/route';
import { gradeWrittenAnswer } from '@/lib/gemini';

function createRequest(body) {
  return {
    json: async () => body,
  };
}

describe('POST /api/quiz/grade', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 when question is missing', async () => {
    const response = await POST(
      createRequest({ sampleAnswer: 'answer', userAnswer: 'my answer' })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  test('returns 400 when sampleAnswer is missing', async () => {
    const response = await POST(
      createRequest({ question: 'Q?', userAnswer: 'my answer' })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  test('returns 400 when userAnswer is missing', async () => {
    const response = await POST(
      createRequest({ question: 'Q?', sampleAnswer: 'answer' })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  test('returns grading result on success', async () => {
    const gradeResult = {
      is_correct: true,
      score: 90,
      feedback: 'Excellent answer!',
    };
    gradeWrittenAnswer.mockResolvedValueOnce(gradeResult);

    const response = await POST(
      createRequest({
        question: 'What is gravity?',
        sampleAnswer: 'Gravity is a force...',
        userAnswer: 'Gravity pulls things down...',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.is_correct).toBe(true);
    expect(data.score).toBe(90);
    expect(data.feedback).toBe('Excellent answer!');
  });

  test('applies defaults for missing fields in grading result', async () => {
    gradeWrittenAnswer.mockResolvedValueOnce({});

    const response = await POST(
      createRequest({
        question: 'Q?',
        sampleAnswer: 'A',
        userAnswer: 'B',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.is_correct).toBe(false);
    expect(data.score).toBe(0);
    expect(data.feedback).toBe('Unable to grade automatically.');
  });

  test('returns fallback result (200) when grading throws', async () => {
    gradeWrittenAnswer.mockRejectedValueOnce(new Error('API Error'));

    const response = await POST(
      createRequest({
        question: 'Q?',
        sampleAnswer: 'A',
        userAnswer: 'B',
      })
    );
    const data = await response.json();

    // Intentionally returns 200 so the quiz flow isn't broken
    expect(response.status).toBe(200);
    expect(data.is_correct).toBe(false);
    expect(data.score).toBe(0);
    expect(data.feedback).toBe('Could not grade automatically. Needs manual review.');
  });

  test('passes correct arguments to gradeWrittenAnswer', async () => {
    gradeWrittenAnswer.mockResolvedValueOnce({
      is_correct: false,
      score: 50,
      feedback: 'Partially correct',
    });

    await POST(
      createRequest({
        question: 'Explain photosynthesis',
        sampleAnswer: 'Plants convert sunlight...',
        userAnswer: 'Plants make food from sun',
      })
    );

    expect(gradeWrittenAnswer).toHaveBeenCalledWith({
      question: 'Explain photosynthesis',
      sampleAnswer: 'Plants convert sunlight...',
      userAnswer: 'Plants make food from sun',
    });
  });
});
