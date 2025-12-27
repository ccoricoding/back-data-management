import React, { createContext, useContext, useState, useEffect } from 'react';

const YearContext = createContext();

export const YearProvider = ({ children }) => {
    // Default to current year
    const [selectedYear, setSelectedYear] = useState(() => {
        const saved = localStorage.getItem('bdm_selected_year');
        return saved ? Number(saved) : new Date().getFullYear();
    });

    useEffect(() => {
        localStorage.setItem('bdm_selected_year', selectedYear);
    }, [selectedYear]);

    return (
        <YearContext.Provider value={{ selectedYear, setSelectedYear }}>
            {children}
        </YearContext.Provider>
    );
};

export const useYear = () => {
    const context = useContext(YearContext);
    if (!context) {
        throw new Error('useYear must be used within a YearProvider');
    }
    return context;
};
