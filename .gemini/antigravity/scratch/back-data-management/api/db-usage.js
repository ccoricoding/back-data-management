// Vercel Serverless Function to fetch Supabase database usage
// Attempting Organization Usage API since Project Usage API does not exist

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = (process.env.SUPABASE_MANAGEMENT_API_KEY || process.env.VITE_SUPABASE_MANAGEMENT_API_KEY || '').trim();
    // User provided Organization Slug from URL
    const orgId = 'zgmhxcgykicukoojohln';
    const targetProjectId = (process.env.SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID || 'fkouuqypcybyowpchjto').trim();

    if (!apiKey) {
        return res.status(500).json({ error: 'Missing API Key' });
    }

    try {
        console.log(`Debug: Fetching Org Usage for ${orgId}`);

        const response = await fetch(
            `https://api.supabase.com/v1/organizations/${orgId}/usage`,
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
            throw new Error(`Org Usage API Failed (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('Debug: Org Usage Data received');

        // The Org Usage API returns usage for ALL projects in the org.
        // We need to filter for our specific project.
        // Structure is usually: { usages: [ { project_ref: '...', db_size: ... } ] } 
        // OR simply aggregated data. Let's inspect what we get.

        // Note: The structure of Org Usage response is not well documented for public use,
        // so we might need to adjust based on what we see.
        // Assuming typical structure:

        let projectUsage = null;

        // If data is an array of projects
        if (Array.isArray(data.projects)) {
            projectUsage = data.projects.find(p => p.ref === targetProjectId);
        }
        // Or if usage is directly in root properties (aggregated)
        else if (data.usage && Array.isArray(data.usage)) {
            // Check if usage array contains project specific data
            projectUsage = data.usage.find(u => u.project_ref === targetProjectId);
        }

        // Fallback: If we can't find specific structure, just dump what we have for debugging
        // But for now, let's try to map common fields

        // If we can't find specific project data, we might be hitting a limitation.
        // But let's assume we find something like 'db_size'

        // Logic for extracting DB Size (bytes)
        let dbSizeBytes = 0;
        let limitBytes = 524288000; // 500MB default

        // Try to find the metric in the response
        // Note: This is an exploratory attempt.
        if (projectUsage && projectUsage.db_size) {
            dbSizeBytes = projectUsage.db_size;
        } else if (data.db_size) {
            dbSizeBytes = data.db_size; // Maybe org aggregate?
        }

        const totalUsageMB = dbSizeBytes / (1024 * 1024);
        const limitMB = limitBytes / (1024 * 1024);

        return res.status(200).json({
            usage: totalUsageMB,
            limit: limitMB,
            percentage: (totalUsageMB / limitMB) * 100,
            debug_raw: data // Send raw data to frontend console to inspect structure
        });

    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({
            error: error.message
        });
    }
}
