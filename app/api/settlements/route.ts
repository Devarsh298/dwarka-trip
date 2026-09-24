import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET all settlement payments
export async function GET() {
  try {
    const db = await getDb();
    const settlements = await db
      .collection('settlements')
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json({ settlements }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch settlements' },
      { status: 500 }
    );
  }
}

// POST record a new settlement payment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromMemberId, fromMemberName, toMemberId, toMemberName, amount, date, method } = body;

    if (!fromMemberId || !toMemberId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Missing required settlement fields' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const settlement = {
      fromMemberId,
      fromMemberName: fromMemberName || '',
      toMemberId,
      toMemberName: toMemberName || '',
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      method: method || 'UPI',
      createdAt: new Date(),
    };

    const result = await db.collection('settlements').insertOne(settlement);

    return NextResponse.json(
      { settlement: { ...settlement, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to record settlement' },
      { status: 500 }
    );
  }
}
