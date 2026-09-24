'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Member } from '@/types/expense';

interface UserContextType {
  currentUser: Member | null;
  members: Member[];
  loading: boolean;
  loginAs: (member: Member) => void;
  loginByName: (name: string) => Promise<Member | null>;
  logout: () => void;
  refreshMembers: () => Promise<Member[]>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async (): Promise<Member[]> => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      const fetched: Member[] = data.members || [];
      setMembers(fetched);
      return fetched;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      const fetched = await fetchMembers();
      // Check localStorage for saved user
      const savedUserId = localStorage.getItem('tripwise_user_id');
      const savedUserName = localStorage.getItem('tripwise_user_name');

      if (savedUserId && fetched.length > 0) {
        const found = fetched.find((m) => m._id === savedUserId);
        if (found) {
          setCurrentUser(found);
        } else if (savedUserName) {
          const foundByName = fetched.find(
            (m) => m.name.toLowerCase() === savedUserName.toLowerCase()
          );
          if (foundByName) setCurrentUser(foundByName);
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  const loginAs = (member: Member) => {
    setCurrentUser(member);
    if (member._id) localStorage.setItem('tripwise_user_id', member._id);
    localStorage.setItem('tripwise_user_name', member.name);
  };

  const loginByName = async (name: string): Promise<Member | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    // Check existing
    let match = members.find(
      (m) => m.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (match) {
      loginAs(match);
      return match;
    }

    // Otherwise create new member
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.member) {
        const newMember: Member = data.member;
        await fetchMembers();
        loginAs(newMember);
        return newMember;
      }
    } catch (err) {
      console.error('Failed to create & login member:', err);
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tripwise_user_id');
    localStorage.removeItem('tripwise_user_name');
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        members,
        loading,
        loginAs,
        loginByName,
        logout,
        refreshMembers: fetchMembers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
