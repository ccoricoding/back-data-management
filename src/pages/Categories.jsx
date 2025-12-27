import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useYear } from '../context/YearContext';
import { Plus, Trash2, Edit2, Check, Save, ArrowUp, ArrowDown, X } from 'lucide-react';

export default function Categories() {
    const { user } = useAuth();
    const { selectedYear } = useYear();
    const [categories, setCategories] = useState({});
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            const data = await db.getCategories(selectedYear);
            setCategories(data);
        };
        fetchCategories();
    }, [selectedYear]);

    const handleSave = async () => {
        try {
            setSuccess('');
            setError('');
            await db.saveCategories(categories, selectedYear);
            setSuccess('카테고리가 저장되었습니다.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
            setError('저장 중 오류가 발생했습니다.');
        }
    };

    const addCategoryItem = (key) => {
        const newItems = [...(categories[key] || [])];
        if (key === '구분' || key === '예산') {
            newItems.push({ v1: '', v2: '', v3: '', v4: '', v5: '', v6: '' });
        } else {
            newItems.push('');
        }
        setCategories({ ...categories, [key]: newItems });
    };

    const removeCategoryItem = (key, index) => {
        const newItems = [...(categories[key] || [])];
        newItems.splice(index, 1);
        setCategories({ ...categories, [key]: newItems });
    };

    const updateItem = (key, index, value) => {
        const newItems = [...(categories[key] || [])];
        newItems[index] = value;
        setCategories({ ...categories, [key]: newItems });
    };

    const updateNestedItem = (key, index, field, value) => {
        const newItems = [...(categories[key] || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setCategories({ ...categories, [key]: newItems });
    };

    const moveItem = (key, index, direction) => {
        const newItems = [...(categories[key] || [])];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= newItems.length) return;
        [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
        setCategories({ ...categories, [key]: newItems });
    };

    if (!user?.isAdmin) {
        return <div className="p-8 text-center text-gray-500">관리자만 접근 가능합니다.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">카테고리 설정 ({selectedYear}년)</h2>
                <div className="flex items-center gap-4 text-sm">
                    {success && <span className="text-green-600 font-medium">✓ {success}</span>}
                    {error && <span className="text-red-600 font-medium">! {error}</span>}
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md"
                    >
                        <Save size={18} />
                        전체 저장
                    </button>
                </div>
            </div>

            {/* Render Category Sections (구분, 예산, etc) */}
            {['구분', '예산', '대상', '장소', '연계', '방법'].map(key => (
                <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b">
                        <h3 className="font-bold text-slate-800">{key}</h3>
                        <button
                            onClick={() => addCategoryItem(key)}
                            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium"
                        >
                            <Plus size={16} /> 추가
                        </button>
                    </div>
                    <div className="p-6">
                        {key === '구분' ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-slate-500 border-b">
                                        <th className="pb-2 font-medium w-1/4">사업부문(대)</th>
                                        <th className="pb-2 font-medium w-1/4">사업명(중)</th>
                                        <th className="pb-2 font-medium w-1/4">프로그램명(소)</th>
                                        <th className="pb-2 font-medium w-24">작업</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(categories[key] || []).map((item, idx) => (
                                        <tr key={idx} className="border-b last:border-0">
                                            <td className="py-2 pr-2">
                                                <input type="text" className="w-full p-1.5 border rounded" value={item.v1 || ''} onChange={e => updateNestedItem(key, idx, 'v1', e.target.value)} />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <input type="text" className="w-full p-1.5 border rounded" value={item.v2 || ''} onChange={e => updateNestedItem(key, idx, 'v2', e.target.value)} />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <input type="text" className="w-full p-1.5 border rounded" value={item.v3 || ''} onChange={e => updateNestedItem(key, idx, 'v3', e.target.value)} />
                                            </td>
                                            <td className="py-2 text-center flex items-center justify-center gap-1">
                                                <button onClick={() => moveItem(key, idx, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowUp size={14} /></button>
                                                <button onClick={() => moveItem(key, idx, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowDown size={14} /></button>
                                                <button onClick={() => removeCategoryItem(key, idx)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : key === '예산' ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-slate-500 border-b">
                                        <th className="pb-2 font-medium">구분</th>
                                        <th className="pb-2 font-medium">사업내역(대)</th>
                                        <th className="pb-2 font-medium">사업내역(중)</th>
                                        <th className="pb-2 font-medium">사업내역(소)</th>
                                        <th className="pb-2 font-medium w-32">목-세목</th>
                                        <th className="pb-2 font-medium w-32">배정액</th>
                                        <th className="pb-2 font-medium w-24">작업</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(categories[key] || []).map((item, idx) => (
                                        <tr key={idx} className="border-b last:border-0">
                                            <td className="py-2 pr-1"><input type="text" className="w-full p-1 border rounded" value={item.v1 || ''} onChange={e => updateNestedItem(key, idx, 'v1', e.target.value)} /></td>
                                            <td className="py-2 pr-1"><input type="text" className="w-full p-1 border rounded" value={item.v2 || ''} onChange={e => updateNestedItem(key, idx, 'v2', e.target.value)} /></td>
                                            <td className="py-2 pr-1"><input type="text" className="w-full p-1 border rounded" value={item.v3 || ''} onChange={e => updateNestedItem(key, idx, 'v3', e.target.value)} /></td>
                                            <td className="py-2 pr-1"><input type="text" className="w-full p-1 border rounded" value={item.v4 || ''} onChange={e => updateNestedItem(key, idx, 'v4', e.target.value)} /></td>
                                            <td className="py-2 pr-1"><input type="text" className="w-full p-1 border rounded" value={item.v5 || ''} onChange={e => updateNestedItem(key, idx, 'v5', e.target.value)} /></td>
                                            <td className="py-2 pr-1"><input type="text" className="w-full p-1 border rounded text-right" value={item.v6 || ''} onChange={e => updateNestedItem(key, idx, 'v6', e.target.value)} /></td>
                                            <td className="py-2 text-center flex items-center justify-center gap-1">
                                                <button onClick={() => moveItem(key, idx, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowUp size={14} /></button>
                                                <button onClick={() => moveItem(key, idx, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowDown size={14} /></button>
                                                <button onClick={() => removeCategoryItem(key, idx)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(categories[key] || []).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-slate-50 border rounded-lg pl-3 pr-1 py-1">
                                        <input type="text" className="bg-transparent text-sm focus:outline-none" value={item} onChange={e => updateItem(key, idx, e.target.value)} />
                                        <button onClick={() => removeCategoryItem(key, idx)} className="p-1 hover:bg-red-50 rounded text-red-500"><X size={14} /></button>
                                    </div>
                                ))}
                                <button onClick={() => addCategoryItem(key)} className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100">+ 추가</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
