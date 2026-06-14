require('dotenv').config({ path: '.env.local' });

const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEMP_PASSWORD = 'ZamSchool2024!';

async function main() {
  console.log('=== Creating ZamSchool Demo Users ===\n');

  // 1. Check if schools already exist
  const { data: existingSchools } = await supabase.from('schools').select('id, name, code').limit(5);
  console.log('Existing schools:', existingSchools?.length || 0);

  // 2. Create System School for Super Admin
  let systemSchoolId;
  const { data: existingSystemSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('code', 'SYSTEM')
    .single();

  if (existingSystemSchool) {
    systemSchoolId = existingSystemSchool.id;
    console.log('System school already exists:', systemSchoolId);
  } else {
    const { data: systemSchool, error: sysSchoolError } = await supabase
      .from('schools')
      .insert({
        name: 'ZamSchool System',
        code: 'SYSTEM',
        address: 'Platform Administration',
        phone: '+260000000000',
        email: 'system@zamschool.edu.zm',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (sysSchoolError) {
      console.error('Failed to create system school:', sysSchoolError.message);
      process.exit(1);
    }
    systemSchoolId = systemSchool.id;
    console.log('System school created:', systemSchool.name);
  }

  // 3. Create Main School for Head Teacher
  let mainSchoolId;
  const { data: existingMainSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('code', 'ZAM001')
    .single();

  if (existingMainSchool) {
    mainSchoolId = existingMainSchool.id;
    console.log('Main school already exists:', mainSchoolId);
  } else {
    const { data: mainSchool, error: mainSchoolError } = await supabase
      .from('schools')
      .insert({
        name: 'Lusaka International Academy',
        code: 'ZAM001',
        address: '45 Independence Avenue, Lusaka',
        phone: '+260211123456',
        email: 'info@lusakaacademy.edu.zm',
        province: 'Lusaka',
        district: 'Lusaka Central',
        school_type: 'Secondary',
        ownership_type: 'Private',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (mainSchoolError) {
      console.error('Failed to create main school:', mainSchoolError.message);
      process.exit(1);
    }
    mainSchoolId = mainSchool.id;
    console.log('Main school created:', mainSchool.name);
  }

  // 4. Create Auth Users and Profiles
  const users = [
    { email: 'superadmin@zamschool.edu.zm', role: 'super_admin', name: 'System Administrator', schoolId: systemSchoolId },
    { email: 'headteacher@zamschool.edu.zm', role: 'principal', name: 'Dr. James Mwamba', schoolId: mainSchoolId },
    { email: 'bursar@zamschool.edu.zm', role: 'bursar', name: 'Mrs. Grace Phiri', schoolId: mainSchoolId },
    { email: 'teacher@zamschool.edu.zm', role: 'teacher', name: 'Mr. Peter Banda', schoolId: mainSchoolId },
  ];

  for (const user of users) {
    // Check if auth user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === user.email);

    let authUserId;

    if (existingUser) {
      authUserId = existingUser.id;
      console.log(`Auth user already exists: ${user.email} (${authUserId})`);
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          must_change_password: true,
        },
      });

      if (createError) {
        console.error(`Failed to create auth user ${user.email}:`, createError.message);
        continue;
      }

      authUserId = newUser.user.id;
      console.log(`Auth user created: ${user.email} (${authUserId})`);
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (existingProfile) {
      console.log(`  Profile already exists for ${user.email}`);

      // Update the role and school if needed
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: user.role, school_id: user.schoolId, name: user.name, first_name: user.name.split(' ').slice(0, -1).join(' '), last_name: user.name.split(' ').slice(-1).join(' ') })
        .eq('auth_user_id', authUserId);

      if (updateError) {
        console.error(`  Failed to update profile for ${user.email}:`, updateError.message);
      } else {
        console.log(`  Profile updated for ${user.email} (role: ${user.role})`);
      }
    } else {
      const nameParts = user.name.split(' ');
      const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0];
      const lastName = nameParts.slice(-1).join(' ') || '';

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authUserId,
        auth_user_id: authUserId,
        school_id: user.schoolId,
        role: user.role,
        name: user.name,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        status: 'ACTIVE',
        must_change_password: true,
        temporary_password_issued_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error(`  Failed to create profile for ${user.email}:`, profileError.message);
      } else {
        console.log(`  Profile created for ${user.email} (role: ${user.role})`);
      }
    }
  }

  console.log('\n=== Users Created Successfully ===');
  console.log('\nLogin credentials (all users):');
  console.log(`  Password: ${TEMP_PASSWORD}`);
  console.log('\nUsers:');
  console.log('  Super Admin:   superadmin@zamschool.edu.zm');
  console.log('  Head Teacher:  headteacher@zamschool.edu.zm');
  console.log('  Bursar:        bursar@zamschool.edu.zm');
  console.log('  Teacher:       teacher@zamschool.edu.zm');
  console.log('\nAll users will be prompted to change password on first login.');
  console.log('School: Lusaka International Academy (Code: ZAM001)');
  console.log('\nRun: npm run dev');
  console.log('Then open http://localhost:3000/login');
}

main().catch(console.error);