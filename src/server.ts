import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ServerConfig, ToolDefinition } from './types';
import { BloggerService } from './bloggerService';
import { z } from 'zod';

/**
 * Creates the tool definitions for the Blogger MCP server
 * @param bloggerService Blogger service to interact with the API
 * @returns Array of tool definitions
 */
export function createToolDefinitions(bloggerService: BloggerService): ToolDefinition[] {
  return [
    {
      name: 'list_blogs',
      description: 'Lists all accessible blogs',
      args: z.object({}),
      handler: async (_args, _extra) => {
        try {
          const blogs = await bloggerService.listBlogs();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ blogs }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error('Error fetching blogs:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching blogs: ${error}`
              }
            ],
            isError: true
          };
        }
      }
    },
    {
      name: 'get_blog',
      description: 'Retrieves details of a specific blog',
      args: z.object({
        blogId: z.string().describe('Blog ID')
      }),
      handler: async (args, _extra) => {
        try {
          const blog = await bloggerService.getBlog(args.blogId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ blog }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error fetching blog ${args.blogId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching blog: ${error}`
              }
            ],
            isError: true
          };
        }
      }
    },
    {
      name: 'create_blog',
      description: 'Creates a new blog (not supported by the Blogger API)',
      args: z.object({
        name: z.string().describe('Blog name'),
        description: z.string().optional().describe('Blog description')
      }),
      handler: async (_args, _extra) => {
        return {
          content: [
            {
              type: 'text',
              text: 'Blog creation is not supported by the Blogger API. Please create a blog via the Blogger web interface.'
            }
          ],
          isError: true
        };
      }
    },
    {
      name: 'list_posts',
      description: 'Lists all posts from a blog',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        maxResults: z.number().optional().describe('Maximum number of results to return')
      }),
      handler: async (args, _extra) => {
        try {
          const posts = await bloggerService.listPosts(args.blogId, args.maxResults);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ posts }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error fetching posts for blog ${args.blogId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching posts: ${error}`
              }
            ],
            isError: true
          };
        }
      }
    },
    {
      name: 'search_posts',
      description: 'Searches posts in a blog',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        query: z.string().describe('Search term'),
        maxResults: z.number().optional().describe('Maximum number of results to return')
      }),
      handler: async (args, _extra) => {
        try {
          const posts = await bloggerService.searchPosts(args.blogId, args.query, args.maxResults);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ posts }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error searching posts in blog ${args.blogId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: `Error searching posts: ${error}`
              }
            ],
            isError: true
          };
        }
      }
    },
    {
      name: 'get_post',
      description: 'Retrieves details of a specific post',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        postId: z.string().describe('Post ID')
      }),
      handler: async (args, _extra) => {
        try {
          const post = await bloggerService.getPost(args.blogId, args.postId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ post }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error fetching post ${args.postId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching post: ${error}`
              }
            ],
            isError: true
          };
        }
      }
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
      handler: async (args, _extra) => {
        try {
          const post = await bloggerService.createPost(args.blogId, { 
            title: args.title, 
            content: args.content, 
            labels: args.labels 
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ post }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error creating post in blog ${args.blogId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: `Error creating post: ${error}`
              }
            ],
            isError: true
          };
        }
      }
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
      handler: async (args, _extra) => {
        try {
          const post = await bloggerService.updatePost(args.blogId, args.postId, { 
            title: args.title, 
            content: args.content, 
            labels: args.labels 
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ post }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error updating post ${args.postId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: `Error updating post: ${error}`
              }
            ],
            isError: true
          };
        }
      }
    },
    {
      name: 'delete_post',
      description: 'Deletes a post',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        postId: z.string().describe('Post ID')
      }),
      handler: async (args, _extra) => {
        try {
          await bloggerService.deletePost(args.blogId, args.postId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error deleting post ${args.postId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: `Error deleting post: ${error}`
              }
            ],
            isError: true
          };
        }
      }
    },
    {
      name: 'list_labels',
      description: 'Lists all labels from a blog',
      args: z.object({
        blogId: z.string().describe('Blog ID')
      }),
      handler: async (args, _extra) => {
        try {
          const labels = await bloggerService.listLabels(args.blogId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ labels }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error fetching labels for blog ${args.blogId}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching labels: ${error}`
              }
            ],
            isError: true
          };
        }
      }
    },
    {
      name: 'get_label',
      description: 'Retrieves details of a specific label',
      args: z.object({
        blogId: z.string().describe('Blog ID'),
        labelName: z.string().describe('Label name')
      }),
      handler: async (args, _extra) => {
        try {
          const label = await bloggerService.getLabel(args.blogId, args.labelName);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ label }, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Error fetching label ${args.labelName}:`, error);
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching label: ${error}`
              }
            ],
            isError: true
          };
        }
      }
    }
  ];
}

/**
 * Initializes the MCP server with all Blogger tools
 * @param bloggerService Blogger service to interact with the API
 * @param config Server configuration
 * @returns MCP server instance
 */
export function initMCPServer(bloggerService: BloggerService, config: ServerConfig): McpServer {
  // Create a new MCP server instance with server information
  const server = new McpServer({
    name: "Blogger MCP Server",
    version: "1.0.4",
    vendor: "mcproadev"
  });

  // Get all tool definitions
  const toolDefinitions = createToolDefinitions(bloggerService);

  // Register each tool with the MCP server
  for (const tool of toolDefinitions) {
    // We can't directly pass the schema object if it's already a Zod object in our definition,
    // The MCP SDK expects the shape, not the Zod object itself for the 'args' parameter in server.tool()
    // However, looking at the previous code:
    // server.tool('name', 'desc', { param: z.string() }, handler)
    // The previous code passed an object with Zod schemas as values.
    // Our ToolDefinition.args is a z.ZodType<any>, which is likely a z.object({...}).
    // We need to extract the shape from the z.object to pass it to server.tool if we want to match the signature.
    
    // Actually, looking at the SDK, server.tool takes:
    // name: string, description: string, args: ToolArgs, handler: ToolCallback
    // where ToolArgs is Record<string, ZodType<any>>
    
    // So my ToolDefinition.args should probably be Record<string, ZodType<any>> instead of z.ZodType<any> 
    // to make it easier to spread.
    
    // Let's adjust the implementation in the loop.
    // Since I defined args as z.ZodType<any> (which is z.object({...})), I can cast it or access .shape if it's a ZodObject.
    
    if (tool.args instanceof z.ZodObject) {
       server.tool(tool.name, tool.description, tool.args.shape, tool.handler);
    } else {
       // Fallback for empty objects or other schemas if we had them (list_blogs has empty object)
       // If it's not a ZodObject, we might have issues if the SDK expects a shape map.
       // list_blogs used {} which is compatible with Record<string, ZodType>
       server.tool(tool.name, tool.description, {}, tool.handler);
    }
  }

  return server;
}
