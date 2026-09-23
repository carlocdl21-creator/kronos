/* ==========================================================================
   CONFIGURAZIONE — unico file da compilare per collegare l'archivio condiviso.

   1. Creare un progetto su https://supabase.com (piano gratuito).
   2. Eseguire supabase/schema.sql nell'SQL Editor del progetto.
   3. Copiare qui sotto Project URL e chiave "anon public"
      (Project Settings → API).

   La chiave anon è pensata per stare nel browser: da sola non dà accesso
   a nulla, perché ogni tabella è protetta dalle policy RLS dello schema.
   Finché i due valori restano vuoti, l'applicativo parte in modalità
   dimostrativa con i dati salvati solo su questo dispositivo.
   ========================================================================== */

export const CONFIG = {
  SUPABASE_URL: "https://cdwoceuocsqadpavgshd.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkd29jZXVvY3NxYWRwYXZnc2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzk1NjksImV4cCI6MjEwNTc1NTU2OX0.VLyaYbX8FA72pUbuUR0P8TDkH_XypavROYbL0iKyFUA",

  /** Bucket dell'archivio file (creati da schema.sql). */
  BUCKET_FOTO: "foto",
  BUCKET_DOCUMENTI: "documenti",

  /** Intervallo di riallineamento dei dati, in secondi (oltre al tempo reale). */
  POLL_SECONDI: 60
};

export const isConfigurato = () =>
  Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
