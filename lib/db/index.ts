import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

// 连接池（在 Next.js 中复用，避免每次请求新建连接）
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  waitForConnections: true,
  connectionLimit: 10,
})

export const db = drizzle(pool, { schema, mode: 'default' })
