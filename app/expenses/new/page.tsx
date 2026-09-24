'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Member } from '@/types/expense';
import { useUser } from '@/app/context/UserContext';

const QUICK_SUGGESTIONS = [
  { label: 'Food & Dinner', icon: '🍕' },
  { label: 'Travel & Taxi', icon: '🚕' },
  { label: 'Hotel & Stay', icon: '🏨' },
  { label: 'Drinks & Party', icon: '🍻' },
  { label: 'Fuel / Petrol', icon: '⛽' },
  { label: 'Entry & Tickets', icon: '🎟️' },
  { label: 'Snacks & Cafe', icon: '☕' },
  { label: 'Shopping', icon: '🛍️' },
  { label: 'Toll & Parking', icon: '🛣️' },
  { label: 'Activities & Sports', icon: '🏄' },
];

export default function NewExpensePage() {
  const router = useRouter();
  const { currentUser, members: contextMembers } = useUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food & Dinner',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paidBy: '',
  });

  // Who shares this expense
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      const fetchedMembers: Member[] = data.members || [];
      setMembers(fetchedMembers);
      setSelectedMembers(new Set(fetchedMembers.map((m) => m._id!)));

      // If current user is logged in, default payer to them
      if (currentUser && fetchedMembers.some((m) => m._id === currentUser._id)) {
        setFormData((prev) => ({ ...prev, paidBy: currentUser._id! }));
      } else if (fetchedMembers.length > 0) {
        setFormData((prev) => ({ ...prev, paidBy: fetchedMembers[0]._id! }));
      }
    } catch {
      setError('Could not connect to MongoDB. Check .env.local');
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleMember = (id: string) => {
    const next = new Set(selectedMembers);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMembers(next);
  };

  const selectAll = () => setSelectedMembers(new Set(members.map((m) => m._id!)));
  const clearAll = () => setSelectedMembers(new Set());

  const amountNum = parseFloat(formData.amount) || 0;
  const splitCount = selectedMembers.size;
  const equalShare = splitCount > 0 ? amountNum / splitCount : 0;

  const customTotal = Object.entries(customAmounts)
    .filter(([id]) => selectedMembers.has(id))
    .reduce((sum, [, v]) => sum + (parseFloat(v) || 0), 0);

  const customRemaining = amountNum - customTotal;

  const getSplitAmong = () => {
    if (splitMode === 'equal') {
      return members
        .filter((m) => selectedMembers.has(m._id!))
        .map((m) => ({
          memberId: m._id!,
          memberName: m.name,
          amount: Math.round(equalShare * 100) / 100,
        }));
    } else {
      return members
        .filter((m) => selectedMembers.has(m._id!))
        .map((m) => ({
          memberId: m._id!,
          memberName: m.name,
          amount: parseFloat(customAmounts[m._id!] || '0'),
        }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.category.trim()) {
      setError('Please type or select where the money was spent');
      return;
    }
    if (!formData.paidBy) {
      setError('Please select who paid for this bill');
      return;
    }
    if (selectedMembers.size === 0) {
      setError('Please select at least one friend to split with');
      return;
    }
    if (splitMode === 'custom' && Math.abs(customRemaining) > 0.01) {
      setError(`Custom split amounts do not match total amount. Diff: ₹${customRemaining.toFixed(2)}`);
      return;
    }

    setLoading(true);
    const paidByMember = members.find((m) => m._id === formData.paidBy);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          paidByName: paidByMember?.name || '',
          splitAmong: getSplitAmong(),
        }),
      });

      if (response.ok) {
        router.push('/expenses');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create expense');
      }
    } catch {
      setError('Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  if (loadingMembers) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-white/50 text-sm">Loading trip crew...</p>
        </div>
      </main>
    );
  }

  if (members.length < 2) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
          <div className="text-5xl mb-3">👥</div>
          <h2 className="text-white text-xl font-bold mb-2">Add Friends First</h2>
          <p className="text-white/60 text-xs sm:text-sm mb-6">
            You need at least 2 friends in your trip crew to split an expense.
          </p>
          <Link
            href="/members"
            className="w-full block bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 active:scale-95 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/25 transition-all"
          >
            + Add Friends
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 px-4 py-6 sm:p-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/expenses"
            className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1 mb-3 transition-colors"
          >
            ← Back to Expenses
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-emerald-500/20 shrink-0">
              💸
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Add Expense</h1>
              <p className="text-purple-300 text-xs sm:text-sm">Split a new bill among friends</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
            <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/40">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-white/10 border border-white/20 text-white text-3xl font-bold placeholder-white/20 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          {/* Where Spent / Category */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-1.5">
                📍 Where was it spent? (Type anything) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Beach Shack Dinner, Go-Karting, Taxi, Petrol..."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all font-medium"
              />
            </div>

            {/* Quick suggestion chips */}
            <div>
              <span className="text-white/40 text-[11px] block mb-1.5 font-medium">
                Or tap quick category:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((item) => {
                  const isSelected = formData.category === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: item.label })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 flex items-center gap-1 ${
                        isSelected
                          ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30 border border-purple-400'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Date & Optional Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-xl">
              <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-purple-400 transition-all"
              />
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-xl">
              <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 transition-all"
                placeholder="Bill #, extra notes, etc."
              />
            </div>
          </div>

          {/* Who Paid */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl">
            <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2.5">
              💳 Who Paid? *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {members.map((member) => {
                const selected = formData.paidBy === member._id;
                const isYou = currentUser?._id === member._id;
                return (
                  <button
                    key={member._id}
                    type="button"
                    onClick={() => setFormData({ ...formData, paidBy: member._id! })}
                    className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                      selected
                        ? 'border-purple-400 bg-gradient-to-r from-violet-600/40 to-purple-600/40 text-white shadow-md shadow-purple-500/20'
                        : 'border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {selected && <span>✓</span>}
                    <span className="truncate">
                      {member.name} {isYou ? '(You)' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Among */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <label className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                🔀 Split Among *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium px-2 py-0.5 rounded bg-purple-500/10"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-white/40 hover:text-white/60 font-medium px-2 py-0.5 rounded bg-white/5"
                >
                  None
                </button>
              </div>
            </div>

            {/* Split Mode Toggle */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-3">
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  splitMode === 'equal'
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                ⚖️ Split Equally
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('custom')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  splitMode === 'custom'
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                ✏️ Custom Amounts
              </button>
            </div>

            {/* Friends list for split */}
            <div className="space-y-2">
              {members.map((member) => {
                const isSelected = selectedMembers.has(member._id!);
                const isYou = currentUser?._id === member._id;
                return (
                  <div
                    key={member._id}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 border transition-all cursor-pointer select-none active:scale-[0.99] ${
                      isSelected
                        ? 'bg-purple-500/15 border-purple-500/40 text-white'
                        : 'bg-white/5 border-white/5 text-white/40'
                    }`}
                    onClick={() => toggleMember(member._id!)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-white/30'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {member.name} {isYou ? '(You)' : ''}
                      </span>
                    </div>

                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      {splitMode === 'equal' ? (
                        <span className="text-purple-300 text-xs sm:text-sm font-bold">
                          {isSelected && amountNum > 0
                            ? `₹${equalShare.toFixed(2)}`
                            : '—'}
                        </span>
                      ) : (
                        isSelected && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-white/50">₹</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={customAmounts[member._id!] || ''}
                              onChange={(e) =>
                                setCustomAmounts({
                                  ...customAmounts,
                                  [member._id!]: e.target.value,
                                })
                              }
                              className="w-20 bg-white/15 border border-white/30 text-white text-xs sm:text-sm font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-purple-400 text-right"
                              placeholder="0.00"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {splitMode === 'custom' && amountNum > 0 && (
              <div
                className={`mt-3 flex justify-between text-xs px-3.5 py-2 rounded-xl font-medium ${
                  Math.abs(customRemaining) < 0.01
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                }`}
              >
                <span>Remaining:</span>
                <span className="font-bold">₹{customRemaining.toFixed(2)}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 active:scale-95 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-purple-500/30 transition-all duration-200"
            >
              {loading ? 'Adding Expense...' : '✅ Save & Split Expense'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
