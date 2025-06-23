const { createClient } = require('@supabase/supabase-js');

// Replace with your Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateUserToAdmin(userId) {
  try {
    console.log(`Updating user ${userId} to admin role...`);
    
    // Update profiles table
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        role: 'admin'
      })
      .select();

    if (error) {
      console.error('Error updating profile:', error);
      return;
    }

    console.log('✅ Successfully updated profile to admin role!');
    console.log('Updated profile:', data);
    
    // Also update user metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role: 'admin' }
    });

    if (metadataError) {
      console.log('⚠️  Note: Could not update user metadata (this is normal for client-side scripts)');
      console.log('The profile table update is sufficient for admin access.');
    } else {
      console.log('✅ Also updated user metadata!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get user ID from command line argument
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node update-admin.js <USER_UUID>');
  console.log('Example: node update-admin.js 12345678-1234-1234-1234-123456789abc');
  process.exit(1);
}

updateUserToAdmin(userId); 