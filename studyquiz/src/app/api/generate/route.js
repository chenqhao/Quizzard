import { NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/gemini';

export async function POST(request) {
  try {
    const body = await request.json();
    const { notes, count, type, difficulty } = body;

    if (!notes || !notes.trim()) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
    }

    const parsedCount = parseInt(count, 10);
    if (!parsedCount || isNaN(parsedCount) || parsedCount < 1 || parsedCount > 20) {
      return NextResponse.json({ error: 'Count must be between 1 and 20' }, { status: 400 });
    }

    const questions = await generateQuestions({
      notes: notes.trim(),
      count: Math.min(parsedCount, 20),
      type: type || 'mixed',
      difficulty: difficulty || 'medium',
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
