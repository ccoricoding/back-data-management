import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useYear } from '../../context/YearContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, PieChart, Database, List, User, Users, LogOut, DollarSign, ClipboardList } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { selectedYear, setSelectedYear } = useYear();
    const location = useLocation();
    const navigate = useNavigate();

    if (!user) return null;

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { name: '대시보드', path: '/', icon: LayoutDashboard },
        { name: '카테고리', path: '/categories', icon: List },
        { name: '입력', path: '/input', icon: Database },
        { name: '현황', path: '/status', icon: ClipboardList },
        { name: '예산', path: '/budget', icon: DollarSign },
        { name: '달력', path: '/calendar', icon: Calendar },
        { name: '통계', path: '/stats', icon: PieChart },
        { name: '회원정보', path: '/profile', icon: User },
    ];

    if (user.isAdmin) {
        navItems.push({ name: '회원관리', path: '/admin', icon: Users });
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-[#f8edbe] shadow-lg sticky top-0 z-50 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white/40 rounded px-1.5 py-0.5">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                                style={{ width: '70px' }}
                            >
                                {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y} className="text-gray-900">{y}년</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-xs font-medium tracking-tight">
                            {user.libraryName} 백데이터 관리
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <div className="flex items-baseline space-x-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center px-2 py-2 rounded-md text-xs font-medium transition-colors ${isActive(item.path)
                                        ? 'bg-[#b6e8a4] text-slate-800'
                                        : 'text-slate-700 hover:bg-[#b6e8a4] hover:text-slate-800'
                                        }`}
                                >
                                    <item.icon className="w-3.5 h-3.5 mr-1.5" />
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-4 text-sm text-slate-700">{user.name}님</span>
                        <button
                            onClick={handleLogout}
                            className="p-1 rounded-full text-slate-700 hover:bg-[#b6e8a4] focus:outline-none"
                            title="로그아웃"
                        >
                            <LogOut className="w-5 h-5 text-slate-700" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
