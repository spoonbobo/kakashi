import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432'),
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        // Get filter parameters
        const categories = searchParams.get('categories')?.split(',') || [];
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const status = searchParams.get('status'); // 'pending', 'running', 'completed', 'failed'
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');
        
        console.log('API received params:', { 
            categories, 
            startDate, 
            endDate, 
            status, 
            limit, 
            offset 
        });
        
        // Build query with filters
        let query = `
            SELECT *
            FROM agent_task
            WHERE 1=1
        `;
        
        const queryParams: any[] = [];
        let paramIndex = 1;
        
        // Add category filter if provided
        if (categories.length > 0) {
            query += ` AND role = ANY($${paramIndex})`;
            queryParams.push(categories);
            paramIndex++;
        }
        
        // Add date range filters if provided
        if (startDate) {
            query += ` AND created_at >= $${paramIndex}`;
            queryParams.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND created_at <= $${paramIndex}`;
            queryParams.push(endDate);
            paramIndex++;
        }
        
        // Add status filter if provided
        if (status) {
            query += ` AND status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }
        
        // Add ordering and pagination
        query += `
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        queryParams.push(limit.toString(), offset.toString());
        
        console.log('Executing query:', query);
        console.log('With params:', queryParams);
        
        const result = await pool.query(query, queryParams);
        console.log(`Found ${result.rows.length} tasks`);
            
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
