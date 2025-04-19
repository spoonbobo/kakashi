import { User } from "./user";
import { IMessage } from "./chat";

export interface ITool {
    tool_name?: string;
    mcp_server?: string;
    description?: string;
    type?: string;
    args?: Record<string, any>;
}

export interface IContextItem {
    sender: User;
    message: IMessage;
}

export type PlanStatus = 'pending' | 'running' | 'success' | 'failure' | 'terminated';
export type TaskStatus = 'pending' | 'running' | 'success' | 'failure' | 'denied' | 'not_started';

export interface IPlan {
    id: string;
    plan_id: string;
    plan_name: string;
    plan_overview: string;
    status: string;
    progress: number;
    room_id: string;
    assigner: string;
    assignee: string;
    reviewer: string | null;
    created_at: Date;
    updated_at: Date;
    completed_at: Date | null;
    logs?: Log[];
    context?: any[];
}


export interface ITask {
    id?: string;
    task_id?: string;
    plan_id: string;
    task_name: string;
    task_explanation?: string;
    status: string;
    step_number: number;
    created_at?: Date;
    updated_at?: Date;
    start_time?: Date | null;
    completed_at?: Date | null;
    tool?: any;
    expected_result?: string;
    result?: string;
    mcp_server?: string;
    logs?: any;
}

export interface IPlanFromAPI {
    id: string;
    plan_id: string;
    plan_name: string;
    plan_overview: string;
    status: string;
    progress: number;
    room_id: string;
    assigner: string;
    assignee: string;
    reviewer: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    logs?: Log[];
    context?: any[];
}

export const logTypes = ['created_plan', 'created_task', 'updated_task', 'completed_task', 'failed_task', 'denied_task', 'not_started_task'];

export class Log {
    id: string;
    created_at: Date;
    plan_id: string;
    task_id: string;
    content: string;
    type: string;
}
