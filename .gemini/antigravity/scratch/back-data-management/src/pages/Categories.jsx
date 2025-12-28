import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useYear } from '../context/YearContext';
import { Plus, Trash2, Edit2, Check, Save, ArrowUp, ArrowDown, X } from 'lucide-react';

export default function Categories() {
    const { selectedYear } = useYear();
    const [categories, setCategories] = useState({});
    const [editingState, setEditingState] = useState({ category: null, index: null, value: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, categoryKey: null, index: null });
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const loadCategories = async () => {
            const loadedCategories = await db.getCategories(selectedYear, user?.libraryName);
            setCategories(loadedCategories);
        };
        loadCategories();
    }, [selectedYear, user]);

    // --- Actions ---

    // ... (handleAddItem, handleDeleteItem, handleMoveItem same as before) ...
    // BUT I need to include them here or just overwrite the changed parts. 
    // Since I'm changing handleSaveItem and adding DnD handlers, it's safer to replace the block.

    const handleAddItem = (categoryKey) => {
        const newCategories = { ...categories };

        // Handle active editing session (cleanup previous item)
        if (editingState.category) {
            const currentCat = editingState.category;
            const currentIdx = editingState.index;
            const currentVal = editingState.value;

            const isComplex = typeof currentVal === 'object';
            const isAllEmpty = isComplex
                ? (!currentVal.v1.trim() && !currentVal.v2.trim() && !currentVal.v3.trim())
                : !currentVal.trim();

            if (isAllEmpty) {
                // Auto-delete the active empty item
                newCategories[currentCat] = newCategories[currentCat].filter((_, i) => i !== currentIdx);
            } else {
                // Check validation for incomplete complex items
                if (isComplex) {
                    if (!currentVal.v1.trim() || !currentVal.v2.trim() || !currentVal.v3.trim()) {
                        alert('입력 중인 항목이 완성되지 않았습니다. 모든 값을 입력해주세요.');
                        return; // Block action
                    }
                }
                // Auto-save valid item
                newCategories[currentCat][currentIdx] = currentVal;
            }
        }

        let newItem = '';
        if (categoryKey === '구분') {
            newItem = { v1: '', v2: '', v3: '' };
        } else if (categoryKey === '예산') {
            newItem = { v1: '', v2: '', v3: '', v4: '', v5: '', v6: '' };
        }

        newCategories[categoryKey] = [...(newCategories[categoryKey] || []), newItem];
        setCategories(newCategories);

        setEditingState({
            category: categoryKey,
            index: newCategories[categoryKey].length - 1,
            value: newItem
        });
    };

    const handleDeleteClick = (categoryKey, index) => {
        setDeleteConfirm({ isOpen: true, categoryKey, index });
    };

    const confirmDelete = () => {
        const { categoryKey, index } = deleteConfirm;
        if (categoryKey !== null && index !== null) {
            const newCategories = { ...categories };
            newCategories[categoryKey] = newCategories[categoryKey].filter((_, i) => i !== index);
            setCategories(newCategories);

            if (editingState.category === categoryKey && editingState.index === index) {
                setEditingState({ category: null, index: null, value: '' });
            }
        }
        setDeleteConfirm({ isOpen: false, categoryKey: null, index: null });
    };

    const handleDeleteItem = (categoryKey, index) => {
        const newCategories = { ...categories };
        newCategories[categoryKey] = newCategories[categoryKey].filter((_, i) => i !== index);
        setCategories(newCategories);

        if (editingState.category === categoryKey && editingState.index === index) {
            setEditingState({ category: null, index: null, value: '' });
        }
    };

    const handleMoveItem = (categoryKey, index, direction) => {
        const items = [...categories[categoryKey]];
        if (direction === 'up' && index > 0) {
            [items[index - 1], items[index]] = [items[index], items[index - 1]];
        } else if (direction === 'down' && index < items.length - 1) {
            [items[index], items[index + 1]] = [items[index + 1], items[index]];
        }

        const newCategories = { ...categories };
        newCategories[categoryKey] = items;
        setCategories(newCategories);
        setEditingState({ category: null, index: null, value: '' });
    };

    // --- Drag and Drop Handlers ---

    const handleDragStart = (e, category, index) => {
        if (editingState.category) {
            e.preventDefault(); // Disable drag while editing
            return;
        }
        setDraggedItem({ category, index });
        e.dataTransfer.effectAllowed = 'move';
        // Transparent image or default is fine
    };

    const handleDragOver = (e, category) => {
        e.preventDefault(); // Necessary to allow dropping
        if (draggedItem && draggedItem.category === category) {
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    };

    const handleDrop = (e, category, dropIndex) => {
        e.preventDefault();

        if (!draggedItem || draggedItem.category !== category) return;

        const dragIndex = draggedItem.index;
        if (dragIndex === dropIndex) return;

        const items = [...categories[category]];
        const [movedItem] = items.splice(dragIndex, 1);
        items.splice(dropIndex, 0, movedItem);

        const newCategories = { ...categories };
        newCategories[category] = items;
        setCategories(newCategories);
        setDraggedItem(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const handleSaveItem = () => {
        if (!editingState.category) return;

        const catKey = editingState.category;
        const idx = editingState.index;
        const val = editingState.value;

        // Validation: All Empty Check (auto-delete)
        const isComplex = catKey === '구분' || catKey === '예산';
        const isAllEmpty = isComplex
            ? (catKey === '예산'
                ? (!val.v1?.trim() && !val.v2?.trim() && !val.v3?.trim() && !val.v4?.trim() && !val.v5?.trim() && !val.v6?.trim())
                : (!val.v1?.trim() && !val.v2?.trim() && !val.v3?.trim()))
            : !val.trim();

        if (isAllEmpty) {
            handleDeleteItem(catKey, idx);
            setEditingState({ category: null, index: null, value: '' });
            return;
        }

        // Validation: Partial Empty Check for Object (Require ALL fields)
        if (isComplex) {
            const requiredFields = catKey === '예산'
                ? [val.v1, val.v2, val.v3, val.v4, val.v5, val.v6]
                : [val.v1, val.v2, val.v3];
            if (requiredFields.some(f => !f?.trim())) {
                alert('모든 값을 입력해야 저장할 수 있습니다.');
                return; // Keep editing state
            }
        }

        // Validation: Duplicate Check (exclude current index)
        const currentItems = categories[catKey];
        const isDuplicate = currentItems.some((item, i) => {
            if (i === idx) return false;

            if (typeof item === 'object' && typeof val === 'object') {
                if (catKey === '예산') {
                    return item.v1 === val.v1 && item.v2 === val.v2 && item.v3 === val.v3 &&
                        item.v4 === val.v4 && item.v5 === val.v5 && item.v6 === val.v6;
                } else {
                    return item.v1 === val.v1 && item.v2 === val.v2 && item.v3 === val.v3;
                }
            } else if (typeof item === 'string' && typeof val === 'string') {
                return item === val;
            }
            return false;
        });

        if (isDuplicate) {
            alert('중복된 값이 존재합니다.');
            return;
        }

        const newCategories = { ...categories };
        newCategories[catKey][idx] = val;
        setCategories(newCategories);
        setEditingState({ category: null, index: null, value: '' });
    };

    // ... (rest of code) ...



    const handleSaveAll = async () => {
        // Permission Check (Fetch latest from DB to ensure validity)
        if (!user || !user.id) {
            setError('로그인이 필요합니다.');
            return;
        }

        // 1. Check local session first for immediate feedback (fast fail)
        const localRole = user.role || 'general';
        const localAdmin = user.isAdmin || false;

        // 2. Double check with DB for critical action (to handle session staleness)
        let isAllowed = false;
        if (localRole === 'special' || localAdmin) {
            isAllowed = true;
        }

        // If local check passes, or even if it fails, let's verify DB to be sure? 
        // Actually, if local fails, we can block. If local passes, we verify DB.
        // But the issue is local PASSING when it should FAIL (stale 'special' role).

        // So, let's verify DB regardless? Or just if local looks like it enters?
        // Let's just do a fresh fetch. It's safer.

        try {
            // We can use db.getUsers similar to how we load categories
            // Or better, a specific method to get current user refresh.
            // Since we don't have getMyUser, let's just assume we can re-fetch by ID if we had an endpoint.
            // But we only have findUser (by name/pw) or getUsers (all).
            // Let's use getUsers and find by ID. (Not efficient but works for now with small user base)

            const allUsers = await db.getUsers();
            const freshUser = allUsers.find(u => u.id === user.id);

            if (freshUser) {
                const freshRole = freshUser.role || 'general';
                const freshAdmin = freshUser.isAdmin || false;

                if (freshRole !== 'special' && !freshAdmin) {
                    setError('권한이 없습니다. 관리자에게 문의해 주세요.');
                    setTimeout(() => setError(''), 3000);
                    return;
                }

                // Also update local user context if different? (Optional but good)
                // setUser(freshUser); // Need access to setUser from useAuth if we want to sync
            } else {
                // User deleted?
                setError('사용자 정보를 찾을 수 없습니다.');
                return;
            }
        } catch (err) {
            console.error("Permission check error", err);
            // Verify failed - proceed with caution or block?
            // If DB error, maybe block.
            setError('권한 확인 중 오류가 발생했습니다.');
            return;
        }

        setIsSaving(true);
        try {
            // Filter out empty items before saving
            const cleanedCategories = {};
            Object.keys(categories).forEach(key => {
                cleanedCategories[key] = categories[key].filter(item => {
                    if (typeof item === 'string') return item.trim() !== '';
                    if (typeof item === 'object') {
                        if ('v4' in item) { // Budget item
                            return item.v1.trim() || item.v2.trim() || item.v3.trim() || item.v4.trim() || item.v5.trim() || item.v6.trim();
                        }
                        return item.v1.trim() || item.v2.trim() || item.v3.trim();
                    }
                    return false;
                });
            });

            await db.saveCategories(cleanedCategories, selectedYear, user?.libraryName);
            setCategories(cleanedCategories); // Update local state to reflect cleaning

            setIsSaving(false);
            setSuccess('작업이 성공적으로 저장되었습니다.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            console.error(e);
            setIsSaving(false);
            setError('저장 실패: ' + (e.message || '알 수 없는 오류'));
        }
    };

    // --- Helpers ---

    const startEditing = (key, idx, currentVal) => {
        setEditingState({ category: key, index: idx, value: currentVal });
    };

    const renderEditInput = (key, theme) => {
        const val = editingState.value;
        const isComplex = key === '구분' || key === '예산';
        const inputBgClass = theme ? theme.b : 'bg-white';

        if (isComplex) {
            const fields = key === '예산' ? ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] : ['v1', 'v2', 'v3'];
            return (
                <div className="flex gap-2 w-full">
                    {fields.map((field, i) => (
                        <input
                            key={field}
                            type="text"
                            value={val[field] || ''}
                            onChange={(e) => {
                                let newValue = e.target.value;
                                // For v6 (last field) of budget, format as number with commas
                                if (i === 5 && key === '예산') {
                                    newValue = newValue.replace(/,/g, '');
                                    if (newValue && !isNaN(newValue)) {
                                        newValue = Number(newValue).toLocaleString();
                                    }
                                }
                                setEditingState({
                                    ...editingState,
                                    value: { ...val, [field]: newValue }
                                });
                            }}
                            className={`flex-1 min-w-0 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBgClass} ${i === 5 ? 'text-right' : 'text-center'}`}
                            autoFocus={i === 0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveItem();
                            }}
                        />
                    ))}
                    <button onClick={handleSaveItem} className="text-green-600 hover:text-green-700 shrink-0">
                        <Check size={16} />
                    </button>
                    <button onClick={() => handleDeleteItem(key, editingState.index)} className="text-red-500 hover:text-red-600 shrink-0">
                        <X size={16} />
                    </button>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2 w-full">
                <input
                    type="text"
                    value={val}
                    onChange={(e) => setEditingState({ ...editingState, value: e.target.value })}
                    className={`flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBgClass}`}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveItem();
                    }}
                />
                <button onClick={handleSaveItem} className="text-green-600 hover:text-green-700 shrink-0">
                    <Check size={16} />
                </button>
                <button onClick={() => handleDeleteItem(key, editingState.index)} className="text-red-500 hover:text-red-600 shrink-0">
                    <X size={16} />
                </button>
            </div>
        );
    };

    const renderItemValue = (item, theme) => {
        if (typeof item === 'object') {
            const hasV4 = 'v4' in item; // Check if it's a 6-field budget item
            if (hasV4) {
                return (
                    <div className="flex gap-2 w-full">
                        <span className={`flex-1 bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-center`}>{item.v1}</span>
                        <span className={`flex-1 bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-center`}>{item.v2}</span>
                        <span className={`flex-1 bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-center`}>{item.v3}</span>
                        <span className={`flex-1 bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-center`}>{item.v4}</span>
                        <span className={`flex-1 bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-center`}>{item.v5}</span>
                        <span className={`flex-1 bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-right`}>
                            {item.v6 ? (isNaN(item.v6.toString().replace(/,/g, '')) ? item.v6 : Number(item.v6.toString().replace(/,/g, '')).toLocaleString()) : ''}
                        </span>
                    </div>
                );
            }
            return (
                <div className="flex gap-2 w-full">
                    <span className={`flex-1 bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-center`}>{item.v1}</span>
                    <span className={`flex-1 bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-center`}>{item.v2}</span>
                    <span className={`flex-1 bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-center`}>{item.v3}</span>
                </div>
            );
        }
        return (
            <div className={`w-full bg-[#f8edbe] px-2 py-1 rounded text-sm text-slate-800 truncate text-center`}>
                {item}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4 min-h-[42px]">
                <div className="flex-1 mr-4">
                    {error && (
                        <span className="inline-block bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold border border-red-100 animate-pulse">
                            {error}
                        </span>
                    )}
                    {success && (
                        <span className="inline-block bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm font-bold border border-green-100 animate-fade-in">
                            {success}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all font-medium disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                    <Save size={18} />
                    {isSaving ? '저장 중...' : '작업 저장'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[
                    { key: '구분', title: '구분', className: 'lg:col-span-2' },
                    { key: '평일/주말', title: '평일/주말' },
                    { key: '관내/관외', title: '관내/관외' },
                    { key: '대상', title: '대상' },
                    { key: '방법', title: '방법' },
                    { key: '예산', title: '예산', className: 'lg:col-span-2' }
                ].map(({ key, className }, index) => {
                    const items = categories[key] || [];

                    const headerClass = 'bg-[#f8edbe]';
                    // We will override theme.b for item backgrounds below
                    const theme = { b: 'bg-[#f8edbe]' };

                    return (
                        <div key={key} className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow ${className || ''}`}>
                            <div className={`${headerClass} px-4 py-2 border-b border-gray-200 flex justify-between items-center`}>
                                <h3 className="font-semibold text-slate-800">{key}</h3>
                                <button
                                    onClick={() => handleAddItem(key)}
                                    className="p-1 hover:bg-black/10 rounded transition-colors text-black"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto max-h-[400px] min-h-[200px]">
                                {items.length === 0 ? (
                                    <div className="text-gray-400 text-sm text-center py-8 italic hidden">
                                        {/* Empty state hidden as requested */}
                                    </div>
                                ) : (
                                    <>

                                        <ul className="space-y-2">
                                            {items.map((item, idx) => (
                                                <li
                                                    key={idx}
                                                    draggable={!editingState.category}
                                                    onDragStart={(e) => handleDragStart(e, key, idx)}
                                                    onDragOver={(e) => handleDragOver(e, key)}
                                                    onDrop={(e) => handleDrop(e, key, idx)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`group flex items-center justify-between p-2 rounded-lg bg-white hover:bg-gray-50 border border-transparent hover:border-slate-100 transition-all gap-2
                                                    ${!editingState.category ? 'cursor-move' : ''}
                                                    ${draggedItem?.category === key && draggedItem?.index === idx ? 'opacity-50 ring-2 ring-indigo-500' : ''}
                                                `}
                                                >
                                                    {editingState.category === key && editingState.index === idx ? (
                                                        renderEditInput(key, theme)
                                                    ) : (
                                                        <>
                                                            {/* Move Buttons */}
                                                            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity -ml-1">
                                                                <button
                                                                    onClick={() => handleMoveItem(key, idx, 'up')}
                                                                    disabled={idx === 0}
                                                                    className="text-slate-300 hover:text-indigo-500 disabled:opacity-0"
                                                                >
                                                                    <ArrowUp size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMoveItem(key, idx, 'down')}
                                                                    disabled={idx === items.length - 1}
                                                                    className="text-slate-300 hover:text-indigo-500 disabled:opacity-0"
                                                                >
                                                                    <ArrowDown size={12} />
                                                                </button>
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0">
                                                                {renderItemValue(item, theme)}
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => startEditing(key, idx, item)}
                                                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                                    title="수정"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteClick(key, idx)}
                                                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                                    title="삭제"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div >

            {/* Delete Confirmation Modal */}
            {
                deleteConfirm.isOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                해당 카테고리를 삭제하시겠습니까?
                            </h3>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setDeleteConfirm({ isOpen: false, categoryKey: null, index: null })}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
