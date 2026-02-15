import { z } from 'zod';

/**
 * Types used in the MCP server for Blogger
 */

// Tool definition type
export interface ToolDefinition {
  name: string;
  description: string;
  args: z.ZodType<any>;
  handler: (args: any, extra?: any) => Promise<any>;
}

// Blog type
export interface BloggerBlog {
  id: string;
  name: string;
  description?: string;
  url: string;
  status?: string;
  posts?: BloggerPost[];
  labels?: BloggerLabel[];
}

// Post type
export interface BloggerPost {
  id: string;
  blogId: string;
  title: string;
  content: string;
  url?: string;
  published?: string;
  updated?: string;
  author?: {
    id: string;
    displayName: string;
    url: string;
    image?: {
      url: string;
    };
  };
  labels?: string[];
}

// Label type
export interface BloggerLabel {
  id?: string;
  name: string;
}

// Search parameters type
export interface SearchParams {
  query: string;
  maxResults?: number;
}

// Pagination parameters type
export interface PaginationParams {
  pageToken?: string;
  maxResults?: number;
}

// Server operating modes type
export type ServerMode =
  | { type: 'stdio' }
  | { type: 'http', host: string, port: number };

// OAuth2 configuration type
export interface OAuth2Config {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

// Server configuration type
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

// UI types
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
