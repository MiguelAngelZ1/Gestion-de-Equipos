const request = require('supertest');
const { app } = require('../../app');
const { ensureTestSetup } = require('./helpers');

beforeAll(async () => {
  await ensureTestSetup();
});

describe('Equipos API', () => {
  describe('GET /api/equipos', () => {
    it('deberia retornar 401 sin autenticacion', async () => {
      const res = await request(app)
        .get('/api/equipos')
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    it('deberia retornar 200 con autenticacion', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/auth/login')
        .send({ usuario: 'testadmin', password: 'testpass123' })
        .expect(200);

      const res = await agent
        .get('/api/equipos')
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/equipos/:id', () => {
    it('deberia retornar 404 con id valido pero inexistente', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/auth/login')
        .send({ usuario: 'testadmin', password: 'testpass123' })
        .expect(200);

      await agent
        .get('/api/equipos/nonexistent-id')
        .expect(404);
    });

    it('deberia retornar 401 sin autenticacion', async () => {
      await request(app)
        .get('/api/equipos/some-id')
        .expect(401);
    });
  });
});
