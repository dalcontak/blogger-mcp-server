import { createToolDefinitions, initMCPServer } from './server';
import { ToolResult } from './types';

jest.mock('./bloggerService', () => ({
  BloggerService: jest.fn().mockImplementation(() => ({
    listBlogs: jest.fn().mockResolvedValue({ items: [] }),
    getBlog: jest.fn().mockResolvedValue({ id: 'b1' }),
    getBlogByUrl: jest.fn().mockResolvedValue({ id: 'b1' }),
    listPosts: jest.fn().mockResolvedValue({ items: [] }),
    searchPosts: jest.fn().mockResolvedValue({ items: [] }),
    getPost: jest.fn().mockResolvedValue({ id: 'p1' }),
    createPost: jest.fn().mockResolvedValue({ id: 'p1' }),
    updatePost: jest.fn().mockResolvedValue({ id: 'p1' }),
    deletePost: jest.fn().mockResolvedValue(undefined),
    listLabels: jest.fn().mockResolvedValue({ items: [] }),
    getLabel: jest.fn().mockResolvedValue({ name: 'test' }),
  }))
}));

jest.mock('./config', () => ({
  config: {
    mode: 'stdio',
    http: { host: '0.0.0.0', port: 3000 },
    blogger: { apiKey: 'test-key', maxResults: 10, timeout: 30000 },
    oauth2: { clientId: 'cid', clientSecret: 'csec', refreshToken: 'rtok' },
    logging: { level: 'info' },
    ui: { port: 0 }
  }
}));

import { BloggerService } from './bloggerService';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createToolDefinitions', () => {
  const service = new BloggerService();
  const tools = createToolDefinitions(service);

  it('should define 11 tools', () => {
    expect(tools).toHaveLength(11);
  });

  it('should have correct tool names', () => {
    const names = tools.map(t => t.name);
    expect(names).toEqual([
      'list_blogs', 'get_blog', 'get_blog_by_url',
      'list_posts', 'search_posts', 'get_post',
      'create_post', 'update_post', 'delete_post',
      'list_labels', 'get_label'
    ]);
  });

  it('should not include create_blog', () => {
    const names = tools.map(t => t.name);
    expect(names).not.toContain('create_blog');
  });

  it('each tool should have a non-empty description', () => {
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it('each tool should have a ZodObject args schema', () => {
    for (const tool of tools) {
      expect(tool.args).toBeDefined();
      expect(tool.args.shape).toBeDefined();
    }
  });

  it('each tool should have a handler function', () => {
    for (const tool of tools) {
      expect(typeof tool.handler).toBe('function');
    }
  });
});

describe('createToolHandler error wrapping', () => {
  const service = new BloggerService();
  const tools = createToolDefinitions(service);

  it('should return isError=true when handler throws', async () => {
    const getPostTool = tools.find(t => t.name === 'get_post')!;
    const mockFn = service.getPost as jest.Mock;
    mockFn.mockRejectedValueOnce(new Error('API failure'));

    const result: ToolResult = await getPostTool.handler(
      { blogId: 'b1', postId: 'p1' }
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('API failure');
  });

  it('should return JSON content on success', async () => {
    const getBlogTool = tools.find(t => t.name === 'get_blog')!;
    const mockFn = service.getBlog as jest.Mock;
    mockFn.mockResolvedValueOnce({ id: 'b1', name: 'Test Blog' });

    const result: ToolResult = await getBlogTool.handler({ blogId: 'b1' });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.blog.id).toBe('b1');
  });
});

describe('initMCPServer', () => {
  it('should return an MCP server instance', () => {
    const service = new BloggerService();
    const serverConfig = {
      mode: { type: 'stdio' as const },
      blogger: { apiKey: 'test', maxResults: 10, timeout: 30000 },
      oauth2: {},
      logging: { level: 'info' }
    };

    const server = initMCPServer(service, serverConfig);
    expect(server).toBeDefined();
  });
});
