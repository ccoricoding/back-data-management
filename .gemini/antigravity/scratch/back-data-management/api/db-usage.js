// Vercel Serverless Function to fetch Supabase database usage
// Advanced Debugging Version: Checks Project Access before fetching Usage

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const projectId = (process.env.SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID || '').trim();
    const apiKey = (process.env.SUPABASE_MANAGEMENT_API_KEY || process.env.VITE_SUPABASE_MANAGEMENT_API_KEY || '').trim();

    if (!projectId || !apiKey) {
        return res.status(500).json({ error: 'Missing Credentials' });
    }

    try {
        console.log(`Debug: Checking credentials...`);
        console.log(`- Project: ${projectId}`);
        console.log(`- Key Prefix: ${apiKey.substring(0, 4)}...`);

        // 1. Test Basic Project Access (Is the token valid for this project?)
        const projectCheck = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!projectCheck.ok) {
            const errorText = await projectCheck.text();
            // If this fails, the token truly cannot see the project
            throw new Error(`Basic Access Failed (${projectCheck.status}): ${errorText}`);
        } else {
            console.log('Debug: Basic Project Access OK!');
        }

        // 2. If basic access works, try fetching Usage
        const usageResponse = await fetch(`https://api.supabase.com/v1/projects/${projectId}/usage`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!usageResponse.ok) {
            const errorText = await usageResponse.text();
            // If basic worked but usage failed, the endpoint might be wrong/blocked
            throw new Error(`Usage Endpoint Failed (${usageResponse.status}): ${errorText}`);
        }

        const data = await usageResponse.json();

        const dbUsageBytes = data.db_size?.usage || 0;
        const storageUsageBytes = data.storage_size?.usage || 0;
        const totalUsageMB = (dbUsageBytes + storageUsageBytes) / (1024 * 1024);
        const limitMB = (data.db_size?.limit || 524288000) / (1024 * 1024);

        return res.status(200).json({
            usage: totalUsageMB,
            limit: limitMB,
            percentage: (totalUsageMB / limitMB) * 100
        });

    } catch (error) {
        console.error('Final Error:', error.message);
        return res.status(500).json({
            error: error.message
        });
    }
}
