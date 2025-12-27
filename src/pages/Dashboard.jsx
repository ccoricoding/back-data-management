import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import { useYear } from '../context/YearContext';

export default function Dashboard() {
    const [allData, setAllData] = useState([]);
    const { selectedYear } = useYear();

    useEffect(() => {
        const loadData = async () => {
            const data = await db.getData(selectedYear);
            setAllData(data);
        };
        loadData();
    }, [selectedYear]);

    // Summary Calculations
    const summaryStats = useMemo(() => {
        const stats = {
            education: { count: 0, sessions: 0, budget: 0, people: 0 },
            event: { count: 0, sessions: 0, budget: 0, people: 0 }
        };

        allData.forEach(item => {
            const category = item.overview?.category || '';
            const isEducation = category.startsWith('평생교육강좌');
            const isEvent = category.startsWith('독서문화행사');

            if (!isEducation && !isEvent) return;

            const target = isEducation ? stats.education : stats.event;

            target.count += 1;
            target.sessions += Number(item.overview?.count || 0);

            // Calculate budget from budgetItems array (v5 is the semok column)
            if (item.budgetItems && Array.isArray(item.budgetItems)) {
                item.budgetItems.forEach(bi => {
                    const semok = bi.v5 || '';
                    if (['210-01', '210-06', '310-06'].includes(semok)) {
                        target.budget += Number(bi.amount || 0);
                    }
                });
            }

            if (item.performances && Array.isArray(item.performances)) {
                item.performances.forEach(perf => {
                    target.people += (perf.adultM || 0) + (perf.adultF || 0) +
                        (perf.teenM || 0) + (perf.teenF || 0) +
                        (perf.childM || 0) + (perf.childF || 0);
                });
            }
        });

        return stats;
    }, [allData]);

    const StatCard = ({ title, icon: Icon, stats, color, labels }) => (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className={`${color} p-4`}>
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <Icon className="text-white" size={24} />
                    </div>
                    <h3 className="text-white font-bold text-lg">{title}</h3>
                </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">{labels[0]}</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.count.toLocaleString()}<span className="text-sm font-normal text-slate-500 ml-1">개</span></p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">{labels[1]}</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.sessions.toLocaleString()}<span className="text-sm font-normal text-slate-500 ml-1">회</span></p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">예산</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.budget.toLocaleString()}<span className="text-sm font-normal text-slate-500 ml-1">원</span></p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">인원</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.people.toLocaleString()}<span className="text-sm font-normal text-slate-500 ml-1">명</span></p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard
                    title="평생교육강좌"
                    icon={BookOpen}
                    stats={summaryStats.education}
                    color="bg-gradient-to-r from-indigo-500 to-indigo-600"
                    labels={['강좌', '횟수']}
                />
                <StatCard
                    title="독서문화행사"
                    icon={BookOpen}
                    stats={summaryStats.event}
                    color="bg-gradient-to-r from-emerald-500 to-emerald-600"
                    labels={['행사', '횟수']}
                />
            </div>
        </div>
    );
}
