import { NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/gemini';

// Increase body size limit for file uploads (20MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { notes, count, type, difficulty, files } = body;

    const hasNotes = notes && notes.trim();
    const hasFiles = files && files.length > 0;

    if (!hasNotes && !hasFiles) {
      return NextResponse.json({ error: 'Please provide notes or upload files' }, { status: 400 });
    }

    const parsedCount = parseInt(count, 10);
    if (!parsedCount || isNaN(parsedCount) || parsedCount < 1 || parsedCount > 20) {
      return NextResponse.json({ error: 'Count must be between 1 and 20' }, { status: 400 });
    }

    const questions = await generateQuestions({
      notes: hasNotes ? notes.trim() : '',
      count: Math.min(parsedCount, 20),
      type: type || 'mixed',
      difficulty: difficulty || 'medium',
      files: hasFiles ? files : [],
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
