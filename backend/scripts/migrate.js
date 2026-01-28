const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function migrate() {
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sqlite.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('Schema file not found:', schemaPath);
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running database migrations...');
    
    // Use db.exec to run the entire schema at once (handles multi-statement SQL better)
    try {
      await db.exec(schema);
      console.log('✓ Schema executed successfully');
    } catch (error) {
      // If exec fails, try splitting statements
      console.log('Trying statement-by-statement approach...');
      
      // Better splitting that handles semicolons in CHECK constraints
      const statements = [];
      let currentStatement = '';
      let inQuotes = false;
      let quoteChar = null;
      
      for (let i = 0; i < schema.length; i++) {
        const char = schema[i];
        const nextChar = schema[i + 1];
        
        if (!inQuotes && (char === '"' || char === "'" || char === '`')) {
          inQuotes = true;
          quoteChar = char;
        } else if (inQuotes && char === quoteChar && schema[i - 1] !== '\\') {
          inQuotes = false;
          quoteChar = null;
        }
        
        currentStatement += char;
        
        if (!inQuotes && char === ';') {
          const trimmed = currentStatement.trim();
          if (trimmed.length > 0 && !trimmed.startsWith('--')) {
            statements.push(trimmed);
          }
          currentStatement = '';
        }
      }
      
      // Add any remaining statement
      if (currentStatement.trim().length > 0) {
        statements.push(currentStatement.trim());
      }

      for (const statement of statements) {
        try {
          await db.query(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate') &&
              !error.message.includes('no such table')) {
            console.warn('Warning:', error.message);
          }
        }
      }
    }

    // Save database after schema creation
    await db.save();

    console.log('✓ Database migrations completed successfully!');

    // Insert default event categories
    const categories = [
      { name: 'Chorus', description: 'Choir and singing events' },
      { name: 'Debate', description: 'Debate competitions and discussions' },
      { name: 'Music', description: 'Music concerts and performances' },
      { name: 'Literary', description: 'Literary events and book clubs' },
      { name: 'Dance', description: 'Dance performances and competitions' },
      { name: 'Drama', description: 'Theater and drama productions' },
      { name: 'Sports', description: 'Sports and athletic events' },
      { name: 'Workshop', description: 'Educational workshops and training sessions' },
      { name: 'Social', description: 'Social gatherings and networking events' },
      { name: 'Cultural', description: 'Cultural and artistic events' },
      { name: 'Career', description: 'Career development and job fairs' },
      { name: 'Academic', description: 'Academic conferences and seminars' },
      { name: 'Tech', description: 'Technology and coding events' },
      { name: 'Art', description: 'Art exhibitions and showcases' },
      { name: 'Food', description: 'Food festivals and culinary events' }
    ];

    for (const category of categories) {
      try {
        await db.query('INSERT OR IGNORE INTO event_categories (name, description) VALUES (?, ?)', 
          [category.name, category.description]);
      } catch (error) {
        // Ignore duplicate errors
      }
    }

    // Save database after inserting categories
    await db.save();

    console.log('✓ Default data inserted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
