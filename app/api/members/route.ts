import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET all members
export async function GET() {
  try {
    const db = await getDb();
    const members = await db
      .collection('members')
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({ members }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST create new member
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check duplicate name (case-insensitive)
    const existing = await db.collection('members').findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A member with this name already exists' },
        { status: 409 }
      );
    }

    const member = {
      name: name.trim(),
      createdAt: new Date(),
    };

    const result = await db.collection('members').insertOne(member);

    return NextResponse.json(
      { member: { ...member, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating member:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create member' },
      { status: 500 }
    );
  }
}
