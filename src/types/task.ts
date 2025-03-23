

export interface Task {
    id: string;
    task_id?: string;
    summarization?: string;
    role?: string;
    description: string;
    created_at: string;
    start_time: string;
    end_time: string;
    status: string;
    result: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools_called?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conversation?: Record<string, any>;
  }