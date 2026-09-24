'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNavbar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Crew', href: '/members', icon: '👥' },
    { name: 'Add', href: '/expenses/new', icon: '➕', highlight: true },
    { name: 'Balances', href: '/balances', icon: '⚖️' },
    { name: 'Report', href: '/report', icon: '📄' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-2 py-1 sm:hidden">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-lg shadow-purple-500/40 border-2 border-slate-900 active:scale-95 transition-transform">
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium text-purple-300 mt-0.5">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-purple-400 font-semibold scale-105'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] mt-1 tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
