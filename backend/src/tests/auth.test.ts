const request = require('supertest');
const { app } = require('../../app');
const { ensureTestSetup } = require('./helpers');

beforeAll(async () => {
  await ensureTestSetup();
});

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('deberia retornar 200 con credenciales validas y setear cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'testadmin', password: 'testpass123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.usuario).toBe('testadmin');
      expect(res.body.user.rol).toBe('admin');
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.startsWith('token='))).toBe(true);
    });

    it('deberia retornar 401 con password incorrecto', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'testadmin', password: 'wrongpass' })
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    it('deberia retornar 400 con campos vacios', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ usuario: '', password: '' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('deberia retornar 400 sin campos', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('deberia retornar 200 con cookie valida', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/auth/login')
        .send({ usuario: 'testadmin', password: 'testpass123' })
        .expect(200);

      const res = await agent
        .get('/api/auth/me')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.user.usuario).toBe('testadmin');
    });

    it('deberia retornar 401 sin cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('deberia retornar 200', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/auth/login')
        .send({ usuario: 'testadmin', password: 'testpass123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/logout')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
