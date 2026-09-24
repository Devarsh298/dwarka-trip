'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from './context/UserContext';

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

export default function Home() {
  const { currentUser } = useUser();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecommendation[]>([]);

  useEffect(() => {
    fetch('/api/balances')
      .then((r) => r.json())
      .then((data) => {
        setBalances(data.balances || []);
        setSettlements(data.settlements || []);
      })
      .catch(() => {});
  }, []);

  const totalTripCost = balances.reduce((sum, b) => sum + b.totalPaid, 0);
  const myBalance = currentUser
    ? balances.find((b) => b.memberId === currentUser._id)
    : null;

  // What I owe to others
  const myDebts = currentUser
    ? settlements.filter((s) => s.from === currentUser._id)
    : [];

  // What others owe to me
  const myCredits = currentUser
    ? settlements.filter((s) => s.to === currentUser._id)
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-4 sm:p-12 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header Hero */}
        <div className="text-center py-6 sm:py-8">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3.5 py-1.5 rounded-full text-purple-300 text-xs sm:text-sm font-medium mb-3">
            <span>✈️</span> Trip Expense Splitter
          </div>
          <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
            TripWise
          </h1>
          <p className="mt-2 text-sm sm:text-lg text-white/60 max-w-xl mx-auto">
            Split trip expenses effortlessly with friends. No passwords needed — just name logins and 1-tap splits!
          </p>
        </div>

        {/* Personalized User Status Card */}
        {currentUser && myBalance && (
          <div className="mb-6 bg-gradient-to-r from-purple-900/60 via-slate-800/90 to-purple-900/60 border border-purple-400/40 p-5 sm:p-6 rounded-3xl shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                  👋 Welcome, {currentUser.name}
                </span>
                <div className="mt-1">
                  {myBalance.net > 0.009 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                        +₹{myBalance.net.toFixed(2)}
                      </span>
                      <span className="text-xs text-white/70">
                        (You get back this amount)
                      </span>
                    </div>
                  ) : myBalance.net < -0.009 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-rose-400">
                        -₹{Math.abs(myBalance.net).toFixed(2)}
                      </span>
                      <span className="text-xs text-white/70">
                        (You owe this total)
                      </span>
                    </div>
                  ) : (
                    <span className="text-xl sm:text-2xl font-bold text-white/80">
                      🎉 All Settled Up!
                    </span>
                  )}
                </div>

                {/* Specific dues */}
                {myDebts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {myDebts.map((d, i) => (
                      <p key={i} className="text-xs text-rose-300">
                        👉 Pay <span className="font-bold text-white">₹{d.amount.toFixed(2)}</span> to <span className="font-bold text-emerald-300">{d.toName}</span>
                      </p>
                    ))}
                  </div>
                )}
                {myCredits.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {myCredits.map((c, i) => (
                      <p key={i} className="text-xs text-emerald-300">
                        👉 <span className="font-bold text-white">{c.fromName}</span> owes you <span className="font-bold text-emerald-300">₹{c.amount.toFixed(2)}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Link
                  href="/balances"
                  className="flex-1 sm:flex-none text-center bg-purple-600 hover:bg-purple-500 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all"
                >
                  View Settlements →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-2">
          {/* Members */}
          <Link
            href="/members"
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 hover:border-violet-500/50 p-5 sm:p-7 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1 overflow-hidden"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
              👥
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1.5 text-white flex items-center gap-2">
              Trip Crew
              <span className="text-sm font-normal text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </h2>
            <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
              Add friends on this trip by name only. No passwords, no sign-ups.
            </p>
          </Link>

          {/* Add Expense */}
          <Link
            href="/expenses/new"
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 hover:border-emerald-500/50 p-5 sm:p-7 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 overflow-hidden"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              💸
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1.5 text-white flex items-center gap-2">
              Add Expense
              <span className="text-sm font-normal text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </h2>
            <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
              Type where spent, select who paid, and split equally or with custom amounts.
            </p>
          </Link>

          {/* View Expenses */}
          <Link
            href="/expenses"
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 hover:border-blue-500/50 p-5 sm:p-7 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              🧾
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1.5 text-white flex items-center gap-2">
              All Expenses
              <span className="text-sm font-normal text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </h2>
            <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
              Browse all bills, filter by category/location, and view split breakdowns.
            </p>
          </Link>

          {/* Settle Up & Balances */}
          <Link
            href="/balances"
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 hover:border-amber-500/50 p-5 sm:p-7 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 overflow-hidden"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              ⚖️
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1.5 text-white flex items-center gap-2">
              Balances & Settle Up
              <span className="text-sm font-normal text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </h2>
            <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
              See who owes whom and who needs to pay whom.
            </p>
          </Link>
        </div>

        {/* Trip Report Banner */}
        <div className="mt-4 sm:mt-6">
          <Link
            href="/report"
            className="block bg-gradient-to-r from-purple-900/50 via-slate-800/80 to-purple-900/50 border border-purple-500/30 hover:border-purple-400 p-5 rounded-3xl transition-all shadow-xl hover:shadow-purple-500/10"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/20 flex items-center justify-center text-2xl shrink-0">
                  📄
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    End of Trip Summary & Report
                  </h3>
                  <p className="text-white/60 text-xs mt-0.5">
                    Full trip breakdown, printable report, and 1-click WhatsApp summary for your trip group!
                  </p>
                </div>
              </div>
              <span className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shrink-0">
                View Report →
              </span>
            </div>
          </Link>
        </div>
      </div>

      <footer className="text-center py-6 text-white/30 text-xs mt-8">
        TripWise • Simple Trip Splitter for Friends
      </footer>
    </main>
  );
}
