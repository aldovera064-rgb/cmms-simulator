require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Faltan variables de entorno (.env.local)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function migrate() {
  console.log("🚀 Iniciando migración...");

  const { data: admins, error } = await supabase.from("admins").select("*");

  if (error) {
    console.error("❌ Error leyendo admins:", error);
    return;
  }

  console.log(`👤 Usuarios encontrados: ${admins.length}`);

  const { data: authUsersData, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("❌ Error obteniendo usuarios de Auth:", listError);
    return;
  }

  const authUsers = authUsersData.users;

  for (const admin of admins) {
    if (admin.auth_id) {
      console.log(`⏩ Skip: ${admin.username}`);
      continue;
    }

    const email = `${admin.username}@cmms.local`;

    let authUser = authUsers.find(u => u.email === email);

    if (!authUser) {
      console.log(`➕ Creando usuario: ${email}`);

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: "TempPassword123!",
        email_confirm: true
      });

      if (error) {
        console.error(`❌ Error creando ${email}:`, error.message);
        continue;
      }

      authUser = data.user;
    } else {
      console.log(`🔁 Ya existe: ${email}`);
    }

    const { error: updateError } = await supabase
      .from("admins")
      .update({ auth_id: authUser.id })
      .eq("id", admin.id);

    if (updateError) {
      console.error(`❌ Error actualizando ${admin.username}:`, updateError);
      continue;
    }

    console.log(`✅ Vinculado: ${admin.username}`);
  }

  console.log("🎉 Migración completada");
}

migrate();