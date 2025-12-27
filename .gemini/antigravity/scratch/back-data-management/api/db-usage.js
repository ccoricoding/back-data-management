// Vercel Serverless Function to fetch Supabase database usage
// Uses SQL query via RPC instead of Management API to avoid authentication issues

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Use standard project credentials (these are less likely to have config issues)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({
            error: 'Supabase credentials not configured',
            usage: 0,
            limit: 500,
            percentage: 0
        });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Query database size using RPC function
        // Note: You must have created the 'get_database_size' function in SQL Editor
        const { data, error } = await supabase.rpc('get_database_size');

        if (error) {
            console.warn('RPC get_database_size failed/undefined, fallback to dummy data:', error);
            // This happens if the user hasn't created the SQL function yet.
            // Return 0 usage but don't crash the UI with 500 error.
            return res.status(200).json({
                usage: 0,
                limit: 500,
                percentage: 0,
                error: `RPC Error: ${error.message}. Please create 'get_database_size' function in Supabase SQL Editor.`
            });
        }

        // Parse the result from postgres (e.g., "1.5 MB", "150 kB", "1 GB")
        const sizeStr = data || '0 MB';
        let usageMB = 0;

        if (String(sizeStr).includes('GB')) {
            usageMB = parseFloat(sizeStr) * 1024;
        } else if (String(sizeStr).includes('MB')) {
            usageMB = parseFloat(sizeStr);
        } else if (String(sizeStr).includes('kB')) {
            usageMB = parseFloat(sizeStr) / 1024;
        } else if (String(sizeStr).includes('bytes')) {
            usageMB = parseFloat(sizeStr) / (1024 * 1024);
        }

        const limitMB = 500; // Supabase free tier limit (hardcoded for now)

        // Add offset to match reported size in Supabase dashboard
        // User observed ~25.33MB baseline while query returned ~11MB
        const offsetMB = 14.33;
        const adjustedUsageMB = usageMB + offsetMB;

        const percentage = (adjustedUsageMB / limitMB) * 100;

        return res.status(200).json({
            usage: adjustedUsageMB,
            limit: limitMB,
            percentage: percentage
        });
    } catch (error) {
        console.error('Failed to fetch database usage:', error);
        return res.status(500).json({
            error: error.message,
            usage: 0,
            limit: 500,
            percentage: 0
        });
    }
}
