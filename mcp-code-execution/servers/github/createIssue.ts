import { callMCPTool } from '../../client';

export interface CreateIssueInput {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  assignees?: string[];
  labels?: string[];
  milestone?: number;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
}

/* Create a new issue in a GitHub repository */
export async function createIssue(
  input: CreateIssueInput
): Promise<Issue> {
  return callMCPTool<Issue>(
    'mcp__github__create_issue',
    input
  );
}
