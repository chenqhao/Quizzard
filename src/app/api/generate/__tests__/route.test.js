/**
 * Tests for src/app/api/generate/route.js
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
  generateQuestions: jest.fn(),
}));

// Import after mocking
import { POST } from '@/app/api/generate/route';
import { generateQuestions } from '@/lib/gemini';

// Helper to create a mock Request
function createRequest(body) {
  return {
    json: async () => body,
  };
}

describe('POST /api/generate', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 when notes is empty', async () => {
    const response = await POST(createRequest({ notes: '', count: 5 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Notes are required');
  });

  test('returns 400 when notes is missing', async () => {
    const response = await POST(createRequest({ count: 5 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Notes are required');
  });

  test('returns 400 when notes is whitespace only', async () => {
    const response = await POST(createRequest({ notes: '   ', count: 5 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Notes are required');
  });

  test('returns 400 when count is 0', async () => {
    const response = await POST(createRequest({ notes: 'Some notes', count: 0 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Count must be between 1 and 20');
  });

  test('returns 400 when count is negative', async () => {
    const response = await POST(createRequest({ notes: 'Some notes', count: -1 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Count must be between 1 and 20');
  });

  test('returns 400 when count exceeds 20', async () => {
    const response = await POST(createRequest({ notes: 'Some notes', count: 21 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Count must be between 1 and 20');
  });

  test('returns 400 when count is missing', async () => {
    const response = await POST(createRequest({ notes: 'Some notes' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Count must be between 1 and 20');
  });

  test('returns 200 with questions on valid input', async () => {
    const mockQuestions = [
      { type: 'multiple_choice', question_text: 'Test Q', choices: ['A', 'B', 'C', 'D'] },
    ];
    generateQuestions.mockResolvedValueOnce(mockQuestions);

    const response = await POST(
      createRequest({ notes: 'Valid notes here', count: 5, type: 'mixed', difficulty: 'medium' })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.questions).toEqual(mockQuestions);
  });

  test('defaults type to mixed and difficulty to medium', async () => {
    generateQuestions.mockResolvedValueOnce([]);

    await POST(createRequest({ notes: 'Valid notes', count: 3 }));

    expect(generateQuestions).toHaveBeenCalledWith({
      notes: 'Valid notes',
      count: 3,
      type: 'mixed',
      difficulty: 'medium',
    });
  });

  test('caps count at 20', async () => {
    generateQuestions.mockResolvedValueOnce([]);

    await POST(createRequest({ notes: 'Valid notes', count: 15, type: 'written', difficulty: 'hard' }));

    expect(generateQuestions).toHaveBeenCalledWith({
      notes: 'Valid notes',
      count: 15,
      type: 'written',
      difficulty: 'hard',
    });
  });

  test('trims notes before passing to generator', async () => {
    generateQuestions.mockResolvedValueOnce([]);

    await POST(createRequest({ notes: '  spaces around  ', count: 1 }));

    expect(generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'spaces around' })
    );
  });

  test('returns 500 when generateQuestions throws', async () => {
    generateQuestions.mockRejectedValueOnce(new Error('Gemini API error'));

    const response = await POST(
      createRequest({ notes: 'Valid notes', count: 5, type: 'mixed', difficulty: 'easy' })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Gemini API error');
  });

  test('returns generic error message when error has no message', async () => {
    generateQuestions.mockRejectedValueOnce(new Error());

    const response = await POST(
      createRequest({ notes: 'Valid notes', count: 5, type: 'mixed', difficulty: 'easy' })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate questions');
  });
});
