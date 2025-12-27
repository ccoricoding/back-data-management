import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useYear } from '../context/YearContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Calendar() {
    const navigate = useNavigate();
    const { selectedYear } = useYear();
    const [currentDate, setCurrentDate] = useState(new Date(selectedYear, new Date().getMonth(), 1));
    const [calendarData, setCalendarData] = useState({});
    const [popupData, setPopupData] = useState(null);
    const [editConfirm, setEditConfirm] = useState({ isOpen: false, itemId: null });

    useEffect(() => {
        setCurrentDate(new Date(selectedYear, currentDate.getMonth(), 1));
    }, [selectedYear]);

    useEffect(() => {
        loadData();
    }, [currentDate, selectedYear]);

    const loadData = async () => {
        const data = await db.getData(selectedYear);
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
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const renderCalendarCells = () => {
        const cells = [];
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="bg-slate-50 h-32 border border-slate-100"></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const events = calendarData[dateStr] || [];

            cells.push(
                <div key={d} className="bg-white h-32 border border-slate-100 p-1 overflow-hidden hover:bg-slate-50 relative group transition-colors">
                    <div className="text-right text-xs font-bold text-slate-400 mb-1">{d}</div>
                    <div className="space-y-1 overflow-y-auto max-h-[80%]">
                        {events.slice(0, 3).map((evt, idx) => (
                            <div
                                key={`${d}-${idx}`}
                                onClick={() => setEditConfirm({ isOpen: true, itemId: evt.id })}
                                className="text-[10px] bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded cursor-pointer hover:bg-indigo-100 truncate border border-indigo-100 shadow-sm"
                            >
                                <span className="font-bold mr-1">{evt.startTime}</span>
                                {evt.title}
                            </div>
                        ))}
                        {events.length > 3 && (
                            <button
                                onClick={() => setPopupData({ date: dateStr, events })}
                                className="w-full text-[10px] text-slate-400 font-bold hover:text-indigo-600"
                            >
                                + {events.length - 3} more
                            </button>
                        )}
                    </div>
                </div>
            );
        }
        return cells;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
                    <h2 className="text-2xl font-black text-slate-800">일정 달력</h2>
                    <div className="flex items-center gap-6">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={28} /></button>
                        <span className="text-3xl font-black text-indigo-600">{year}년 {month + 1}월</span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={28} /></button>
                    </div>
                    <div className="w-20"></div>
                </div>

                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} className={`text-center py-3 text-xs font-black uppercase tracking-widest ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 bg-slate-200 gap-px border-b border-slate-200">
                    {renderCalendarCells()}
                </div>
            </div>

            {/* Popup & Confirm Modals ... same as before but refined ... */}
            {popupData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPopupData(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-6 flex justify-between items-center">
                            <h3 className="text-white font-black text-xl">{popupData.date} 일정</h3>
                            <button onClick={() => setPopupData(null)} className="text-white/80 hover:text-white font-bold text-2xl">×</button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                            {popupData.events.map((evt, idx) => (
                                <div
                                    key={`popup-${idx}`}
                                    onClick={() => { setPopupData(null); setEditConfirm({ isOpen: true, itemId: evt.id }); }}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-indigo-50 cursor-pointer transition-all shadow-sm"
                                >
                                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-sm">{evt.startTime}</span>
                                    <span className="text-slate-800 font-bold text-sm">{evt.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {editConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center">
                        <h3 className="text-2xl font-black mb-6 text-slate-800">데이터를 수정하시겠습니까?</h3>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setEditConfirm({ isOpen: false, itemId: null })} className="flex-1 py-3 bg-gray-100 text-slate-600 rounded-xl font-bold hover:bg-gray-200 transition-all">취소</button>
                            <button onClick={() => { navigate(`/input?id=${editConfirm.itemId}`); setEditConfirm({ isOpen: false, itemId: null }); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
