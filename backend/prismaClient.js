const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Prisma para JS espera booleanos reales (true/false) incluso en SQLite
const IS_DELETED_VAL = false;
const FALSE_VAL = false;
const TRUE_VAL = true;

prisma.IS_DELETED_VAL = IS_DELETED_VAL;
prisma.FALSE_VAL = FALSE_VAL;
prisma.TRUE_VAL = TRUE_VAL;

module.exports = prisma;
