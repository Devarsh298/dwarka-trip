import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET single expense
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const expense = await db
      .collection('expenses')
      .findOne({ _id: new ObjectId(params.id) });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ expense }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

// PUT update expense
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { amount, category, description, date, paidBy, paidByName, splitAmong } = body;

    const db = await getDb();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (category) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (date) updateData.date = date;
    if (paidBy) updateData.paidBy = paidBy;
    if (paidByName) updateData.paidByName = paidByName;
    if (splitAmong) updateData.splitAmong = splitAmong;

    const result = await db
      .collection('expenses')
      .updateOne(
        { _id: new ObjectId(params.id) },
        { $set: updateData }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Expense updated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE expense
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    
    const result = await db
      .collection('expenses')
      .deleteOne({ _id: new ObjectId(params.id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Expense deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
