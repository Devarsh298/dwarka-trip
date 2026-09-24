'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Expense } from '@/types/expense';

function getCategoryIcon(cat: string = ''): string {
  const c = cat.toLowerCase();
  if (c.includes('food') || c.includes('dinner') || c.includes('lunch') || c.includes('breakfast') || c.includes('eat') || c.includes('restaurant') || c.includes('pizza') || c.includes('burger')) return '🍕';
  if (c.includes('travel') || c.includes('taxi') || c.includes('cab') || c.includes('flight') || c.includes('bus') || c.includes('train') || c.includes('transport')) return '🚕';
  if (c.includes('hotel') || c.includes('stay') || c.includes('room') || c.includes('resort') || c.includes('airbnb')) return '🏨';
  if (c.includes('drink') || c.includes('party') || c.includes('beer') || c.includes('alcohol') || c.includes('bar') || c.includes('club')) return '🍻';
  if (c.includes('fuel') || c.includes('petrol') || c.includes('diesel') || c.includes('gas')) return '⛽';
  if (c.includes('ticket') || c.includes('entry') || c.includes('pass') || c.includes('cinema') || c.includes('movie')) return '🎟️';
  if (c.includes('coffee') || c.includes('tea') || c.includes('cafe') || c.includes('snack')) return '☕';
  if (c.includes('shop') || c.includes('grocer') || c.includes('mall') || c.includes('market') || c.includes('dress')) return '🛍️';
  if (c.includes('toll') || c.includes('park')) return '🛣️';
  if (c.includes('beach') || c.includes('surf') || c.includes('boat') || c.includes('sport') || c.includes('kart') || c.includes('activity')) return '🏄';
  return '💸';
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // In-screen Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      const data = await response.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!deleteTarget?._id) return;
    setDeleting(true);

    try {
      await fetch(`/api/expenses/${deleteTarget._id}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      fetchExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    } finally {
      setDeleting(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(expenses.map((e) => e.category)))];

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      (expense.category && expense.category.toLowerCase().includes(filter.toLowerCase())) ||
      (expense.description && expense.description.toLowerCase().includes(filter.toLowerCase())) ||
      (expense.paidByName && expense.paidByName.toLowerCase().includes(filter.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || expense.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 px-4 py-6 sm:p-8">
      <div className="max-w-xl sm:max-w-2xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <Link
              href="/"
              className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1 mb-2 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <span>🧾</span> Trip Expenses
            </h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/balances"
              className="flex-1 sm:flex-none text-center bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all"
            >
              ⚖️ Balances
            </Link>
            <Link
              href="/expenses/new"
              className="flex-1 sm:flex-none text-center bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-purple-500/25 transition-all"
            >
              + Add Expense
            </Link>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl col-span-2 sm:col-span-1">
            <p className="text-white/60 text-xs font-medium">Total Spent</p>
            <p className="text-2xl font-bold text-white mt-1">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl">
            <p className="text-white/60 text-xs font-medium">Records</p>
            <p className="text-2xl font-bold text-purple-300 mt-1">
              {filteredExpenses.length}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col justify-center">
            <p className="text-white/60 text-xs font-medium">Trip Crew</p>
            <Link href="/members" className="text-xs text-purple-400 hover:underline font-semibold mt-1">
              Manage Friends →
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2.5 mb-5">
          <input
            type="text"
            placeholder="Search by where spent, payer, notes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
          />

          {categories.length > 2 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                      : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                  }`}
                >
                  {cat !== 'All' ? `${getCategoryIcon(cat)} ` : ''}{cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expenses List */}
        {loading ? (
          <div className="text-center py-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-white/40 text-xs">Loading expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl">
            <div className="text-4xl mb-2">🏖️</div>
            <p className="text-white/70 font-semibold text-base">No expenses recorded yet</p>
            <p className="text-white/40 text-xs mt-0.5 mb-4">Add your first trip bill!</p>
            <Link
              href="/expenses/new"
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-block shadow-lg shadow-purple-500/25 transition-all"
            >
              + Add Expense
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense._id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 p-4 rounded-2xl transition-all shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shrink-0">
                      {getCategoryIcon(expense.category)}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-white font-semibold text-sm sm:text-base truncate">
                          {expense.category}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-white/50">
                        <span>{expense.date}</span>
                        {expense.description && (
                          <>
                            <span>•</span>
                            <span className="italic text-white/70 truncate max-w-[150px]">{expense.description}</span>
                          </>
                        )}
                      </div>

                      {/* Split details */}
                      <div className="pt-1.5 text-xs text-white/70 space-y-1">
                        <div>
                          <span className="text-emerald-400 font-medium text-[11px]">Paid by:</span>{' '}
                          <span className="text-white font-semibold text-xs">{expense.paidByName || 'Someone'}</span>
                        </div>

                        {expense.splitAmong && expense.splitAmong.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-white/40 text-[10px]">Split:</span>
                            {expense.splitAmong.map((split, i) => (
                              <span
                                key={i}
                                className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded text-[10px] border border-white/10"
                              >
                                {split.memberName} (₹{split.amount.toFixed(0)})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between shrink-0 self-stretch">
                    <p className="text-base sm:text-lg font-bold text-white">
                      ₹{expense.amount.toFixed(2)}
                    </p>
                    <button
                      onClick={() => setDeleteTarget(expense)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 active:scale-95 px-2 py-1 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all mt-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* In-Screen Delete Confirmation Popup Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl shadow-rose-950/50 scale-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-2xl mx-auto mb-4 text-rose-400">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-1">
                Delete Expense?
              </h3>
              <p className="text-white/60 text-xs text-center mb-4">
                Are you sure you want to remove <span className="text-white font-semibold">&ldquo;{deleteTarget.category}&rdquo;</span> (₹{deleteTarget.amount.toFixed(2)})? This will recalculate all balances.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white/80 font-semibold text-xs sm:text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmDeleteExpense}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-rose-500/30 transition-all"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
