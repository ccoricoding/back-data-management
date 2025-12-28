import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Save, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useYear } from '../context/YearContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

const NumberInput = ({ value, onChange, className }) => (
    <input
        type="text"
        value={value ? value.toLocaleString() : '0'}
        onChange={(e) => onChange(e.target.value)}
        className={`${className}`}
        onFocus={(e) => e.target.select()}
    />
);

const MultiSelect = ({ options, value, onChange, placeholder, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const selectedValues = value ? value.split(', ').filter(Boolean) : [];
    const toggleOption = (option) => {
        let newValues = selectedValues.includes(option)
            ? selectedValues.filter(v => v !== option)
            : [...selectedValues, option];
        onChange(newValues.join(', '));
    };
    return (
        <div className="relative w-full" ref={containerRef}>
            <div className={`w-full border border-gray-300 rounded-md bg-white text-sm py-1.5 px-2 text-left cursor-pointer flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[34px] ${className}`} onClick={() => setIsOpen(!isOpen)}>
                <span className={`block truncate ${selectedValues.length === 0 ? 'text-gray-400' : 'text-gray-900'} flex-1 text-center`}>
                    {selectedValues.length > 0 ? selectedValues.join(', ') : placeholder}
                </span>
                <ChevronDown size={14} className="text-gray-400 ml-1 flex-shrink-0" />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-48 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-100">
                    {options && options.map((option) => (
                        <div key={option} className="cursor-pointer select-none relative py-2 pl-3 pr-2 hover:bg-gray-50 flex items-center" onClick={() => toggleOption(option)}>
                            <input type="checkbox" checked={selectedValues.includes(option)} readOnly className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2" />
                            <span className={`block truncate ${selectedValues.includes(option) ? 'font-semibold' : 'font-normal'}`}>{option}</span>
                        </div>
                    ))}
                    {(!options || options.length === 0) && <div className="p-2 text-gray-400 text-center text-xs">옵션 없음</div>}
                </div>
            )}
        </div>
    );
};

export default function DataInput() {
    const { user } = useAuth();
    const { selectedYear } = useYear();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, index: null });

    const [categories, setCategories] = useState({});

    // Form State
    const [overview, setOverview] = useState({
        category: '',       // 구분
        title: '',          // 제목
        instructor: '',     // 강사
        count: 1,           // 횟수
        weekType: '',       // 평일/주말
        startDate: '',      // 시작일
        endDate: '',        // 종료일
        startTime: '09:00', // 시작시간
        endTime: '10:00',   // 종료시간
        inOut: '',          // 관내/관외
        place: '',          // 장소
        connection: '',     // 연계
        target: '',         // 대상
        method: '',         // 방법
    });

    const [budgetItems, setBudgetItems] = useState([]);

    const [performances, setPerformances] = useState([
        {
            opDate: '',
            adultM: 0, adultF: 0,
            teenM: 0, teenF: 0,
            childM: 0, childF: 0
        }
    ]);

    useEffect(() => {
        const loadInitialData = async () => {
            const loadedCategories = await db.getCategories(selectedYear, user?.libraryName);
            setCategories(loadedCategories);

            // Initialize budgetItems from categories
            if (loadedCategories['예산']) {
                const budgetCategoryItems = loadedCategories['예산'].filter(item => typeof item === 'object' && item.v1);
                const initialBudgetItems = budgetCategoryItems.map(item => ({
                    v1: item.v1,
                    v2: item.v2,
                    v3: item.v3,
                    v4: item.v4,
                    v5: item.v5,
                    amount: 0
                }));
                setBudgetItems(initialBudgetItems);
            }

            if (editId) {
                const allData = await db.getData(selectedYear, user?.libraryName);
                const existingData = allData.find(d => d.id === editId);
                if (existingData) {
                    setOverview(existingData.overview);
                    if (existingData.budgetItems) {
                        setBudgetItems(existingData.budgetItems);
                    }
                    setPerformances(existingData.performances);
                }
            }
        };
        loadInitialData();
    }, [editId, selectedYear, user]);

    const generateTimeOptions = () => {
        const options = [];
        let startHour = 9;
        let endHour = 22;
        for (let h = startHour; h <= endHour; h++) {
            for (let m = 0; m < 60; m += 10) {
                if (h === 22 && m > 0) break;
                const hh = h.toString().padStart(2, '0');
                const mm = m.toString().padStart(2, '0');
                options.push(`${hh}:${mm}`);
            }
        }
        return options;
    };
    const timeOptions = generateTimeOptions();
    const countOptions = Array.from({ length: 200 }, (_, i) => i + 1);

    const renderCategoryOption = (c) => {
        if (typeof c === 'object') {
            return `${c.v1} > ${c.v2} > ${c.v3}`;
        }
        return c;
    };

    const handleOverviewChange = (e) => {
        const { name, value } = e.target;
        setOverview(prev => ({ ...prev, [name]: value }));
    };

    const handleBudgetItemChange = (index, value) => {
        const cleanVal = String(value).replace(/,/g, '');
        if (isNaN(cleanVal) || cleanVal < 0) return;
        const newBudgetItems = [...budgetItems];
        newBudgetItems[index] = { ...newBudgetItems[index], amount: Number(cleanVal) };
        setBudgetItems(newBudgetItems);
    };

    const addPerformanceRow = () => {
        setPerformances(prev => [
            ...prev,
            { opDate: '', adultM: 0, adultF: 0, teenM: 0, teenF: 0, childM: 0, childF: 0 }
        ]);
    };

    const removePerformanceRow = () => {
        if (performances.length <= 1) return;
        setPerformances(prev => prev.slice(0, -1));
    };

    const handlePerformanceChange = (index, field, value) => {
        const newPerfs = [...performances];
        newPerfs[index][field] = value;
        setPerformances(newPerfs);
    };

    const handlePerformanceNumberChange = (index, field, value) => {
        let val = value.replace(/,/g, '');
        if (isNaN(val) || val < 0) return;
        const newPerfs = [...performances];
        newPerfs[index][field] = Number(val);
        setPerformances(newPerfs);
    };

    const handleDataDeleteClick = () => {
        setDeleteConfirm({ isOpen: true, type: 'data' });
    };

    const handleRowDeleteClick = (index) => {
        setDeleteConfirm({ isOpen: true, type: 'row', index });
    };

    const confirmDelete = async () => {
        if (deleteConfirm.type === 'data') {
            await db.deleteData(editId);
            navigate('/');
        } else if (deleteConfirm.type === 'row') {
            const idx = deleteConfirm.index;
            if (performances.length === 1) {
                alert("최소 1개의 실적은 유지해야 합니다.");
            } else {
                setPerformances(prev => prev.filter((_, i) => i !== idx));
            }
            setDeleteConfirm({ isOpen: false, type: null, index: null });
        }
    };

    const closeDeleteModal = () => {
        setDeleteConfirm({ isOpen: false, type: null, index: null });
    };

    const handleSave = async () => {
        setError('');
        // 1. Validation for Empty Inputs
        for (const [key, value] of Object.entries(overview)) {
            if (key === 'count') continue;
            if (!value || value.trim() === '') {
                setError('모든 항목을 입력해 주세요.');
                return;
            }
        }
        for (const perf of performances) {
            if (!perf.opDate) {
                setError('모든 항목을 입력해 주세요.');
                return;
            }
        }

        // 2. Duplicate Title Check
        const allData = await db.getData(selectedYear, user?.libraryName);
        const isDuplicate = allData.some(d =>
            d.overview.title === overview.title && d.id !== editId
        );

        if (isDuplicate) {
            setError('중복된 제목이 있습니다.');
            return;
        }

        const dataToSave = {
            id: editId || undefined,
            userId: user.id,
            overview: { ...overview, year: String(selectedYear) },
            budgetItems,
            performances,
            updatedAt: new Date().toISOString()
        };

        try {
            if (editId) {
                await db.updateData(editId, dataToSave);
            } else {
                await db.saveData(dataToSave, selectedYear, user?.libraryName);
            }

            setSuccess('작업이 성공적으로 저장되었습니다.');
            if (!editId) {
                setTimeout(() => navigate('/'), 1000);
            }
        } catch (error) {
            console.error('Save error:', error);
            // Show detailed error message from Supabase
            setError(`저장에 실패했습니다: ${error.message || error.details || '알 수 없는 오류'}`);
        }
    };

    // Styling classes
    // Added bg-slate-50 to selects to show "empty" state visual if needed, but per request:
    // "배경색 설정해줘서 빈칸이 하얗다는 걸 보이게 해줘" -> I interpret this as inputs should be white (as they are) but maybe the background of the container makes them pop? 
    // Or maybe the User means "Input fields should have a background color like the 210-01 box (slate-50) so that white means empty?" 
    // "210-01, 선택처럼 배경색 설정해줘서 빈칸이 하얗다는 걸 보이게 해줘" 
    // 210-01 currently has a wrapper bg-slate-50.
    // The user wants ALL inputs to look like they are in a 'box' or have a background so the white input area stands out?
    // Let's interpret: Add a background to the area SURROUNDING the input, or make the input itself distinct?
    // "빈칸이 하얗다는 걸 보이게 해줘" -> Implies background is NOT white.
    // Currently, typical inputs are white.
    // Use `bg-slate-50` for the input background? No, then it's not white.
    // Let's assume the user wants the `bg-slate-50` CONTAINER style applied to other fields too, or simple `bg-slate-50` on the input makes the white caret/text stand out?
    // "210-01, 선택처럼 배경색 설정해줘서" -> 210-01 IS wrapped in `bg-slate-50`.
    // OK, I will apply `bg-slate-50 p-2 rounded` wrapper to OTHER inputs too where possible or apply a light gray background to the Selects/Inputs so they aren't stark white?
    // Wait, "빈칸이 하얗다는 걸 보이게 해줘" -> means the input field itself should be white, and the SURROUNDINGS should be colored.
    // So I will wrap all inputs in the Overview section in `bg-slate-50 rounded p-2` blocks.

    const inputWrapperClass = "bg-[#f8edbe] p-2 rounded-lg border border-slate-100";
    const selectClass = "w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2.5 text-center appearance-none bg-white";
    const inputClass = "w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2.5 px-3 text-center bg-white";

    return (
        <div className="space-y-6">
            {/* Top Bar - Buttons and Messages */}
            <div className="flex justify-between items-center">
                <div className="flex-1">
                    {error && (
                        <span className="inline-block bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold border border-red-100 animate-pulse">
                            {error}
                        </span>
                    )}
                    {success && (
                        <span className="inline-block bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm font-bold border border-green-100">
                            {success}
                        </span>
                    )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    {editId && (
                        <button
                            onClick={handleDataDeleteClick}
                            className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 transition-all font-medium shadow-md hover:shadow-lg"
                        >
                            <Trash2 size={18} />
                            작업 삭제
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-[#f3d876] text-slate-800 px-6 py-2.5 rounded-lg hover:bg-[#e9ce6d] transition-all font-bold shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        <Save size={18} />
                        작업 저장
                    </button>
                </div>
            </div>

            {/* Box 1: 개요 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#f8edbe] px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-slate-800">개요</h3>
                </div>

                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                        {/* Row 1 */}
                        <div className="md:col-span-2">
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">구분</label>
                                <select name="category" value={overview.category} onChange={handleOverviewChange} className={selectClass}>
                                    <option value="">선택</option>
                                    {categories['구분']?.map((c, idx) => {
                                        const label = renderCategoryOption(c);
                                        return <option key={idx} value={label}>{label}</option>
                                    })}
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">제목</label>
                                <input type="text" name="title" value={overview.title} onChange={handleOverviewChange} className={inputClass} />
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">강사</label>
                                <input type="text" name="instructor" value={overview.instructor} onChange={handleOverviewChange} className={inputClass} />
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">횟수</label>
                                <select name="count" value={overview.count} onChange={handleOverviewChange} className={selectClass}>
                                    {countOptions.map(num => <option key={num} value={num}>{num}회</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">평일/주말</label>
                                <select name="weekType" value={overview.weekType} onChange={handleOverviewChange} className={selectClass}>
                                    <option value="">선택</option>
                                    {categories['평일/주말']?.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">시작일</label>
                                <input type="date" name="startDate" min="2000-01-01" max="2099-12-31" value={overview.startDate} onChange={handleOverviewChange} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">종료일</label>
                                <input type="date" name="endDate" min="2000-01-01" max="2099-12-31" value={overview.endDate} onChange={handleOverviewChange} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">시작시간</label>
                                <select name="startTime" value={overview.startTime} onChange={handleOverviewChange} className={selectClass}>
                                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">종료시간</label>
                                <select name="endTime" value={overview.endTime} onChange={handleOverviewChange} className={selectClass}>
                                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        {/* Row 3 */}
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">관내/관외</label>
                                <select name="inOut" value={overview.inOut} onChange={handleOverviewChange} className={selectClass}>
                                    <option value="">선택</option>
                                    {categories['관내/관외']?.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">장소</label>
                                <input type="text" name="place" value={overview.place} onChange={handleOverviewChange} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">연계</label>
                                <input type="text" name="connection" value={overview.connection} onChange={handleOverviewChange} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">대상</label>
                                <select name="target" value={overview.target} onChange={handleOverviewChange} className={selectClass}>
                                    <option value="">선택</option>
                                    {categories['대상']?.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <div className={inputWrapperClass}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 text-center">방법</label>
                                <select name="method" value={overview.method} onChange={handleOverviewChange} className={selectClass}>
                                    <option value="">선택</option>
                                    {categories['방법']?.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Box 2: 예산 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="bg-[#f8edbe] px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-slate-800">예산</h3>
                </div>
                <div className="p-4">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="bg-[#f8edbe] text-xs text-slate-800 uppercase font-bold">
                            <tr>
                                <th className="px-3 py-2 border border-gray-200 text-center">목</th>
                                <th className="px-3 py-2 border border-gray-200 text-center">세목</th>
                                <th className="px-3 py-2 border border-gray-200 text-center">금액</th>
                                <th className="px-3 py-2 border border-gray-200 text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {budgetItems.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v1}</td>
                                    <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v2}</td>
                                    <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v3}</td>
                                    <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v4}</td>
                                    <td className="px-3 py-2 text-sm text-center border border-gray-200">{item.v5}</td>
                                    <td className="px-3 py-2 border border-gray-200">
                                        <NumberInput
                                            value={item.amount}
                                            onChange={(val) => handleBudgetItemChange(index, val)}
                                            className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm py-1.5 px-2 bg-white text-right"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Box 3: 실적 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="bg-[#f8edbe] px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-slate-800">실적</h3>
                </div>

                <div className="p-4">
                    <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="bg-[#f8edbe] text-xs text-slate-800 uppercase font-bold">
                                <tr>
                                    <th rowSpan="2" className="px-3 py-2 border border-gray-200 text-center whitespace-nowrap min-w-[120px]">일자/회차</th>
                                    <th colSpan="3" className="px-3 py-2 border border-gray-200 text-center bg-[#f8edbe]">성인</th>
                                    <th colSpan="3" className="px-3 py-2 border border-gray-200 text-center bg-[#f8edbe]">중고생</th>
                                    <th colSpan="3" className="px-3 py-2 border border-gray-200 text-center bg-[#f8edbe]">어린이</th>
                                    <th rowSpan="2" className="px-3 py-2 border border-gray-200 text-center w-10"></th>
                                </tr>
                                <tr>
                                    <th className="px-2 py-1 border border-gray-200 text-center bg-[#f8edbe] text-[10px]">남</th>
                                    <th className="px-2 py-1 border border-gray-200 text-center bg-[#f8edbe] text-[10px]">여</th>
                                    <th className="px-2 py-1 border border-gray-200 text-center bg-[#f8edbe] text-[10px]">계</th>
                                    <th className="px-2 py-1 border border-gray-200 text-center bg-[#f8edbe] text-[10px]">남</th>
                                    <th className="px-2 py-1 border border-gray-200 text-center bg-[#f8edbe] text-[10px]">여</th>
                                    <th className="px-2 py-1 border border-gray-200 text-center bg-[#f8edbe] text-[10px]">계</th>
                                    <th className="px-2 py-1 border border-gray-200 text-center bg-[#f8edbe] text-[10px]">남</th>
                                    <th className="px-2 py-1 border border-gray-200 text-center bg-[#f8edbe] text-[10px]">여</th>
                                    <th className="px-2 py-1 border border-gray-200 text-center bg-[#f8edbe] text-[10px]">계</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performances.map((perf, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-sm text-center border border-gray-200 font-bold text-slate-400">{index + 1}</td>
                                        <td className="px-3 py-2 border border-gray-200">
                                            <input
                                                type="date"
                                                min="2000-01-01"
                                                max="2099-12-31"
                                                value={perf.opDate}
                                                onChange={(e) => handlePerformanceChange(index, 'opDate', e.target.value)}
                                                className="w-full border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500 text-sm py-1.5 px-2 text-center"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200">
                                            <NumberInput
                                                value={perf.adultM}
                                                onChange={(val) => handlePerformanceNumberChange(index, 'adultM', val)}
                                                className="w-full border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500 text-sm py-1.5 px-2 text-right"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200">
                                            <NumberInput
                                                value={perf.adultF}
                                                onChange={(val) => handlePerformanceNumberChange(index, 'adultF', val)}
                                                className="w-full border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500 text-sm py-1.5 px-2 text-right"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200">
                                            <NumberInput
                                                value={perf.teenM}
                                                onChange={(val) => handlePerformanceNumberChange(index, 'teenM', val)}
                                                className="w-full border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500 text-sm py-1.5 px-2 text-right"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200">
                                            <NumberInput
                                                value={perf.teenF}
                                                onChange={(val) => handlePerformanceNumberChange(index, 'teenF', val)}
                                                className="w-full border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500 text-sm py-1.5 px-2 text-right"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200">
                                            <NumberInput
                                                value={perf.childM}
                                                onChange={(val) => handlePerformanceNumberChange(index, 'childM', val)}
                                                className="w-full border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500 text-sm py-1.5 px-2 text-right"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200">
                                            <NumberInput
                                                value={perf.childF}
                                                onChange={(val) => handlePerformanceNumberChange(index, 'childF', val)}
                                                className="w-full border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500 text-sm py-1.5 px-2 text-right"
                                            />
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-center">
                                            <button
                                                onClick={() => handleRowDeleteClick(index)}
                                                className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                                title="행 삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={addPerformanceRow}
                            className="flex items-center gap-1 p-1 hover:bg-black/10 rounded transition-colors text-black"
                            title="행 추가"
                        >
                            <Plus size={20} />
                        </button>

                    </div>
                </div>
            </div>

            {/* Box 4: Remarks */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6 mb-8">
                <div className="bg-[#f8edbe] px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-slate-800">비고</h3>
                </div>

                <div className="p-4">
                    <textarea
                        rows={4}
                        value={overview.remark || ''}
                        onChange={(e) => handleOverviewChange({ target: { name: 'remark', value: e.target.value } })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 bg-[#f8edbe] border border-slate-200 text-slate-800"
                        placeholder="비고 사항을 입력하세요..."
                    />
                </div>
            </div>

            {/* Confirmation Modal */}
            {deleteConfirm.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm animate-fade-in text-center">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">
                            {deleteConfirm.type === 'data' ? '해당 강좌를 삭제하시겠습니까?' : '해당 실적을 삭제하시겠습니까?'}
                        </h3>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={closeDeleteModal}
                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm"
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
