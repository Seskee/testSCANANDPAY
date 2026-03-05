// server/config/database.js
// Kreira singleton PostgresDatabase instancu i eksportira je

const { PostgresDatabase } = require('../database/database.impl');

let db = null;

const connectDB = async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL nije postavljen u .env datoteci!');
    }

    db = new PostgresDatabase(connectionString);

    const health = await db.healthCheck();
    if (!health.healthy) {
      throw new Error(`Baza nije dostupna: ${health.message}`);
    }

    console.log('✅ PostgreSQL baza spojena');
    console.log('✅ Connection pool inicijaliziran (max: 20 konekcija)');
    return db;
  } catch (error) {
    console.error('❌ Greška pri spajanju na PostgreSQL bazu:', error.message);
    console.error('   Provjeri DATABASE_URL u .env datoteci i da li PostgreSQL radi.');
    process.exit(1);
  }
};

// Vraća db instancu — koristi se u svim servisima
const getDB = () => {
  if (!db) throw new Error('Baza nije inicijalizirana! connectDB() mora biti pozvan prvi.');
  return db;
};

// Vraća raw pool — za slučaj da treba direktni pristup
const getPool = () => {
  if (!db) throw new Error('Baza nije inicijalizirana!');
  return db.pool;
};

const closeDB = async () => {
  if (db) {
    await db.close();
    db = null;
  }
};

module.exports = { connectDB, getDB, getPool, closeDB };
