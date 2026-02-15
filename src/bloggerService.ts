import { google, blogger_v3 } from 'googleapis';
import { BloggerBlog, BloggerPost, BloggerLabel } from './types';
import { config } from './config';

/**
 * Custom types to compensate for Blogger API limitations
 */
interface BloggerLabelList {
  kind?: string;
  items?: BloggerLabel[];
}

/**
 * Google Blogger API interaction service
 * 
 * Supports two authentication modes:
 * - OAuth2 (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN):
 *   full access (read + write). Required for listBlogs, createPost, updatePost, deletePost.
 * - API Key (BLOGGER_API_KEY): read-only access to public blogs.
 *   Works for getBlog, listPosts, getPost, searchPosts, listLabels, getLabel.
 * 
 * If both are configured, OAuth2 is used (it covers all operations).
 */
export class BloggerService {
  private blogger: blogger_v3.Blogger;
  private readonly isOAuth2: boolean;

  /**
   * Initializes the Blogger service with OAuth2 or API key
   */
  constructor() {
    const { oauth2 } = config;
    const hasOAuth2 = !!(oauth2.clientId && oauth2.clientSecret && oauth2.refreshToken);

    if (hasOAuth2) {
      const oauth2Client = new google.auth.OAuth2(
        oauth2.clientId,
        oauth2.clientSecret
      );
      oauth2Client.setCredentials({ refresh_token: oauth2.refreshToken });

      this.blogger = google.blogger({
        version: 'v3',
        auth: oauth2Client,
        timeout: config.blogger.timeout
      });
      this.isOAuth2 = true;
      console.log('BloggerService initialized with OAuth2 (full access)');
    } else if (config.blogger.apiKey) {
      this.blogger = google.blogger({
        version: 'v3',
        auth: config.blogger.apiKey,
        timeout: config.blogger.timeout
      });
      this.isOAuth2 = false;
      console.log('BloggerService initialized with API Key (read-only)');
    } else {
      throw new Error(
        'No authentication configured. ' +
        'Set BLOGGER_API_KEY (read-only) or ' +
        'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN (full access).'
      );
    }
  }

  /**
   * Checks that OAuth2 authentication is available.
   * Throws an explicit error if the operation requires OAuth2 and we are in API key mode.
   */
  private requireOAuth2(operation: string): void {
    if (!this.isOAuth2) {
      throw new Error(
        `Operation "${operation}" requires OAuth2 authentication. ` +
        'API Key mode only allows reading public blogs. ' +
        'Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN.'
      );
    }
  }

  /**
   * Lists all blogs for the authenticated user.
   * Requires OAuth2 (blogs.listByUser with userId: 'self').
   * @returns Blog list
   */
  async listBlogs(): Promise<blogger_v3.Schema$BlogList> {
    this.requireOAuth2('list_blogs');
    try {
      const response = await this.blogger.blogs.listByUser({
        userId: 'self'
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching blogs:', error);
      throw error;
    }
  }

  /**
   * Retrieves details of a specific blog
   * @param blogId ID of the blog to retrieve
   * @returns Blog details
   */
  async getBlog(blogId: string): Promise<blogger_v3.Schema$Blog> {
    try {
      const response = await this.blogger.blogs.get({
        blogId
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching blog ${blogId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a blog by its URL
   * @param url Blog URL
   * @returns Blog details
   */
  async getBlogByUrl(url: string): Promise<blogger_v3.Schema$Blog> {
    try {
      const response = await this.blogger.blogs.getByUrl({
        url
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching blog by URL ${url}:`, error);
      throw error;
    }
  }

  /**
   * Simulates blog creation.
   * Note: The Blogger API does not actually allow creating a blog via API.
   * This method simulates the functionality and returns an explanatory error message.
   * 
   * @param blogData Blog data to create
   * @returns Explanatory error message
   */
  async createBlog(blogData: Partial<BloggerBlog>): Promise<any> {
    // Simulate a delay to make the response more realistic
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return an explanatory error message
    return {
      error: true,
      message: "The Google Blogger API does not allow creating a new blog via API. Please create a blog manually on blogger.com.",
      details: "This limitation is documented by Google. Blogs must be created via the Blogger web interface.",
      suggestedAction: "Create a blog at https://www.blogger.com, then use its ID with this MCP server."
    };
  }

  /**
   * Lists posts from a blog
   * @param blogId Blog ID
   * @param maxResults Maximum number of results to return
   * @returns Post list
   */
  async listPosts(blogId: string, maxResults?: number): Promise<blogger_v3.Schema$PostList> {
    try {
      const response = await this.blogger.posts.list({
        blogId,
        maxResults: maxResults || config.blogger.maxResults
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching posts for blog ${blogId}:`, error);
      throw error;
    }
  }

  /**
   * Searches posts in a blog using the native posts.search endpoint of the Blogger API
   * @param blogId Blog ID
   * @param query Search term
   * @param maxResults Maximum number of results to return
   * @returns List of matching posts
   */
  async searchPosts(blogId: string, query: string, maxResults?: number): Promise<blogger_v3.Schema$PostList> {
    try {
      const response = await this.blogger.posts.search({
        blogId,
        q: query,
        fetchBodies: true
      });

      // The search endpoint does not support maxResults directly,
      // so we truncate client-side if needed
      const items = response.data.items || [];
      const limit = maxResults || config.blogger.maxResults;

      return {
        kind: response.data.kind,
        items: items.slice(0, limit)
      };
    } catch (error) {
      console.error(`Error searching posts in blog ${blogId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a specific post
   * @param blogId Blog ID
   * @param postId Post ID
   * @returns Post details
   */
  async getPost(blogId: string, postId: string): Promise<blogger_v3.Schema$Post> {
    try {
      const response = await this.blogger.posts.get({
        blogId,
        postId
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Creates a new post in a blog.
   * Requires OAuth2.
   * @param blogId Blog ID
   * @param postData Post data to create
   * @returns Created post
   */
  async createPost(blogId: string, postData: Partial<BloggerPost>): Promise<blogger_v3.Schema$Post> {
    this.requireOAuth2('create_post');
    try {
      const response = await this.blogger.posts.insert({
        blogId,
        requestBody: postData as blogger_v3.Schema$Post
      });
      return response.data;
    } catch (error) {
      console.error(`Error creating post in blog ${blogId}:`, error);
      throw error;
    }
  }

  /**
   * Updates an existing post.
   * Requires OAuth2.
   * @param blogId Blog ID
   * @param postId Post ID
   * @param postData Post data to update
   * @returns Updated post
   */
  async updatePost(blogId: string, postId: string, postData: Partial<BloggerPost>): Promise<blogger_v3.Schema$Post> {
    this.requireOAuth2('update_post');
    try {
      // Convert types to avoid compilation errors
      const requestBody: blogger_v3.Schema$Post = {
        title: postData.title,
        content: postData.content,
        labels: postData.labels
      };
      
      const response = await this.blogger.posts.update({
        blogId,
        postId,
        requestBody
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a post.
   * Requires OAuth2.
   * @param blogId Blog ID
   * @param postId Post ID
   * @returns Deletion status
   */
  async deletePost(blogId: string, postId: string): Promise<void> {
    this.requireOAuth2('delete_post');
    try {
      await this.blogger.posts.delete({
        blogId,
        postId
      });
    } catch (error) {
      console.error(`Error deleting post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Lists labels from a blog
   * @param blogId Blog ID
   * @returns Label list
   */
  async listLabels(blogId: string): Promise<BloggerLabelList> {
    try {
      // The Blogger API does not provide a direct endpoint to list labels
      // We fetch all posts and extract unique labels
      const response = await this.blogger.posts.list({
        blogId,
        maxResults: 50 // Fetch enough posts to extract labels
      });
      
      const posts = response.data.items || [];
      const labelSet = new Set<string>();
      
      // Extract all unique labels from posts
      posts.forEach(post => {
        const postLabels = post.labels || [];
        postLabels.forEach(label => labelSet.add(label));
      });
      
      // Convert to expected format
      const labels = Array.from(labelSet).map(name => ({ name }));
      
      return {
        kind: 'blogger#labelList',
        items: labels
      };
    } catch (error) {
      console.error(`Error fetching labels for blog ${blogId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a specific label
   * @param blogId Blog ID
   * @param labelName Label name
   * @returns Label details
   */
  async getLabel(blogId: string, labelName: string): Promise<BloggerLabel> {
    try {
      // The Blogger API does not provide a direct endpoint to retrieve a label
      // We check if the label exists by listing all labels
      const labels = await this.listLabels(blogId);
      const label = labels.items?.find(l => l.name === labelName);
      
      if (!label) {
        throw new Error(`Label ${labelName} not found`);
      }
      
      return label;
    } catch (error) {
      console.error(`Error fetching label ${labelName}:`, error);
      throw error;
    }
  }
}
