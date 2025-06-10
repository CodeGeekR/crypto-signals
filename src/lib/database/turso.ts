import { createClient } from '@libsql/client';

// 🔒 Configuración segura de la base de datos Turso
const tursoConfig = {
  url: import.meta.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL,
  authToken: import.meta.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
};

// 🚨 Validación de variables de entorno críticas
if (!tursoConfig.url || !tursoConfig.authToken) {
  throw new Error(
    '❌ TURSO_DATABASE_URL y TURSO_AUTH_TOKEN son requeridos. Verifica tu archivo .env'
  );
}

// 🔗 Cliente Turso con configuración optimizada para performance
export const tursoClient = createClient({
  url: tursoConfig.url,
  authToken: tursoConfig.authToken,
});

// 📊 Tipos TypeScript para la base de datos
export interface WaitlistLead {
  id?: number;
  name: string;
  email: string;
  country: string;
  experience: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  
  // Campos de tracking de marketing
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  page_url?: string;
  user_agent?: string;
  ip_address?: string;
  
  // Campos de gestión
  lead_status?: 'active' | 'contacted' | 'converted' | 'unsubscribed';
  email_verified?: boolean;
  marketing_consent?: boolean;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_contacted_at?: string;
}

export interface LeadActivity {
  id?: number;
  lead_id: number;
  activity_type: 'signup' | 'email_open' | 'email_click' | 'page_visit';
  activity_data?: string; // JSON stringified data
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

// 🏗️ Inicialización de la base de datos (crear tablas si no existen)
export async function initDatabase(): Promise<void> {
  try {
    // Tabla principal para leads de lista de espera
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS waitlist_leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        country TEXT NOT NULL,
        experience TEXT NOT NULL CHECK (experience IN ('beginner', 'intermediate', 'advanced', 'professional')),
        
        -- Campos de tracking y marketing
        utm_source TEXT DEFAULT 'direct',
        utm_medium TEXT DEFAULT 'organic', 
        utm_campaign TEXT DEFAULT 'waitlist_signup',
        page_url TEXT,
        user_agent TEXT,
        ip_address TEXT,
        
        -- Campos de gestión
        lead_status TEXT DEFAULT 'active' CHECK (lead_status IN ('active', 'contacted', 'converted', 'unsubscribed')),
        email_verified BOOLEAN DEFAULT FALSE,
        marketing_consent BOOLEAN DEFAULT TRUE,
        
        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_contacted_at DATETIME,
        
        -- Constraint único para email
        CONSTRAINT unique_email UNIQUE (email)
      )
    `);

    // Tabla para tracking de actividad de leads
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS lead_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        activity_data TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (lead_id) REFERENCES waitlist_leads(id) ON DELETE CASCADE
      )
    `);

    // 🚀 Índices para optimización de performance
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_leads(email)`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_leads(created_at)`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_waitlist_country ON waitlist_leads(country)`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id)`);
    await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at)`);

    // 🔄 Trigger para updated_at automático
    await tursoClient.execute(`
      CREATE TRIGGER IF NOT EXISTS update_waitlist_leads_updated_at 
        AFTER UPDATE ON waitlist_leads
        FOR EACH ROW
      BEGIN
        UPDATE waitlist_leads 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = OLD.id;
      END
    `);

    console.log('✅ Base de datos Turso inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
    throw error;
  }
}

// 🧪 Función para verificar la conexión
export async function testConnection(): Promise<boolean> {
  try {
    const result = await tursoClient.execute('SELECT 1 as test');
    return result.rows.length > 0;
  } catch (error) {
    console.error('❌ Error de conexión a Turso:', error);
    return false;
  }
} 