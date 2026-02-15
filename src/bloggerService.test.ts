/**
 * Tests for BloggerService
 *
 * We mock 'googleapis' and './config' to test the service logic
 * without making real API calls.
 */

// Mock googleapis before importing anything
const mockBlogsListByUser = jest.fn();
const mockBlogsGet = jest.fn();
const mockBlogsGetByUrl = jest.fn();
const mockPostsList = jest.fn();
const mockPostsSearch = jest.fn();
const mockPostsGet = jest.fn();
const mockPostsInsert = jest.fn();
const mockPostsUpdate = jest.fn();
const mockPostsDelete = jest.fn();
const mockSetCredentials = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(() => ({
        setCredentials: mockSetCredentials
      }))
    },
    blogger: jest.fn(() => ({
      blogs: {
        listByUser: mockBlogsListByUser,
        get: mockBlogsGet,
        getByUrl: mockBlogsGetByUrl
      },
      posts: {
        list: mockPostsList,
        search: mockPostsSearch,
        get: mockPostsGet,
        insert: mockPostsInsert,
        update: mockPostsUpdate,
        delete: mockPostsDelete
      }
    }))
  }
}));

// Mock config type — allows string or undefined for optional fields
interface MockConfig {
  blogger: { apiKey: string | undefined; maxResults: number; timeout: number };
  oauth2: { clientId: string | undefined; clientSecret: string | undefined; refreshToken: string | undefined };
}

const defaultMockConfig: MockConfig = {
  blogger: { apiKey: 'test-api-key', maxResults: 10, timeout: 30000 },
  oauth2: { clientId: undefined, clientSecret: undefined, refreshToken: undefined },
};

let mockConfig: MockConfig = { ...defaultMockConfig };

jest.mock('./config', () => ({
  get config() {
    return mockConfig;
  }
}));

import { BloggerService } from './bloggerService';
import { google } from 'googleapis';

beforeEach(() => {
  jest.clearAllMocks();
  // Suppress console.log/error in tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // Reset to default config
  mockConfig = { ...defaultMockConfig };
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Constructor / Auth ─────────────────────────────────────

describe('BloggerService constructor', () => {

  it('should initialize with API key when only apiKey is set', () => {
    mockConfig = {
      blogger: { apiKey: 'my-key', maxResults: 10, timeout: 30000 },
      oauth2: { clientId: undefined, clientSecret: undefined, refreshToken: undefined },
    };

    const service = new BloggerService();
    expect(google.blogger).toHaveBeenCalledWith(
      expect.objectContaining({ version: 'v3', auth: 'my-key' })
    );
    // isOAuth2 is private — we test it indirectly via requireOAuth2 behavior
    expect(() => (service as any).requireOAuth2('test')).toThrow(/requires OAuth2/);
  });

  it('should initialize with OAuth2 when all OAuth2 vars are set', () => {
    mockConfig = {
      blogger: { apiKey: 'my-key', maxResults: 10, timeout: 30000 },
      oauth2: { clientId: 'cid', clientSecret: 'csec', refreshToken: 'rtok' },
    };

    const service = new BloggerService();
    expect(google.auth.OAuth2).toHaveBeenCalledWith('cid', 'csec');
    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: 'rtok' });
    // Should NOT throw on OAuth2-required operations
    expect(() => (service as any).requireOAuth2('test')).not.toThrow();
  });

  it('should throw when no authentication is configured', () => {
    mockConfig = {
      blogger: { apiKey: undefined, maxResults: 10, timeout: 30000 },
      oauth2: { clientId: undefined, clientSecret: undefined, refreshToken: undefined },
    };

    expect(() => new BloggerService()).toThrow(/No authentication configured/);
  });

  it('should fall back to API key when OAuth2 is partially configured', () => {
    mockConfig = {
      blogger: { apiKey: 'my-key', maxResults: 10, timeout: 30000 },
      oauth2: { clientId: 'cid', clientSecret: undefined, refreshToken: undefined },
    };

    const service = new BloggerService();
    // Should have used API key path, not OAuth2
    expect(google.auth.OAuth2).not.toHaveBeenCalled();
    expect(google.blogger).toHaveBeenCalledWith(
      expect.objectContaining({ auth: 'my-key' })
    );
  });
});

// ─── requireOAuth2 guard ────────────────────────────────────

describe('requireOAuth2 guard', () => {
  let apiKeyService: BloggerService;

  beforeEach(() => {
    mockConfig = {
      blogger: { apiKey: 'key', maxResults: 10, timeout: 30000 },
      oauth2: { clientId: undefined, clientSecret: undefined, refreshToken: undefined },
    };
    apiKeyService = new BloggerService();
  });

  it('should reject listBlogs in API key mode', async () => {
    await expect(apiKeyService.listBlogs()).rejects.toThrow(/requires OAuth2/);
  });

  it('should reject createPost in API key mode', async () => {
    await expect(apiKeyService.createPost('blog1', { title: 'T' })).rejects.toThrow(/requires OAuth2/);
  });

  it('should reject updatePost in API key mode', async () => {
    await expect(apiKeyService.updatePost('blog1', 'post1', { title: 'T' })).rejects.toThrow(/requires OAuth2/);
  });

  it('should reject deletePost in API key mode', async () => {
    await expect(apiKeyService.deletePost('blog1', 'post1')).rejects.toThrow(/requires OAuth2/);
  });
});

// ─── Read operations (API key mode) ────────────────────────

describe('read operations', () => {
  let service: BloggerService;

  beforeEach(() => {
    mockConfig = {
      blogger: { apiKey: 'key', maxResults: 5, timeout: 30000 },
      oauth2: { clientId: undefined, clientSecret: undefined, refreshToken: undefined },
    };
    service = new BloggerService();
  });

  describe('getBlog', () => {
    it('should call blogs.get with the blogId and return data', async () => {
      const mockBlog = { id: '123', name: 'Test Blog' };
      mockBlogsGet.mockResolvedValue({ data: mockBlog });

      const result = await service.getBlog('123');
      expect(mockBlogsGet).toHaveBeenCalledWith({ blogId: '123' });
      expect(result).toEqual(mockBlog);
    });

    it('should propagate API errors', async () => {
      mockBlogsGet.mockRejectedValue(new Error('API error'));
      await expect(service.getBlog('bad')).rejects.toThrow('API error');
    });
  });

  describe('getBlogByUrl', () => {
    it('should call blogs.getByUrl with the URL and return data', async () => {
      const mockBlog = { id: '123', name: 'Test Blog', url: 'https://test.blogspot.com' };
      mockBlogsGetByUrl.mockResolvedValue({ data: mockBlog });

      const result = await service.getBlogByUrl('https://test.blogspot.com');
      expect(mockBlogsGetByUrl).toHaveBeenCalledWith({ url: 'https://test.blogspot.com' });
      expect(result).toEqual(mockBlog);
    });

    it('should propagate API errors', async () => {
      mockBlogsGetByUrl.mockRejectedValue(new Error('Not found'));
      await expect(service.getBlogByUrl('https://bad-url.com')).rejects.toThrow('Not found');
    });
  });

  describe('listPosts', () => {
    it('should call posts.list with blogId and config default maxResults', async () => {
      const mockPosts = { items: [{ id: '1', title: 'Post 1' }] };
      mockPostsList.mockResolvedValue({ data: mockPosts });

      const result = await service.listPosts('blog1');
      expect(mockPostsList).toHaveBeenCalledWith({ blogId: 'blog1', maxResults: 5 });
      expect(result).toEqual(mockPosts);
    });

    it('should use explicit maxResults when provided', async () => {
      mockPostsList.mockResolvedValue({ data: { items: [] } });

      await service.listPosts('blog1', 20);
      expect(mockPostsList).toHaveBeenCalledWith({ blogId: 'blog1', maxResults: 20 });
    });
  });

  describe('searchPosts', () => {
    it('should call posts.search with the query', async () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      mockPostsSearch.mockResolvedValue({ data: { kind: 'blogger#postList', items } });

      const result = await service.searchPosts('blog1', 'typescript');
      expect(mockPostsSearch).toHaveBeenCalledWith({
        blogId: 'blog1', q: 'typescript', fetchBodies: true
      });
      expect(result.items).toHaveLength(3);
    });

    it('should truncate results to maxResults', async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
      mockPostsSearch.mockResolvedValue({ data: { kind: 'blogger#postList', items } });

      // config maxResults is 5
      const result = await service.searchPosts('blog1', 'query');
      expect(result.items).toHaveLength(5);
    });

    it('should use explicit maxResults over config default', async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
      mockPostsSearch.mockResolvedValue({ data: { kind: 'blogger#postList', items } });

      const result = await service.searchPosts('blog1', 'query', 3);
      expect(result.items).toHaveLength(3);
    });

    it('should handle empty results', async () => {
      mockPostsSearch.mockResolvedValue({ data: { kind: 'blogger#postList' } });

      const result = await service.searchPosts('blog1', 'nothing');
      expect(result.items).toHaveLength(0);
    });
  });

  describe('getPost', () => {
    it('should call posts.get with blogId and postId', async () => {
      const mockPost = { id: 'p1', title: 'My Post' };
      mockPostsGet.mockResolvedValue({ data: mockPost });

      const result = await service.getPost('blog1', 'p1');
      expect(mockPostsGet).toHaveBeenCalledWith({ blogId: 'blog1', postId: 'p1' });
      expect(result).toEqual(mockPost);
    });
  });

  describe('listLabels', () => {
    it('should extract unique labels from posts', async () => {
      mockPostsList.mockResolvedValue({
        data: {
          items: [
            { id: '1', labels: ['tech', 'js'] },
            { id: '2', labels: ['tech', 'python'] },
            { id: '3', labels: null },
            { id: '4' } // no labels field
          ]
        }
      });

      const result = await service.listLabels('blog1');
      expect(result.kind).toBe('blogger#labelList');
      const names = result.items!.map(l => l.name).sort();
      expect(names).toEqual(['js', 'python', 'tech']);
    });

    it('should return empty list when no posts exist', async () => {
      mockPostsList.mockResolvedValue({ data: { items: [] } });

      const result = await service.listLabels('blog1');
      expect(result.items).toEqual([]);
    });

    it('should return empty list when posts have no labels', async () => {
      mockPostsList.mockResolvedValue({
        data: { items: [{ id: '1' }, { id: '2' }] }
      });

      const result = await service.listLabels('blog1');
      expect(result.items).toEqual([]);
    });
  });

  describe('getLabel', () => {
    it('should return the label when found', async () => {
      mockPostsList.mockResolvedValue({
        data: { items: [{ id: '1', labels: ['tech', 'js'] }] }
      });

      const result = await service.getLabel('blog1', 'tech');
      expect(result).toEqual({ name: 'tech' });
    });

    it('should throw when label is not found', async () => {
      mockPostsList.mockResolvedValue({
        data: { items: [{ id: '1', labels: ['tech'] }] }
      });

      await expect(service.getLabel('blog1', 'nonexistent')).rejects.toThrow(/not found/);
    });
  });
});

// ─── Write operations (OAuth2 mode) ────────────────────────

describe('write operations (OAuth2)', () => {
  let service: BloggerService;

  beforeEach(() => {
    mockConfig = {
      blogger: { apiKey: 'key', maxResults: 10, timeout: 30000 },
      oauth2: { clientId: 'cid', clientSecret: 'csec', refreshToken: 'rtok' },
    };
    service = new BloggerService();
  });

  describe('listBlogs', () => {
    it('should call blogs.listByUser with self', async () => {
      const mockData = { items: [{ id: 'b1' }] };
      mockBlogsListByUser.mockResolvedValue({ data: mockData });

      const result = await service.listBlogs();
      expect(mockBlogsListByUser).toHaveBeenCalledWith({ userId: 'self' });
      expect(result).toEqual(mockData);
    });
  });

  describe('createPost', () => {
    it('should call posts.insert with correct params', async () => {
      const newPost = { title: 'New', content: '<p>Hello</p>', labels: ['test'] };
      mockPostsInsert.mockResolvedValue({ data: { id: 'p1', ...newPost } });

      const result = await service.createPost('blog1', newPost);
      expect(mockPostsInsert).toHaveBeenCalledWith({
        blogId: 'blog1',
        requestBody: newPost
      });
      expect(result.title).toBe('New');
    });
  });

  describe('updatePost', () => {
    it('should call posts.update with correct params', async () => {
      const updates = { title: 'Updated Title' };
      mockPostsUpdate.mockResolvedValue({ data: { id: 'p1', title: 'Updated Title' } });

      const result = await service.updatePost('blog1', 'p1', updates);
      expect(mockPostsUpdate).toHaveBeenCalledWith({
        blogId: 'blog1',
        postId: 'p1',
        requestBody: expect.objectContaining({ title: 'Updated Title' })
      });
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('deletePost', () => {
    it('should call posts.delete with correct params', async () => {
      mockPostsDelete.mockResolvedValue({});

      await service.deletePost('blog1', 'p1');
      expect(mockPostsDelete).toHaveBeenCalledWith({ blogId: 'blog1', postId: 'p1' });
    });

    it('should propagate API errors', async () => {
      mockPostsDelete.mockRejectedValue(new Error('forbidden'));
      await expect(service.deletePost('blog1', 'p1')).rejects.toThrow('forbidden');
    });
  });
});
