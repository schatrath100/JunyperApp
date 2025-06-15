const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// You'll need to replace these with your actual Supabase URL and service role key
// Get these from your Supabase dashboard -> Settings -> API
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('Please set VITE_SUPABASE_URL environment variable or update the script');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable or update the script');
  console.error('You can find this in your Supabase dashboard -> Settings -> API -> service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241222000010_complete_accounting_settings_fix.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration...');
    console.log('Migration SQL length:', migrationSQL.length, 'characters');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('Migration failed:', error);
      return;
    }
    
    console.log('Migration completed successfully!');
    console.log('Result:', data);
    
  } catch (err) {
    console.error('Error running migration:', err);
  }
}

// Alternative method if exec_sql RPC doesn't exist
async function runMigrationDirect() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241222000010_complete_accounting_settings_fix.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration directly...');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });
          
          if (error) {
            console.error(`Statement ${i + 1} failed:`, error);
            console.error('Statement was:', statement);
            return;
          }
        } catch (err) {
          console.error(`Error executing statement ${i + 1}:`, err);
          console.error('Statement was:', statement);
          return;
        }
      }
    }
    
    console.log('All migration statements completed successfully!');
    
  } catch (err) {
    console.error('Error running migration:', err);
  }
}

console.log('Starting migration runner...');
console.log('Supabase URL:', SUPABASE_URL);

// Try the first method, if it fails, try the direct method
runMigration().catch(() => {
  console.log('First method failed, trying direct execution...');
  runMigrationDirect();
}); 