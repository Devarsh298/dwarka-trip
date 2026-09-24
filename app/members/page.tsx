'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Member } from '@/types/expense';
import { useUser } from '@/app/context/UserContext';

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-yellow-500 to-orange-600',
  'from-teal-500 to-green-600',
];

export default function MembersPage() {
  const { currentUser, loginAs, refreshMembers } = useUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Custom in-screen Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members');
      if (!response.ok) {
        throw new Error('Database not connected. Please check your MongoDB connection in .env.local');
      }
      const data = await response.json();
      setMembers(data.members || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load members. Please ensure MongoDB is running.');
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await response.json();

      if (response.ok) {
        const addedMember = data.member;
        setNewName('');
        setSuccess(`${addedMember.name} added to the trip! 🎉`);
        await refreshMembers();
        fetchMembers();
        // If no user logged in, log in as this new member
        if (!currentUser) {
          loginAs(addedMember);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to add member. Check MongoDB connection.');
      }
    } catch (err: any) {
      setError('Failed to add member. Please verify your MongoDB connection in .env.local.');
    } finally {
      setAdding(false);
    }
  };

  const confirmRemoveMember = async () => {
    if (!deleteTarget?._id) return;
    setRemoving(true);

    try {
      await fetch(`/api/members/${deleteTarget._id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await refreshMembers();
      fetchMembers();
    } catch (err) {
      setError('Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 px-4 py-6 sm:p-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1 mb-3 transition-colors"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-purple-500/20 shrink-0">
              👥
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Trip Crew</h1>
              <p className="text-purple-300 text-xs sm:text-sm">Manage friends on this trip</p>
            </div>
          </div>
        </div>

        {/* Database notice if error */}
        {error && (
          <div className="mb-5 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-2xl text-xs sm:text-sm">
            <div className="font-semibold flex items-center gap-1.5 mb-1 text-rose-400">
              <span>⚠️</span> MongoDB Notice
            </div>
            <p>{error}</p>
          </div>
        )}

        {/* Add Member Form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 mb-5 shadow-xl">
          <h2 className="text-white font-semibold mb-3 text-sm sm:text-base">Add a Friend</h2>
          <form onSubmit={addMember} className="flex gap-2 sm:gap-3">
            <input
              type="text"
              placeholder="Friend's name (e.g. Alex, Sam)..."
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError('');
              }}
              className="flex-1 min-w-0 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
              maxLength={50}
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap shadow-lg shadow-purple-500/25 shrink-0"
            >
              {adding ? 'Adding...' : '+ Add'}
            </button>
          </form>

          {success && (
            <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <span>✓</span> {success}
            </div>
          )}
        </div>

        {/* Members List */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm sm:text-base">
              Current Friends on Trip
            </h2>
            <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-1 rounded-full border border-purple-500/30 font-medium">
              {members.length} {members.length === 1 ? 'person' : 'people'}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-white/40 text-xs">Loading trip members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-10 bg-white/5 rounded-xl border border-white/5">
              <div className="text-4xl mb-2">🧳</div>
              <p className="text-white/70 font-medium text-sm">No members added yet</p>
              <p className="text-white/40 text-xs mt-0.5">Type a friend&apos;s name above to start!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {members.map((member, index) => {
                const isYou = currentUser?._id === member._id;
                return (
                  <div
                    key={member._id}
                    className={`flex items-center justify-between border rounded-xl px-3.5 py-3 transition-all ${
                      isYou
                        ? 'bg-purple-500/15 border-purple-400/50 shadow-md'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br ${
                          AVATAR_COLORS[index % AVATAR_COLORS.length]
                        } rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md shrink-0`}
                      >
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm sm:text-base">
                            {member.name}
                          </span>
                          {isYou && (
                            <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        {!isYou && (
                          <button
                            type="button"
                            onClick={() => loginAs(member)}
                            className="text-[11px] text-purple-300 hover:text-white font-medium mt-0.5 block"
                          >
                            Set as active on this phone →
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(member)}
                      className="text-white/40 hover:text-rose-400 active:text-rose-400 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                    >
                      ✕ Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Button */}
        {members.length >= 2 && (
          <div className="mt-6 text-center">
            <Link
              href="/expenses/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 active:scale-95 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-purple-500/30 transition-all text-sm sm:text-base"
            >
              💸 Start Splitting Expenses →
            </Link>
          </div>
        )}

        {/* In-Screen Remove Member Popup Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl shadow-rose-950/50 scale-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-2xl mx-auto mb-4 text-rose-400">
                👤
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-1">
                Remove Friend?
              </h3>
              <p className="text-white/60 text-xs text-center mb-4">
                Are you sure you want to remove <span className="text-white font-semibold">&ldquo;{deleteTarget.name}&rdquo;</span> from the trip crew?
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white/80 font-semibold text-xs sm:text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removing}
                  onClick={confirmRemoveMember}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-rose-500/30 transition-all"
                >
                  {removing ? 'Removing...' : 'Yes, Remove'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
