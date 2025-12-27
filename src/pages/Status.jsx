import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useYear } from '../context/YearContext';
import { Download, ChevronDown, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

export default function Status() {
    const { user } = useAuth();
    const { selectedYear } = useYear();
    const navigate = useNavigate();
    const [rawData, setRawData] = useState([]);
    const [processedData, setProcessedData] = useState([]);
    const [filters, setFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
    const [categoryOrder, setCategoryOrder] = useState({});
    const [activeFilterCol, setActiveFilterCol] = useState(null);
    const [filterPosition, setFilterPosition] = useState({ x: 0, y: 0 });
    const [editConfirm, setEditConfirm] = useState({ isOpen: false, itemId: null });
    const popupRef = useRef(null);

    // Helpers
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
            const data = await db.getData(selectedYear);
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

                let amt21001 = 0;
                let amt21006 = 0;
                let amt31006 = 0;

                if (item.budgetItems && Array.isArray(item.budgetItems)) {
                    item.budgetItems.forEach(budgetItem => {
                        const semok = budgetItem.v5 || '';
                        const amount = budgetItem.amount || 0;
                        if (semok === '210-01') amt21001 += amount;
                        else if (semok === '210-06') amt21006 += amount;
                        else if (semok === '310-06') amt31006 += amount;
                    });
                }

                return {
                    id: item.id,
                    ...(item.overview || {}),
                    amt21001, amt21006, amt31006,
                    ...pSums,
                    adultTotal, teenTotal, childTotal, maleTotal, femaleTotal, total,
                    assigneeName: userMap[item.userId] || 'Unknown',
                    updatedAt: item.updatedAt ? (() => {
                        const d = new Date(item.updatedAt);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    })() : ''
                };
            });

            // Set Category Order
            const categoriesData = await db.getCategories(selectedYear);
            const catList = categoriesData['구분'] || [];
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

            // Init Filters
            if (processed.length > 0) {
                const initialFilters = {};
                COLUMNS.forEach(col => {
                    if (col.key === 'index') return;
                    initialFilters[col.key] = {
                        search: '',
                        selected: new Set(getUniqueValues(processed, col.key))
                    };
                });
                setFilters(initialFilters);
            }
        };
        loadStatusData();
    }, [selectedYear]);

    // Filter & Sort Logic
    useEffect(() => {
        let result = [...rawData];

        if (Object.keys(filters).length > 0) {
            Object.keys(filters).forEach(key => {
                const { search, selected } = filters[key] || {};
                if (search) {
                    const lower = search.toLowerCase();
                    result = result.filter(item => String(item[key] || '').toLowerCase().includes(lower));
                }
                if (selected && selected.size > 0) {
                    result = result.filter(item => selected.has(String(item[key] || '')));
                } else if (selected && selected.size === 0) {
                    result = [];
                }
            });
        }

        const { key: sortKey, direction } = sortConfig;
        if (sortKey) {
            result.sort((a, b) => {
                const valA = a[sortKey] ?? '';
                const valB = b[sortKey] ?? '';
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        result = result.map((item, idx) => ({ ...item, index: idx + 1 }));
        setProcessedData(result);
    }, [rawData, filters, sortConfig]);

    // Handlers
    const toggleFilterPopup = (key, event) => {
        if (activeFilterCol === key) {
            setActiveFilterCol(null);
        } else {
            const rect = event.currentTarget.getBoundingClientRect();
            setFilterPosition({ x: Math.min(rect.left, window.innerWidth - 280), y: rect.bottom + 5 });
            setActiveFilterCol(key);
        }
    };

    const handleSortChange = (key, direction) => {
        setSortConfig({ key, direction });
        setActiveFilterCol(null);
    };

    const handleFilterSearchChange = (key, val) => {
        setFilters(prev => ({ ...prev, [key]: { ...prev[key], search: val } }));
    };

    const handleFilterCheckboxChange = (key, val, checked) => {
        setFilters(prev => {
            const current = new Set(prev[key]?.selected || []);
            if (checked) current.add(val);
            else current.delete(val);
            return { ...prev, [key]: { ...prev[key], selected: current } };
        });
    };

    const handleSelectAll = (key, checked, allValues) => {
        setFilters(prev => ({ ...prev, [key]: { ...prev[key], selected: checked ? new Set(allValues) : new Set() } }));
    };

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

    const handleDownloadExcel = () => {
        const fileName = `백데이터_현황_${selectedYear}.xlsx`;
        const headerRow = COLUMNS.map(c => ({ v: c.label, t: 's', s: { font: { bold: true }, fill: { fgColor: { rgb: "87CEEB" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } }));
        const dataRows = processedData.map(item => COLUMNS.map(col => ({ v: item[col.key] ?? '', t: col.type === 'number' ? 'n' : 's', s: { alignment: { horizontal: col.align || "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }, numFmt: col.type === 'number' ? '#,##0' : undefined } })));
        const summaryRow = COLUMNS.map((col, idx) => {
            const s = { font: { bold: true }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };
            if (idx === 0) return { v: '합계', t: 's', s: { ...s, alignment: { horizontal: "center" } } };
            if (col.sum) return { v: summaries[col.key], t: 'n', s: { ...s, alignment: { horizontal: "right" }, numFmt: '#,##0' } };
            return { v: '', t: 's', s };
        });

        const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows, summaryRow]);
        ws['!cols'] = COLUMNS.map(c => ({ wch: 15 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "현황");
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center mb-4">
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-all font-bold shadow-md h-[50px] text-lg"
                >
                    <Download size={20} />
                    엑셀 저장
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-xs text-left text-gray-500 border-collapse">
                        <thead className="bg-gray-50 text-gray-700 uppercase">
                            <tr>
                                {COLUMNS.map((col) => (
                                    <th key={col.key} className="px-3 py-2 border border-gray-200 text-center relative">
                                        <div className="flex justify-center items-center gap-1">
                                            <span>{col.label}</span>
                                            {col.key !== 'index' && (
                                                <button onClick={(e) => toggleFilterPopup(col.key, e)} className="text-gray-400 hover:text-indigo-600">
                                                    <ChevronDown size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 border-b">
                                    {COLUMNS.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`px-3 py-3 border border-gray-100 ${col.align === 'right' ? 'text-right' : 'text-center'} ${col.key === 'title' ? 'text-indigo-600 font-medium cursor-pointer hover:underline' : ''}`}
                                            onClick={col.key === 'title' ? () => setEditConfirm({ isOpen: true, itemId: item.id }) : undefined}
                                        >
                                            {col.type === 'number' ? (item[col.key] || 0).toLocaleString() : (item[col.key] || '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-indigo-50 font-bold text-indigo-700">
                            <tr>
                                {COLUMNS.map((col, idx) => {
                                    if (idx === 0) return <td key={col.key} className="px-3 py-3 border border-gray-200 text-center">합계</td>;
                                    if (col.key === 'title') return <td key={col.key} className="px-3 py-3 border border-gray-200 text-center">{processedData.length}건</td>;
                                    if (col.sum) return <td key={col.key} className="px-3 py-3 border border-gray-200 text-right">{summaries[col.key]?.toLocaleString()}</td>;
                                    return <td key={col.key} className="px-3 py-3 border border-gray-200"></td>;
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Filter Popup */}
            {activeFilterCol && activeCol && (
                <div
                    ref={popupRef}
                    className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 z-[100] p-3 w-64"
                    style={{ left: filterPosition.x, top: filterPosition.y }}
                >
                    <div className="flex justify-between items-center mb-2 pb-2 border-b">
                        <span className="font-bold text-sm">{activeCol.label}</span>
                        <button onClick={() => setActiveFilterCol(null)}>✕</button>
                    </div>
                    <div className="flex flex-col gap-1 mb-2 border-b pb-2">
                        <button onClick={() => handleSortChange(activeFilterCol, 'asc')} className="text-left text-xs py-1.5 px-2 hover:bg-gray-100 rounded">오름차순</button>
                        <button onClick={() => handleSortChange(activeFilterCol, 'desc')} className="text-left text-xs py-1.5 px-2 hover:bg-gray-100 rounded">내림차순</button>
                    </div>
                    <input
                        type="text"
                        placeholder="검색..."
                        className="w-full text-xs p-2 border rounded mb-2"
                        value={filters[activeFilterCol]?.search || ''}
                        onChange={(e) => handleFilterSearchChange(activeFilterCol, e.target.value)}
                    />
                    <div className="max-h-40 overflow-y-auto border rounded p-1">
                        <label className="flex items-center p-1 hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={filters[activeFilterCol]?.selected?.size === getUniqueValues(rawData, activeFilterCol).length}
                                onChange={(e) => handleSelectAll(activeFilterCol, e.target.checked, getUniqueValues(rawData, activeFilterCol))}
                            />
                            <span className="text-xs">전체 선택</span>
                        </label>
                        {getUniqueValues(rawData, activeFilterCol).filter(v => v.toLowerCase().includes((filters[activeFilterCol]?.search || '').toLowerCase())).map(val => (
                            <label key={val} className="flex items-center p-1 hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mr-2"
                                    checked={filters[activeFilterCol]?.selected?.has(val)}
                                    onChange={(e) => handleFilterCheckboxChange(activeFilterCol, val, e.target.checked)}
                                />
                                <span className="text-xs truncate">{val}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]">
                    <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
                        <h3 className="text-lg font-bold mb-4">데이터를 수정하시겠습니까?</h3>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setEditConfirm({ isOpen: false, itemId: null })} className="px-6 py-2 bg-gray-200 rounded-md font-bold">취소</button>
                            <button onClick={() => { navigate(`/input?id=${editConfirm.itemId}`); setEditConfirm({ isOpen: false, itemId: null }); }} className="px-6 py-2 bg-indigo-600 text-white rounded-md font-bold">확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
