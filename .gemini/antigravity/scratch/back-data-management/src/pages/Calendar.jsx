import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useYear } from '../context/YearContext';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function Calendar() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedYear } = useYear();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState({});
    const [popupData, setPopupData] = useState(null);
    const [editConfirm, setEditConfirm] = useState({ isOpen: false, itemId: null });

    useEffect(() => {
        loadData();
    }, [currentDate, selectedYear, user]);

    const loadData = async () => {
        const data = await db.getData(selectedYear, user?.libraryName);
        const mapping = {};

        data.forEach(entry => {
            if (entry.performances && Array.isArray(entry.performances)) {
                entry.performances.forEach(perf => {
                    if (perf.opDate) {
                        if (!mapping[perf.opDate]) {
                            mapping[perf.opDate] = [];
                        }
                        mapping[perf.opDate].push({
                            id: entry.id,
                            title: entry.overview?.title || '',
                            startTime: entry.overview?.startTime || ''
                        });
                    }
                });
            }
        });

        Object.keys(mapping).forEach(dateKey => {
            mapping[dateKey].sort((a, b) => {
                const timeA = a.startTime || '00:00';
                const timeB = b.startTime || '00:00';
                if (timeA < timeB) return -1;
                if (timeA > timeB) return 1;
                return a.title.localeCompare(b.title);
            });
        });

        setCalendarData(mapping);
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        if (newDate.getFullYear() < selectedYear) return;
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        if (newDate.getFullYear() > selectedYear) return;
        setCurrentDate(newDate);
    };

    // Update currentDate if selectedYear changes
    useEffect(() => {
        const now = new Date();
        if (selectedYear === now.getFullYear()) {
            setCurrentDate(new Date()); // Current year -> Current month
        } else {
            setCurrentDate(new Date(selectedYear, 0, 1)); // Other year -> Jan 1st
        }
    }, [selectedYear]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const renderCalendarCells = () => {
        const days = [];
        // Add empty slots for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div key={`empty-start-${i}`} className="min-h-[120px] bg-[#f8f0d2] border-b border-r border-gray-100 p-2"></div>
            );
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const events = calendarData[dateStr] || [];

            days.push(
                <div key={d} className="bg-white min-h-[120px] border-b border-r border-gray-100 p-1 overflow-hidden hover:bg-slate-50 transition-colors relative group">
                    <div className="text-right text-xs font-semibold text-slate-500 mb-1 p-1">{d}</div>
                    <div className="space-y-1">
                        {events.slice(0, 2).map((evt, idx) => (
                            <div
                                key={`${d}-${idx}`}
                                onClick={() => setEditConfirm({ isOpen: true, itemId: evt.id })}
                                className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-100 truncate shadow-sm border border-indigo-100 transition-colors"
                                title={`${evt.startTime} ${evt.title}`}
                            >
                                <span className="font-mono text-[10px] mr-1 opacity-75">{evt.startTime}</span>
                                {evt.title || '(제목없음)'}
                            </div>
                        ))}
                        {events.length > 2 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPopupData({ date: dateStr, events });
                                }}
                                className="w-full text-center text-xs text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded py-0.5 font-medium transition-colors"
                            >
                                + {events.length - 2} 더 보기
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        // Empty cells after last day
        const totalSlots = firstDay + daysInMonth;
        const remainder = totalSlots % 7;
        const trailingEmpty = remainder === 0 ? 0 : 7 - remainder;

        // Add empty slots for days after the last day of the month
        const remainingCells = 35 - days.length; // Ensure 5 rows (7 * 5 = 35) or more
        for (let i = 0; i < remainingCells; i++) {
            days.push(
                <div key={`empty-end-${i}`} className="min-h-[120px] bg-[#f8f0d2] border-b border-r border-gray-100 p-2"></div>
            );
        }
        return days;
    };

    const getMonthData = async (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const data = await db.getData(year, user?.libraryName);
        return data.filter(entry => {
            if (entry.overview?.startDate) {
                const entryDate = new Date(entry.overview.startDate);
                return entryDate.getFullYear() === year && entryDate.getMonth() === month;
            }
            return false;
        });
    };

    const handleDownloadExcel = async () => {
        if (!XLSX) return;

        // Get month data
        const monthData = await getMonthData(currentDate);

        // Create Excel logic - Simplified list for Calendar view export or similar to Status?
        // User asked for "like Statistics page, add Excel button".
        // I will export the LIST of events for the current month.

        const exportData = monthData.map(item => ({
            '일자': item.overview.startDate,
            '구분': item.overview.category,
            '강좌명/행사명': item.overview.title,
            '장소': item.overview.place,
            '강사': item.overview.instructor,
            '대상': item.overview.target,
            '시간': `${item.overview.startTime} ~ ${item.overview.endTime}`
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "월간일정");
        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `달력_${today}.xlsx`);
    };

    return (
        <div className="space-y-6 relative">
            {/* Calendar */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 gap-4">
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 min-w-[140px] text-center">
                            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                        </h2>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                    <button
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 bg-[#aaf376] text-slate-800 px-6 py-2.5 rounded-lg hover:bg-[#99e265] transition-all font-medium shadow-md hover:shadow-lg"
                    >
                        <Download size={18} />
                        엑셀 저장
                    </button>
                </div>
                <div className="grid grid-cols-7 bg-[#f8edbe] border-b border-gray-200">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} className={`text-center py-2 text-sm font-bold ${i === 0 ? 'text-red-600' : 'text-slate-800'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 bg-slate-200 gap-px border-b border-gray-200">
                    {renderCalendarCells()}
                </div>
            </div>

            {/* Event Popup */}
            {popupData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPopupData(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">{popupData.date} 일정</h3>
                            <button onClick={() => setPopupData(null)} className="text-white/80 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {popupData.events.map((evt, idx) => (
                                <div
                                    key={`popup-${idx}`}
                                    onClick={() => {
                                        setPopupData(null);
                                        setEditConfirm({ isOpen: true, itemId: evt.id });
                                    }}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 cursor-pointer transition-all group"
                                >
                                    <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded group-hover:bg-white">{evt.startTime}</span>
                                    <span className="text-slate-700 font-medium">{evt.title || '(제목없음)'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Confirmation Modal */}
            {editConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                            해당 데이터를 수정하시겠습니까?
                        </h3>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setEditConfirm({ isOpen: false, itemId: null })}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    navigate(`/input?id=${editConfirm.itemId}`);
                                    setEditConfirm({ isOpen: false, itemId: null });
                                }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
