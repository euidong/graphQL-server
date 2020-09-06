// tests/nexus-test-environment.js
const mysql = require('mysql')
const NodeEnvironment = require('jest-environment-node')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const prismaBinary = './node_modules/.bin/prisma'
/**
 * Custom test environment for Nexus, Prisma and MySQL
 */
class PrismaTestEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config)
    // Generate the pg connection string for the test schema
    this.databaseUrl = `mysql://root:1234@localhost:3308/testing`
  }
  async setup() {
    // Set the required environment variable to contain the connection string
    process.env.DATABASE_URL = this.databaseUrl
    this.global.process.env.DATABASE_URL = this.databaseUrl
    // Run the migrations to ensure our schema has the required structure
    await exec(`${prismaBinary} migrate up --create-db --experimental`)
    return super.setup()
  }
  async teardown() {
    // Drop the schema after the tests have completed
    const client = new mysql.createConnection(`${this.databaseUrl}?debug=true`);
    await client.connect();
    await client.query(`DROP DATABASE IF EXISTS testing`);
    await client.end();
  }
}
module.exports = PrismaTestEnvironment