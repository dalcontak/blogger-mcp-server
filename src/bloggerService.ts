import { google, blogger_v3 } from 'googleapis';
import { BloggerBlog, BloggerPost, BloggerLabel } from './types';
import { config } from './config';

/**
 * Types personnalisés pour compenser les limitations de l'API Blogger
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
      console.error('Erreur lors de la récupération des blogs:', error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un blog spécifique
   * @param blogId ID du blog à récupérer
   * @returns Détails du blog
   */
  async getBlog(blogId: string): Promise<blogger_v3.Schema$Blog> {
    try {
      const response = await this.blogger.blogs.get({
        blogId
      });
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du blog ${blogId}:`, error);
      throw error;
    }
  }

  /**
   * Simule la création d'un nouveau blog
   * Note: L'API Blogger ne permet pas réellement de créer un blog via API
   * Cette méthode simule la fonctionnalité et retourne un message d'erreur explicatif
   * 
   * @param blogData Données du blog à créer
   * @returns Message d'erreur explicatif
   */
  async createBlog(blogData: Partial<BloggerBlog>): Promise<any> {
    // Simuler un délai pour rendre la réponse plus réaliste
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Retourner un message d'erreur explicatif
    return {
      error: true,
      message: "L'API Blogger de Google ne permet pas de créer un nouveau blog via API. Veuillez créer un blog manuellement sur blogger.com.",
      details: "Cette limitation est documentée par Google. Les blogs doivent être créés via l'interface web de Blogger.",
      suggestedAction: "Créez un blog sur https://www.blogger.com, puis utilisez son ID avec ce serveur MCP."
    };
  }

  /**
   * Liste les posts d'un blog
   * @param blogId ID du blog
   * @param maxResults Nombre maximum de résultats à retourner
   * @returns Liste des posts
   */
  async listPosts(blogId: string, maxResults?: number): Promise<blogger_v3.Schema$PostList> {
    try {
      const response = await this.blogger.posts.list({
        blogId,
        maxResults: maxResults || config.blogger.maxResults
      });
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des posts du blog ${blogId}:`, error);
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
      console.error(`Erreur lors de la recherche de posts dans le blog ${blogId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère un post spécifique
   * @param blogId ID du blog
   * @param postId ID du post
   * @returns Détails du post
   */
  async getPost(blogId: string, postId: string): Promise<blogger_v3.Schema$Post> {
    try {
      const response = await this.blogger.posts.get({
        blogId,
        postId
      });
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du post ${postId}:`, error);
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
      console.error(`Erreur lors de la création du post dans le blog ${blogId}:`, error);
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
      // Convertir les types pour éviter les erreurs de compilation
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
      console.error(`Erreur lors de la mise à jour du post ${postId}:`, error);
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
      console.error(`Erreur lors de la suppression du post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Liste les labels d'un blog
   * @param blogId ID du blog
   * @returns Liste des labels
   */
  async listLabels(blogId: string): Promise<BloggerLabelList> {
    try {
      // L'API Blogger ne fournit pas d'endpoint direct pour lister les labels
      // Nous allons récupérer tous les posts et extraire les labels uniques
      const response = await this.blogger.posts.list({
        blogId,
        maxResults: 50 // Récupérer un nombre suffisant de posts pour extraire les labels
      });
      
      const posts = response.data.items || [];
      const labelSet = new Set<string>();
      
      // Extraire tous les labels uniques des posts
      posts.forEach(post => {
        const postLabels = post.labels || [];
        postLabels.forEach(label => labelSet.add(label));
      });
      
      // Convertir en format attendu
      const labels = Array.from(labelSet).map(name => ({ name }));
      
      return {
        kind: 'blogger#labelList',
        items: labels
      };
    } catch (error) {
      console.error(`Erreur lors de la récupération des labels du blog ${blogId}:`, error);
      throw error;
    }
  }

  /**
   * Récupère un label spécifique
   * @param blogId ID du blog
   * @param labelName Nom du label
   * @returns Détails du label
   */
  async getLabel(blogId: string, labelName: string): Promise<BloggerLabel> {
    try {
      // L'API Blogger ne fournit pas d'endpoint direct pour récupérer un label
      // Nous allons vérifier si le label existe en listant les labels
      const labels = await this.listLabels(blogId);
      const label = labels.items?.find(l => l.name === labelName);
      
      if (!label) {
        throw new Error(`Label ${labelName} non trouvé`);
      }
      
      return label;
    } catch (error) {
      console.error(`Erreur lors de la récupération du label ${labelName}:`, error);
      throw error;
    }
  }
}
