const { Pool } = require('pg');

const pool = new Pool({
  user: 'adminavo',
  host: 'avo-adb-001.postgres.database.azure.com',
  database: 'web_app_competitor',
  password: '$#fKcdXPg4@ue8AW',
  port: 5432, // Default PostgreSQL port
  ssl:true
});

module.exports = pool;
