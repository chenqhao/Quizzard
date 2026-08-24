import { NextResponse } from 'next/server';
import { gradeWrittenAnswer } from '@/lib/gemini';

export async function POST(request) {
  try {
    const { question, sampleAnswer, userAnswer } = await request.json();

    if (!question || !sampleAnswer || !userAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await gradeWrittenAnswer({ question, sampleAnswer, userAnswer });

    return NextResponse.json({
      is_correct: result.is_correct ?? false,
      score: result.score ?? 0,
      feedback: result.feedback ?? 'Unable to grade automatically.',
    });
  } catch (error) {
    console.error('Grade API error:', error);
    return NextResponse.json({
      is_correct: false,
      score: 0,
      feedback: 'Could not grade automatically. Needs manual review.',
    }, { status: 200 }); // Return 200 with fallback so quiz flow isn't broken
  }
}
