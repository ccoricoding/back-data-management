import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LIBRARY_LIST } from '../services/db';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [libraryName, setLibraryName] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [confirmPassword, setConfirmPassword] = useState('');

    // Reset form when switching modes
    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setSuccess('');
        setName('');
        setPassword('');
        setConfirmPassword('');
        setLibraryName('');
    }

    const { login, signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (isLogin) {
                const result = await login(name, password);
                if (!result) {
                    throw new Error('이름 또는 비밀번호가 틀렸습니다.');
                }
                if (result.error) {
                    throw new Error(result.error);
                }
                navigate('/');
            } else {
                if (!libraryName) {
                    throw new Error('도서관을 선택해주세요.');
                }
                if (password !== confirmPassword) {
                    throw new Error('비밀번호가 일치하지 않습니다.');
                }
                const result = await signup(name, password, libraryName);
                if (result.error) {
                    throw new Error(result.error);
                }
                setSuccess('가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다.');
                setTimeout(() => {
                    setIsLogin(true);
                    setSuccess('');
                    setName('');
                    setPassword('');
                    setConfirmPassword('');
                    setLibraryName('');
                }, 2000);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-8">
                    {isLogin ? '로그인' : '회원가입'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">도서관명</label>
                            <select
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                value={libraryName}
                                onChange={(e) => setLibraryName(e.target.value)}
                            >
                                <option value="">도서관 선택</option>
                                {/* We need LIBRARY_LIST. Since I can't import easily if not exported or if I want to avoid relative path guessing failure, I will assume import is needed. 
                                   Actually I'll try to import it. If it fails, I'll hardcode or use db.LIBRARY_LIST if accessible. 
                                   Wait, Login.jsx imports useAuth. I should import LIBRARY_LIST from ../services/db 
                               */}
                                {LIBRARY_LIST.map(lib => (
                                    <option key={lib} value={lib}>{lib}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">이름</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">비밀번호</label>
                        <input
                            type="password"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">비밀번호 확인</label>
                            <input
                                type="password"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    )}

                    {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{error}</div>}
                    {success && <div className="text-green-600 text-sm text-center font-medium bg-green-50 p-2 rounded">{success}</div>}

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        disabled={!!success}
                    >
                        {isLogin ? '로그인' : '가입'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={switchMode}
                        className="text-sm text-primary-600 hover:text-primary-500"
                    >
                        {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                    </button>
                </div>
            </div>
        </div>
    );
}
