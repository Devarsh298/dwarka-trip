'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Expense, Member } from '@/types/expense';

interface Balance {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  net: number;
}

interface SettlementRecommendation {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export default function TripReportPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resExpenses, resMembers, resBalances] = await Promise.all([
        fetch('/api/expenses').then((r) => r.json()),
        fetch('/api/members').then((r) => r.json()),
        fetch('/api/balances').then((r) => r.json()),
      ]);

      setExpenses(resExpenses.expenses || []);
      setMembers(resMembers.members || []);
      setBalances(resBalances.balances || []);
      setSettlements(resBalances.settlements || []);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgPerPerson = members.length > 0 ? totalSpent / members.length : 0;

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const exp of expenses) {
    const cat = exp.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
  }
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // Date range
  const dates = expenses.map((e) => e.date).filter(Boolean).sort();
  const startDate = dates.length > 0 ? dates[0] : '';
  const endDate = dates.length > 0 ? dates[dates.length - 1] : '';

  // Copy WhatsApp Summary
  const copyWhatsAppSummary = () => {
    let text = `🌴 *TRIP EXPENSE REPORT & SETTLEMENTS* 🌴\n`;
    if (startDate && endDate) {
      text += `📅 Dates: ${startDate} to ${endDate}\n`;
    }
    text += `👥 Members (${members.length}): ${members.map((m) => m.name).join(', ')}\n`;
    text += `💰 Total Trip Cost: ₹${totalSpent.toFixed(2)}\n`;
    text += `📊 Average per person: ₹${avgPerPerson.toFixed(2)}\n\n`;

    text += `*--- CATEGORY BREAKDOWN ---*\n`;
    for (const [cat, amt] of sortedCategories) {
      const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(0) : '0';
      text += `• ${cat}: ₹${amt.toFixed(2)} (${pct}%)\n`;
    }

    text += `\n*--- WHO PAID WHAT ---*\n`;
    for (const b of balances) {
      text += `• ${b.memberName}: Paid ₹${b.totalPaid.toFixed(2)} | Share ₹${b.totalOwed.toFixed(2)}\n`;
    }

    text += `\n*--- FINAL SETTLEMENTS (WHO OWES WHOM) ---*\n`;
    if (settlements.length === 0) {
      text += `🎉 All debts are settled!\n`;
    } else {
      for (const s of settlements) {
        text += `👉 *${s.fromName}* pays *${s.toName}*: ₹${s.amount.toFixed(2)}\n`;
      }
    }

    text += `\nGenerated via TripWise ✈️`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-white/50 text-sm">Generating Trip Report...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white px-4 py-6 sm:p-8 print:bg-white print:text-black print:p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation / Action Bar (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
          <div>
            <Link
              href="/balances"
              className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1 mb-1 transition-colors"
            >
              ← Back to Balances
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <span>📄</span> Trip Summary Report
            </h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={copyWhatsAppSummary}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <span>📲</span> {copied ? 'Copied to Clipboard!' : 'Share to WhatsApp'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <span>🖨️</span> Print / PDF
            </button>
          </div>
        </div>

        {/* Report Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl print:border-gray-300 print:bg-white print:shadow-none print:p-0 space-y-6">
          {/* Trip Header Banner */}
          <div className="border-b border-white/10 print:border-gray-300 pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-purple-400 print:text-purple-700">
                  Trip Expense Summary
                </span>
                <h2 className="text-3xl font-extrabold text-white print:text-black mt-1">
                  Trip Wise Report
                </h2>
                {startDate && endDate && (
                  <p className="text-xs text-white/50 print:text-gray-500 mt-1">
                    📅 {startDate} &rarr; {endDate}
                  </p>
                )}
              </div>
              <div className="text-left sm:text-right mt-2 sm:mt-0">
                <p className="text-xs text-white/50 print:text-gray-500">Trip Crew</p>
                <p className="text-sm font-semibold text-white print:text-black">
                  {members.map((m) => m.name).join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Key KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 print:bg-gray-100 p-4 rounded-2xl border border-white/10 print:border-gray-200">
              <p className="text-white/60 print:text-gray-600 text-xs font-medium">Total Cost</p>
              <p className="text-xl sm:text-2xl font-bold text-white print:text-black mt-1">
                ₹{totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="bg-white/5 print:bg-gray-100 p-4 rounded-2xl border border-white/10 print:border-gray-200">
              <p className="text-white/60 print:text-gray-600 text-xs font-medium">Avg / Person</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-300 print:text-purple-700 mt-1">
                ₹{avgPerPerson.toFixed(2)}
              </p>
            </div>
            <div className="bg-white/5 print:bg-gray-100 p-4 rounded-2xl border border-white/10 print:border-gray-200">
              <p className="text-white/60 print:text-gray-600 text-xs font-medium">Total Bills</p>
              <p className="text-xl sm:text-2xl font-bold text-white print:text-black mt-1">
                {expenses.length}
              </p>
            </div>
            <div className="bg-white/5 print:bg-gray-100 p-4 rounded-2xl border border-white/10 print:border-gray-200">
              <p className="text-white/60 print:text-gray-600 text-xs font-medium">Crew Size</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400 print:text-emerald-700 mt-1">
                {members.length} friends
              </p>
            </div>
          </div>

          {/* Settle Up Directives (Who Owes Whom) */}
          <div className="border border-purple-500/30 bg-purple-500/5 print:border-gray-300 print:bg-gray-50 p-5 rounded-2xl space-y-3">
            <h3 className="text-base font-bold text-purple-300 print:text-purple-800 flex items-center gap-2">
              <span>🔄</span> Final Settlements (Who Owes Whom)
            </h3>
            {settlements.length === 0 ? (
              <p className="text-xs text-emerald-400 print:text-emerald-700 font-semibold">
                🎉 All expenses have been settled up! No outstanding balances.
              </p>
            ) : (
              <div className="space-y-2">
                {settlements.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white/5 print:bg-white p-3 rounded-xl border border-white/10 print:border-gray-200 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-rose-300 print:text-rose-700 font-bold">{s.fromName}</span>
                      <span className="text-white/40 print:text-gray-500">pays</span>
                      <span className="text-emerald-300 print:text-emerald-700 font-bold">{s.toName}</span>
                    </div>
                    <span className="font-extrabold text-white print:text-black text-sm">
                      ₹{s.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white print:text-black">
              📊 Spending by Category
            </h3>
            <div className="space-y-2.5">
              {sortedCategories.map(([cat, amt]) => {
                const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs text-white/80 print:text-gray-800">
                      <span className="font-medium">{cat}</span>
                      <span className="font-bold">
                        ₹{amt.toFixed(2)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 print:bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-600 print:bg-purple-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member Scorecard */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white print:text-black">
              👥 Individual Member Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/10 print:border-gray-300 text-white/50 print:text-gray-500">
                    <th className="py-2 font-semibold">Friend</th>
                    <th className="py-2 font-semibold text-right">Total Paid</th>
                    <th className="py-2 font-semibold text-right">Actual Share</th>
                    <th className="py-2 font-semibold text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-200">
                  {balances.map((b) => (
                    <tr key={b.memberId}>
                      <td className="py-2.5 font-bold text-white print:text-black">
                        {b.memberName}
                      </td>
                      <td className="py-2.5 text-right text-white/80 print:text-gray-800">
                        ₹{b.totalPaid.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right text-white/80 print:text-gray-800">
                        ₹{b.totalOwed.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        {b.net > 0.009 ? (
                          <span className="text-emerald-400 print:text-emerald-700">Gets back ₹{b.net.toFixed(2)}</span>
                        ) : b.net < -0.009 ? (
                          <span className="text-rose-400 print:text-rose-700">Owes ₹{Math.abs(b.net).toFixed(2)}</span>
                        ) : (
                          <span className="text-white/40 print:text-gray-400">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Itemized Expenses List */}
          <div className="space-y-3 pt-4 border-t border-white/10 print:border-gray-300">
            <h3 className="text-base font-bold text-white print:text-black">
              🧾 Itemized Expense Receipts ({expenses.length})
            </h3>
            <div className="space-y-2">
              {expenses.map((e) => (
                <div
                  key={e._id}
                  className="flex justify-between items-start bg-white/5 print:bg-gray-50 p-3 rounded-xl border border-white/10 print:border-gray-200 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-white print:text-black">
                      <span>{e.category}</span>
                      {e.description && (
                        <span className="font-normal text-white/50 print:text-gray-500">
                          • {e.description}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 print:text-gray-500 mt-0.5">
                      {e.date} | Paid by <span className="text-emerald-400 print:text-emerald-700 font-medium">{e.paidByName}</span>
                    </p>
                  </div>
                  <div className="text-right font-bold text-white print:text-black text-sm">
                    ₹{e.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
