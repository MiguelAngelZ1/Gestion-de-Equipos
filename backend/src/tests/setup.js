const path = require('path');
const fs = require('fs');

process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars';
process.env.ADMIN_PASSWORD = 'test-admin-pw';
process.env.NODE_ENV = 'test';
process.env.TEST = 'true';

const dbPath = path.resolve(__dirname, '../../test-data/test.db');
process.env.DB_PATH = dbPath;

const testDir = path.dirname(dbPath);
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}
