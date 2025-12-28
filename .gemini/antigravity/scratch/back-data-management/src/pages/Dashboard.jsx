import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useYear } from '../context/YearContext';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Calendar as CalendarIcon, Database } from 'lucide-react';

export default function Dashboard() {
    const [allData, setAllData] = useState([]);
    const [dbUsage, setDbUsage] = useState({ usage: 0, limit: 500, percentage: 0 });
    const [dbUsageLoaded, setDbUsageLoaded] = useState(false);

    const { selectedYear } = useYear();
    const { user } = useAuth(); // Get user context for library-specific data

    // Fetch database usage from serverless function
    useEffect(() => {
        const fetchDbUsage = async () => {
            try {
                const response = await fetch('/api/db-usage');

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = `API status: ${response.status}`;
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage += ` - ${errorJson.error || errorText}`;
                    } catch (e) {
                        errorMessage += ` - ${errorText}`;
                    }
                    console.warn(errorMessage); // Log but don't crash
                    return;
                }

                const data = await response.json();

                setDbUsage({
                    usage: data.usage || 0,
                    limit: data.limit || 500,
                    percentage: data.percentage || 0
                });
                setDbUsageLoaded(true);

                // Pure usage log
                console.log(`DB Usage: ${data.usage?.toFixed(2)}MB / ${data.limit}MB`);

            } catch (error) {
                console.error('Failed to fetch database usage:', error);
            }
        };

        fetchDbUsage();
    }, []);

    // Load main data based on year and user library
    useEffect(() => {
        const loadData = async () => {
            console.log('Dashboard: Loading data for year:', selectedYear, 'library:', user?.libraryName);
            // Pass libraryName filter if user is not admin (or based on business logic)
            // Assuming getData handles undefined libraryName for admins
            const data = await db.getData(selectedYear, user?.libraryName);
            console.log('Dashboard: Loaded data:', data.length, 'entries');
            setAllData(data);
        };

        // Wait for user to be loaded if checking auth (optional optimization)
        if (user !== undefined) {
            loadData();
        }
    }, [selectedYear, user]); // Reload when year or user changes

    // Summary Calculations (Memoized)
    const summaryStats = useMemo(() => {
        console.log('Dashboard: Calculating stats for', allData.length, 'items');
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

            // Count & Sessions
            target.count += 1;
            target.sessions += Number(item.overview?.count || 0);

            // Budget (Check 'v5' semok codes)
            if (item.budgetItems && Array.isArray(item.budgetItems)) {
                item.budgetItems.forEach(bi => {
                    const semok = bi.v5 || '';
                    // 210-01: Common op, 210-06: Material, 310-06: Education op
                    if (['210-01', '210-06', '310-06'].includes(semok)) {
                        target.budget += Number(bi.amount || 0);
                    }
                });
            }

            // Participants
            if (item.performances && Array.isArray(item.performances)) {
                item.performances.forEach(perf => {
                    target.people += (Number(perf.adultM) || 0) + (Number(perf.adultF) || 0) +
                        (Number(perf.teenM) || 0) + (Number(perf.teenF) || 0) +
                        (Number(perf.childM) || 0) + (Number(perf.childF) || 0);
                });
            }
        });

        console.log('Dashboard: Final stats:', stats);
        return stats;
    }, [allData, selectedYear]);

    // Component: Stat Card
    const StatCard = ({ title, icon: Icon, stats, color, labels }) => (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className={`p-4 ${color} bg-opacity-10 border-b border-gray-100 flex items-center justify-between`}>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
                    {title}
                </h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{labels[0]}</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.count.toLocaleString()}개</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{labels[1]}</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.sessions.toLocaleString()}회</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{labels[2]}</p>
                        <p className="text-2xl font-bold text-gray-800">{(stats.people).toLocaleString()}명</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{labels[3]}</p>
                        <p className="text-2xl font-bold text-gray-800">{(stats.budget / 1000).toLocaleString()}천원</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 relative pb-10"> {/* Added pb-10 for bottom widget space */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard
                    title="평생교육강좌"
                    icon={BookOpen}
                    stats={summaryStats.education}
                    color="bg-blue-500"
                    labels={['운영 강좌', '운영 횟수', '참여 인원', '집행 예산']}
                />

                <StatCard
                    title="독서문화행사"
                    icon={CalendarIcon}
                    stats={summaryStats.event}
                    color="bg-green-500"
                    labels={['운영 행사', '운영 횟수', '참여 인원', '집행 예산']}
                />
            </div>

            {/* Database Usage Widget - Bottom Right Fixed/Absolute */}
            {dbUsageLoaded && (
                <div className="fixed bottom-4 right-4 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3 text-xs z-50 hover:opacity-100 transition-opacity">

                    <div className="flex flex-col items-end">
                        {/* Text: 25.33 MB / 500 MB */}
                        <div className="font-medium text-gray-600 mb-1">
                            {dbUsage.usage.toFixed(2)} MB / {dbUsage.limit} MB
                        </div>

                        {/* Progress Bar */}
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${dbUsage.percentage > 90 ? 'bg-red-500' :
                                        dbUsage.percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                style={{ width: `${Math.min(dbUsage.percentage, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
