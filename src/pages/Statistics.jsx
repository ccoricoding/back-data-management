import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useYear } from '../context/YearContext';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import XLSX from 'xlsx-js-style';

export default function Statistics() {
    const { selectedYear } = useYear();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date(selectedYear, new Date().getMonth(), 1));

    useEffect(() => {
        // When global year changes, reset currentDate to that year
        setCurrentDate(new Date(selectedYear, currentDate.getMonth(), 1));
    }, [selectedYear]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const allData = await db.getData(selectedYear);
            setData(allData);
            setLoading(false);
        };
        loadData();
    }, [selectedYear]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const stats = useMemo(() => {
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
        const wsData = [
            ["구분", "성인(남)", "성인(여)", "성인(계)", "중고생(남)", "중고생(여)", "중고생(계)", "어린이(남)", "어린이(여)", "어린이(계)", "남자(계)", "여자(계)", "합계"],
            ["평생교육강좌", stats.edu.adultM, stats.edu.adultF, stats.edu.adultSum, stats.edu.teenM, stats.edu.teenF, stats.edu.teenSum, stats.edu.childM, stats.edu.childF, stats.edu.childSum, stats.edu.maleSum, stats.edu.femaleSum, stats.edu.total],
            ["독서문화행사", stats.event.adultM, stats.event.adultF, stats.event.adultSum, stats.event.teenM, stats.event.teenF, stats.event.teenSum, stats.event.childM, stats.event.childF, stats.event.childSum, stats.event.maleSum, stats.event.femaleSum, stats.event.total],
            ["합계", stats.total.adultM, stats.total.adultF, stats.total.adultSum, stats.total.teenM, stats.total.teenF, stats.total.teenSum, stats.total.childM, stats.total.childF, stats.total.childSum, stats.total.maleSum, stats.total.femaleSum, stats.total.total]
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "통계");
        XLSX.writeFile(wb, `백데이터_통계_${selectedYear}_${currentDate.getMonth() + 1}월.xlsx`);
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold">데이터를 불러오는 중...</div>;

    const Th = ({ children, className, rowSpan, colSpan }) => (
        <th rowSpan={rowSpan} colSpan={colSpan} className={`px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-center border border-gray-200 ${className}`}>
            {children}
        </th>
    );

    const Td = ({ children, className, isTotal }) => (
        <td className={`px-4 py-3 text-sm text-gray-700 text-center border border-gray-100 ${isTotal ? 'bg-gray-50 font-bold' : ''} ${className}`}>
            {typeof children === 'number' ? children.toLocaleString() : children}
        </td>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-all font-bold shadow-md"
                >
                    <Download size={18} /> 엑셀 저장
                </button>
            </div>

            <div className="flex items-center justify-center gap-6 mb-6">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={28} /></button>
                <span className="text-3xl font-black text-slate-800">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</span>
                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={28} /></button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <Th rowSpan={2}>구분</Th>
                                <Th colSpan={3} className="bg-indigo-50 text-indigo-700">성인</Th>
                                <Th colSpan={3} className="bg-amber-50 text-amber-700">중고생</Th>
                                <Th colSpan={3} className="bg-emerald-50 text-emerald-700">어린이</Th>
                                <Th colSpan={3} className="bg-slate-800 text-white">합계</Th>
                            </tr>
                            <tr className="bg-gray-50">
                                <Th className="text-[10px]">남</Th><Th className="text-[10px]">여</Th><Th className="bg-indigo-100/50">소계</Th>
                                <Th className="text-[10px]">남</Th><Th className="text-[10px]">여</Th><Th className="bg-amber-100/50">소계</Th>
                                <Th className="text-[10px]">남</Th><Th className="text-[10px]">여</Th><Th className="bg-emerald-100/50">소계</Th>
                                <Th className="text-[10px] text-gray-300">남</Th><Th className="text-[10px] text-gray-300">여</Th><Th className="bg-slate-700">합계</Th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="px-4 py-4 text-center font-bold text-gray-700 border border-gray-200">평생교육강좌</td>
                                <Td>{stats.edu.adultM}</Td><Td>{stats.edu.adultF}</Td><Td className="bg-indigo-50/30 font-bold">{stats.edu.adultSum}</Td>
                                <Td>{stats.edu.teenM}</Td><Td>{stats.edu.teenF}</Td><Td className="bg-amber-50/30 font-bold">{stats.edu.teenSum}</Td>
                                <Td>{stats.edu.childM}</Td><Td>{stats.edu.childF}</Td><Td className="bg-emerald-50/30 font-bold">{stats.edu.childSum}</Td>
                                <Td>{stats.edu.maleSum}</Td><Td>{stats.edu.femaleSum}</Td><Td className="bg-slate-100 font-black text-indigo-600">{stats.edu.total}</Td>
                            </tr>
                            <tr>
                                <td className="px-4 py-4 text-center font-bold text-gray-700 border border-gray-200">독서문화행사</td>
                                <Td>{stats.event.adultM}</Td><Td>{stats.event.adultF}</Td><Td className="bg-indigo-50/30 font-bold">{stats.event.adultSum}</Td>
                                <Td>{stats.event.teenM}</Td><Td>{stats.event.teenF}</Td><Td className="bg-amber-50/30 font-bold">{stats.event.teenSum}</Td>
                                <Td>{stats.event.childM}</Td><Td>{stats.event.childF}</Td><Td className="bg-emerald-50/30 font-bold">{stats.event.childSum}</Td>
                                <Td>{stats.event.maleSum}</Td><Td>{stats.event.femaleSum}</Td><Td className="bg-slate-100 font-black text-indigo-600">{stats.event.total}</Td>
                            </tr>
                            <tr className="bg-slate-800 text-white font-black">
                                <td className="px-4 py-4 text-center border border-slate-700">합계</td>
                                <Td className="text-gray-300 bg-slate-800">{stats.total.adultM}</Td><Td className="text-gray-300 bg-slate-800">{stats.total.adultF}</Td><Td className="bg-slate-700 text-indigo-300">{stats.total.adultSum}</Td>
                                <Td className="text-gray-300 bg-slate-800">{stats.total.teenM}</Td><Td className="text-gray-300 bg-slate-800">{stats.total.teenF}</Td><Td className="bg-slate-700 text-amber-300">{stats.total.teenSum}</Td>
                                <Td className="text-gray-300 bg-slate-800">{stats.total.childM}</Td><Td className="text-gray-300 bg-slate-800">{stats.total.childF}</Td><Td className="bg-slate-700 text-emerald-300">{stats.total.childSum}</Td>
                                <Td className="text-gray-300 bg-slate-800">{stats.total.maleSum}</Td><Td className="text-gray-300 bg-slate-800">{stats.total.femaleSum}</Td><Td className="bg-indigo-600 text-white text-xl">{stats.total.total}</Td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
