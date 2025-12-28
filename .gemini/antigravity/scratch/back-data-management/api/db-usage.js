// Vercel Serverless Function to fetch Supabase database usage
// Uses Management API to get comprehensive project usage data (DB + Storage)

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Use environment variables (without VITE_ prefix for serverless functions)
    // Trim strictly to avoid copy-paste whitespace issues which cause 401s
    const projectId = (process.env.SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID || '').trim();
    const apiKey = (process.env.SUPABASE_MANAGEMENT_API_KEY || process.env.VITE_SUPABASE_MANAGEMENT_API_KEY || '').trim();

    // Validate credentials
    if (!projectId || !apiKey) {
        console.error('Missing credentials in Vercel env vars');
        return res.status(500).json({
            error: 'Supabase credentials not configured',
            details: 'Please set SUPABASE_PROJECT_ID and SUPABASE_MANAGEMENT_API_KEY in Vercel Settings'
        });
    }

    try {
        console.log(`Debug Info:`);
        console.log(`- Project ID: ${projectId} (Length: ${projectId.length})`);

        // Safety check prefix
        const keyPrefix = apiKey ? apiKey.substring(0, 4) : 'null';
        console.log(`- API Key Prefix: ${keyPrefix}`);
        console.log(`- API Key Length: ${apiKey ? apiKey.length : 0}`);

        // Warn if key looks suspicious
        if (!apiKey.startsWith('sbp_')) {
            throw new Error(`Invalid API Key format. Starts with '${keyPrefix}', expected 'sbp_'. Check Vercel Env Vars.`);
        }

        const response = await fetch(
            `https://api.supabase.com/v1/projects/${projectId}/usage`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Supabase API Error (${response.status}): ${errorText}`);

            if (response.status === 401) {
                // Return exact details to help user fix it
                throw new Error(`Unauthorized (401). Key Length: ${apiKey.length}. Msg: ${errorText}`);
            } else if (response.status === 404) {
                throw new Error(`Project Not Found (404). Check if SUPABASE_PROJECT_ID (${projectId}) is correct.`);
            }

            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Calculate total usage (DB + Storage)
        const dbUsageBytes = data.db_size?.usage || 0;
        const storageUsageBytes = data.storage_size?.usage || 0;

        // Convert to MB
        const totalUsageMB = (dbUsageBytes + storageUsageBytes) / (1024 * 1024);
        const limitMB = (data.db_size?.limit || 524288000) / (1024 * 1024); // Default 500MB

        const percentage = (totalUsageMB / limitMB) * 100;

        return res.status(200).json({
            usage: totalUsageMB,
            limit: limitMB,
            percentage: percentage,
            details: {
                database: dbUsageBytes / (1024 * 1024),
                storage: storageUsageBytes / (1024 * 1024)
            }
        });
    } catch (error) {
        console.error('Failed to fetch database usage:', error.message);
        return res.status(500).json({
            error: error.message,
            usage: 0,
            limit: 500,
            percentage: 0
        });
    }
}
