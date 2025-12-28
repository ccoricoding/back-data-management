import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useYear } from '../context/YearContext';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import XLSX from 'xlsx-js-style';

export default function Statistics() {
    const { user } = useAuth();
    const { selectedYear } = useYear();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

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

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const allData = await db.getData(selectedYear, user?.libraryName);
            setData(allData);
            setLoading(false);
        };
        loadData();
    }, [selectedYear, user]);

    const stats = useMemo(() => {
        // Initial Counters
        const createCounter = () => ({
            count: 0,
            adultM: 0, adultF: 0,
            teenM: 0, teenF: 0,
            childM: 0, childF: 0,
        });

        const edu = createCounter();
        const event = createCounter();

        data.forEach(item => {
            const category = item.overview?.category || '';
            let target = null;
            if (category.startsWith('평생교육강좌')) target = edu;
            else if (category.startsWith('독서문화행사')) target = event;
            else return;

            let hasOp = false;
            let iStats = { aM: 0, aF: 0, tM: 0, tF: 0, cM: 0, cF: 0 };

            if (item.performances && Array.isArray(item.performances)) {
                item.performances.forEach(p => {
                    if (!p.opDate) return;
                    const d = new Date(p.opDate);
                    // Match Year/Month
                    if (d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth()) {
                        hasOp = true;
                        iStats.aM += (Number(p.adultM) || 0);
                        iStats.aF += (Number(p.adultF) || 0);
                        iStats.tM += (Number(p.teenM) || 0);
                        iStats.tF += (Number(p.teenF) || 0);
                        iStats.cM += (Number(p.childM) || 0);
                        iStats.cF += (Number(p.childF) || 0);
                    }
                });
            }

            if (hasOp) {
                target.count++;
                target.adultM += iStats.aM;
                target.adultF += iStats.aF;
                target.teenM += iStats.tM;
                target.teenF += iStats.tF;
                target.childM += iStats.cM;
                target.childF += iStats.cF;
            }
        });

        const calculateTotals = (obj) => {
            const adultSum = obj.adultM + obj.adultF;
            const teenSum = obj.teenM + obj.teenF;
            const childSum = obj.childM + obj.childF;
            const maleSum = obj.adultM + obj.teenM + obj.childM;
            const femaleSum = obj.adultF + obj.teenF + obj.childF;
            const total = maleSum + femaleSum;
            return { ...obj, adultSum, teenSum, childSum, maleSum, femaleSum, total };
        };

        const eduFinal = calculateTotals(edu);
        const eventFinal = calculateTotals(event);

        const totalRaw = {
            count: edu.count + event.count,
            adultM: edu.adultM + event.adultM,
            adultF: edu.adultF + event.adultF,
            teenM: edu.teenM + event.teenM,
            teenF: edu.teenF + event.teenF,
            childM: edu.childM + event.childM,
            childF: edu.childF + event.childF,
        };
        const totalFinal = calculateTotals(totalRaw);

        return { edu: eduFinal, event: eventFinal, total: totalFinal };
    }, [data, currentDate]);

    const handleDownloadExcel = () => {
        const wb = XLSX.utils.book_new();

        // Data for Excel
        const wsData = [
            [
                "구분", "성인(남)", "성인(여)", "성인(계)",
                "중고생(남)", "중고생(여)", "중고생(계)",
                "어린이(남)", "어린이(여)", "어린이(계)",
                "남자(계)", "여자(계)", "합계"
            ],
            [
                "평생교육강좌",
                stats.edu.adultM, stats.edu.adultF, stats.edu.adultSum,
                stats.edu.teenM, stats.edu.teenF, stats.edu.teenSum,
                stats.edu.childM, stats.edu.childF, stats.edu.childSum,
                stats.edu.maleSum, stats.edu.femaleSum, stats.edu.total
            ],
            [
                "독서문화행사",
                stats.event.adultM, stats.event.adultF, stats.event.adultSum,
                stats.event.teenM, stats.event.teenF, stats.event.teenSum,
                stats.event.childM, stats.event.childF, stats.event.childSum,
                stats.event.maleSum, stats.event.femaleSum, stats.event.total
            ],
            [
                "합계",
                stats.total.adultM, stats.total.adultF, stats.total.adultSum,
                stats.total.teenM, stats.total.teenF, stats.total.teenSum,
                stats.total.childM, stats.total.childF, stats.total.childSum,
                stats.total.maleSum, stats.total.femaleSum, stats.total.total
            ]
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Styling
        const headerStyle = {
            font: { bold: true, sz: 12 },
            alignment: { horizontal: "center", vertical: "center" },
            fill: { fgColor: { rgb: "EFEFEF" } },
            border: {
                top: { style: "thin" }, bottom: { style: "thin" },
                left: { style: "thin" }, right: { style: "thin" }
            }
        };

        const cellCenterStyle = {
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin" }, bottom: { style: "thin" },
                left: { style: "thin" }, right: { style: "thin" }
            }
        };

        const totalRowStyle = {
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            fill: { fgColor: { rgb: "F3F4F6" } }, // slate-100
            border: {
                top: { style: "thin" }, bottom: { style: "thin" },
                left: { style: "thin" }, right: { style: "thin" }
            }
        };

        // Apply styles
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }; // Ensure cell exists

                if (R === 0) ws[cellRef].s = headerStyle;
                else if (R === 3) ws[cellRef].s = totalRowStyle;
                else ws[cellRef].s = cellCenterStyle;

                // Numbers formatting
                if (ws[cellRef].t === 'n') {
                    ws[cellRef].z = '#,##0';
                }
            }
        }

        // Column Widths
        ws['!cols'] = [
            { wch: 15 }, // 구분
            { wch: 10 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "통계");
        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `백데이터_통계_${today}.xlsx`);
    };

    if (loading) return <div className="p-8 text-center"></div>;

    const Th = ({ children, className, rowSpan, colSpan }) => (
        <th rowSpan={rowSpan} colSpan={colSpan} className={`px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-center min-w-[90px] ${className}`}>
            {children}
        </th>
    );

    const Td = ({ children, className, isTotal }) => (
        <td className={`px-4 py-3 text-sm text-gray-700 text-center ${isTotal ? 'bg-gray-50 font-bold' : ''} ${className}`}>
            {typeof children === 'number' ? children.toLocaleString() : children}
        </td>
    );

    return (
        <div className="space-y-6">
            {/* Header with Excel Button */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-all font-medium shadow-md hover:shadow-lg"
                >
                    <Download size={18} />
                    엑셀 저장
                </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-center gap-4 mb-6">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <span className="text-2xl font-bold text-slate-800">
                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </span>
                <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronRight size={24} />
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr>
                                <Th rowSpan={2} className="sticky left-0 bg-slate-200 z-10 w-32 border-b border-white/50 text-slate-800">구분</Th>
                                <Th colSpan={3} className="bg-indigo-100 text-slate-800 border-b border-indigo-200">성인</Th>
                                <Th colSpan={3} className="bg-indigo-100 text-slate-800 border-b border-indigo-200">중고생</Th>
                                <Th colSpan={3} className="bg-indigo-100 text-slate-800 border-b border-indigo-200">어린이</Th>
                                <Th colSpan={3} className="bg-green-100 text-slate-800 border-b border-green-200">합계</Th>
                            </tr>
                            <tr>
                                <Th className="bg-indigo-50 text-slate-800">남</Th><Th className="bg-indigo-50 text-slate-800">여</Th><Th className="bg-indigo-100 text-slate-800 font-bold">소계</Th>
                                <Th className="bg-indigo-50 text-slate-800">남</Th><Th className="bg-indigo-50 text-slate-800">여</Th><Th className="bg-indigo-100 text-slate-800 font-bold">소계</Th>
                                <Th className="bg-indigo-50 text-slate-800">남</Th><Th className="bg-indigo-50 text-slate-800">여</Th><Th className="bg-indigo-100 text-slate-800 font-bold">소계</Th>
                                <Th className="bg-green-50 text-slate-800">남</Th>
                                <Th className="bg-green-50 text-slate-800">여</Th>
                                <Th className="bg-green-100 text-slate-800 font-bold">합계</Th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="px-4 py-3 text-sm text-gray-700 bg-slate-50 sticky left-0 text-center border-b border-gray-100 font-bold tracking-wider">
                                    평생교육강좌
                                </td>
                                <Td>{stats.edu.adultM}</Td>
                                <Td>{stats.edu.adultF}</Td>
                                <Td className="bg-indigo-50 font-bold text-slate-800">{stats.edu.adultSum}</Td>
                                <Td>{stats.edu.teenM}</Td>
                                <Td>{stats.edu.teenF}</Td>
                                <Td className="bg-indigo-50 font-bold text-slate-800">{stats.edu.teenSum}</Td>
                                <Td>{stats.edu.childM}</Td>
                                <Td>{stats.edu.childF}</Td>
                                <Td className="bg-indigo-50 font-bold text-slate-800">{stats.edu.childSum}</Td>
                                <Td>{stats.edu.maleSum}</Td>
                                <Td>{stats.edu.femaleSum}</Td>
                                <Td className="bg-green-50 font-bold text-slate-800">{stats.edu.total}</Td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 text-sm text-gray-700 bg-slate-50 sticky left-0 text-center border-b border-gray-100 font-bold tracking-wider">
                                    독서문화행사
                                </td>
                                <Td>{stats.event.adultM}</Td>
                                <Td>{stats.event.adultF}</Td>
                                <Td className="bg-indigo-50 font-bold text-slate-800">{stats.event.adultSum}</Td>
                                <Td>{stats.event.teenM}</Td>
                                <Td>{stats.event.teenF}</Td>
                                <Td className="bg-indigo-50 font-bold text-slate-800">{stats.event.teenSum}</Td>
                                <Td>{stats.event.childM}</Td>
                                <Td>{stats.event.childF}</Td>
                                <Td className="bg-indigo-50 font-bold text-slate-800">{stats.event.childSum}</Td>
                                <Td>{stats.event.maleSum}</Td>
                                <Td>{stats.event.femaleSum}</Td>
                                <Td className="bg-green-50 font-bold text-slate-800">{stats.event.total}</Td>
                            </tr>
                            <tr className="bg-slate-100">
                                <td className="px-4 py-3 text-sm text-gray-700 bg-slate-200 sticky left-0 text-center border-t border-gray-200 font-bold tracking-wider">
                                    합계
                                </td>
                                <Td isTotal>{stats.total.adultM}</Td>
                                <Td isTotal>{stats.total.adultF}</Td>
                                <Td className="bg-indigo-100 font-bold text-slate-800">{stats.total.adultSum}</Td>
                                <Td isTotal>{stats.total.teenM}</Td>
                                <Td isTotal>{stats.total.teenF}</Td>
                                <Td className="bg-indigo-100 font-bold text-slate-800">{stats.total.teenSum}</Td>
                                <Td isTotal>{stats.total.childM}</Td>
                                <Td isTotal>{stats.total.childF}</Td>
                                <Td className="bg-indigo-100 font-bold text-slate-800">{stats.total.childSum}</Td>
                                <Td isTotal>{stats.total.maleSum}</Td>
                                <Td isTotal>{stats.total.femaleSum}</Td>
                                <Td className="bg-green-100 font-black text-lg text-slate-800">{stats.total.total}</Td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
