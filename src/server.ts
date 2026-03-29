import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ServerConfig, ToolDefinition, ToolResult } from './types';
import { BloggerService } from './bloggerService';
import { z } from 'zod';

function createToolHandler(
  toolName: string,
  fn: () => Promise<unknown>
): () => Promise<ToolResult> {
  return async () => {
    try {
      const result = await fn();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      console.error(`Error in ${toolName}:`, error);
      return {
        content: [{ type: 'text', text: `Error in ${toolName}: ${error}` }],
        isError: true
      };
    }
  };
}

export function createToolDefinitions(bloggerService: BloggerService): ToolDefinition[] {
  return [
    {
      name: 'list_blogs',
      description: 'Lists all accessible blogs',
      args: z.object({}),
      handler: createToolHandler('list_blogs', () => {
        return bloggerService.listBlogs().then(blogs => ({ blogs }));
      })
    },
    {
      name: 'get_blog',
      description: 'Retrieves details of a specific blog',
      args: z.object({
        blogId: z.string().describe('Blog ID')
      }),
      handler: (args) => createToolHandler('get_blog', () => {
        return bloggerService.getBlog(args.blogId).then(blog => ({ blog }));
      })()
    },
    {
      name: 'get_blog_by_url',
      description: 'Retrieves a blog by its URL (useful for discovering blog ID)',
      args: z.object({
        url: z.string().describe('Blog URL')
      }),
      handler: (args) => createToolHandler('get_blog_by_url', () => {
        return bloggerService.getBlogByUrl(args.url).then(blog => ({ blog }));
      })()
    },
    {
      name: 'list_posts',
      description: 'Lists all posts from a blog',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        maxResults: z.number().optional().describe('Maximum number of results to return')
      }),
      handler: (args) => createToolHandler('list_posts', () => {
        return bloggerService.listPosts(args.blogId, args.maxResults).then(posts => ({ posts }));
      })()
    },
    {
      name: 'search_posts',
      description: 'Searches posts in a blog',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        query: z.string().describe('Search term'),
        maxResults: z.number().optional().describe('Maximum number of results to return')
      }),
      handler: (args) => createToolHandler('search_posts', () => {
        return bloggerService.searchPosts(args.blogId, args.query, args.maxResults).then(posts => ({ posts }));
      })()
    },
    {
      name: 'get_post',
      description: 'Retrieves details of a specific post',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        postId: z.string().describe('Post ID')
      }),
      handler: (args) => createToolHandler('get_post', () => {
        return bloggerService.getPost(args.blogId, args.postId).then(post => ({ post }));
      })()
    },
    {
      name: 'create_post',
      description: 'Creates a new post in a blog',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        title: z.string().describe('Post title'),
        content: z.string().describe('Post content'),
        labels: z.array(z.string()).optional().describe('Labels to associate with the post')
      }),
      handler: (args) => createToolHandler('create_post', () => {
        return bloggerService.createPost(args.blogId, {
          title: args.title,
          content: args.content,
          labels: args.labels
        }).then(post => ({ post }));
      })()
    },
    {
      name: 'update_post',
      description: 'Updates an existing post',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        postId: z.string().describe('Post ID'),
        title: z.string().optional().describe('New post title'),
        content: z.string().optional().describe('New post content'),
        labels: z.array(z.string()).optional().describe('New labels to associate with the post')
      }),
      handler: (args) => createToolHandler('update_post', () => {
        return bloggerService.updatePost(args.blogId, args.postId, {
          title: args.title,
          content: args.content,
          labels: args.labels
        }).then(post => ({ post }));
      })()
    },
    {
      name: 'delete_post',
      description: 'Deletes a post',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        postId: z.string().describe('Post ID')
      }),
      handler: (args) => createToolHandler('delete_post', () => {
        return bloggerService.deletePost(args.blogId, args.postId).then(() => ({ success: true }));
      })()
    },
    {
      name: 'list_labels',
      description: 'Lists all labels from a blog',
      args: z.object({
        blogId: z.string().describe('Blog ID')
      }),
      handler: (args) => createToolHandler('list_labels', () => {
        return bloggerService.listLabels(args.blogId).then(labels => ({ labels: labels.items }));
      })()
    },
    {
      name: 'get_label',
      description: 'Retrieves details of a specific label',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        labelName: z.string().describe('Label name')
      }),
      handler: (args) => createToolHandler('get_label', () => {
        return bloggerService.getLabel(args.blogId, args.labelName).then(label => ({ label }));
      })()
    }
  ];
}

export function initMCPServer(bloggerService: BloggerService, config: ServerConfig): McpServer {
  const server = new McpServer({
    name: "Blogger MCP Server",
    version: "1.0.4",
    vendor: "mcproadev"
  });

  const toolDefinitions = createToolDefinitions(bloggerService);

  for (const tool of toolDefinitions) {
    server.tool(tool.name, tool.description, tool.args.shape, tool.handler as never);
  }

  return server;
}
