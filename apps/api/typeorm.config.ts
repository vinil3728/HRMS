/// <reference types="node" />

import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'],
  port: Number(process.env['DB_PORT']),
  username: process.env['DB_USERNAME'],
  password: process.env['DB_PASSWORD'],
  database: process.env['DB_NAME'],
  entities: ['apps/api/src/**/*.entity.ts'],
  migrations: ['apps/api/src/database-migrations/*.ts'],
});