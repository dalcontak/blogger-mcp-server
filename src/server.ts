import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ServerConfig, BloggerBlog, BloggerPost, BloggerLabel } from './types';
import { BloggerService } from './bloggerService';
import { z } from 'zod';

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

  // Tool to list blogs
  server.tool('list_blogs', 'Lists all accessible blogs', {}, 
    async (_args, _extra) => {
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
  );

  // Tool to get blog details
  server.tool('get_blog', 'Retrieves details of a specific blog', 
    {
      blogId: z.string().describe('Blog ID')
    },
    async (args, _extra) => {
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
  );

  // Tool to create a new blog (not supported by the Blogger API)
  server.tool('create_blog', 'Creates a new blog (not supported by the Blogger API)',
    {
      name: z.string().describe('Blog name'),
      description: z.string().optional().describe('Blog description')
    },
    async (_args, _extra) => {
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
  );

  // Tool to list posts from a blog
  server.tool('list_posts', 'Lists all posts from a blog',
    {
      blogId: z.string().describe('Blog ID'),
      maxResults: z.number().optional().describe('Maximum number of results to return')
    },
    async (args, _extra) => {
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
  );

  // Tool to search posts
  server.tool('search_posts', 'Searches posts in a blog',
    {
      blogId: z.string().describe('Blog ID'),
      query: z.string().describe('Search term'),
      maxResults: z.number().optional().describe('Maximum number of results to return')
    },
    async (args, _extra) => {
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
  );

  // Tool to get post details
  server.tool('get_post', 'Retrieves details of a specific post',
    {
      blogId: z.string().describe('Blog ID'),
      postId: z.string().describe('Post ID')
    },
    async (args, _extra) => {
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
  );

  // Tool to create a new post
  server.tool('create_post', 'Creates a new post in a blog',
    {
      blogId: z.string().describe('Blog ID'),
      title: z.string().describe('Post title'),
      content: z.string().describe('Post content'),
      labels: z.array(z.string()).optional().describe('Labels to associate with the post')
    },
    async (args, _extra) => {
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
  );

  // Tool to update an existing post
  server.tool('update_post', 'Updates an existing post',
    {
      blogId: z.string().describe('Blog ID'),
      postId: z.string().describe('Post ID'),
      title: z.string().optional().describe('New post title'),
      content: z.string().optional().describe('New post content'),
      labels: z.array(z.string()).optional().describe('New labels to associate with the post')
    },
    async (args, _extra) => {
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
  );

  // Tool to delete a post
  server.tool('delete_post', 'Deletes a post',
    {
      blogId: z.string().describe('Blog ID'),
      postId: z.string().describe('Post ID')
    },
    async (args, _extra) => {
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
  );

  // Tool to list labels from a blog
  server.tool('list_labels', 'Lists all labels from a blog',
    {
      blogId: z.string().describe('Blog ID')
    },
    async (args, _extra) => {
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
  );

  // Tool to get label details
  server.tool('get_label', 'Retrieves details of a specific label',
    {
      blogId: z.string().describe('Blog ID'),
      labelName: z.string().describe('Label name')
    },
    async (args, _extra) => {
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
  );

  return server;
}
