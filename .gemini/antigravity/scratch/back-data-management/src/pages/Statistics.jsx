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

    useEffect(() => {
        if (currentDate.getFullYear() !== selectedYear) {
            setCurrentDate(new Date(selectedYear, 0, 1));
        }
    }, [selectedYear]);

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

        // Styles
        const noBorderStyle = { border: { top: { style: 'thin', color: { rgb: "E5E7EB" } }, bottom: { style: 'thin', color: { rgb: "E5E7EB" } }, left: { style: 'thin', color: { rgb: "E5E7EB" } }, right: { style: 'thin', color: { rgb: "E5E7EB" } } } };
        // Light Theme Colors
        const headerFill = "EEF2FF"; // primary-50
        const headerText = "334155"; // slate-700

        const headerStyle = { font: { bold: true, color: { rgb: headerText } }, fill: { fgColor: { rgb: headerFill } }, alignment: { horizontal: "center", vertical: "center" }, border: noBorderStyle.border };
        const categoryStyle = { font: { bold: true, color: { rgb: headerText } }, fill: { fgColor: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: noBorderStyle.border };
        const normalCellStyle = { alignment: { horizontal: "center", vertical: "center" }, border: noBorderStyle.border };

        // Slightly different for "Subtotal" columns if we want to differentiate? 
        // User asked for "Budget menu format". Budget is very plain. 
        // But Statistics has Logic Groups (M/F -> Sum).
        // Let's keep it simple (White) or maybe very faint gray for sums?
        // Budget has NO background colors for data. I will stick to White for data to be safe.
        // But for "Total" row, I'll allow a slight background (primary-50) to make it readable.

        const totalRowStyle = { font: { bold: true, color: { rgb: headerText } }, fill: { fgColor: { rgb: headerFill } }, alignment: { horizontal: "center", vertical: "center" }, border: noBorderStyle.border };

        const wsData = [
            // Title Row
            [{ v: `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`, t: "s", s: { font: { sz: 14, bold: true }, alignment: { horizontal: "center" } } }],
            [], // Spacer
            // Header Row 1
            [
                { v: "구분", t: "s", s: headerStyle },
                { v: "성인", t: "s", s: headerStyle }, { v: "", t: "s", s: headerStyle }, { v: "", t: "s", s: headerStyle },
                { v: "중고생", t: "s", s: headerStyle }, { v: "", t: "s", s: headerStyle }, { v: "", t: "s", s: headerStyle },
                { v: "어린이", t: "s", s: headerStyle }, { v: "", t: "s", s: headerStyle }, { v: "", t: "s", s: headerStyle },
                { v: "합계", t: "s", s: headerStyle }, { v: "", t: "s", s: headerStyle }, { v: "", t: "s", s: headerStyle }
            ],
            // Header Row 2
            [
                { v: "", t: "s", s: headerStyle },
                { v: "남", t: "s", s: headerStyle }, { v: "여", t: "s", s: headerStyle }, { v: "소계", t: "s", s: headerStyle },
                { v: "남", t: "s", s: headerStyle }, { v: "여", t: "s", s: headerStyle }, { v: "소계", t: "s", s: headerStyle },
                { v: "남", t: "s", s: headerStyle }, { v: "여", t: "s", s: headerStyle }, { v: "소계", t: "s", s: headerStyle },
                { v: "남", t: "s", s: headerStyle }, { v: "여", t: "s", s: headerStyle }, { v: "합계", t: "s", s: headerStyle }
            ],
            // Data
            [
                { v: "평생교육강좌", t: "s", s: categoryStyle },
                { v: stats.edu.adultM, t: "n", s: normalCellStyle }, { v: stats.edu.adultF, t: "n", s: normalCellStyle }, { v: stats.edu.adultSum, t: "n", s: normalCellStyle },
                { v: stats.edu.teenM, t: "n", s: normalCellStyle }, { v: stats.edu.teenF, t: "n", s: normalCellStyle }, { v: stats.edu.teenSum, t: "n", s: normalCellStyle },
                { v: stats.edu.childM, t: "n", s: normalCellStyle }, { v: stats.edu.childF, t: "n", s: normalCellStyle }, { v: stats.edu.childSum, t: "n", s: normalCellStyle },
                { v: stats.edu.maleSum, t: "n", s: normalCellStyle }, { v: stats.edu.femaleSum, t: "n", s: normalCellStyle }, { v: stats.edu.total, t: "n", s: normalCellStyle }
            ],
            [
                { v: "독서문화행사", t: "s", s: categoryStyle },
                { v: stats.event.adultM, t: "n", s: normalCellStyle }, { v: stats.event.adultF, t: "n", s: normalCellStyle }, { v: stats.event.adultSum, t: "n", s: normalCellStyle },
                { v: stats.event.teenM, t: "n", s: normalCellStyle }, { v: stats.event.teenF, t: "n", s: normalCellStyle }, { v: stats.event.teenSum, t: "n", s: normalCellStyle },
                { v: stats.event.childM, t: "n", s: normalCellStyle }, { v: stats.event.childF, t: "n", s: normalCellStyle }, { v: stats.event.childSum, t: "n", s: normalCellStyle },
                { v: stats.event.maleSum, t: "n", s: normalCellStyle }, { v: stats.event.femaleSum, t: "n", s: normalCellStyle }, { v: stats.event.total, t: "n", s: normalCellStyle }
            ],
            [
                { v: "합계", t: "s", s: totalRowStyle },
                { v: stats.total.adultM, t: "n", s: totalRowStyle }, { v: stats.total.adultF, t: "n", s: totalRowStyle }, { v: stats.total.adultSum, t: "n", s: totalRowStyle },
                { v: stats.total.teenM, t: "n", s: totalRowStyle }, { v: stats.total.teenF, t: "n", s: totalRowStyle }, { v: stats.total.teenSum, t: "n", s: totalRowStyle },
                { v: stats.total.childM, t: "n", s: totalRowStyle }, { v: stats.total.childF, t: "n", s: totalRowStyle }, { v: stats.total.childSum, t: "n", s: totalRowStyle },
                { v: stats.total.maleSum, t: "n", s: totalRowStyle }, { v: stats.total.femaleSum, t: "n", s: totalRowStyle }, { v: stats.total.total, t: "n", s: totalRowStyle }
            ]
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Merges
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }, // Title

            { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // 구분 RowSpan 2 (Row 2,3)
            { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } }, // 성인 ColSpan 3
            { s: { r: 2, c: 4 }, e: { r: 2, c: 6 } }, // 중고생 ColSpan 3
            { s: { r: 2, c: 7 }, e: { r: 2, c: 9 } }, // 어린이 ColSpan 3
            { s: { r: 2, c: 10 }, e: { r: 2, c: 12 } } // 합계 ColSpan 3
        ];

        // Col Widths
        ws['!cols'] = [
            { wch: 12 }, // 구분
            { wch: 10 }, { wch: 10 }, { wch: 12 }, // 성인
            { wch: 10 }, { wch: 10 }, { wch: 12 }, // 중고생
            { wch: 10 }, { wch: 10 }, { wch: 12 }, // 어린이
            { wch: 10 }, { wch: 10 }, { wch: 12 }  // 합계
        ];

        // Row Heights
        ws['!rows'] = [
            { hpt: 40 }, // Title
            { hpt: 20 }, // Spacer
            { hpt: 30 }, // Header 1
            { hpt: 30 }, // Header 2
            { hpt: 22 }, // Data 1
            { hpt: 22 }, // Data 2
            { hpt: 25 }  // Total
        ];


        XLSX.utils.book_append_sheet(wb, ws, "통계");
        const today = new Date().toISOString().split('T')[0];
        const fileName = `${user?.libraryName || '도서관'}_${selectedYear}_통계_${today}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (loading) return <div className="p-8 text-center"></div>;

    const Th = ({ children, className, rowSpan, colSpan, isSubHeader }) => (
        <th rowSpan={rowSpan} colSpan={colSpan} className={`px-2 py-3 text-sm font-bold text-slate-700 text-center min-w-[70px] border border-gray-200 bg-primary-50 ${className}`}>
            {children}
        </th>
    );

    const Td = ({ children, className, isTotal }) => (
        <td className={`px-2 py-3 text-sm text-gray-700 text-center border border-gray-200 ${className}`}>
            {typeof children === 'number' ? children.toLocaleString() : children}
        </td>
    );

    return (
        <div className="space-y-6">
            {/* Header with Excel Button */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 transition-all font-medium shadow-md hover:shadow-lg"
                >
                    <Download size={18} />
                    엑셀 저장
                </button>
            </div>

            {/* Month Navigation & Table Container */}
            <div className="bg-white p-0 rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-primary-500 p-2 border-b border-primary-600 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-white pl-3">통계</h2>
                </div>
                <div className="p-6">
                    {/* Month Navigation */}
                    <div className="flex justify-center items-center p-4 border-b border-gray-100 gap-4 mb-4">
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

                    {/* Table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr>
                                    <Th rowSpan={2} className="sticky left-0 z-20 min-w-[120px] border-r-gray-200">구분</Th>
                                    <Th colSpan={3}>성인</Th>
                                    <Th colSpan={3}>중고생</Th>
                                    <Th colSpan={3}>어린이</Th>
                                    <Th colSpan={3}>합계</Th>
                                </tr>
                                <tr>
                                    <Th isSubHeader>남</Th><Th isSubHeader>여</Th><Th isSubHeader>소계</Th>
                                    <Th isSubHeader>남</Th><Th isSubHeader>여</Th><Th isSubHeader>소계</Th>
                                    <Th isSubHeader>남</Th><Th isSubHeader>여</Th><Th isSubHeader>소계</Th>
                                    <Th isSubHeader>남</Th>
                                    <Th isSubHeader>여</Th>
                                    <Th isSubHeader>합계</Th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="px-2 py-3 text-sm tracking-wider text-center sticky left-0 z-10 font-bold text-slate-700 bg-white border border-gray-200 min-w-[120px]">
                                        평생교육강좌
                                    </td>
                                    <Td>{stats.edu.adultM}</Td>
                                    <Td>{stats.edu.adultF}</Td>
                                    <Td className="font-bold">{stats.edu.adultSum}</Td>
                                    <Td>{stats.edu.teenM}</Td>
                                    <Td>{stats.edu.teenF}</Td>
                                    <Td className="font-bold">{stats.edu.teenSum}</Td>
                                    <Td>{stats.edu.childM}</Td>
                                    <Td>{stats.edu.childF}</Td>
                                    <Td className="font-bold">{stats.edu.childSum}</Td>
                                    <Td>{stats.edu.maleSum}</Td>
                                    <Td>{stats.edu.femaleSum}</Td>
                                    <Td className="font-bold">{stats.edu.total}</Td>
                                </tr>
                                <tr>
                                    <td className="px-2 py-3 text-sm tracking-wider text-center sticky left-0 z-10 font-bold text-slate-700 bg-white border border-gray-200 min-w-[120px]">
                                        독서문화행사
                                    </td>
                                    <Td>{stats.event.adultM}</Td>
                                    <Td>{stats.event.adultF}</Td>
                                    <Td className="font-bold">{stats.event.adultSum}</Td>
                                    <Td>{stats.event.teenM}</Td>
                                    <Td>{stats.event.teenF}</Td>
                                    <Td className="font-bold">{stats.event.teenSum}</Td>
                                    <Td>{stats.event.childM}</Td>
                                    <Td>{stats.event.childF}</Td>
                                    <Td className="font-bold">{stats.event.childSum}</Td>
                                    <Td>{stats.event.maleSum}</Td>
                                    <Td>{stats.event.femaleSum}</Td>
                                    <Td className="font-bold">{stats.event.total}</Td>
                                </tr>
                                <tr className="bg-primary-50">
                                    <td className="px-2 py-3 text-sm tracking-wider text-center sticky left-0 z-10 font-bold text-slate-700 bg-primary-50 border border-gray-200 min-w-[120px]">
                                        합계
                                    </td>
                                    <Td className="font-bold">{stats.total.adultM}</Td>
                                    <Td className="font-bold">{stats.total.adultF}</Td>
                                    <Td className="font-bold">{stats.total.adultSum}</Td>
                                    <Td className="font-bold">{stats.total.teenM}</Td>
                                    <Td className="font-bold">{stats.total.teenF}</Td>
                                    <Td className="font-bold">{stats.total.teenSum}</Td>
                                    <Td className="font-bold">{stats.total.childM}</Td>
                                    <Td className="font-bold">{stats.total.childF}</Td>
                                    <Td className="font-bold">{stats.total.childSum}</Td>
                                    <Td className="font-bold">{stats.total.maleSum}</Td>
                                    <Td className="font-bold">{stats.total.femaleSum}</Td>
                                    <Td className="font-bold">{stats.total.total}</Td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
