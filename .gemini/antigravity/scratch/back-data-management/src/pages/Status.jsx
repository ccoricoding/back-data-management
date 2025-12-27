import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { useYear } from '../context/YearContext';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, Filter, Download } from 'lucide-react';
import XLSX from 'xlsx-js-style';

const COLUMNS = [
    { key: 'index', label: '연번', type: 'number', align: 'center' },
    { key: 'category', label: '구분', type: 'string', align: 'center' },
    { key: 'title', label: '제목', type: 'string', align: 'center' },
    { key: 'instructor', label: '강사', type: 'string', align: 'center' },
    { key: 'count', label: '횟수', type: 'number', align: 'center', sum: true },
    { key: 'weekType', label: '평일/주말', type: 'string', align: 'center' },
    { key: 'startDate', label: '시작일', type: 'string', align: 'center' },
    { key: 'endDate', label: '종료일', type: 'string', align: 'center' },
    { key: 'startTime', label: '시작시간', type: 'string', align: 'center' },
    { key: 'endTime', label: '종료시간', type: 'string', align: 'center' },
    { key: 'inOut', label: '관내/관외', type: 'string', align: 'center' },
    { key: 'place', label: '장소', type: 'string', align: 'center' },
    { key: 'connection', label: '연계', type: 'string', align: 'center' },
    { key: 'target', label: '대상', type: 'string', align: 'center' },
    { key: 'method', label: '방법', type: 'string', align: 'center' },
    { key: 'amt21001', label: '210-01', type: 'number', align: 'right', sum: true },
    { key: 'amt21006', label: '210-06', type: 'number', align: 'right', sum: true },
    { key: 'amt31006', label: '310-06', type: 'number', align: 'right', sum: true },
    { key: 'adultM', label: '성인(남)', type: 'number', align: 'center', sum: true },
    { key: 'adultF', label: '성인(여)', type: 'number', align: 'center', sum: true },
    { key: 'adultTotal', label: '성인(계)', type: 'number', align: 'center', sum: true },
    { key: 'teenM', label: '중고생(남)', type: 'number', align: 'center', sum: true },
    { key: 'teenF', label: '중고생(여)', type: 'number', align: 'center', sum: true },
    { key: 'teenTotal', label: '중고생(계)', type: 'number', align: 'center', sum: true },
    { key: 'childM', label: '어린이(남)', type: 'number', align: 'center', sum: true },
    { key: 'childF', label: '어린이(여)', type: 'number', align: 'center', sum: true },
    { key: 'childTotal', label: '어린이(계)', type: 'number', align: 'center', sum: true },
    { key: 'maleTotal', label: '남자(계)', type: 'number', align: 'center', sum: true },
    { key: 'femaleTotal', label: '여자(계)', type: 'number', align: 'center', sum: true },
    { key: 'total', label: '합계', type: 'number', align: 'center', sum: true },
    { key: 'assigneeName', label: '작업자', type: 'string', align: 'center' },
    { key: 'updatedAt', label: '작업일시', type: 'string', align: 'center' },
];

const getUniqueValues = (data, key) => {
    const values = new Set();
    data.forEach(item => {
        const val = item[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
            values.add(String(val));
        }
    });
    return Array.from(values).sort();
};

export default function Status() {
    const navigate = useNavigate();
    const { selectedYear } = useYear();
    const { user } = useAuth();
    const [rawData, setRawData] = useState([]);
    const [processedData, setProcessedData] = useState([]);
    const [filters, setFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
    const [categoryOrder, setCategoryOrder] = useState({});
    const [activeFilterCol, setActiveFilterCol] = useState(null);
    const [filterPosition, setFilterPosition] = useState({ x: 0, y: 0 });
    const [editConfirm, setEditConfirm] = useState({ isOpen: false, itemId: null });
    const popupRef = useRef(null);

    // Close popup on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeFilterCol && popupRef.current && !popupRef.current.contains(event.target)) {
                setActiveFilterCol(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeFilterCol]);

    // Load Data
    useEffect(() => {
        const loadStatusData = async () => {
            const data = await db.getData(selectedYear, user?.libraryName);
            const users = await db.getUsers();
            const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

            const processed = data.map(item => {
                let pSums = { adultM: 0, adultF: 0, teenM: 0, teenF: 0, childM: 0, childF: 0 };

                if (item.performances && Array.isArray(item.performances)) {
                    item.performances.forEach(p => {
                        pSums.adultM += (p.adultM || 0);
                        pSums.adultF += (p.adultF || 0);
                        pSums.teenM += (p.teenM || 0);
                        pSums.teenF += (p.teenF || 0);
                        pSums.childM += (p.childM || 0);
                        pSums.childF += (p.childF || 0);
                    });
                }

                const adultTotal = pSums.adultM + pSums.adultF;
                const teenTotal = pSums.teenM + pSums.teenF;
                const childTotal = pSums.childM + pSums.childF;
                const maleTotal = pSums.adultM + pSums.teenM + pSums.childM;
                const femaleTotal = pSums.adultF + pSums.teenF + pSums.childF;
                const total = maleTotal + femaleTotal;

                // Calculate budget amounts from budgetItems based on v5 (세목)
                let amt21001 = 0;
                let amt21006 = 0;
                let amt31006 = 0;

                if (item.budgetItems && Array.isArray(item.budgetItems)) {
                    item.budgetItems.forEach(budgetItem => {
                        const semok = budgetItem.v5 || '';
                        const amount = budgetItem.amount || 0;

                        if (semok === '210-01') {
                            amt21001 += amount;
                        } else if (semok === '210-06') {
                            amt21006 += amount;
                        } else if (semok === '310-06') {
                            amt31006 += amount;
                        }
                    });
                }

                return {
                    id: item.id,
                    ...(item.overview || {}),
                    amt21001,
                    amt21006,
                    amt31006,
                    ...pSums,
                    adultTotal, teenTotal, childTotal, maleTotal, femaleTotal, total,
                    assigneeName: userMap[item.userId] || 'Unknown',
                    updatedAt: item.updatedAt ? (() => {
                        const d = new Date(item.updatedAt);
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const hour = String(d.getHours()).padStart(2, '0');
                        const minute = String(d.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day} ${hour}:${minute}`;
                    })() : ''
                };
            });

            // Sort: Category (DB Order) > Title (Alphabetical)
            const categories = await db.getCategories(selectedYear, user?.libraryName);
            const catList = categories['구분'] || [];
            const catOrder = catList.reduce((acc, cat, idx) => {
                const label = typeof cat === 'object' ? `${cat.v1} > ${cat.v2} > ${cat.v3}` : cat;
                return { ...acc, [label]: idx };
            }, {});
            setCategoryOrder(catOrder);

            processed.sort((a, b) => {
                const catA = String(a.category || '');
                const catB = String(b.category || '');
                const cA = catOrder[catA] !== undefined ? catOrder[catA] : 999;
                const cB = catOrder[catB] !== undefined ? catOrder[catB] : 999;
                if (cA !== cB) return cA - cB;
                return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
            });

            setRawData(processed);

            // Initialize filters with all values selected (excluding 'index' which is calculated)
            if (processed.length > 0) {
                const initialFilters = {};
                COLUMNS.forEach(col => {
                    if (col.key === 'index') return; // Skip index column
                    // Double check to ensure no index filter is ever created
                    if (col.key === 'index' || col.key === '연번') return;

                    initialFilters[col.key] = {
                        search: '',
                        selected: new Set(getUniqueValues(processed, col.key))
                    };
                });
                setFilters(initialFilters);
            }
        };

        loadStatusData();
    }, [selectedYear, user]);

    // Filter & Sort
    useEffect(() => {
        let result = [...rawData];

        // Don't filter if filters are not initialized
        if (Object.keys(filters).length > 0) {
            Object.keys(filters).forEach(key => {
                const { search, selected } = filters[key] || {};

                if (search) {
                    const lowerSearch = search.toLowerCase();
                    result = result.filter(item => {
                        const val = String(item[key] || '');
                        return val.toLowerCase().includes(lowerSearch);
                    });
                }

                // If selected exists and has items, filter by it
                if (selected && selected.size > 0) {
                    result = result.filter(item => {
                        const val = String(item[key] || '');
                        return selected.has(val) || (val === '' && selected.size === getUniqueValues(rawData, key).length);
                    });
                } else if (selected && selected.size === 0) {
                    result = [];
                }
            });
        }

        // Sort
        const { key: sortKey, direction } = sortConfig;
        if (sortKey) {
            result.sort((a, b) => {
                if (sortKey === 'category') {
                    const cA = String(a.category || '');
                    const cB = String(b.category || '');

                    if (cA !== cB) {
                        return direction === 'asc'
                            ? cA.localeCompare(cB, 'ko')
                            : cB.localeCompare(cA, 'ko');
                    }

                    // Same category: Title ASC
                    return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
                }

                const valA = a[sortKey] ?? '';
                const valB = b[sortKey] ?? '';

                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sort: Category (DB Order) > Title (Alphabetical)
            result.sort((a, b) => {
                const catA = String(a.category || '');
                const catB = String(b.category || '');
                const cA = categoryOrder[catA] !== undefined ? categoryOrder[catA] : 999;
                const cB = categoryOrder[catB] !== undefined ? categoryOrder[catB] : 999;
                if (cA !== cB) return cA - cB;
                return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
            });
        }

        // Apply Year Filter (Start Date)
        if (selectedYear && selectedYear !== '') {
            const targetYear = String(selectedYear);
            result = result.filter(item => {
                const dateStr = String(item.startDate || '').trim();
                return dateStr.includes(targetYear);
            });
        }

        // Add Index (1-based)
        result = result.map((item, idx) => ({ ...item, index: idx + 1 }));

        setProcessedData(result);
    }, [rawData, filters, sortConfig, categoryOrder, selectedYear]);

    // Handlers
    const toggleFilterPopup = (key, event) => {
        if (activeFilterCol === key) {
            setActiveFilterCol(null);
        } else {
            const rect = event.currentTarget.getBoundingClientRect();
            const popupHeight = 320;
            const popupWidth = 260;

            let x = rect.left;
            if (x + popupWidth > window.innerWidth - 20) {
                x = window.innerWidth - popupWidth - 20;
            }
            if (x < 20) x = 20;

            let y = rect.bottom + 4;
            if (y + popupHeight > window.innerHeight - 20) {
                y = rect.top - popupHeight - 4;
                if (y < 80) y = 80;
            }

            setFilterPosition({ x, y });
            setActiveFilterCol(key);
        }
    };

    const handleSortChange = (key, direction) => {
        setSortConfig({ key, direction });
        setActiveFilterCol(null);
    };

    const handleFilterSearchChange = (key, val) => {
        setFilters(prev => ({
            ...prev,
            [key]: { ...prev[key], search: val }
        }));
    };

    const handleFilterCheckboxChange = (key, valStr, checked) => {
        setFilters(prev => {
            const currentSelected = prev[key]?.selected
                ? new Set(prev[key].selected)
                : new Set(getUniqueValues(rawData, key));

            if (checked) currentSelected.add(valStr);
            else currentSelected.delete(valStr);

            return {
                ...prev,
                [key]: { ...(prev[key] || {}), selected: currentSelected }
            };
        });
    };

    const handleSelectAll = (key, checked, allValues) => {
        setFilters(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                selected: checked ? new Set(allValues) : new Set()
            }
        }));
    };

    // Summaries
    const summaries = useMemo(() => {
        const sums = {};
        COLUMNS.forEach(col => {
            if (col.sum) {
                sums[col.key] = processedData.reduce((acc, curr) => acc + (Number(curr[col.key]) || 0), 0);
            }
        });
        return sums;
    }, [processedData]);

    const activeCol = COLUMNS.find(c => c.key === activeFilterCol);

    // Excel Export
    const handleDownloadExcel = () => {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const fileName = `백데이터_현황_${dateStr}.xlsx`;

        const headerRow = COLUMNS.map(c => ({
            v: c.label,
            t: 's',
            s: {
                font: { bold: true },
                fill: { fgColor: { rgb: "87CEEB" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: 'thin' }, bottom: { style: 'thin' },
                    left: { style: 'thin' }, right: { style: 'thin' }
                }
            }
        }));

        const dataRows = processedData.map(item => {
            return COLUMNS.map(col => ({
                v: item[col.key] ?? '',
                t: col.type === 'number' ? 'n' : 's',
                s: {
                    alignment: { horizontal: col.align || "center", vertical: "center" },
                    border: {
                        top: { style: 'thin' }, bottom: { style: 'thin' },
                        left: { style: 'thin' }, right: { style: 'thin' }
                    },
                    numFmt: col.type === 'number' ? '#,##0' : undefined
                }
            }));
        });

        const summaryRow = COLUMNS.map((col, idx) => {
            const commonStyle = {
                font: { bold: true },
                border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
            };
            if (idx === 0) return { v: '합계', t: 's', s: { ...commonStyle, alignment: { horizontal: "center" } } };
            if (col.sum) return { v: summaries[col.key], t: 'n', s: { ...commonStyle, alignment: { horizontal: col.align || "right" }, numFmt: '#,##0' } };
            return { v: '', t: 's', s: { ...commonStyle } };
        });

        const wsData = [headerRow, ...dataRows, summaryRow];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wscols = COLUMNS.map(c => ({ wch: Math.max(c.label.length * 2, 10) }));
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "현황");
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
                    <table className="w-full min-w-max text-sm text-left text-gray-500 border-collapse">
                        <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                            <tr>
                                {COLUMNS.map((col) => (
                                    <th key={col.key} className="px-3 py-2 border border-gray-200 whitespace-nowrap text-center">
                                        <div className="flex justify-center items-center gap-1">
                                            <span className="text-xs">{col.label}</span>
                                            <button
                                                onClick={(e) => toggleFilterPopup(col.key, e)}
                                                className={`p-0.5 rounded hover:bg-gray-200 ${activeFilterCol === col.key ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'}`}
                                            >
                                                <ChevronDown size={12} />
                                            </button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.length > 0 ? processedData.map((item) => (
                                <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                    {COLUMNS.map(col => (
                                        <td
                                            key={col.key}
                                            className={`px-3 py-4 border border-gray-100 whitespace-nowrap text-xs ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'} ${col.key === 'title' ? 'cursor-pointer hover:text-indigo-600 hover:underline' : ''}`}
                                            onClick={col.key === 'title' ? () => setEditConfirm({ isOpen: true, itemId: item.id }) : undefined}
                                        >
                                            {col.type === 'number' ? (item[col.key] || 0).toLocaleString() : (item[col.key] || '')}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-gray-400">
                                        데이터가 없습니다.
                                    </td>
                                </tr>
                            )}
                            {/* Summary Row */}
                            <tr className="bg-indigo-50 font-bold border-t-2 border-indigo-200 text-indigo-700">
                                {COLUMNS.map((col, idx) => {
                                    if (idx === 0) return <td key={col.key} className="px-3 py-2 border border-gray-200 text-center text-xs">합계</td>;

                                    // 요청사항: 제목(title) 열 하단에 건수 표시
                                    if (col.key === 'title') {
                                        return (
                                            <td key={col.key} className="px-3 py-2 border border-gray-200 text-center text-xs text-indigo-700">
                                                {processedData.length.toLocaleString()} 개
                                            </td>
                                        );
                                    }

                                    if (col.sum) {
                                        let unit = '명'; // Default to person count
                                        if (col.key === 'count') unit = '회';
                                        else if (col.key.startsWith('amt')) unit = '원';

                                        return (
                                            <td key={col.key} className={`px-3 py-2 border border-gray-200 text-xs ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                                                {summaries[col.key]?.toLocaleString()} {unit}
                                            </td>
                                        );
                                    }
                                    return <td key={col.key} className="px-3 py-2 border border-gray-200"></td>;
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Filter Popup - Fixed Position Portal */}
            {activeFilterCol && activeCol && (
                <div
                    ref={popupRef}
                    className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 z-[100] p-3"
                    style={{
                        left: filterPosition.x,
                        top: filterPosition.y,
                        width: 260,
                        maxHeight: 'calc(100vh - 100px)'
                    }}
                >
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                        <span className="font-semibold text-sm text-gray-700">{activeCol.label}</span>
                        <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>

                    <div className="flex flex-col gap-1 mb-2 border-b border-gray-100 pb-2">
                        <button onClick={() => handleSortChange(activeFilterCol, 'asc')} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded text-left text-gray-700">
                            <span className="text-xs">오름차순 정렬</span>
                        </button>
                        <button onClick={() => handleSortChange(activeFilterCol, 'desc')} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded text-left text-gray-700">
                            <span className="text-xs">내림차순 정렬</span>
                        </button>
                    </div>

                    <div className="mb-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="검색"
                                value={filters[activeFilterCol]?.search || ''}
                                onChange={(e) => handleFilterSearchChange(activeFilterCol, e.target.value)}
                                className="w-full text-xs p-2 pl-8 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                            />
                            <Filter size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                        </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-gray-100 rounded">
                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                                checked={filters[activeFilterCol]?.selected?.size === getUniqueValues(rawData, activeFilterCol).length}
                                onChange={(e) => handleSelectAll(activeFilterCol, e.target.checked, getUniqueValues(rawData, activeFilterCol))}
                            />
                            <span className="text-xs leading-none">(모두 선택)</span>
                        </label>

                        {getUniqueValues(rawData, activeFilterCol)
                            .filter(val => val.toLowerCase().includes((filters[activeFilterCol]?.search || '').toLowerCase()))
                            .map(val => (
                                <label key={val} className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                                        checked={filters[activeFilterCol]?.selected?.has(val) || false}
                                        onChange={(e) => handleFilterCheckboxChange(activeFilterCol, val, e.target.checked)}
                                    />
                                    <span className="text-xs leading-none truncate">{val}</span>
                                </label>
                            ))}
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
