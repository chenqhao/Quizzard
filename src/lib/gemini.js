/**
 * Google Gemini API client for question generation and answer grading.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

/**
 * Call Gemini API with text or multimodal content.
 * @param {string|Array} promptOrParts - Either a text string or an array of content parts
 *   Parts can be: { text: "..." } or { inlineData: { mimeType: "...", data: "base64..." } }
 */
async function callGemini(promptOrParts) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Normalize: if a plain string is passed, wrap it as a text part
  const parts = typeof promptOrParts === 'string'
    ? [{ text: promptOrParts }]
    : promptOrParts;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini API');
  }

  return JSON.parse(text);
}

/**
 * Generate quiz questions from class notes.
 */
export async function generateQuestions({ notes, count, type, difficulty, files }) {
  const typeInstruction = type === 'mixed'
    ? 'Generate a mix of multiple_choice and written questions.'
    : `Generate only ${type} questions.`;

  const hasFiles = files && files.length > 0;
  const hasNotes = notes && notes.trim();

  // Build the source description based on what's provided
  let sourceDescription;
  if (hasNotes && hasFiles) {
    sourceDescription = 'the following class notes AND the attached files (images, documents, etc.)';
  } else if (hasFiles) {
    sourceDescription = 'the attached files (images, documents, etc.)';
  } else {
    sourceDescription = 'the following class notes';
  }

  let prompt = `You are an expert educational quiz generator. Generate exactly ${count} quiz questions based ONLY on ${sourceDescription}. Do NOT make up information that is not in the provided content.

${typeInstruction}

Difficulty level: ${difficulty}
`;

  if (hasNotes) {
    prompt += `
CLASS NOTES:
"""
${notes}
"""
`;
  }

  if (hasFiles) {
    prompt += `
ATTACHED FILES: ${files.length} file(s) have been attached. Carefully analyze ALL content in these files (text, diagrams, charts, tables, formulas, etc.) and use them to generate questions.
`;
  }

  prompt += `
RULES:
- Only use information from the provided content (notes and/or attached files)
- Generate clear, well-formed questions
- For multiple_choice: provide exactly 4 answer choices
- IMPORTANT: Some multiple choice questions CAN have multiple correct answers. When a question naturally has multiple correct answers (e.g., "Which of the following are true?", "Select all that apply"), set is_multi_select to true and put ALL correct answers in the correct_answers array.
- For single-answer multiple choice, set is_multi_select to false and correct_answers should contain exactly one answer.
- For written: provide a comprehensive sample answer and grading notes. Set is_multi_select to false.
- Include a short explanation for each question
- Set the difficulty to "${difficulty}"
- CRITICAL: Every value in correct_answers MUST exactly match one of the strings in the choices array (character-for-character identical)

Return a JSON array of objects with this exact schema:
[
  {
    "type": "multiple_choice" or "written",
    "question_text": "The question",
    "choices": ["A", "B", "C", "D"] (only for multiple_choice, null for written),
    "correct_answers": ["The correct answer text"] (array — one item for single-answer, multiple for multi-select),
    "is_multi_select": false (true if multiple answers are correct),
    "explanation": "Brief explanation of why this is correct",
    "difficulty": "${difficulty}"
  }
]

Return ONLY the JSON array, no other text.`;

  // Build multimodal content parts
  const parts = [];

  // Add file parts first (so Gemini sees them before the prompt)
  if (hasFiles) {
    for (const file of files) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data, // base64-encoded
        },
      });
    }
  }

  // Add the text prompt
  parts.push({ text: prompt });

  const questions = await callGemini(parts);

  // Validate structure
  if (!Array.isArray(questions)) {
    throw new Error('Invalid response format from AI');
  }

  return questions.map((q) => {
    // Normalize: support both old "correct_answer" string and new "correct_answers" array
    let correctAnswers = q.correct_answers || [];
    if (correctAnswers.length === 0 && q.correct_answer) {
      correctAnswers = [q.correct_answer];
    }

    // For backward compat, also set correct_answer as the first correct answer
    const correctAnswer = correctAnswers[0] || q.correct_answer || '';

    // Ensure correct answers actually match choices exactly
    if (q.type === 'multiple_choice' && q.choices) {
      correctAnswers = correctAnswers.map(ca => {
        const exactMatch = q.choices.find(c => c === ca);
        if (exactMatch) return exactMatch;
        // Try case-insensitive / trimmed match
        const fuzzyMatch = q.choices.find(c => c.trim().toLowerCase() === ca.trim().toLowerCase());
        return fuzzyMatch || ca;
      });
    }

    return {
      type: q.type || 'multiple_choice',
      question_text: q.question_text || '',
      choices: q.type === 'multiple_choice' ? (q.choices || []) : null,
      correct_answer: correctAnswers.join('|||'), // Store multi-answers joined by delimiter
      correct_answers: correctAnswers, // Keep array for preview
      is_multi_select: q.is_multi_select || correctAnswers.length > 1,
      explanation: q.explanation || '',
      difficulty: q.difficulty || difficulty,
    };
  });
}

/**
 * Grade a written answer using AI comparison.
 */
export async function gradeWrittenAnswer({ question, sampleAnswer, userAnswer }) {
  const prompt = `You are a fair and encouraging teacher grading a student's written answer.

QUESTION: "${question}"

SAMPLE/CORRECT ANSWER: "${sampleAnswer}"

STUDENT'S ANSWER: "${userAnswer}"

Evaluate the student's answer by comparing it to the sample answer. Consider:
1. Does it capture the key concepts?
2. Is it factually correct?
3. Is it complete enough?

Return a JSON object with this schema:
{
  "is_correct": true/false (true if the answer demonstrates sufficient understanding),
  "score": 0-100 (percentage score),
  "feedback": "Detailed, encouraging feedback explaining what was good and what could be improved"
}

Return ONLY the JSON object, no other text.`;

  return await callGemini(prompt);
}
