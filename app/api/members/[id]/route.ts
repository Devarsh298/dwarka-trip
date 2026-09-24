import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// DELETE a member
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();

    await db.collection('members').deleteOne({
      _id: new ObjectId(params.id),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete member' },
      { status: 500 }
    );
  }
}
