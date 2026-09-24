'use client';

import { useState } from 'react';
import { useUser } from '@/app/context/UserContext';

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
];

export default function UserHeader() {
  const { currentUser, members, loginAs, loginByName, logout, loading } = useUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [creating, setCreating] = useState(false);

  if (loading) return null;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleAddNewAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setCreating(true);
    await loginByName(newMemberName.trim());
    setNewMemberName('');
    setCreating(false);
    setModalOpen(false);
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {getInitials(currentUser.name)}
              </div>
              <div className="leading-tight">
                <p className="text-[11px] text-white/50 font-medium">Logged in as</p>
                <p className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">
                  {currentUser.name}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl">👋</span>
              <div>
                <p className="text-xs text-white/60">Using this phone as:</p>
                <p className="text-xs font-semibold text-purple-300">Not selected</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>{currentUser ? 'Switch User' : 'Login / Select Name'}</span>
          </button>
        </div>
      </header>

      {/* User Selection & Login Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl mx-auto mb-2 text-white shadow-lg shadow-purple-500/30">
                👤
              </div>
              <h3 className="text-lg font-bold text-white">
                Who is using this phone?
              </h3>
              <p className="text-white/60 text-xs mt-0.5">
                Select your name for 1-tap personalized trip splits
              </p>
            </div>

            {/* List of existing members */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1 scrollbar-thin">
              {members.length === 0 ? (
                <p className="text-center text-xs text-white/40 py-4">
                  No friends added yet. Type your name below to start!
                </p>
              ) : (
                members.map((m, idx) => {
                  const isCurrent = currentUser?._id === m._id;
                  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => {
                        loginAs(m);
                        setModalOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all active:scale-98 ${
                        isCurrent
                          ? 'bg-purple-500/20 border-purple-400 text-white shadow-md shadow-purple-500/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-xs shadow-md`}
                        >
                          {getInitials(m.name)}
                        </div>
                        <span className="font-semibold text-sm">{m.name}</span>
                      </div>
                      {isCurrent ? (
                        <span className="text-purple-300 text-xs font-bold bg-purple-500/30 px-2.5 py-0.5 rounded-full border border-purple-400/40">
                          Active (You)
                        </span>
                      ) : (
                        <span className="text-white/40 text-xs">Tap to select →</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Add new name form */}
            <form onSubmit={handleAddNewAndLogin} className="pt-3 border-t border-white/10 space-y-2.5">
              <label className="block text-white/70 text-[11px] font-semibold uppercase">
                Not in the list? Add your name:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter your name..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400"
                />
                <button
                  type="submit"
                  disabled={creating || !newMemberName.trim()}
                  className="bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all"
                >
                  {creating ? '...' : '+ Join'}
                </button>
              </div>
            </form>

            <div className="flex justify-between items-center gap-2 mt-4 pt-2">
              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setModalOpen(false);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  Log out
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="ml-auto py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
