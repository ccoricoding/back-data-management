import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/db';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 세션에서 사용자 정보 복원
        const sessionUser = db.getSession();
        if (sessionUser) {
            setUser(sessionUser);
        }
        setLoading(false);
    }, []);

    const login = async (name, password) => {
        const foundUser = await db.findUser(name, password);
        if (foundUser) {
            // Supabase 형식 -> 앱 형식으로 변환
            const appUser = {
                id: foundUser.id,
                name: foundUser.name,
                libraryName: foundUser.library_name,
                isAdmin: foundUser.is_admin,
                isApproved: foundUser.is_approved,
                password: foundUser.password,
                role: foundUser.role
            };

            if (!appUser.isApproved) {
                return { error: '승인 대기 중입니다.' };
            }

            db.saveSession(appUser);
            setUser(appUser);
            return appUser;
        }
        return null;
    };

    const signup = async (name, password, libraryName) => {
        // 중복 체크
        const users = await db.getUsers();
        const exists = users.find(u => u.name === name);
        if (exists) {
            return { error: '이미 존재하는 이름입니다.' };
        }

        const newUser = await db.addUser({
            name,
            password,
            libraryName,
            isAdmin: false,
            isApproved: false
        });

        if (newUser) {
            return {
                id: newUser.id,
                name: newUser.name,
                libraryName: newUser.library_name,
                isAdmin: newUser.is_admin,
                isApproved: newUser.is_approved,
                role: newUser.role
            };
        }
        return { error: '회원가입 실패' };
    };

    const logout = () => {
        db.clearSession();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, signup, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
