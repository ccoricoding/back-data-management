import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useYear } from '../context/YearContext';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Lightbulb, Calendar as CalendarIcon } from 'lucide-react';

export default function Dashboard() {
    const [allData, setAllData] = useState([]);
    const [dbUsage, setDbUsage] = useState({ usage: 0, limit: 500, percentage: 0 });
    const [dbUsageLoaded, setDbUsageLoaded] = useState(false);
    const { selectedYear } = useYear();
    const { user } = useAuth();

    // Fetch database usage from our backend API (avoids CORS issues)
    useEffect(() => {
        const fetchDbUsage = async () => {
            try {
                const response = await fetch('/api/db-usage');

                if (!response.ok) {
                    // Try to parse error details
                    const errorText = await response.text();
                    let errorMessage = `API status: ${response.status}`;
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage += ` - ${errorJson.error || errorText}`;
                    } catch (e) {
                        errorMessage += ` - ${errorText}`;
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();

                setDbUsage({
                    usage: data.usage || 0,
                    limit: data.limit || 500,
                    percentage: data.percentage || 0
                });
                setDbUsageLoaded(true);

                console.log(`DB Usage: ${data.usage.toFixed(2)}MB / ${data.limit}MB (${data.percentage.toFixed(1)}%)`);
            } catch (error) {
                console.error('Failed to fetch database usage details:', error.message);
                setDbUsageLoaded(false);
            }
        };

        fetchDbUsage();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            console.log('Dashboard: Loading data for year:', selectedYear, 'library:', user?.libraryName);
            const data = await db.getData(selectedYear, user?.libraryName);
            console.log('Dashboard: Loaded data:', data.length, 'entries');
            setAllData(data);
        };
        if (user?.libraryName) {
            loadData();
        }
    }, [selectedYear, user]);

    // Summary Calculations
    const summaryStats = useMemo(() => {
        console.log('Dashboard: Calculating stats for', allData.length, 'items');

        const stats = {
            education: { count: 0, sessions: 0, budget: 0, people: 0 },
            event: { count: 0, sessions: 0, budget: 0, people: 0 }
        };

        allData.forEach((item, index) => {
            const category = item.overview?.category || '';
            console.log(`Item ${index}: category="${category}"`);

            const isEducation = category.startsWith('평생교육강좌');
            const isEvent = category.startsWith('독서문화행사');

            if (!isEducation && !isEvent) {
                console.log(`  -> Skipped (not education or event)`);
                return;
            }

            const target = isEducation ? stats.education : stats.event;
            const targetName = isEducation ? 'education' : 'event';

            target.count += 1;
            target.sessions += Number(item.overview?.count || 0);

            console.log(`  -> ${targetName}: count=${target.count}, sessions=${target.sessions}`);

            // Calculate budget from budgetItems array (v5 is the semok column)
            if (item.budgetItems && Array.isArray(item.budgetItems)) {
                item.budgetItems.forEach(bi => {
                    const semok = bi.v5 || '';
                    if (['210-01', '210-06', '310-06'].includes(semok)) {
                        target.budget += Number(bi.amount || 0);
                    }
                });
                console.log(`  -> budget=${target.budget}`);
            }

            if (item.performances && Array.isArray(item.performances)) {
                item.performances.forEach(perf => {
                    target.people += (perf.adultM || 0) + (perf.adultF || 0) +
                        (perf.teenM || 0) + (perf.teenF || 0) +
                        (perf.childM || 0) + (perf.childF || 0);
                });
                console.log(`  -> people=${target.people}`);
            }
        });

        console.log('Dashboard: Final stats:', stats);
        return stats;
    }, [allData, selectedYear]);

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
                    icon={Lightbulb}
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

            {/* Database Usage Widget - Minimal Style */}
            {/* Database Usage Widget - Transparent & Minimal */}
            <div className="flex justify-end mt-4">
                <div className="w-48 px-2">
                    <div className="flex justify-end items-center mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500">
                            {dbUsage.usage.toFixed(2)} MB / {dbUsage.limit} MB
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${dbUsage.percentage > 80 ? 'bg-red-500' :
                                dbUsage.percentage > 60 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(dbUsage.percentage, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

