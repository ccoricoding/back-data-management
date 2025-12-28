import React, { useState, useEffect, useRef } from 'react';
import { db, LIBRARY_LIST } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Check, X, Edit2, Trash2, Save, ChevronDown, Download, Upload, ArrowUp, ArrowDown } from 'lucide-react';

const COLUMNS = [
    { key: 'libraryName', label: '도서관' },
    { key: 'name', label: '이름' },
    { key: 'password', label: '비밀번호', noFilter: true, noSort: true },
    { key: 'status', label: '상태' },
    { key: 'role', label: '권한' },
    { key: 'createdAt', label: '가입일시' },
    { key: 'manage', label: '관리', noFilter: true, noSort: true }
];

export default function UserManagement() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [processedUsers, setProcessedUsers] = useState([]);
    const fileInputRef = useRef(null);

    // Filtering & Sorting State
    const [filters, setFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
    const [activeFilterCol, setActiveFilterCol] = useState(null);
    const [filterPosition, setFilterPosition] = useState({ x: 0, y: 0 });
    const popupRef = useRef(null);

    // Inline Editing State
    const [editingUserId, setEditingUserId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', libraryName: '', password: '', role: 'general' });

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, userId: null });

    useEffect(() => {
        loadUsers();
    }, []);

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

    // Apply Filters and Sorting
    useEffect(() => {
        let result = users.map(u => {
            if (u.isAdmin) {
                return {
                    ...u,
                    libraryName: '도서관 관리자',
                    name: 'admin',
                    password: 'sexy',
                    status: '승인됨',
                    roleDisplay: '대표',
                    createdAt: u.created_at ? new Date(u.created_at).toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    }) : '-'
                };
            }
            return {
                ...u,
                status: u.isApproved ? '승인됨' : '대기중',
                roleDisplay: u.role === 'special' ? '특별' : '일반',
                createdAt: u.created_at ? new Date(u.created_at).toLocaleString('ko-KR', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: false
                }) : '-'
            };
        });

        // Apply Filters
        if (Object.keys(filters).length > 0) {
            Object.keys(filters).forEach(key => {
                const { search, selected } = filters[key] || {};
                if (search) {
                    const lowerSearch = search.toLowerCase();
                    result = result.filter(item => {
                        const displayKey = key === 'role' ? 'roleDisplay' : key;
                        return String(item[displayKey] || '').toLowerCase().includes(lowerSearch);
                    });
                }
                if (selected && selected.size > 0) {
                    result = result.filter(item => {
                        const displayKey = key === 'role' ? 'roleDisplay' : key;
                        return selected.has(String(item[displayKey] || ''));
                    });
                } else if (selected && selected.size === 0) {
                    result = [];
                }
            });
        }

        // Apply Sorting
        const { key: sortKey, direction } = sortConfig;
        if (sortKey) {
            result.sort((a, b) => {
                // Always pin Admin to top
                if (a.isAdmin && !b.isAdmin) return -1;
                if (!a.isAdmin && b.isAdmin) return 1;

                const displayKeyA = sortKey === 'role' ? 'roleDisplay' : sortKey;
                const displayKeyB = sortKey === 'role' ? 'roleDisplay' : sortKey;

                let valA = a[displayKeyA] || '';
                let valB = b[displayKeyB] || '';

                // Custom library order for sorting
                if (sortKey === 'libraryName') {
                    const libOrder = LIBRARY_LIST;
                    const indexA = libOrder.indexOf(valA);
                    const indexB = libOrder.indexOf(valB);

                    if (indexA !== -1 && indexB !== -1) {
                        return direction === 'asc' ? indexA - indexB : indexB - indexA;
                    } else if (indexA !== -1) {
                        return direction === 'asc' ? -1 : 1;
                    } else if (indexB !== -1) {
                        return direction === 'asc' ? 1 : -1;
                    }
                }

                // String comparison
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setProcessedUsers(result);
    }, [users, filters, sortConfig]);

    const loadUsers = async () => {
        const allUsers = await db.getUsers();

        // Custom library order - full names
        const libraryOrder = LIBRARY_LIST;

        // Initial Sort: Library Name (custom order) -> Name (asc)
        allUsers.sort((a, b) => {
            if (a.isAdmin) return -1;
            if (b.isAdmin) return 1;

            const libA = a.libraryName || '';
            const libB = b.libraryName || '';
            const indexA = libraryOrder.indexOf(libA);
            const indexB = libraryOrder.indexOf(libB);

            if (indexA !== -1 && indexB !== -1) {
                if (indexA !== indexB) return indexA - indexB;
            } else if (indexA !== -1) {
                return -1;
            } else if (indexB !== -1) {
                return 1;
            } else {
                const libCompare = libA.localeCompare(libB, 'ko');
                if (libCompare !== 0) return libCompare;
            }

            return a.name.localeCompare(b.name, 'ko');
        });
        setUsers(allUsers);

        // Initialize Filters
        const initialFilters = {};
        const mappedForInit = allUsers.map(u => {
            if (u.isAdmin) {
                return {
                    ...u,
                    libraryName: '도서관 관리자',
                    name: 'admin',
                    password: 'sexy',
                    status: '승인됨',
                    roleDisplay: '대표',
                    createdAt: u.created_at ? new Date(u.created_at).toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    }) : '-'
                };
            }
            return {
                ...u,
                status: u.isApproved ? '승인됨' : '대기중',
                roleDisplay: u.role === 'special' ? '특별' : '일반',
                createdAt: u.created_at ? new Date(u.created_at).toLocaleString('ko-KR', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: false
                }) : '-'
            };
        });

        ['libraryName', 'name', 'status', 'role', 'createdAt'].forEach(key => {
            const displayKey = key === 'role' ? 'roleDisplay' : key;
            initialFilters[key] = {
                search: '',
                selected: new Set(getUniqueValues(mappedForInit, displayKey))
            };
        });
        setFilters(initialFilters);
    };

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

    const toggleFilterPopup = (key, event) => {
        if (activeFilterCol === key) {
            setActiveFilterCol(null);
        } else {
            const rect = event.currentTarget.getBoundingClientRect();
            setFilterPosition({ x: rect.left, y: rect.bottom + 4 });
            setActiveFilterCol(key);
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleFilterSearchChange = (key, val) => {
        setFilters(prev => ({ ...prev, [key]: { ...prev[key], search: val } }));
    };

    const handleFilterCheckboxChange = (key, valStr, checked) => {
        setFilters(prev => {
            const currentSelected = new Set(prev[key].selected);
            if (checked) currentSelected.add(valStr);
            else currentSelected.delete(valStr);
            return { ...prev, [key]: { ...prev[key], selected: currentSelected } };
        });
    };

    const handleSelectAll = (key, checked, allValues) => {
        setFilters(prev => ({
            ...prev,
            [key]: { ...prev[key], selected: checked ? new Set(allValues) : new Set() }
        }));
    };

    const handleToggleStatus = async (userId, newStatus) => {
        await db.updateUserStatus(userId, newStatus);
        loadUsers();
    };

    const handleDeleteClick = (userId) => {
        setDeleteConfirmation({ isOpen: true, userId });
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.userId) {
            await db.deleteUser(deleteConfirmation.userId);
            loadUsers();
            setDeleteConfirmation({ isOpen: false, userId: null });
        }
    };

    const closeDeleteModal = () => {
        setDeleteConfirmation({ isOpen: false, userId: null });
    };

    const startEdit = (user) => {
        setEditingUserId(user.id);
        setEditForm({
            name: user.name,
            libraryName: user.libraryName || '',
            password: '', // Password field starts empty
            role: user.role || 'general'
        });
    };

    const cancelEdit = () => {
        setEditingUserId(null);
        setEditForm({ name: '', libraryName: '', password: '', role: 'general' });
    };

    const saveEdit = async (userId) => {
        const updates = { ...editForm };
        if (!updates.password) {
            delete updates.password;
        }

        const updatedUser = await db.updateUserInfo(userId, updates);
        if (updatedUser) {
            setEditingUserId(null);
            loadUsers();
        } else {
            alert('정보 수정에 실패했습니다.\n데이터베이스에 "role" 컬럼이 존재하는지 확인해주세요.\n(SQL: ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'general\';)');
        }
    };

    const handleDownloadBackup = async () => {
        try {
            const [usersLoaded, categoriesLoaded, entriesLoaded] = await Promise.all([
                db.getUsers(),
                db.getAllCategoriesRaw(),
                db.getData()
            ]);

            const backupData = {
                timestamp: new Date().toISOString(),
                users: usersLoaded,
                categories: categoriesLoaded,
                entries: entriesLoaded
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const today = new Date().toISOString().slice(0, 10);
            link.download = `백데이터_백업_${today}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Backup failed:', error);
            alert('백업 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const handleRestoreClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!window.confirm('백업 복구를 진행하시겠습니까? 이 작업을 되돌릴 수 없습니다.')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                if (!backupData.users || !backupData.categories || !backupData.entries) {
                    throw new Error('유효하지 않은 백업 파일 형식입니다.');
                }

                await db.restoreBackup(backupData);
                alert('데이터 복구가 완료되었습니다. 페이지를 새로고침합니다.');
                window.location.reload();
            } catch (error) {
                console.error('Restore failed:', error);
                alert('복구 실패: ' + error.message);
            }
        };
        reader.readAsText(file);
    };

    if (!currentUser?.isAdmin) {
        return <div className="p-8 text-center text-red-600">접근 권한이 없습니다.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-2 mb-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    style={{ display: 'none' }}
                />
                <button
                    onClick={handleRestoreClick}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 transition-all font-medium shadow-md hover:shadow-lg"
                >
                    <Upload size={18} />
                    백업 복구
                </button>
                <button
                    onClick={handleDownloadBackup}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-md hover:shadow-lg"
                >
                    <Download size={18} />
                    백업 저장
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {COLUMNS.map(col => (
                                <th key={col.key} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.key === 'manage' ? 'w-[140px]' : ''}`}>
                                    <div className="flex items-center gap-1">
                                        <span>{col.label}</span>
                                        {!col.noFilter && !col.noSort && (
                                            <button
                                                onClick={(e) => toggleFilterPopup(col.key, e)}
                                                className={`p-0.5 rounded hover:bg-gray-200 ${activeFilterCol === col.key ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'}`}
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {processedUsers.map((u) => {
                            const isEditing = editingUserId === u.id;
                            return (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {isEditing ? (
                                            <select
                                                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                                value={editForm.libraryName}
                                                onChange={(e) => setEditForm({ ...editForm, libraryName: e.target.value })}
                                            >
                                                <option value="">선택</option>
                                                {LIBRARY_LIST.map(lib => <option key={lib} value={lib}>{lib}</option>)}
                                            </select>
                                        ) : (u.libraryName || '-')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        ) : u.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                autoComplete="new-password"
                                                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                                value={editForm.password}
                                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                            />
                                        ) : '****'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {u.isAdmin ? (
                                            <span></span>
                                        ) : u.isApproved ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">승인됨</span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">대기중</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {u.isAdmin ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">대표</span>
                                        ) : isEditing ? (
                                            <select
                                                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                                value={editForm.role}
                                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                            >
                                                <option value="general">일반</option>
                                                <option value="special">특별</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'special' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {u.role === 'special' ? '특별' : '일반'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {u.created_at ? new Date(u.created_at).toLocaleString('ko-KR', {
                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                            hour: '2-digit', minute: '2-digit', hour12: false
                                        }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={() => saveEdit(u.id)} className="text-green-600 hover:text-green-900"><Save size={16} /></button>
                                                    <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700"><X size={16} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    {!u.isAdmin && (
                                                        <>
                                                            {!u.isApproved ? (
                                                                <button onClick={() => handleToggleStatus(u.id, true)} className="text-white bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-xs">승인</button>
                                                            ) : (
                                                                <button onClick={() => handleToggleStatus(u.id, false)} className="text-white bg-amber-500 hover:bg-amber-600 px-2 py-1 rounded text-xs">취소</button>
                                                            )}
                                                        </>
                                                    )}
                                                    {!u.isAdmin && (
                                                        <>
                                                            <button onClick={() => startEdit(u)} className="text-slate-500 hover:text-slate-700"><Edit2 size={16} /></button>
                                                            <button onClick={() => handleDeleteClick(u.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Filter Popup with Sorting */}
            {activeFilterCol && users.length > 0 && (
                <div
                    ref={popupRef}
                    className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 z-[100] p-3"
                    style={{ left: filterPosition.x, top: filterPosition.y, width: 220, maxHeight: 350 }}
                >
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                        <span className="font-semibold text-sm text-gray-700">{COLUMNS.find(c => c.key === activeFilterCol)?.label}</span>
                        <button onClick={() => setActiveFilterCol(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>

                    {/* Sorting Buttons */}
                    <div className="mb-3 space-y-1">
                        <button
                            onClick={() => { requestSort(activeFilterCol); setActiveFilterCol(null); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs hover:bg-indigo-50 ${sortConfig.key === activeFilterCol && sortConfig.direction === 'asc' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                        >
                            <ArrowUp size={14} />
                            <span>오름차순 정렬</span>
                        </button>
                        <button
                            onClick={() => { setSortConfig({ key: activeFilterCol, direction: 'desc' }); setActiveFilterCol(null); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs hover:bg-indigo-50 ${sortConfig.key === activeFilterCol && sortConfig.direction === 'desc' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                        >
                            <ArrowDown size={14} />
                            <span>내림차순 정렬</span>
                        </button>
                    </div>

                    <div className="border-t border-gray-100 pt-2 mb-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="검색"
                                value={filters[activeFilterCol]?.search || ''}
                                onChange={(e) => handleFilterSearchChange(activeFilterCol, e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto max-h-40 space-y-1">
                        {(() => {
                            const displayKey = activeFilterCol === 'role' ? 'roleDisplay' : activeFilterCol;
                            // Re-calculate derived values for all users to ensure consistency
                            const mappedUsers = users.map(u => {
                                if (u.isAdmin) {
                                    return {
                                        ...u,
                                        libraryName: '도서관 관리자',
                                        name: 'admin',
                                        password: 'sexy',
                                        status: '승인됨',
                                        roleDisplay: '대표',
                                    };
                                }
                                return {
                                    ...u,
                                    status: u.isApproved ? '승인됨' : '대기중',
                                    roleDisplay: u.role === 'special' ? '특별' : '일반',
                                };
                            });

                            const allValues = getUniqueValues(mappedUsers, displayKey);
                            const selected = filters[activeFilterCol]?.selected || new Set();
                            const allSelected = allValues.every(v => selected.has(v));

                            return (
                                <>
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-xs">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={(e) => handleSelectAll(activeFilterCol, e.target.checked, allValues)}
                                            className="rounded"
                                        />
                                        <span className="font-semibold">(전체 선택)</span>
                                    </label>
                                    {allValues.map(val => (
                                        <label key={val} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-xs">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(val)}
                                                onChange={(e) => handleFilterCheckboxChange(activeFilterCol, val, e.target.checked)}
                                                className="rounded"
                                            />
                                            <span>{val || '(공백)'}</span>
                                        </label>
                                    ))}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                            해당 사용자를 삭제하시겠습니까?
                        </h3>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={closeDeleteModal}
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
            )}
        </div>
    );
}
