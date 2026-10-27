const mysql = require("mysql2/promise");
const { getConnectionOptions } = require("./config");

const pool = mysql.createPool(getConnectionOptions());

module.exports = pool;
