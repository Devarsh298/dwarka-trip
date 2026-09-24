'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SettlementRecord } from '@/types/expense';
import { useUser } from '@/app/context/UserContext';

interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  settlementsPaid?: number;
  settlementsReceived?: number;
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
  const [history, setHistory] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'my' | 'transfers' | 'spent'>('my');

  // Record Payment Modal
  const [payModal, setPayModal] = useState<{
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amount: string;
    method: string;
    date: string;
  } | null>(null);
  const [payError, setPayError] = useState('');
  const [recording, setRecording] = useState(false);

  // In-screen Undo Confirmation Popup
  const [undoTarget, setUndoTarget] = useState<SettlementRecord | null>(null);
  const [undoing, setUndoing] = useState(false);

  // In-screen Toast Popup
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const response = await fetch('/api/balances');
      const data = await response.json();
      setBalances(data.balances || []);
      setPairwiseDebts(data.pairwiseDebts || data.settlements || []);
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open custom modal for any payer/payee
  const openCustomPaymentModal = (defaultFromId?: string, defaultToId?: string, defaultAmount?: number) => {
    const fromId = defaultFromId || (members.length > 0 ? members[0]._id! : '');
    const toId = defaultToId || (currentUser ? currentUser._id! : (members.length > 1 ? members[1]._id! : ''));
    const fromName = members.find((m) => m._id === fromId)?.name || '';
    const toName = members.find((m) => m._id === toId)?.name || '';

    setPayError('');
    setPayModal({
      fromId,
      fromName,
      toId,
      toName,
      amount: defaultAmount ? defaultAmount.toFixed(2) : '',
      method: 'UPI / GPay',
      date: new Date().toISOString().split('T')[0],
    });
  };

  // Open modal when friend paid you
  const openMarkReceived = (item: { fromId: string; fromName: string; amount: number }) => {
    if (!currentUser) return;
    setPayError('');
    setPayModal({
      fromId: item.fromId,
      fromName: item.fromName,
      toId: currentUser._id!,
      toName: currentUser.name,
      amount: item.amount.toFixed(2),
      method: 'UPI / GPay',
      date: new Date().toISOString().split('T')[0],
    });
  };

  // Open modal when you paid friend
  const openMarkPaid = (item: { toId: string; toName: string; amount: number }) => {
    if (!currentUser) return;
    setPayError('');
    setPayModal({
      fromId: currentUser._id!,
      fromName: currentUser.name,
      toId: item.toId,
      toName: item.toName,
      amount: item.amount.toFixed(2),
      method: 'UPI / GPay',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setPayError('');

    if (payModal.fromId === payModal.toId) {
      setPayError('Payer and Receiver cannot be the same person.');
      return;
    }
    const amountNum = parseFloat(payModal.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPayError('Please enter a valid payment amount greater than 0.');
      return;
    }

    setRecording(true);

    try {
      const fromName = payModal.fromName || members.find((m) => m._id === payModal.fromId)?.name || '';
      const toName = payModal.toName || members.find((m) => m._id === payModal.toId)?.name || '';

      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMemberId: payModal.fromId,
          fromMemberName: fromName,
          toMemberId: payModal.toId,
          toMemberName: toName,
          amount: amountNum,
          method: payModal.method,
          date: payModal.date,
        }),
      });

      if (res.ok) {
        setPayModal(null);
        showToast(`Payment of ₹${amountNum.toFixed(2)} from ${fromName} to ${toName} recorded! 🎉`);
        await fetchBalances();
      } else {
        const d = await res.json().catch(() => ({}));
        setPayError(d.error || 'Failed to record payment. Please try again.');
      }
    } catch {
      setPayError('Network error while recording payment. Please check connection.');
    } finally {
      setRecording(false);
    }
  };

  const confirmUndoPayment = async () => {
    if (!undoTarget?._id) return;
    setUndoing(true);
    try {
      const res = await fetch(`/api/settlements/${undoTarget._id}`, { method: 'DELETE' });
      if (res.ok) {
        setUndoTarget(null);
        showToast(`Payment of ₹${undoTarget.amount.toFixed(2)} undone successfully.`);
        await fetchBalances();
      } else {
        showToast('Failed to undo payment. Please try again.');
      }
    } catch (err) {
      console.error('Failed to delete settlement:', err);
      showToast('Network error while undoing payment.');
    } finally {
      setUndoing(false);
    }
  };

  const totalTripSpent = balances.reduce((sum, b) => sum + b.totalPaid, 0);
  const equalShare = members.length > 0 ? totalTripSpent / members.length : 0;

  // Settle-up transfers filter state
  const [showAllTransfers, setShowAllTransfers] = useState(false);

  // Active user's balance profile
  const activeUserBalance = currentUser
    ? balances.find((b) => b.memberId === currentUser._id)
    : null;

  const myOwedBy = activeUserBalance?.owedBy || []; // Friends who owe me
  const myOwesTo = activeUserBalance?.owesTo || []; // People I owe

  const totalIReceive = myOwedBy.reduce((sum, item) => sum + item.amount, 0);
  const totalIOwe = myOwesTo.reduce((sum, item) => sum + item.amount, 0);

  // Transfers specific to current user
  const myPairwiseDebts = currentUser
    ? pairwiseDebts.filter((d) => d.fromId === currentUser._id || d.toId === currentUser._id)
    : pairwiseDebts;

  const displayedDebts = currentUser && !showAllTransfers
    ? myPairwiseDebts
    : pairwiseDebts;

  // Relevant settlement history for active user
  const myHistory = currentUser
    ? history.filter((h) => h.fromMemberId === currentUser._id || h.toMemberId === currentUser._id)
    : history;

  // Sorted members by spend for the breakdown tab
  const sortedMembersBySpend = [...balances].sort((a, b) => b.totalPaid - a.totalPaid);

  return (
    <main className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 text-slate-100 px-4 py-6 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <Link
              href="/"
              className="text-indigo-400 hover:text-indigo-300 text-xs sm:text-sm flex items-center gap-1.5 mb-1.5 transition-colors font-medium"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
              <span>⚖️</span> Trip Balances
            </h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => openCustomPaymentModal()}
              className="flex-1 sm:flex-none text-center bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 border border-indigo-400/30"
            >
              <span>💸</span> Record Payment
            </button>
            <Link
              href="/report"
              className="flex-1 sm:flex-none text-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/25 transition-all border border-emerald-400/30"
            >
              📄 Report
            </Link>
            <Link
              href="/expenses"
              className="flex-1 sm:flex-none text-center bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-slate-200 border border-slate-700 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all"
            >
              🧾 Bills
            </Link>
          </div>
        </div>

        {/* 3-Tab Pill Switcher */}
        <div className="grid grid-cols-3 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl mb-6 shadow-xl">
          <button
            type="button"
            onClick={() => setViewMode('my')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'my'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>👤</span>
            <span className="truncate">My Money</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('transfers')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'transfers'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🔄</span>
            <span className="truncate">Settle-Up</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('spent')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'spent'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📊</span>
            <span className="truncate">Total Spent</span>
          </button>
        </div>

        {/* Not Logged In Banner */}
        {!currentUser && (
          <div className="mb-6 bg-indigo-950/60 border border-indigo-500/30 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-indigo-300/80 font-medium">To view your personal dues:</p>
              <p className="text-sm font-bold text-white">Select your name</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {members.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => loginAs(m)}
                  className="bg-indigo-900/60 hover:bg-indigo-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-indigo-500/30 transition-all active:scale-95"
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl">
            <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-400 text-xs font-medium">Calculating live trip balances...</p>
          </div>
        ) : balances.length === 0 ? (
          <div className="text-center py-14 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-slate-200 font-semibold text-base">No trip members found</p>
            <p className="text-slate-400 text-xs mt-0.5 mb-4">Add members first to calculate balances!</p>
            <Link
              href="/members"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-block shadow-lg shadow-indigo-600/30 transition-all"
            >
              Add Members
            </Link>
          </div>
        ) : (
          <>
            {/* ======================================================== */}
            {/* TAB 1: MY MONEY (PERSONAL BREAKDOWN & ACTIONS) */}
            {/* ======================================================== */}
            {viewMode === 'my' && (
              <div className="space-y-5">
                {currentUser ? (
                  <>
                    {/* Personal Status Hero Card */}
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-5 rounded-3xl shadow-2xl relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                            Personal Balance Sheet
                          </span>
                          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1.5 flex items-center gap-2">
                            {currentUser.name}
                          </h2>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Net Balance</span>
                          {activeUserBalance && activeUserBalance.net > 0.009 ? (
                            <span className="text-xl sm:text-2xl font-black text-emerald-400">
                              +₹{activeUserBalance.net.toFixed(2)}
                              <span className="text-xs font-semibold block text-emerald-300">You Get Back</span>
                            </span>
                          ) : activeUserBalance && activeUserBalance.net < -0.009 ? (
                            <span className="text-xl sm:text-2xl font-black text-rose-400">
                              -₹{Math.abs(activeUserBalance.net).toFixed(2)}
                              <span className="text-xs font-semibold block text-rose-300">You Need to Pay</span>
                            </span>
                          ) : (
                            <span className="text-base sm:text-lg font-bold text-emerald-400 block mt-1">
                              🎉 All Settled Up
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-slate-800 text-xs">
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                          <p className="text-slate-400 text-[11px]">You Paid for Bills:</p>
                          <p className="text-base font-extrabold text-white mt-0.5">
                            ₹{activeUserBalance?.totalPaid.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                          <p className="text-slate-400 text-[11px]">Your Equal Consumption:</p>
                          <p className="text-base font-extrabold text-indigo-200 mt-0.5">
                            ₹{activeUserBalance?.totalOwed.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 1. Money Other Friends Owe to You */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm sm:text-base font-bold text-emerald-400 flex items-center gap-2">
                          <span>💰</span> Friends Who Owe You ({currentUser.name})
                        </h3>
                        <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                          Total: +₹{totalIReceive.toFixed(2)}
                        </span>
                      </div>

                      {myOwedBy.length === 0 ? (
                        <div className="text-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                          <p className="text-slate-400 text-xs">No one owes you money right now. 👍</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {myOwedBy.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-2xl gap-2.5 hover:border-emerald-500/50 transition-all shadow-md"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-extrabold text-xs border border-emerald-500/40 shrink-0">
                                  {item.fromName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-white font-bold text-sm">
                                    {item.fromName}
                                  </p>
                                  <p className="text-[11px] text-emerald-300 font-medium">
                                    Owes you pending share
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2.5">
                                <span className="text-base font-black text-white bg-slate-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                                  ₹{item.amount.toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openMarkReceived(item)}
                                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 border border-emerald-400/40"
                                >
                                  <span>✓</span> Mark Received
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. Money You Need to Pay */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm sm:text-base font-bold text-rose-400 flex items-center gap-2">
                          <span>💸</span> Money You Need to Pay
                        </h3>
                        <span className="text-xs font-extrabold text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-500/30">
                          Total: -₹{totalIOwe.toFixed(2)}
                        </span>
                      </div>

                      {myOwesTo.length === 0 ? (
                        <div className="text-center py-6 bg-emerald-950/20 rounded-2xl border border-emerald-500/20">
                          <p className="text-emerald-300 font-bold text-xs">
                            🎉 Awesome! You don&apos;t owe any money to anyone.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {myOwesTo.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between bg-rose-950/30 border border-rose-500/30 p-3.5 rounded-2xl gap-2.5 hover:border-rose-500/50 transition-all shadow-md"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-extrabold text-xs border border-rose-500/40 shrink-0">
                                  {item.toName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-white font-bold text-sm">
                                    Pay to {item.toName}
                                  </p>
                                  <p className="text-[11px] text-rose-300 font-medium">
                                    Your pending bill share
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2.5">
                                <span className="text-base font-black text-white bg-slate-950/80 px-3 py-1.5 rounded-xl border border-rose-500/30">
                                  ₹{item.amount.toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openMarkPaid(item)}
                                  className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5 border border-rose-400/40"
                                >
                                  <span>💸</span> I Paid This
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Recorded Payments History */}
                    {myHistory.length > 0 && (
                      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                          <span>📜</span> Recorded Payments History
                        </h3>
                        <div className="space-y-2">
                          {myHistory.map((h) => (
                            <div
                              key={h._id}
                              className="flex items-center justify-between bg-slate-950/70 border border-slate-800 p-3 rounded-2xl text-xs hover:border-slate-700 transition-all"
                            >
                              <div className="space-y-0.5">
                                <p className="text-white font-medium">
                                  <span className="text-rose-300 font-semibold">{h.fromMemberName}</span> paid{' '}
                                  <span className="text-emerald-300 font-semibold">{h.toMemberName}</span>
                                </p>
                                <p className="text-slate-400 text-[10px]">
                                  {h.date} • {h.method || 'UPI'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-extrabold text-emerald-400 text-sm">
                                  ₹{h.amount.toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setUndoTarget(h)}
                                  className="text-slate-500 hover:text-rose-400 active:scale-95 text-xs p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
                                  title="Undo this payment"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
                    <div className="text-4xl mb-2">👤</div>
                    <p className="text-white font-bold text-base">Select your name to see your money</p>
                    <p className="text-slate-400 text-xs mt-1 mb-4">Choose who you are from the top bar to view who owes you!</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {members.map((m) => (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => loginAs(m)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: SETTLE-UP TRANSFERS (USER-SPECIFIC BY DEFAULT) */}
            {/* ======================================================== */}
            {viewMode === 'transfers' && (
              <div className="space-y-4">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>🔄</span> {currentUser ? `${currentUser.name}'s Settle-Up Transfers` : 'Direct Settle-Up Transfers'}
                      </h2>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {currentUser
                          ? `Showing only transfers involving ${currentUser.name}.`
                          : 'Direct 1-to-1 transfer amounts between friends.'}
                      </p>
                    </div>

                    {currentUser && (
                      <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowAllTransfers(false)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                            !showAllTransfers
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Only {currentUser.name} ({myPairwiseDebts.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAllTransfers(true)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                            showAllTransfers
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          All Friends ({pairwiseDebts.length})
                        </button>
                      </div>
                    )}
                  </div>

                  {displayedDebts.length === 0 ? (
                    <div className="text-center py-10 bg-emerald-950/20 rounded-2xl border border-emerald-500/20">
                      <div className="text-4xl mb-2">🎉</div>
                      <p className="text-emerald-300 font-bold text-base">
                        {currentUser && !showAllTransfers
                          ? `${currentUser.name} is all settled up!`
                          : 'All debts in the group are settled!'}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">No pending transfers needed.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {displayedDebts.map((d, idx) => {
                        const isReceiver = currentUser?._id === d.toId;
                        const isPayer = currentUser?._id === d.fromId;

                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                              isReceiver
                                ? 'bg-emerald-950/25 border-emerald-500/30 hover:border-emerald-500/50'
                                : isPayer
                                ? 'bg-rose-950/25 border-rose-500/30 hover:border-rose-500/50'
                                : 'bg-slate-950/70 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                              <span
                                className={`font-bold px-2.5 py-1 rounded-lg border truncate ${
                                  isPayer
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-slate-900 text-slate-200 border-slate-700'
                                }`}
                              >
                                {d.fromName} {isPayer ? '(You)' : ''}
                              </span>
                              <span className="text-slate-500 font-medium text-xs shrink-0">pays</span>
                              <span
                                className={`font-bold px-2.5 py-1 rounded-lg border truncate ${
                                  isReceiver
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-900 text-slate-200 border-slate-700'
                                }`}
                              >
                                {d.toName} {isReceiver ? '(You)' : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm sm:text-base font-black text-white bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700">
                                ₹{d.amount.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openCustomPaymentModal(d.fromId, d.toId, d.amount)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 ${
                                  isReceiver
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 border border-emerald-400/30'
                                    : isPayer
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 border border-rose-400/30'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30'
                                }`}
                              >
                                {isReceiver ? '✓ Received' : isPayer ? '💸 I Paid' : 'Settle'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: TOTAL SPENT BREAKDOWN (SEPARATE TAB) */}
            {/* ======================================================== */}
            {viewMode === 'spent' && (
              <div className="space-y-5">
                {/* Spending Overview Metric Header */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl shadow-xl">
                    <p className="text-slate-400 text-xs font-medium">Total Trip Expense</p>
                    <p className="text-xl sm:text-2xl font-black text-white mt-1">
                      ₹{totalTripSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl shadow-xl">
                    <p className="text-slate-400 text-xs font-medium">Equal Share / Friend</p>
                    <p className="text-xl sm:text-2xl font-black text-indigo-300 mt-1">
                      ₹{equalShare.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl shadow-xl col-span-2 sm:col-span-1">
                    <p className="text-slate-400 text-xs font-medium">Trip Crew Size</p>
                    <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                      {members.length} friends
                    </p>
                  </div>
                </div>

                {/* Member Scorecards */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>📊</span> Member Spending vs Fair Share
                      </h2>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Comparison of who paid for bills vs who consumed.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {sortedMembersBySpend.map((b) => {
                      const isOwed = b.net > 0.009;
                      const owes = b.net < -0.009;
                      const percentOfTotal = totalTripSpent > 0 ? (b.totalPaid / totalTripSpent) * 100 : 0;

                      return (
                        <div
                          key={b.memberId}
                          className={`p-4 rounded-2xl border transition-all ${
                            isOwed
                              ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                              : owes
                              ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2.5">
                            <div>
                              <h3 className="font-extrabold text-sm sm:text-base text-white">
                                {b.memberName}
                              </h3>
                              <span className="text-[10px] text-slate-400">
                                {percentOfTotal.toFixed(0)}% of total trip spend
                              </span>
                            </div>
                            <span
                              className={`text-[11px] px-2.5 py-1 rounded-xl font-black border ${
                                isOwed
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : owes
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isOwed
                                ? `+₹${b.net.toFixed(2)}`
                                : owes
                                ? `-₹${Math.abs(b.net).toFixed(2)}`
                                : 'Settled'}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-800/80 rounded-full h-1.5 mb-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isOwed ? 'bg-emerald-400' : owes ? 'bg-rose-400' : 'bg-slate-500'
                              }`}
                              style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase font-semibold">Paid for Bills</p>
                              <p className="font-extrabold text-white text-sm mt-0.5">
                                ₹{b.totalPaid.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase font-semibold">Equal Share</p>
                              <p className="font-extrabold text-indigo-200 text-sm mt-0.5">
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

        {/* Record Payment Popup Modal */}
        {payModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl mx-auto mb-3 text-white shadow-lg shadow-emerald-500/30">
                💸
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-1">
                Record Settle-Up Payment
              </h3>
              <p className="text-slate-400 text-xs text-center mb-4">
                Record a direct transfer (UPI/Cash) between trip members
              </p>

              {payError && (
                <div className="mb-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>{payError}</span>
                </div>
              )}

              <form onSubmit={handleSavePayment} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 text-[10px] font-semibold uppercase mb-1">
                      Who Paid? *
                    </label>
                    <select
                      value={payModal.fromId}
                      onChange={(e) => {
                        const m = members.find((x) => x._id === e.target.value);
                        setPayModal({ ...payModal, fromId: e.target.value, fromName: m?.name || '' });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                    >
                      {members.map((m) => (
                        <option key={m._id} value={m._id} className="bg-slate-900 text-white">
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-[10px] font-semibold uppercase mb-1">
                      Who Received? *
                    </label>
                    <select
                      value={payModal.toId}
                      onChange={(e) => {
                        const m = members.find((x) => x._id === e.target.value);
                        setPayModal({ ...payModal, toId: e.target.value, toName: m?.name || '' });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                    >
                      {members.map((m) => (
                        <option key={m._id} value={m._id} className="bg-slate-900 text-white">
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] font-semibold uppercase mb-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    value={payModal.amount}
                    onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white font-bold rounded-xl px-3 py-2.5 text-lg focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] font-semibold uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={payModal.method}
                    onChange={(e) => setPayModal({ ...payModal, method: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                  >
                    <option value="UPI / GPay" className="bg-slate-900">📱 UPI / GPay / PhonePe</option>
                    <option value="Cash" className="bg-slate-900">💵 Cash</option>
                    <option value="Net Banking" className="bg-slate-900">🏦 Net Banking</option>
                    <option value="Other" className="bg-slate-900">💳 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] font-semibold uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={payModal.date}
                    onChange={(e) => setPayModal({ ...payModal, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={recording}
                    onClick={() => setPayModal(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recording}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    {recording ? 'Saving...' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* In-Screen Undo Payment Confirmation Modal */}
        {undoTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl shadow-rose-950/50 scale-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl mx-auto mb-4 text-amber-400">
                ↩️
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-1">
                Undo Recorded Payment?
              </h3>
              <p className="text-slate-300 text-xs text-center mb-4">
                Are you sure you want to undo the payment of <span className="text-emerald-400 font-bold">₹{undoTarget.amount.toFixed(2)}</span> from <span className="text-white font-semibold">{undoTarget.fromMemberName}</span> to <span className="text-white font-semibold">{undoTarget.toMemberName}</span>? This will restore the pending balance.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={undoing}
                  onClick={() => setUndoTarget(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={undoing}
                  onClick={confirmUndoPayment}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-amber-500/30 transition-all"
                >
                  {undoing ? 'Undoing...' : 'Yes, Undo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl shadow-emerald-950/80 border border-emerald-400/40 animate-in fade-in slide-in-from-bottom-4 duration-200 flex items-center gap-2">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </main>
  );
}
