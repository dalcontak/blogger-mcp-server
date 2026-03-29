function loadConfig(env: Record<string, string>) {
  const keys = [
    'MCP_MODE', 'MCP_HTTP_HOST', 'MCP_HTTP_PORT',
    'BLOGGER_API_KEY', 'BLOGGER_MAX_RESULTS', 'BLOGGER_API_TIMEOUT',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN',
    'LOG_LEVEL', 'UI_PORT'
  ];
  for (const key of keys) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: any;
  jest.isolateModules(() => {
    config = require('./config').config;
  });
  return config;
}

beforeEach(() => {
  jest.resetModules();
});

describe('config.ts', () => {

  describe('defaults', () => {
    it('should use default values when no env vars are set', () => {
      const config = loadConfig({});

      expect(config.mode).toBe('stdio');
      expect(config.http.host).toBe('0.0.0.0');
      expect(config.http.port).toBe(3000);
      expect(config.blogger.apiKey).toBeUndefined();
      expect(config.blogger.maxResults).toBe(10);
      expect(config.blogger.timeout).toBe(30000);
      expect(config.oauth2.clientId).toBeUndefined();
      expect(config.oauth2.clientSecret).toBeUndefined();
      expect(config.oauth2.refreshToken).toBeUndefined();
      expect(config.logging.level).toBe('info');
      expect(config.ui.port).toBe(0);
    });
  });

  describe('mode', () => {
    it('should read MCP_MODE from env', () => {
      const config = loadConfig({ MCP_MODE: 'http' });
      expect(config.mode).toBe('http');
    });
  });

  describe('http', () => {
    it('should read host and port from env', () => {
      const config = loadConfig({ MCP_HTTP_HOST: '127.0.0.1', MCP_HTTP_PORT: '8080' });
      expect(config.http.host).toBe('127.0.0.1');
      expect(config.http.port).toBe(8080);
    });
  });

  describe('safeInt (NaN protection)', () => {
    it('should return default for non-numeric port', () => {
      const config = loadConfig({ MCP_HTTP_PORT: 'abc' });
      expect(config.http.port).toBe(3000);
    });

    it('should return default for non-numeric maxResults', () => {
      const config = loadConfig({ BLOGGER_MAX_RESULTS: 'notanumber' });
      expect(config.blogger.maxResults).toBe(10);
    });

    it('should return default for non-numeric timeout', () => {
      const config = loadConfig({ BLOGGER_API_TIMEOUT: 'xyz' });
      expect(config.blogger.timeout).toBe(30000);
    });
  });

  describe('blogger', () => {
    it('should read API key from env', () => {
      const config = loadConfig({ BLOGGER_API_KEY: 'test-key-123' });
      expect(config.blogger.apiKey).toBe('test-key-123');
    });

    it('should parse maxResults and timeout as integers', () => {
      const config = loadConfig({ BLOGGER_MAX_RESULTS: '25', BLOGGER_API_TIMEOUT: '60000' });
      expect(config.blogger.maxResults).toBe(25);
      expect(config.blogger.timeout).toBe(60000);
    });
  });

  describe('oauth2', () => {
    it('should read all OAuth2 vars from env', () => {
      const config = loadConfig({
        GOOGLE_CLIENT_ID: 'cid',
        GOOGLE_CLIENT_SECRET: 'csec',
        GOOGLE_REFRESH_TOKEN: 'rtok'
      });
      expect(config.oauth2.clientId).toBe('cid');
      expect(config.oauth2.clientSecret).toBe('csec');
      expect(config.oauth2.refreshToken).toBe('rtok');
    });

    it('should leave oauth2 fields undefined when partially set', () => {
      const config = loadConfig({ GOOGLE_CLIENT_ID: 'cid' });
      expect(config.oauth2.clientId).toBe('cid');
      expect(config.oauth2.clientSecret).toBeUndefined();
      expect(config.oauth2.refreshToken).toBeUndefined();
    });
  });

  describe('logging', () => {
    it('should read LOG_LEVEL from env', () => {
      const config = loadConfig({ LOG_LEVEL: 'debug' });
      expect(config.logging.level).toBe('debug');
    });
  });

  describe('ui', () => {
    it('should default to port 0 (disabled)', () => {
      const config = loadConfig({});
      expect(config.ui.port).toBe(0);
    });

    it('should read UI_PORT from env', () => {
      const config = loadConfig({ UI_PORT: '4000' });
      expect(config.ui.port).toBe(4000);
    });

    it('should return default 0 for non-numeric UI_PORT', () => {
      const config = loadConfig({ UI_PORT: 'abc' });
      expect(config.ui.port).toBe(0);
    });
  });
});
