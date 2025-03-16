import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432'),
});
  
/*
id |        name        |   role   |     start_time      |      end_time       |                 description                  |   status    |         created_at         | result  
----+--------------------+----------+---------------------+---------------------+----------------------------------------------+-------------+----------------------------+---------
  1 | Data Analysis      | Analyst  | 2023-10-01 09:00:00 | 2023-10-01 17:00:00 | Analyze user behavior data for Q3            | completed   | 2025-03-12 03:33:25.856199 | success
  2 | System Upgrade     | Engineer | 2023-10-02 10:00:00 |                     | Upgrade production servers to latest version | in_progress | 2025-03-12 03:33:25.856199 | n/a
  3 | Marketing Campaign | Marketer |                     |                     | Plan Q4 marketing strategy                   | pending     | 2025-03-12 03:33:25.856199 | n/a
(3 rows)

*/

export async function GET() {
    try {
        const result = await pool.query(`
            select 
                id,
                name as task_executor,
                description as task_description,
                created_at as task_create_time,
                start_time as task_start_time,
                end_time as task_end_time,
                status as task_status,
                result as task_result
            from agent_task t
            order by t.created_at desc
        `);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}