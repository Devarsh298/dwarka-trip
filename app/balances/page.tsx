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
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

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

  // Active user's balance profile
  const activeUserBalance = currentUser
    ? balances.find((b) => b.memberId === currentUser._id)
    : null;

  const myOwedBy = activeUserBalance?.owedBy || []; // Friends who owe me
  const myOwesTo = activeUserBalance?.owesTo || []; // People I owe

  const totalIReceive = myOwedBy.reduce((sum, item) => sum + item.amount, 0);
  const totalIOwe = myOwesTo.reduce((sum, item) => sum + item.amount, 0);

  // Relevant settlement history for active user
  const myHistory = currentUser
    ? history.filter((h) => h.fromMemberId === currentUser._id || h.toMemberId === currentUser._id)
    : history;

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
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => openCustomPaymentModal()}
              className="flex-1 sm:flex-none text-center bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              <span>💸</span> Record Payment
            </button>
            <Link
              href="/report"
              className="flex-1 sm:flex-none text-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all"
            >
              📄 Report
            </Link>
            <Link
              href="/expenses"
              className="flex-1 sm:flex-none text-center bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all"
            >
              🧾 Bills
            </Link>
          </div>
        </div>

        {/* View Toggle */}
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
              <p className="text-xs text-white/60 font-medium">To view & record your payments:</p>
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
            {/* VIEW MODE: MY PERSONAL BALANCES */}
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
                      <span className="text-[11px] text-white/50 block">Your Remaining Status</span>
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
                      <p className="text-white/50">Your Equal Consumption:</p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        ₹{activeUserBalance?.totalOwed.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1. Money Other Friends Owe to You (With Mark Received Button) */}
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
                          className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl gap-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-500/40 shrink-0">
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

                          <div className="flex items-center justify-between sm:justify-end gap-2.5">
                            <span className="text-base font-extrabold text-white bg-slate-900/60 px-3 py-1 rounded-xl border border-emerald-500/30">
                              ₹{item.amount.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => openMarkReceived(item)}
                              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1"
                            >
                              <span>✓</span> Mark Received
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Money You Need to Pay (With Mark Paid Button) */}
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
                          className="flex flex-col sm:flex-row sm:items-center justify-between bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl gap-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs border border-rose-500/40 shrink-0">
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

                          <div className="flex items-center justify-between sm:justify-end gap-2.5">
                            <span className="text-base font-extrabold text-white bg-slate-900/60 px-3 py-1 rounded-xl border border-rose-500/30">
                              ₹{item.amount.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => openMarkPaid(item)}
                              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-md shadow-purple-500/30 transition-all flex items-center gap-1"
                            >
                              <span>💸</span> I Paid This
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Settled Payments Log (With Undo) */}
                {myHistory.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <span>📜</span> Recorded Payments History
                    </h3>
                    <div className="space-y-2">
                      {myHistory.map((h) => (
                        <div
                          key={h._id}
                          className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-xl text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="text-white font-medium">
                              <span className="text-rose-300 font-semibold">{h.fromMemberName}</span> paid{' '}
                              <span className="text-emerald-300 font-semibold">{h.toMemberName}</span>
                            </p>
                            <p className="text-white/40 text-[10px]">
                              {h.date} • {h.method || 'UPI'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400 text-sm">
                              ₹{h.amount.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setUndoTarget(h)}
                              className="text-white/40 hover:text-rose-400 active:scale-95 text-xs p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
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
                      {pairwiseDebts.length} pending
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mb-4">
                    Exact direct amounts between each pair of friends.
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

        {/* Record Payment Popup Modal */}
        {payModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl mx-auto mb-3 text-white shadow-lg shadow-emerald-500/30">
                💸
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-1">
                Record Settle-Up Payment
              </h3>
              <p className="text-white/60 text-xs text-center mb-4">
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
                    <label className="block text-white/70 text-[10px] font-semibold uppercase mb-1">
                      Who Paid? *
                    </label>
                    <select
                      value={payModal.fromId}
                      onChange={(e) => {
                        const m = members.find((x) => x._id === e.target.value);
                        setPayModal({ ...payModal, fromId: e.target.value, fromName: m?.name || '' });
                      }}
                      className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-purple-400"
                    >
                      {members.map((m) => (
                        <option key={m._id} value={m._id} className="bg-slate-800">
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/70 text-[10px] font-semibold uppercase mb-1">
                      Who Received? *
                    </label>
                    <select
                      value={payModal.toId}
                      onChange={(e) => {
                        const m = members.find((x) => x._id === e.target.value);
                        setPayModal({ ...payModal, toId: e.target.value, toName: m?.name || '' });
                      }}
                      className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-purple-400"
                    >
                      {members.map((m) => (
                        <option key={m._id} value={m._id} className="bg-slate-800">
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-[11px] font-semibold uppercase mb-1">
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
                    className="w-full bg-white/10 border border-white/20 text-white font-bold rounded-xl px-3 py-2.5 text-lg focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-[11px] font-semibold uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={payModal.method}
                    onChange={(e) => setPayModal({ ...payModal, method: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                  >
                    <option value="UPI / GPay" className="bg-slate-800">📱 UPI / GPay / PhonePe</option>
                    <option value="Cash" className="bg-slate-800">💵 Cash</option>
                    <option value="Net Banking" className="bg-slate-800">🏦 Net Banking</option>
                    <option value="Other" className="bg-slate-800">💳 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/70 text-[11px] font-semibold uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={payModal.date}
                    onChange={(e) => setPayModal({ ...payModal, date: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={recording}
                    onClick={() => setPayModal(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recording}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 transition-all"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl shadow-rose-950/50 scale-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl mx-auto mb-4 text-amber-400">
                ↩️
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-1">
                Undo Recorded Payment?
              </h3>
              <p className="text-white/60 text-xs text-center mb-4">
                Are you sure you want to undo the payment of <span className="text-emerald-300 font-bold">₹{undoTarget.amount.toFixed(2)}</span> from <span className="text-white font-semibold">{undoTarget.fromMemberName}</span> to <span className="text-white font-semibold">{undoTarget.toMemberName}</span>? This will restore the pending balance.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={undoing}
                  onClick={() => setUndoTarget(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white/80 font-semibold text-xs transition-all"
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
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl shadow-emerald-900/50 border border-emerald-400/40 animate-in fade-in slide-in-from-bottom-4 duration-200 flex items-center gap-2">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </main>
  );
}
