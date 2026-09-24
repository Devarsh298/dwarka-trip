'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Member } from '@/types/expense';
import { useUser } from '@/app/context/UserContext';

interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  net: number;
  owesTo: { toId: string; toName: string; amount: number }[];
  owedBy: { fromId: string; fromName: string; amount: number }[];
}

interface PairwiseDebt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export default function BalancesPage() {
  const { currentUser, members, loginAs } = useUser();
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [pairwiseDebts, setPairwiseDebts] = useState<PairwiseDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const response = await fetch('/api/balances');
      const data = await response.json();
      setBalances(data.balances || []);
      setPairwiseDebts(data.pairwiseDebts || data.settlements || []);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTripSpent = balances.reduce((sum, b) => sum + b.totalPaid, 0);
  const equalShare = members.length > 0 ? totalTripSpent / members.length : 0;

  // Active user's balance profile
  const activeUserBalance = currentUser
    ? balances.find((b) => b.memberId === currentUser._id)
    : null;

  const myOwedBy = activeUserBalance?.owedBy || []; // Friends who owe me
  const myOwesTo = activeUserBalance?.owesTo || []; // People I owe

  const totalIReceive = myOwedBy.reduce((sum, item) => sum + item.amount, 0);
  const totalIOwe = myOwesTo.reduce((sum, item) => sum + item.amount, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 px-4 py-6 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <Link
              href="/"
              className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1 mb-2 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <span>⚖️</span> Trip Balances
            </h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/report"
              className="flex-1 sm:flex-none text-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all"
            >
              📄 Full Report
            </Link>
            <Link
              href="/expenses"
              className="flex-1 sm:flex-none text-center bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all"
            >
              🧾 Expenses
            </Link>
          </div>
        </div>

        {/* View Toggle (My Personal Balances vs All Group Balances) */}
        {currentUser && (
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setViewMode('my')}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'my'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              👤 My Money ({currentUser.name})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'all'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              🌐 All Friends Transfers
            </button>
          </div>
        )}

        {/* Not Logged In Banner */}
        {!currentUser && (
          <div className="mb-6 bg-purple-900/40 border border-purple-500/30 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-white/60 font-medium">To see your personal money:</p>
              <p className="text-sm font-bold text-white">Select your name</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {members.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => loginAs(m)}
                  className="bg-white/10 hover:bg-purple-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-white/15 transition-all"
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-white/40 text-xs">Loading balances...</p>
          </div>
        ) : balances.length === 0 ? (
          <div className="text-center py-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-white/70 font-semibold text-base">No trip members found</p>
            <p className="text-white/40 text-xs mt-0.5 mb-4">Add members first to calculate balances!</p>
            <Link
              href="/members"
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-block shadow-lg shadow-purple-500/25 transition-all"
            >
              Add Members
            </Link>
          </div>
        ) : (
          <>
            {/* VIEW MODE: MY PERSONAL BALANCES (SHOWCASE ONLY THIS USER'S MONEY) */}
            {viewMode === 'my' && currentUser && (
              <div className="space-y-5">
                {/* Personal Status Header Card */}
                <div className="bg-gradient-to-r from-violet-900/60 via-purple-900/60 to-slate-800/80 border border-purple-400/40 p-5 rounded-3xl shadow-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                        Personal Balance Sheet
                      </span>
                      <h2 className="text-2xl font-extrabold text-white mt-0.5">
                        {currentUser.name}
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-white/50 block">Your Net Status</span>
                      {activeUserBalance && activeUserBalance.net > 0.009 ? (
                        <span className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                          +₹{activeUserBalance.net.toFixed(2)} (Get back)
                        </span>
                      ) : activeUserBalance && activeUserBalance.net < -0.009 ? (
                        <span className="text-xl sm:text-2xl font-extrabold text-rose-400">
                          -₹{Math.abs(activeUserBalance.net).toFixed(2)} (To pay)
                        </span>
                      ) : (
                        <span className="text-lg font-bold text-white/70">
                          🎉 All Settled Up
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10 text-xs">
                    <div>
                      <p className="text-white/50">You Paid for Bills:</p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        ₹{activeUserBalance?.totalPaid.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/50">Your Consumption Share:</p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        ₹{activeUserBalance?.totalOwed.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1. Money Other Friends Owe to You */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm sm:text-base font-bold text-emerald-300 flex items-center gap-2">
                      <span>💰</span> Money Friends Owe to You ({currentUser.name})
                    </h3>
                    <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                      Total: +₹{totalIReceive.toFixed(2)}
                    </span>
                  </div>

                  {myOwedBy.length === 0 ? (
                    <div className="text-center py-6 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-white/40 text-xs">No one owes you money right now.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myOwedBy.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-500/40">
                              {item.fromName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm">
                                {item.fromName}
                              </p>
                              <p className="text-[11px] text-emerald-300">
                                Owes you
                              </p>
                            </div>
                          </div>

                          <span className="text-base font-extrabold text-white bg-slate-900/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                            ₹{item.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Money You Need to Pay */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm sm:text-base font-bold text-rose-300 flex items-center gap-2">
                      <span>💸</span> Money You Need to Pay
                    </h3>
                    <span className="text-xs font-extrabold text-rose-400 bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/30">
                      Total: -₹{totalIOwe.toFixed(2)}
                    </span>
                  </div>

                  {myOwesTo.length === 0 ? (
                    <div className="text-center py-6 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <p className="text-emerald-300 font-bold text-xs">
                        🎉 You don&apos;t owe any money to anyone!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myOwesTo.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs border border-rose-500/40">
                              {item.toName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm">
                                Pay to {item.toName}
                              </p>
                              <p className="text-[11px] text-rose-300">
                                Your pending share
                              </p>
                            </div>
                          </div>

                          <span className="text-base font-extrabold text-white bg-slate-900/60 px-3 py-1.5 rounded-xl border border-rose-500/30">
                            ₹{item.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW MODE: ALL FRIENDS TRANSFERS */}
            {(viewMode === 'all' || !currentUser) && (
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>🔄</span> All Pairwise Transfers
                    </h2>
                    <span className="text-[11px] text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-semibold">
                      {pairwiseDebts.length} transfers
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mb-4">
                    Exact direct amounts between each pair of friends based on who paid for what.
                  </p>

                  {pairwiseDebts.length === 0 ? (
                    <div className="text-center py-6 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                      <div className="text-3xl mb-1">🎉</div>
                      <p className="text-emerald-300 font-bold text-sm">All Debts Settled!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pairwiseDebts.map((d, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white/5 border border-white/10 p-3.5 rounded-xl"
                        >
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <span className="font-bold text-rose-300">{d.fromName}</span>
                            <span className="text-white/40 text-xs">pays</span>
                            <span className="font-bold text-emerald-300">{d.toName}</span>
                          </div>
                          <span className="text-sm sm:text-base font-extrabold text-white bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-xl">
                            ₹{d.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Member Contributions Breakdown */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
                  <h2 className="text-base sm:text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <span>📊</span> Total Spent vs Equal Share
                  </h2>
                  <p className="text-white/50 text-xs mb-4">
                    Equal share per friend: <span className="text-purple-300 font-bold">₹{equalShare.toFixed(2)}</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {balances.map((b) => {
                      const isOwed = b.net > 0.009;
                      const owes = b.net < -0.009;
                      return (
                        <div
                          key={b.memberId}
                          className={`p-3.5 rounded-xl border ${
                            isOwed
                              ? 'bg-emerald-500/5 border-emerald-500/25'
                              : owes
                              ? 'bg-rose-500/5 border-rose-500/25'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-sm text-white">{b.memberName}</h3>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                                isOwed
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : owes
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-white/10 text-white/50'
                              }`}
                            >
                              {isOwed
                                ? `Gets back ₹${b.net.toFixed(2)}`
                                : owes
                                ? `Owes ₹${Math.abs(b.net).toFixed(2)}`
                                : 'Settled'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/60 pt-2 border-t border-white/10">
                            <div>
                              <p>Paid for Bills:</p>
                              <p className="font-semibold text-white text-xs mt-0.5">
                                ₹{b.totalPaid.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p>Equal Share:</p>
                              <p className="font-semibold text-white text-xs mt-0.5">
                                ₹{b.totalOwed.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
