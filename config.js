/*
  Configuración para GitHub Pages + Supabase.

  1) Crea tu proyecto en Supabase.
  2) Ejecuta supabase/schema.sql.
  3) Crea/verifica el bucket glasses-designs.
  4) Copia aquí tu URL y ANON KEY.

  Nota: en proyectos frontend la ANON KEY es pública. La seguridad real se controla con RLS/policies en Supabase.
*/
window.OPTICA_AR_CONFIG = {
  SUPABASE_URL: "", // Ejemplo: "https://xxxx.supabase.co"
  SUPABASE_ANON_KEY: "", // Ejemplo: "eyJhbGciOi..."
  SUPABASE_BUCKET: "glasses-designs",
  ADMIN_PASSCODE: "admin123",
  USE_SUPABASE: true
};
