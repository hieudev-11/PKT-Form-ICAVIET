import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const POOL_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000,
};

// Pool 1: Auth DB – icawikic_icawiki_v2
const poolAuth = mysql.createPool({ ...POOL_CONFIG, database: process.env.DB_NAME });
poolAuth.on('connection', conn => conn.query("SET NAMES 'utf8mb4'"));

// Pool 2: Form DB – icawikic_icaholding
const poolForm = mysql.createPool({ ...POOL_CONFIG, database: process.env.DB_NAME_FORM });

// Pool 3: Checker DB – icawikic_pkt (cùng host 103.200.23.236)
const poolChecker = mysql.createPool({ ...POOL_CONFIG, database: process.env.DB_NAME_PKT });
poolChecker.on('connection', conn => conn.query("SET NAMES 'utf8mb4'"));

/**
 * Tự động retry khi mất kết nối MySQL (PROTOCOL_CONNECTION_LOST, ETIMEDOUT).
 * Thử tối đa `maxRetries` lần, mỗi lần chờ `delayMs` ms.
 */
export async function queryWithRetry(pool, sql, params = [], maxRetries = 3, delayMs = 800) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      lastErr = err;
      const isRecoverable = ['PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ECONNRESET', 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'].includes(err.code);
      if (isRecoverable && attempt < maxRetries) {
        console.warn(`[DB] Mất kết nối (${err.code}), thử lại lần ${attempt}/${maxRetries - 1}...`);
        await new Promise(r => setTimeout(r, delayMs * attempt));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

export default poolAuth;
export { poolAuth, poolForm, poolChecker };
