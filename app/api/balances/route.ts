import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export interface PairwiseDebt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  settlementsPaid: number;
  settlementsReceived: number;
  net: number; // positive = receives, negative = owes
  owesTo: { toId: string; toName: string; amount: number }[];
  owedBy: { fromId: string; fromName: string; amount: number }[];
}

export async function GET() {
  try {
    const db = await getDb();

    const [members, expenses, recordedSettlements] = await Promise.all([
      db.collection('members').find({}).toArray(),
      db.collection('expenses').find({}).toArray(),
      db.collection('settlements').find({}).sort({ date: -1, createdAt: -1 }).toArray(),
    ]);

    // Initialize pair matrix: matrix[payerId][consumerId] = total consumed by consumerId on payerId's bills
    const matrix: Record<string, Record<string, number>> = {};
    const settlementsMatrix: Record<string, Record<string, number>> = {};
    const memberNameMap: Record<string, string> = {};

    for (const m of members) {
      const id = m._id.toString();
      memberNameMap[id] = m.name;
      matrix[id] = {};
      settlementsMatrix[id] = {};
      for (const m2 of members) {
        matrix[id][m2._id.toString()] = 0;
        settlementsMatrix[id][m2._id.toString()] = 0;
      }
    }

    // Tally up bill spending
    const totalPaidMap: Record<string, number> = {};
    const totalOwedMap: Record<string, number> = {};
    const settlementsPaidMap: Record<string, number> = {};
    const settlementsReceivedMap: Record<string, number> = {};

    for (const m of members) {
      const id = m._id.toString();
      totalPaidMap[id] = 0;
      totalOwedMap[id] = 0;
      settlementsPaidMap[id] = 0;
      settlementsReceivedMap[id] = 0;
    }

    for (const exp of expenses) {
      const payerId = exp.paidBy?.toString();
      if (payerId && totalPaidMap[payerId] !== undefined) {
        totalPaidMap[payerId] += exp.amount;
      }

      if (exp.splitAmong && Array.isArray(exp.splitAmong)) {
        for (const split of exp.splitAmong) {
          const consumerId = split.memberId?.toString();
          if (consumerId && totalOwedMap[consumerId] !== undefined) {
            totalOwedMap[consumerId] += split.amount;
          }
          if (payerId && consumerId && payerId !== consumerId && matrix[payerId] && matrix[payerId][consumerId] !== undefined) {
            matrix[payerId][consumerId] += split.amount;
          }
        }
      }
    }

    // Tally settlements
    for (const s of recordedSettlements) {
      const from = s.fromMemberId?.toString();
      const to = s.toMemberId?.toString();
      if (from && settlementsPaidMap[from] !== undefined) {
        settlementsPaidMap[from] += s.amount;
      }
      if (to && settlementsReceivedMap[to] !== undefined) {
        settlementsReceivedMap[to] += s.amount;
      }
      if (from && to && settlementsMatrix[from] && settlementsMatrix[from][to] !== undefined) {
        settlementsMatrix[from][to] += s.amount;
      }
    }

    // Compute pairwise net remaining balances
    const pairwiseDebts: PairwiseDebt[] = [];
    const memberIds = members.map((m) => m._id.toString());

    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const a = memberIds[i];
        const b = memberIds[j];

        const bOwesAOnBills = matrix[a][b] || 0;
        const aOwesBOnBills = matrix[b][a] || 0;
        const netBill = bOwesAOnBills - aOwesBOnBills;

        const bPaidA = settlementsMatrix[b][a] || 0;
        const aPaidB = settlementsMatrix[a][b] || 0;
        const netSettled = bPaidA - aPaidB;

        const finalNet = netBill - netSettled;

        if (finalNet > 0.009) {
          pairwiseDebts.push({
            fromId: b,
            fromName: memberNameMap[b],
            toId: a,
            toName: memberNameMap[a],
            amount: Math.round(finalNet * 100) / 100,
          });
        } else if (finalNet < -0.009) {
          pairwiseDebts.push({
            fromId: a,
            fromName: memberNameMap[a],
            toId: b,
            toName: memberNameMap[b],
            amount: Math.round(Math.abs(finalNet) * 100) / 100,
          });
        }
      }
    }

    // Build per-member balance profiles
    const balances: MemberBalance[] = members.map((m) => {
      const id = m._id.toString();
      const paid = totalPaidMap[id] || 0;
      const owed = totalOwedMap[id] || 0;
      const sPaid = settlementsPaidMap[id] || 0;
      const sRec = settlementsReceivedMap[id] || 0;
      const net = (paid - owed) + sPaid - sRec;

      const owesTo = pairwiseDebts
        .filter((d) => d.fromId === id)
        .map((d) => ({ toId: d.toId, toName: d.toName, amount: d.amount }));

      const owedBy = pairwiseDebts
        .filter((d) => d.toId === id)
        .map((d) => ({ fromId: d.fromId, fromName: d.fromName, amount: d.amount }));

      return {
        memberId: id,
        memberName: m.name,
        totalPaid: Math.round(paid * 100) / 100,
        totalOwed: Math.round(owed * 100) / 100,
        settlementsPaid: Math.round(sPaid * 100) / 100,
        settlementsReceived: Math.round(sRec * 100) / 100,
        net: Math.round(net * 100) / 100,
        owesTo,
        owedBy,
      };
    });

    return NextResponse.json(
      { balances, settlements: pairwiseDebts, pairwiseDebts, history: recordedSettlements },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error computing pairwise balances:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to compute balances' },
      { status: 500 }
    );
  }
}
