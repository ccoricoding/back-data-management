import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useYear } from '../context/YearContext';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import XLSX from 'xlsx-js-style';

export default function Calendar() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedYear } = useYear();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState({});
    const [popupData, setPopupData] = useState(null);
    const [editConfirm, setEditConfirm] = useState({ isOpen: false, itemId: null });

    useEffect(() => {
        // Sync currentDate with selectedYear if year mismatches
        if (currentDate.getFullYear() !== selectedYear) {
            setCurrentDate(new Date(selectedYear, 0, 1));
        }
    }, [selectedYear]);

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
        const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        if (prevDate.getFullYear() === selectedYear) {
            setCurrentDate(prevDate);
        }
    };

    const handleNextMonth = () => {
        const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        if (nextDate.getFullYear() === selectedYear) {
            setCurrentDate(nextDate);
        }
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const renderCalendarCells = () => {
        const cells = [];

        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="bg-white h-28 border-b border-r border-slate-100 last:border-r-0"></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const events = calendarData[dateStr] || [];

            // User requested: Calendar empty cells should have the 'hover' color by default?
            // "달력에서 날짜가 없는 빈칸의 셀 색상을 마우스로 셀을 가져다 올렸을 때의 색으로 바꿔줘."
            // Currently cells with no events are white. 
            // Wait, "날짜가 없는 빈칸" -> could mean empty padding cells (already slate-50).
            // OR it means cells that represent a valid date but have NO EVENTS.
            // If they have no events, they should still be interactive.
            // "마우스로 셀을 가져다 올렸을 때의 색" -> hover:bg-slate-50.
            // So if I make the base color bg-slate-50, then hover won't do anything visible unless I darken it.
            // But the user asked to change the cell color TO the hover color.
            // So I will change bg-white to bg-slate-50.

            cells.push(
                <div key={d} className="bg-white h-28 border border-slate-100 p-1 overflow-hidden hover:bg-slate-50 transition-colors relative group">
                    <div className="text-right text-xs font-semibold text-slate-500 mb-1 p-1">{d}</div>
                    <div className="space-y-1">
                        {events.slice(0, 2).map((evt, idx) => (
                            <div
                                key={`${d}-${idx}`}
                                onClick={() => setEditConfirm({ isOpen: true, itemId: evt.id })}
                                className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary-100 truncate shadow-sm border border-primary-100 transition-colors"
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
                                className="w-full text-center text-xs text-slate-500 hover:text-primary-600 bg-slate-100 hover:bg-primary-50 rounded py-0.5 font-medium transition-colors"
                            >
                                + {events.length - 2} 더 보기
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        // Post-padding with same background
        const totalSlots = firstDay + daysInMonth;
        const totalRows = Math.ceil(totalSlots / 7);
        const finalSlots = totalRows * 7;
        const remainingCells = finalSlots - totalSlots;

        for (let i = 0; i < remainingCells; i++) {
            cells.push(<div key={`end-empty-${i}`} className="bg-white h-28 border-b border-r border-slate-100 last:border-r-0"></div>);
        }

        return cells;
    };

    const handleDownloadExcel = () => {
        const events = [];
        const dateList = Object.keys(calendarData).sort();
        // Existing list export logic kept or replaced?
        // User asked: "Even if nothing is input... calendar format should be saved."
        // "Calendar format" implies the visual grid.
        // Let's create a Grid export.

        const wb = XLSX.utils.book_new();
        const wsData = [];

        // Title
        wsData.push([`${selectedYear}년 ${month + 1}월`]);
        wsData.push([]); // Spacer

        // Days Header
        const daysHeader = ['일', '월', '화', '수', '목', '금', '토'];
        wsData.push(daysHeader);

        // Grid Logic
        const totalRows = Math.ceil((firstDay + daysInMonth) / 7);
        let dayCounter = 1;

        for (let r = 0; r < totalRows; r++) {
            const rowData = [];
            for (let c = 0; c < 7; c++) {
                const cellIndex = r * 7 + c;
                if (cellIndex < firstDay || dayCounter > daysInMonth) {
                    rowData.push(''); // Empty cell
                } else {
                    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayCounter.toString().padStart(2, '0')}`;
                    const dayEvents = calendarData[dateStr] || [];

                    // Format cell content:
                    // 1
                    // 09:00 Event
                    // 14:00 Event
                    let cellContent = `${dayCounter}`;
                    if (dayEvents.length > 0) {
                        cellContent += '\n' + dayEvents.map(e => `${e.startTime} ${e.title}`).join('\n');
                    }
                    rowData.push(cellContent);
                    dayCounter++;
                }
            }
            wsData.push(rowData);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Styling
        const noBorderStyle = { border: { top: { style: 'thin', color: { rgb: "E5E7EB" } }, bottom: { style: 'thin', color: { rgb: "E5E7EB" } }, left: { style: 'thin', color: { rgb: "E5E7EB" } }, right: { style: 'thin', color: { rgb: "E5E7EB" } } } };

        // Header Style (Days)
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "6366F1" } }, // primary-500
            alignment: { horizontal: "center", vertical: "center" },
            border: noBorderStyle.border
        };

        // Cell Style
        const cellStyle = {
            alignment: { vertical: "top", wrapText: true },
            border: noBorderStyle.border
        };

        // Title Style
        if (ws['A1']) {
            ws['A1'].s = { font: { sz: 14, bold: true }, alignment: { horizontal: "center" } };
        }
        // Merge Title
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });

        // Apply styles to headers (Row index 2, 0-based)
        for (let c = 0; c < 7; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: 2, c: c });
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: daysHeader[c] };
            ws[cellRef].s = headerStyle;
        }

        // Apply styles to grid cells (Rows 3 onwards)
        for (let r = 3; r < 3 + totalRows; r++) {
            for (let c = 0; c < 7; c++) {
                const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }; // Ensure existence
                ws[cellRef].s = cellStyle;
            }
        }

        // Column Widths
        ws['!cols'] = Array(7).fill({ wch: 20 });

        // Row Heights (approx 100px for grid rows to show content)
        const rowHeights = [];
        rowHeights[0] = { hpt: 30 };
        rowHeights[1] = { hpt: 10 };
        rowHeights[2] = { hpt: 25 };
        for (let i = 0; i < totalRows; i++) rowHeights[3 + i] = { hpt: 80 };
        ws['!rows'] = rowHeights;

        XLSX.utils.book_append_sheet(wb, ws, "달력");
        const today = new Date().toISOString().split('T')[0];
        const fileName = `${user?.libraryName || '도서관'}_${selectedYear}_달력_${today}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 transition-all font-medium shadow-md hover:shadow-lg"
                >
                    <Download size={18} />
                    엑셀 저장
                </button>
            </div>

            {/* Calendar */}
            <div className="bg-white p-0 rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-primary-500 p-2 border-b border-primary-600 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-white pl-3">달력</h2>
                </div>

                <div className="p-6">
                    <div className="flex justify-center items-center p-4 border-b border-gray-100 gap-4 mb-4">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                            <ChevronLeft size={24} />
                        </button>
                        <span className="text-2xl font-bold text-slate-800">
                            {year}년 {month + 1}월
                        </span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    <div className="rounded-lg overflow-hidden border border-gray-200">
                        <div className="grid grid-cols-7 bg-gradient-to-r from-primary-400 to-primary-500">
                            {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                                <div key={day} className={`text-center py-2 text-sm font-bold text-white`}>
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 bg-white">
                            {renderCalendarCells()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Popup */}
            {popupData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPopupData(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-primary-600 p-4 flex justify-between items-center">
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
                                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-primary-50 hover:border-primary-100 cursor-pointer transition-all group"
                                >
                                    <span className="font-mono text-primary-600 font-bold bg-primary-50 px-2 py-1 rounded group-hover:bg-white">{evt.startTime}</span>
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
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
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
