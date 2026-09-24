import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET all expenses
export async function GET() {
  try {
    const db = await getDb();
    const expenses = await db
      .collection('expenses')
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json({ expenses }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST create new expense
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, category, description, date, paidBy, paidByName, splitAmong } = body;

    if (!amount || !category || !date || !paidBy || !splitAmong || splitAmong.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const expense = {
      amount: parseFloat(amount),
      category,
      description: description || '',
      date,
      paidBy,
      paidByName: paidByName || '',
      splitAmong,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('expenses').insertOne(expense);

    return NextResponse.json(
      { expense: { ...expense, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create expense' },
      { status: 500 }
    );
  }
}
