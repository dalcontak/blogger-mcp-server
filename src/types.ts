import { z } from 'zod';
import { blogger_v3 } from 'googleapis';

export interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface ToolDefinition<T extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  args: z.ZodObject<T>;
  handler: (args: z.infer<z.ZodObject<T>>) => Promise<ToolResult>;
}

export type BloggerBlog = blogger_v3.Schema$Blog;
export type BloggerPost = blogger_v3.Schema$Post;
export type BloggerLabel = { name: string };

export type ServerMode =
  | { type: 'stdio' }
  | { type: 'http'; host: string; port: number };

export interface OAuth2Config {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export interface ServerConfig {
  mode: ServerMode;
  blogger: {
    apiKey?: string;
    maxResults: number;
    timeout: number;
  };
  oauth2: OAuth2Config;
  logging: {
    level: string;
  };
}

export interface ServerStatus {
  running: boolean;
  mode: string;
  startTime?: Date;
  connections: number;
  tools: string[];
}

export interface ClientConnection {
  id: string;
  ip?: string;
  connectedAt: Date;
  lastActivity: Date;
  requestCount: number;
}

export interface ServerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  toolUsage: Record<string, number>;
}
