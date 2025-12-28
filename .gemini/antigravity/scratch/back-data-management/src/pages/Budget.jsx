import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useYear } from '../context/YearContext';
import { useAuth } from '../context/AuthContext';
import { Download } from 'lucide-react';
import XLSX from 'xlsx-js-style';

export default function Budget() {
    const { selectedYear } = useYear();
    const { user } = useAuth();
    const [budgetData, setBudgetData] = useState([]);
    const [categories, setCategories] = useState([]);
    const [detailPopup, setDetailPopup] = useState({ isOpen: false, items: [], budgetKey: '' });
    const [popupSort, setPopupSort] = useState({ key: null, direction: null });

    useEffect(() => {
        loadData();
    }, [selectedYear, user]);

    const loadData = async () => {
        // Load categories for budget structure
        const loadedCategories = await db.getCategories(selectedYear, user?.libraryName);
        setCategories(loadedCategories);

        // Load all data entries
        const allData = await db.getData(selectedYear, user?.libraryName);

        // Create budget summary from all entries
        const budgetMap = {};

        // Initialize from categories
        if (loadedCategories['예산']) {
            loadedCategories['예산'].forEach(item => {
                if (typeof item === 'object' && item.v1) {
                    const key = `${item.v1}|${item.v2}|${item.v3}|${item.v4}|${item.v5}`;
                    budgetMap[key] = {
                        v1: item.v1,
                        v2: item.v2,
                        v3: item.v3,
                        v4: item.v4,
                        v5: item.v5,
                        allocated: item.v6 ? Number(item.v6.toString().replace(/,/g, '')) : 0,
                        spent: 0,
                        details: [] // Store individual entries
                    };
                }
            });
        }

        // Sum up spent amounts from filtered data entries
        allData.forEach(entry => {
            if (entry.budgetItems && Array.isArray(entry.budgetItems)) {
                entry.budgetItems.forEach(budgetItem => {
                    const key = `${budgetItem.v1}|${budgetItem.v2}|${budgetItem.v3}|${budgetItem.v4}|${budgetItem.v5}`;
                    if (budgetMap[key]) {
                        budgetMap[key].spent += (budgetItem.amount || 0);
                        budgetMap[key].details.push({
                            title: entry.overview?.title || '제목 없음',
                            amount: budgetItem.amount || 0
                        });
                    }
                });
            }
        });

        setBudgetData(Object.values(budgetMap));
    };

    const handleSpentClick = (item) => {
        if (!item.spent || item.spent === 0) return;

        const budgetKey = `${item.v1} > ${item.v2} > ${item.v3} > ${item.v4} > ${item.v5}`;
        setDetailPopup({
            isOpen: true,
            items: item.details,
            budgetKey
        });
        setPopupSort({ key: null, direction: null });
    };

    const sortedPopupItems = useMemo(() => {
        if (!popupSort.key || !popupSort.direction) return detailPopup.items;

        return [...detailPopup.items].sort((a, b) => {
            const aVal = a[popupSort.key];
            const bVal = b[popupSort.key];

            if (typeof aVal === 'number') {
                return popupSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
            return popupSort.direction === 'asc'
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });
    }, [detailPopup.items, popupSort]);

    const togglePopupSort = (key) => {
        setPopupSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleDownloadExcel = () => {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const fileName = `예산현황_${dateStr}.xlsx`;

        const headerRow = [
            { v: '구분', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: "87CEEB" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: '사업내역(대)', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: "87CEEB" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: '사업내역(중)', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: "87CEEB" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: '사업내역(소)', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: "87CEEB" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: '목-세목', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: "87CEEB" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: '배정금액', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: "87CEEB" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: '지출금액', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: "87CEEB" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: '잔액', t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: "87CEEB" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } }
        ];

        const dataRows = budgetData.map(item => [
            { v: item.v1, t: 's', s: { alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: item.v2, t: 's', s: { alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: item.v3, t: 's', s: { alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: item.v4, t: 's', s: { alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: item.v5, t: 's', s: { alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
            { v: item.allocated, t: 'n', s: { alignment: { horizontal: "right" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }, numFmt: '#,##0' } },
            { v: item.spent, t: 'n', s: { alignment: { horizontal: "right" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }, numFmt: '#,##0' } },
            { v: item.allocated - item.spent, t: 'n', s: { alignment: { horizontal: "right" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }, numFmt: '#,##0' } }
        ]);

        const wsData = [headerRow, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wscols = [
            { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "예산");
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center mb-4">
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-all font-medium shadow-md hover:shadow-lg"
                >
                    <Download size={18} />
                    엑셀 저장
                </button>
            </div>


            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-[#d5f7c9] text-xs text-slate-800 uppercase font-bold">
                            <tr>
                                <th className="px-3 py-2 border border-gray-200 whitespace-nowrap text-center">
                                    <div className="flex justify-center items-center gap-1">
                                        <span className="text-xs">구분</span>
                                    </div>
                                </th>
                                <th className="px-3 py-2 border border-gray-200 whitespace-nowrap text-center">
                                    <div className="flex justify-center items-center gap-1">
                                        <span className="text-xs">사업내역(대)</span>
                                    </div>
                                </th>
                                <th className="px-3 py-2 border border-gray-200 whitespace-nowrap text-center">
                                    <div className="flex justify-center items-center gap-1">
                                        <span className="text-xs">사업내역(중)</span>
                                    </div>
                                </th>
                                <th className="px-3 py-2 border border-gray-200 whitespace-nowrap text-center">
                                    <div className="flex justify-center items-center gap-1">
                                        <span className="text-xs">사업내역(소)</span>
                                    </div>
                                </th>
                                <th className="px-3 py-2 border border-gray-200 whitespace-nowrap text-center">
                                    <div className="flex justify-center items-center gap-1">
                                        <span className="text-xs">목-세목</span>
                                    </div>
                                </th>
                                <th className="px-3 py-2 border border-gray-200 whitespace-nowrap text-center">
                                    <div className="flex justify-center items-center gap-1">
                                        <span className="text-xs">배정금액</span>
                                    </div>
                                </th>
                                <th className="px-3 py-2 border border-gray-200 whitespace-nowrap text-center">
                                    <div className="flex justify-center items-center gap-1">
                                        <span className="text-xs">지출금액</span>
                                    </div>
                                </th>
                                <th className="px-3 py-2 border border-gray-200 whitespace-nowrap text-center">
                                    <div className="flex justify-center items-center gap-1">
                                        <span className="text-xs">잔액</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {budgetData.map((item, index) => {
                                const balance = item.allocated - item.spent;
                                return (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v1}</td>
                                        <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v2}</td>
                                        <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v3}</td>
                                        <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v4}</td>
                                        <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v5}</td>
                                        <td className="px-3 py-2 text-sm text-right border border-gray-200">{item.allocated.toLocaleString()}</td>
                                        <td
                                            className={`px-3 py-2 text-sm text-right border border-gray-200 ${item.spent > 0 ? 'cursor-pointer hover:bg-emerald-50 hover:text-emerald-600 transition-colors font-semibold underline' : ''}`}
                                            onClick={() => handleSpentClick(item)}
                                        >
                                            {item.spent.toLocaleString()}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-right border border-gray-200">
                                            {balance.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Popup */}
            {detailPopup.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-8 shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis mr-4">
                                {detailPopup.budgetKey} - 지출 내역
                            </h3>
                            <button
                                onClick={() => setDetailPopup({ isOpen: false, items: [], budgetKey: '' })}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 border rounded-lg">
                            <table className="min-w-full table-fixed">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th
                                            className="px-6 py-4 text-sm font-bold text-slate-600 text-center border-b cursor-pointer hover:bg-gray-100"
                                            onClick={() => togglePopupSort('title')}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                강좌명
                                                {popupSort.key === 'title' && (
                                                    <span className="text-xs">{popupSort.direction === 'asc' ? '▲' : '▼'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-6 py-4 text-sm font-bold text-slate-600 text-center border-b cursor-pointer hover:bg-gray-100 w-48"
                                            onClick={() => togglePopupSort('amount')}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                지출금액
                                                {popupSort.key === 'amount' && (
                                                    <span className="text-xs">{popupSort.direction === 'asc' ? '▲' : '▼'}</span>
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sortedPopupItems.map((detail, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-700 text-center">{detail.title}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700 text-right font-medium">{detail.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-indigo-50 font-bold sticky bottom-0">
                                    <tr>
                                        <td className="px-6 py-4 text-sm text-indigo-900 text-center border-t">합계</td>
                                        <td className="px-6 py-4 text-sm text-indigo-900 text-right border-t">
                                            {detailPopup.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setDetailPopup({ isOpen: false, items: [], budgetKey: '' })}
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition-all"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
