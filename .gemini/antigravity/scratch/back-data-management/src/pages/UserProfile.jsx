import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, LIBRARY_LIST } from '../services/db';
import { Save } from 'lucide-react';

export default function UserProfile() {
    const { user: currentUser } = useAuth();
    const [libraryName, setLibraryName] = useState('');

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser) {
            setLibraryName(currentUser.libraryName || '');
        }
    }, [currentUser]);

    const handleSave = (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const updates = { libraryName };
            let hasChanges = false;

            // Check if library name changed
            if (libraryName !== currentUser.libraryName) {
                hasChanges = true;
            }

            // Password Change Logic
            if (newPassword || currentPassword) {
                // If attempting to change password (any field filled), require validation
                if (currentPassword !== currentUser.password) {
                    throw new Error('현재 비밀번호가 일치하지 않습니다.');
                }
                if (newPassword) {
                    if (newPassword === currentPassword) {
                        throw new Error('현재 비밀번호와 동일합니다.');
                    }
                    if (newPassword !== confirmNewPassword) {
                        throw new Error('새 비밀번호가 일치하지 않습니다.');
                    }
                    updates.password = newPassword;
                    hasChanges = true;
                }
            }

            if (!hasChanges) {
                setMessage('변경사항이 없습니다.');
                return;
            }

            db.updateUserInfo(currentUser.id, updates);
            setMessage('회원정보가 수정되었습니다.');

            // Clear password fields on success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (e) {
            console.error(e);
            setError(e.message || '저장 실패');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">도서관명</label>
                        <input
                            type="text"
                            value={libraryName}
                            disabled
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 shadow-sm"
                        />
                        <p className="mt-1 text-xs text-gray-400">도서관명 변경은 관리자에게 요청해 주세요.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">이름</label>
                        <input
                            type="text"
                            value={currentUser?.name || ''}
                            disabled
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 shadow-sm"
                        />
                        <p className="mt-1 text-xs text-gray-400">이름은 변경할 수 없습니다.</p>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">비밀번호 변경</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500">현재 비밀번호</label>
                                <input
                                    type="password"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">새 비밀번호</label>
                                <input
                                    type="password"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">새 비밀번호 확인</label>
                                <input
                                    type="password"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded text-center">{error}</div>}
                    {message && <div className="text-green-600 text-sm font-medium bg-green-50 p-2 rounded text-center">{message}</div>}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-sm hover:shadow-md"
                        >
                            <Save size={18} />
                            저장하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
