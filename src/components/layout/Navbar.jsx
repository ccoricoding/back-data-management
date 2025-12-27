import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useYear } from '../../context/YearContext';
import { LayoutDashboard, Calendar, PieChart, Database, List, User, Users, LogOut, DollarSign } from 'lucide-react';

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
        { name: '현황', path: '/status', icon: LayoutDashboard },
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
        <nav className="bg-sky-400 text-white shadow-lg fixed top-0 left-0 right-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-sky-500/50 rounded-lg px-2 py-1">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent text-white text-sm font-bold focus:outline-none cursor-pointer"
                            >
                                {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y} className="text-gray-900">{y}년</option>
                                ))}
                            </select>
                        </div>
                        <Link to="/" className="text-xl font-bold tracking-tight">백데이터 관리</Link>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path)
                                        ? 'bg-sky-500 text-white'
                                        : 'text-sky-50 hover:bg-sky-500 hover:text-white'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4 mr-2" />
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-4 text-sm text-sky-50">{user.name}님</span>
                        <button
                            onClick={handleLogout}
                            className="p-1 rounded-full text-sky-50 hover:bg-sky-500 focus:outline-none"
                            title="로그아웃"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
