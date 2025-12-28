// Vercel Serverless Function to fetch Supabase database usage
// Research Mode: Fetching Project Metadata to see if usage stats are exposed there.

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = (process.env.SUPABASE_MANAGEMENT_API_KEY || process.env.VITE_SUPABASE_MANAGEMENT_API_KEY || '').trim();
    const targetProjectId = (process.env.SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID || 'fkouuqypcybyowpchjto').trim();

    if (!apiKey) {
        return res.status(500).json({ error: 'Missing API Key in Vercel Env Vars' });
    }

    try {
        console.log(`Debug: Fetching Project List for inspection...`);

        const response = await fetch(
            `https://api.supabase.com/v1/projects`,
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
            throw new Error(`Projects List API Failed (${response.status}): ${errorText}`);
        }

        const projects = await response.json();
        const myProject = projects.find(p => p.id === targetProjectId);

        if (!myProject) {
            throw new Error(`Project ${targetProjectId} not found in your account. Project count: ${projects.length}`);
        }

        // Return the full project metadata to the frontend to inspect
        // We'll see if 'usage' or 'database_size' is hidden in here.

        return res.status(200).json({
            usage: 0,
            limit: 500,
            percentage: 0,
            debug_raw_project: myProject,
            message: "Check console for 'debug_raw_project' to see available fields."
        });

    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({
            error: error.message
        });
    }
}
