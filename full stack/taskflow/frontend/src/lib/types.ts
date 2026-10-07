export type Status = "todo" | "in_progress" | "done";
export type User = { id: string; display_name: string; email?: string };
export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: Status;
  assignee_id: string | null;
  assignee_name: string | null;
};
export type Comment = {
  id: string;
  task_id: string;
  name: string;
  body: string;
  created_at: string;
};
export type Notif = {
  id: string;
  message: string;
  project_id: string;
  task_id: string;
  read: boolean;
  created_at: string;
};
