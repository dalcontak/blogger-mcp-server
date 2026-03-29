import { google, blogger_v3 } from 'googleapis';
import { BloggerPost } from './types';
import { config } from './config';

interface BloggerLabelList {
  kind?: string;
  items?: Array<{ name: string }>;
}

export class BloggerService {
  private blogger: blogger_v3.Blogger;
  private readonly isOAuth2: boolean;

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

  private requireOAuth2(operation: string): void {
    if (!this.isOAuth2) {
      throw new Error(
        `Operation "${operation}" requires OAuth2 authentication. ` +
        'API Key mode only allows reading public blogs. ' +
        'Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN.'
      );
    }
  }

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

  async getBlog(blogId: string): Promise<blogger_v3.Schema$Blog> {
    try {
      const response = await this.blogger.blogs.get({ blogId });
      return response.data;
    } catch (error) {
      console.error(`Error fetching blog ${blogId}:`, error);
      throw error;
    }
  }

  async getBlogByUrl(url: string): Promise<blogger_v3.Schema$Blog> {
    try {
      const response = await this.blogger.blogs.getByUrl({ url });
      return response.data;
    } catch (error) {
      console.error(`Error fetching blog by URL ${url}:`, error);
      throw error;
    }
  }

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

  async searchPosts(blogId: string, query: string, maxResults?: number): Promise<blogger_v3.Schema$PostList> {
    try {
      const response = await this.blogger.posts.search({
        blogId,
        q: query,
        fetchBodies: true
      });

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

  async getPost(blogId: string, postId: string): Promise<blogger_v3.Schema$Post> {
    try {
      const response = await this.blogger.posts.get({ blogId, postId });
      return response.data;
    } catch (error) {
      console.error(`Error fetching post ${postId}:`, error);
      throw error;
    }
  }

  async createPost(blogId: string, postData: Partial<BloggerPost>): Promise<blogger_v3.Schema$Post> {
    this.requireOAuth2('create_post');
    try {
      const requestBody: blogger_v3.Schema$Post = {
        title: postData.title ?? undefined,
        content: postData.content ?? undefined,
        labels: postData.labels ?? undefined
      };
      const response = await this.blogger.posts.insert({ blogId, requestBody });
      return response.data;
    } catch (error) {
      console.error(`Error creating post in blog ${blogId}:`, error);
      throw error;
    }
  }

  async updatePost(blogId: string, postId: string, postData: Partial<BloggerPost>): Promise<blogger_v3.Schema$Post> {
    this.requireOAuth2('update_post');
    try {
      const requestBody: blogger_v3.Schema$Post = {
        title: postData.title ?? undefined,
        content: postData.content ?? undefined,
        labels: postData.labels ?? undefined
      };
      const response = await this.blogger.posts.update({ blogId, postId, requestBody });
      return response.data;
    } catch (error) {
      console.error(`Error updating post ${postId}:`, error);
      throw error;
    }
  }

  async deletePost(blogId: string, postId: string): Promise<void> {
    this.requireOAuth2('delete_post');
    try {
      await this.blogger.posts.delete({ blogId, postId });
    } catch (error) {
      console.error(`Error deleting post ${postId}:`, error);
      throw error;
    }
  }

  async listLabels(blogId: string): Promise<BloggerLabelList> {
    try {
      const response = await this.blogger.posts.list({
        blogId,
        maxResults: 50
      });

      const posts = response.data.items || [];
      const labelSet = new Set<string>();

      posts.forEach(post => {
        (post.labels || []).forEach(label => labelSet.add(label));
      });

      const labels = Array.from(labelSet).map(name => ({ name }));

      return { kind: 'blogger#labelList', items: labels };
    } catch (error) {
      console.error(`Error fetching labels for blog ${blogId}:`, error);
      throw error;
    }
  }

  async getLabel(blogId: string, labelName: string): Promise<{ name: string }> {
    try {
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
