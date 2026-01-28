const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use SQLite for local development (no setup required!)
const dbPath = process.env.DATABASE_PATH 
  ? path.isAbsolute(process.env.DATABASE_PATH) 
    ? process.env.DATABASE_PATH 
    : path.join(__dirname, process.env.DATABASE_PATH)
  : path.join(__dirname, '../../database/campus_connect.db');

let db = null;
let SQL = null;

// Initialize SQL.js
async function initDatabase() {
  if (!SQL) {
    // Find the sql-wasm.wasm file in node_modules
    const sqlJsPath = require.resolve('sql.js');
    const sqlJsDir = path.dirname(sqlJsPath);
    
    // Check if we're already in dist folder or need to go to dist
    let distDir = sqlJsDir;
    if (!sqlJsDir.endsWith('dist')) {
      distDir = path.join(sqlJsDir, 'dist');
    }
    
    // Try to find the WASM file (could be sql-wasm.wasm or sql-wasm-debug.wasm)
    let wasmPath = path.join(distDir, 'sql-wasm.wasm');
    if (!fs.existsSync(wasmPath)) {
      wasmPath = path.join(distDir, 'sql-wasm-debug.wasm');
    }
    if (!fs.existsSync(wasmPath) && fs.existsSync(distDir)) {
      // List all wasm files to find the right one
      try {
        const wasmFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.wasm'));
        if (wasmFiles.length > 0) {
          wasmPath = path.join(distDir, wasmFiles[0]);
        }
      } catch (e) {
        // If dist doesn't exist, try parent directory
        const parentDir = path.dirname(sqlJsDir);
        const parentDist = path.join(parentDir, 'dist');
        if (fs.existsSync(parentDist)) {
          distDir = parentDist;
          wasmPath = path.join(distDir, 'sql-wasm.wasm');
        }
      }
    }
    
    SQL = await initSqlJs({
      locateFile: (file) => {
        if (file.endsWith('.wasm')) {
          // Return absolute path to WASM file
          return wasmPath;
        }
        // For other files, return as-is
        const filePath = path.join(distDir, file);
        return fs.existsSync(filePath) ? filePath : file;
      }
    });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('✓ Connected to SQLite database:', dbPath);
  } else {
    // Create new database
    db = new SQL.Database();
    console.log('✓ Created new SQLite database:', dbPath);
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
}

// Initialize on module load
let initPromise = initDatabase();

// Helper function to run queries (compatible with pg syntax)
const query = async (sql, params = []) => {
  // Wait for initialization
  await initPromise;

  try {
    // Replace PostgreSQL parameter placeholders ($1, $2) with SQLite placeholders (?)
    let sqliteSql = sql;
    const paramMatches = [...sql.matchAll(/\$(\d+)/g)];
    if (paramMatches.length > 0) {
      // Sort by position in reverse order
      const sortedMatches = paramMatches.sort((a, b) => b.index - a.index);
      for (const match of sortedMatches) {
        sqliteSql = sqliteSql.substring(0, match.index) + '?' + sqliteSql.substring(match.index + match[0].length);
      }
    }
    
    // Replace ILIKE with LIKE (SQLite doesn't have ILIKE, use UPPER for case-insensitive)
    sqliteSql = sqliteSql.replace(/ILIKE/gi, 'LIKE');
    
    // Extract RETURNING clause if present
    const returningMatch = sql.match(/RETURNING (.+)/i);
    let returningColumns = null;
    if (returningMatch) {
      returningColumns = returningMatch[1].split(',').map(c => c.trim());
      sqliteSql = sqliteSql.replace(/RETURNING .+/i, '');
    }
    
    // Remove trailing semicolons
    sqliteSql = sqliteSql.trim().replace(/;+$/, '');
    
    // Check if it's a SELECT query
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sqliteSql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        rows.push(processRow(row));
      }
      stmt.free();
      return { rows };
    } else {
      // For INSERT, UPDATE, DELETE
      const stmt = db.prepare(sqliteSql);
      stmt.bind(params);
      stmt.step();
      const lastInsertRowid = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0];
      stmt.free();
      
      // Don't save after every query - save will be called explicitly when needed
      
      // For INSERT with RETURNING, fetch the inserted row
      if (returningColumns && lastInsertRowid) {
        const tableMatch = sql.match(/INTO (\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const selectSql = `SELECT ${returningColumns.join(', ')} FROM ${tableName} WHERE id = ?`;
          const selectStmt = db.prepare(selectSql);
          selectStmt.bind([lastInsertRowid]);
          selectStmt.step();
          const row = selectStmt.getAsObject();
          selectStmt.free();
          return { rows: row ? [processRow(row)] : [] };
        }
      }
      
      return { rows: [] };
    }
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
};

// Process row to convert SQLite booleans (0/1) to JavaScript booleans
function processRow(row) {
  if (!row) return row;
  const processed = { ...row };
  for (const key in processed) {
    // Convert integer booleans to actual booleans
    if (key.includes('is_') || key.includes('_accepted') || key.includes('is_approved')) {
      processed[key] = Boolean(processed[key]);
    }
    // Handle JSON arrays stored as strings (for skills)
    if (key === 'skills' && typeof processed[key] === 'string') {
      try {
        processed[key] = JSON.parse(processed[key]);
      } catch (e) {
        // If not JSON, treat as comma-separated
        processed[key] = processed[key].split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }
  return processed;
}

// Prepare statement helper
const prepare = (sql) => {
  return {
    run: (params) => {
      return query(sql, params);
    },
    get: (params) => {
      const result = query(sql, params);
      return result.rows[0] || null;
    },
    all: (params) => {
      const result = query(sql, params);
      return result.rows;
    }
  };
};

// Export a pool-like interface for compatibility
module.exports = {
  query,
  prepare,
  // Additional methods
  exec: async (sql) => {
    await initPromise;
    return db.exec(sql);
  },
  // Save database
  save: async () => {
    await initPromise;
    try {
      // Ensure directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      const data = db.export();
      const buffer = Buffer.from(data);
      // Use writeFile with proper flags to avoid permission issues
      fs.writeFileSync(dbPath, buffer, { flag: 'w' });
    } catch (error) {
      // If save fails, log but don't crash
      console.warn('Warning: Could not save database file:', error.message);
      console.warn('Database path:', dbPath);
      // Database is still in memory and will work, just won't persist
    }
  }
};
