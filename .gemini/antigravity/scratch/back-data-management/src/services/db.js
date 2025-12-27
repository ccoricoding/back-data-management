import { supabase } from './supabase';

export const LIBRARY_LIST = [
    "국채보상운동기념도서관",
    "대구2·28기념학생도서관",
    "대구광역시립동부도서관",
    "대구광역시립서부도서관",
    "대구광역시립남부도서관",
    "대구광역시립북부도서관",
    "대구광역시립수성도서관",
    "대구광역시립두류도서관",
    "대구광역시립달성도서관",
    "대구광역시교육청 삼국유사군위도서관"
];

export const db = {
    // ============ USERS ============
    // Helper to map DB columns to App fields
    _mapUser(u) {
        if (!u) return null;
        return {
            ...u,
            libraryName: u.library_name,
            isAdmin: u.is_admin,
            isApproved: u.is_approved,
            role: u.role || 'general'
        };
    },

    async getUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return (data || []).map(u => this._mapUser(u));
    },

    async findUser(name, password) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('name', name)
            .eq('password', password)
            .single();

        if (error) return null;
        return this._mapUser(data);
    },

    async addUser(user) {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                name: user.name,
                password: user.password,
                library_name: user.libraryName,
                is_admin: user.isAdmin || false,
                is_approved: user.isApproved || false,
                role: user.role || 'general'
                // role column might not exist in DB yet, causing registration failure.
                // role: user.role || 'general' 
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding user:', error);
            return null;
        }
        return this._mapUser(data);
    },

    async updateUser(userId, updates) {
        const updateData = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.password !== undefined) updateData.password = updates.password;
        if (updates.libraryName !== undefined) updateData.library_name = updates.libraryName;
        if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin;
        if (updates.isApproved !== undefined) updateData.is_approved = updates.isApproved;
        if (updates.role !== undefined) updateData.role = updates.role;

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating user:', error);
            return null;
        }
        return this._mapUser(data);
    },

    async updateUserInfo(userId, updates) {
        return this.updateUser(userId, updates);
    },

    async deleteUser(userId) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            console.error('Error deleting user:', error);
            return false;
        }
        return true;
    },

    async approveUser(userId) {
        return this.updateUser(userId, { isApproved: true });
    },

    async updateUserStatus(userId, isApproved) {
        return this.updateUser(userId, { isApproved });
    },

    // ============ CATEGORIES ============
    async getCategories(year, libraryName) {
        const { data, error } = await supabase
            .from('categories')
            .select('*');

        if (error) {
            console.error('Error fetching categories:', error);
            return {};
        }

        const categories = {};
        // Filter by library_year prefix (e.g., "대구광역시립수성도서관_2025_")
        // This creates isolated data spaces for each library-year combination

        data.forEach(row => {
            if (year && libraryName) {
                const prefix = `${libraryName}_${year}_`;
                if (row.key.startsWith(prefix)) {
                    const originalKey = row.key.replace(prefix, '');
                    categories[originalKey] = row.items || [];
                }
            } else if (year) {
                // Backward compatibility: filter by year only
                const prefix = `${year}_`;
                if (row.key.startsWith(prefix)) {
                    const originalKey = row.key.replace(prefix, '');
                    categories[originalKey] = row.items || [];
                }
            } else {
                // Legacy: keys without year prefix
                if (!/^\d{4}_/.test(row.key) && !row.key.includes('_')) {
                    categories[row.key] = row.items || [];
                }
            }
        });
        return categories;
    },

    async getAllCategoriesRaw() {
        const { data, error } = await supabase
            .from('categories')
            .select('*');
        if (error) {
            console.error('Error fetching raw categories:', error);
            return [];
        }
        return data || [];
    },

    async saveCategories(categories, year, libraryName) {
        // Use upsert to ensure new categories are created
        const updates = Object.entries(categories).map(([key, items]) => {
            // If year and libraryName are provided, prefix the key with both
            let finalKey = key;
            if (year && libraryName) {
                finalKey = `${libraryName}_${year}_${key}`;
            } else if (year) {
                // Backward compatibility: year only
                finalKey = `${year}_${key}`;
            }
            return {
                key: finalKey,
                items,
                updated_at: new Date().toISOString()
            };
        });

        if (updates.length > 0) {
            const { error } = await supabase
                .from('categories')
                .upsert(updates, { onConflict: 'key' });

            if (error) {
                console.error('Error saving categories:', error);
                throw error;
            }
        }
        return true;
    },

    // ============ DATA ENTRIES ============
    async getData(year, libraryName) {
        // Get all data first
        const { data, error } = await supabase
            .from('data_entries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching data:', error);
            return [];
        }

        // Map to app format
        let results = (data || []).map(entry => ({
            id: entry.id,
            userId: entry.user_id,
            overview: entry.overview || {},
            budgetItems: entry.budget || [],
            performances: entry.performances || [],
            createdAt: entry.created_at,
            updatedAt: entry.updated_at
        }));

        // Client-side filtering for flexibility
        // This handles both new data (with libraryName/year in overview) 
        // and old data (without these fields)
        if (year) {
            results = results.filter(entry => {
                const entryYear = entry.overview?.year;
                // If no year in overview, check startDate as fallback
                if (entryYear) {
                    return String(entryYear) === String(year);
                }
                // Fallback: check if startDate contains the year
                const startDate = entry.overview?.startDate;
                if (startDate) {
                    return startDate.includes(String(year));
                }
                return false;
            });
        }

        if (libraryName) {
            results = results.filter(entry => {
                const entryLibrary = entry.overview?.libraryName;
                return entryLibrary === libraryName;
            });
        }

        console.log(`getData: Found ${results.length} entries for year=${year}, library=${libraryName}`);

        return results;
    },

    async saveData(entry, year, libraryName) {
        // Ensure year and libraryName are in overview if provided
        const finalOverview = { ...entry.overview };
        if (year) {
            finalOverview.year = String(year);
        }
        if (libraryName) {
            finalOverview.libraryName = libraryName;
        }

        const { data, error } = await supabase
            .from('data_entries')
            .insert([{
                user_id: entry.userId,
                overview: finalOverview,
                budget: entry.budgetItems || [], // Map budgetItems to DB 'budget' column
                performances: entry.performances,
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('Error saving data:', error);
            throw error;
        }
        return {
            id: data.id,
            userId: data.user_id,
            overview: data.overview,
            budget: data.budget,
            performances: data.performances,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    async updateData(entryId, updates) {
        const updateData = {
            updated_at: new Date().toISOString()
        };
        if (updates.overview !== undefined) updateData.overview = updates.overview;
        if (updates.budgetItems !== undefined) updateData.budget = updates.budgetItems;
        if (updates.performances !== undefined) updateData.performances = updates.performances;

        const { data, error } = await supabase
            .from('data_entries')
            .update(updateData)
            .eq('id', entryId)
            .select()
            .single();

        if (error) {
            console.error('Error updating data:', error);
            throw error;
        }
        return data;
    },

    async deleteData(entryId) {
        const { error } = await supabase
            .from('data_entries')
            .delete()
            .eq('id', entryId);

        if (error) {
            console.error('Error deleting data:', error);
            return false;
        }
        return true;
    },

    // ============ SESSION (Local Storage - 세션은 로컬 유지) ============
    saveSession(user) {
        localStorage.setItem('bdm_session', JSON.stringify(user));
    },

    getSession() {
        const session = localStorage.getItem('bdm_session');
        return session ? JSON.parse(session) : null;
    },

    clearSession() {
        localStorage.removeItem('bdm_session');
    },

    // ============ BACKUP & RESTORE ============
    async restoreBackup(backupData) {
        // 1. Clear Existing Data (Order: Child -> Parent)
        console.log('Clearing existing data...');
        // Use not.is('id', null) to clear all rows safely regardless of ID type (UUID/Int)
        const { error: err1 } = await supabase.from('data_entries').delete().not('id', 'is', null);
        if (err1) throw new Error('기존 데이터 삭제 실패 (엔트리): ' + err1.message);

        const { error: err2 } = await supabase.from('categories').delete().not('id', 'is', null);
        if (err2) throw new Error('기존 데이터 삭제 실패 (카테고리): ' + err2.message);

        const { error: err3 } = await supabase.from('users').delete().not('id', 'is', null);
        if (err3) throw new Error('기존 데이터 삭제 실패 (사용자): ' + err3.message);

        // 2. Insert Backup Data (Order: Parent -> Child)
        console.log('Restoring users...');
        if (backupData.users && backupData.users.length > 0) {
            const usersToInsert = backupData.users.map(u => ({
                id: u.id,
                name: u.name,
                password: u.password,
                library_name: u.libraryName,
                is_admin: u.isAdmin,
                is_approved: u.isApproved,
                created_at: u.createdAt
            }));
            const { error: err4 } = await supabase.from('users').insert(usersToInsert);
            if (err4) throw new Error('사용자 복구 실패: ' + err4.message);
        }

        console.log('Restoring categories...');
        if (backupData.categories && backupData.categories.length > 0) {
            const catsToInsert = backupData.categories.map(c => ({
                id: c.id,
                key: c.key,
                items: c.items,
                updated_at: c.updated_at || new Date().toISOString()
            }));
            const { error: err5 } = await supabase.from('categories').insert(catsToInsert);
            if (err5) throw new Error('카테고리 복구 실패: ' + err5.message);
        }

        console.log('Restoring entries...');
        if (backupData.entries && backupData.entries.length > 0) {
            const entriesToInsert = backupData.entries.map(e => ({
                id: e.id,
                user_id: e.userId,
                overview: e.overview,
                budget: e.budgetItems || [], // consistency for backup
                performances: e.performances,
                created_at: e.createdAt,
                updated_at: e.updatedAt
            }));
            const { error: err6 } = await supabase.from('data_entries').insert(entriesToInsert);
            if (err6) throw new Error('데이터 엔트리 복구 실패: ' + err6.message);
        }

        return true;
    },

};
