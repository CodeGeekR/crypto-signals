import { tursoClient, type WaitlistLead, type LeadActivity } from '../database/turso.js';
import { 
  validateContactForm, 
  type ContactFormInput,
  type UpdateLeadInput,
  type LeadActivityInput 
} from '../validators/contact-form.js';

// 🏆 Clase principal del servicio de waitlist
export class WaitlistService {
  
  // 📝 Crear un nuevo lead en la waitlist
  async createLead(formData: unknown, metadata: {
    ip?: string;
    userAgent?: string;
    referer?: string;
  } = {}): Promise<{
    success: boolean;
    leadId?: number;
    isExisting?: boolean;
    message: string;
    errors?: Record<string, string[]>;
  }> {
    try {
      // 🔍 Validar datos del formulario
      const validation = validateContactForm(formData);
      
      if (!validation.success) {
        return {
          success: false,
          message: 'Datos del formulario inválidos',
          errors: validation.errors
        };
      }

      const data = validation.data!;
      
      // 🔍 Verificar si el email ya existe
      const existingLead = await this.findLeadByEmail(data.email);
      
      if (existingLead) {
        // 📊 Registrar actividad de re-signup
        await this.trackActivity({
          lead_id: existingLead.id!,
          activity_type: 'signup',
          activity_data: JSON.stringify({
            type: 'duplicate_signup',
            original_utm: {
              source: existingLead.utm_source,
              medium: existingLead.utm_medium,
              campaign: existingLead.utm_campaign
            },
            new_utm: {
              source: data.utm_source,
              medium: data.utm_medium,
              campaign: data.utm_campaign
            }
          }),
          ip_address: metadata.ip,
          user_agent: metadata.userAgent
        });

        return {
          success: true,
          leadId: existingLead.id,
          isExisting: true,
          message: '¡Ya estás en nuestra lista VIP! Te notificaremos cuando lancemos.'
        };
      }

      // 🆕 Crear nuevo lead
      const insertResult = await tursoClient.execute(
        `
          INSERT INTO waitlist_leads (
            name, email, country, experience,
            utm_source, utm_medium, utm_campaign, page_url,
            user_agent, ip_address
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id
        `,
        [
          data.name,
          data.email,
          data.country,
          data.experience,
          data.utm_source || 'direct',
          data.utm_medium || 'organic',
          data.utm_campaign || 'waitlist_signup',
          data.page_url || metadata.referer || '',
          data.user_agent || metadata.userAgent || '',
          data.ip_address || metadata.ip || ''
        ]
      );

      const leadId = insertResult.rows[0]?.id as number;

      if (!leadId) {
        throw new Error('No se pudo obtener el ID del lead creado');
      }

      // 📊 Registrar actividad inicial de signup
      await this.trackActivity({
        lead_id: leadId,
        activity_type: 'signup',
        activity_data: JSON.stringify({
          type: 'new_signup',
          source: data.utm_source || 'direct',
          country: data.country,
          experience: data.experience
        }),
        ip_address: metadata.ip,
        user_agent: metadata.userAgent
      });

      return {
        success: true,
        leadId,
        isExisting: false,
        message: '🎉 ¡Bienvenido a la lista VIP! Eres uno de los elegidos.'
      };

    } catch (error) {
      console.error('❌ Error creando lead:', error);
      
      // 🔍 Debug: Información detallada del error
      if (error instanceof Error) {
        console.error('📋 Detalles del error:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5)
        });
      }
      
      // 🔍 Verificar si es error de constraint único (email duplicado)
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        return {
          success: false,
          message: 'Este email ya está registrado en nuestra lista de espera.',
          errors: { email: ['Email ya registrado'] }
        };
      }
      
      // 🔍 Verificar si es error de conexión a Turso
      if (error instanceof Error && (
        error.message.includes('TURSO_DATABASE_URL') ||
        error.message.includes('TURSO_AUTH_TOKEN') ||
        error.message.includes('not found') ||
        error.message.includes('unauthorized')
      )) {
        console.error('🚨 Error de configuración de Turso detectado');
        return {
          success: false,
          message: 'Error de configuración de base de datos. Contacta al administrador.',
          errors: { config: ['Error de configuración de BD'] }
        };
      }

      return {
        success: false,
        message: 'Error interno del servidor. Por favor, inténtalo de nuevo.',
        errors: { general: ['Error interno del servidor'] }
      };
    }
  }

  // 🔍 Buscar lead por email
  async findLeadByEmail(email: string): Promise<WaitlistLead | null> {
    try {
      const result = await tursoClient.execute(
        'SELECT * FROM waitlist_leads WHERE email = ? LIMIT 1',
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id as number,
        name: row.name as string,
        email: row.email as string,
        country: row.country as string,
        experience: row.experience as WaitlistLead['experience'],
        utm_source: row.utm_source as string,
        utm_medium: row.utm_medium as string,
        utm_campaign: row.utm_campaign as string,
        page_url: row.page_url as string,
        user_agent: row.user_agent as string,
        ip_address: row.ip_address as string,
        lead_status: row.lead_status as WaitlistLead['lead_status'],
        email_verified: Boolean(row.email_verified),
        marketing_consent: Boolean(row.marketing_consent),
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        last_contacted_at: row.last_contacted_at as string
      };
    } catch (error) {
      console.error('❌ Error buscando lead por email:', error);
      return null;
    }
  }

  // 📊 Registrar actividad de lead
  async trackActivity(activity: LeadActivityInput): Promise<boolean> {
    try {
      await tursoClient.execute(
        `
          INSERT INTO lead_activities (
            lead_id, activity_type, activity_data, ip_address, user_agent
          ) VALUES (?, ?, ?, ?, ?)
        `,
        [
          activity.lead_id,
          activity.activity_type,
          activity.activity_data || '',
          activity.ip_address || '',
          activity.user_agent || ''
        ]
      );

      return true;
    } catch (error) {
      console.error('❌ Error registrando actividad:', error);
      return false;
    }
  }

  // 📈 Obtener estadísticas de la waitlist
  async getWaitlistStats(): Promise<{
    totalLeads: number;
    todaySignups: number;
    countryBreakdown: Record<string, number>;
    experienceBreakdown: Record<string, number>;
    topUtmSources: Array<{ source: string; count: number }>;
  }> {
    try {
      // 📊 Total de leads
      const totalResult = await tursoClient.execute(
        'SELECT COUNT(*) as total FROM waitlist_leads WHERE lead_status = "active"'
      );
      const totalLeads = totalResult.rows[0]?.total as number || 0;

      // 📅 Signups de hoy
      const todayResult = await tursoClient.execute(
        'SELECT COUNT(*) as today FROM waitlist_leads WHERE DATE(created_at) = DATE("now") AND lead_status = "active"'
      );
      const todaySignups = todayResult.rows[0]?.today as number || 0;

      // 🌍 Breakdown por país
      const countryResult = await tursoClient.execute(
        'SELECT country, COUNT(*) as count FROM waitlist_leads WHERE lead_status = "active" GROUP BY country ORDER BY count DESC'
      );
      const countryBreakdown: Record<string, number> = {};
      countryResult.rows.forEach(row => {
        countryBreakdown[row.country as string] = row.count as number;
      });

      // 📊 Breakdown por experiencia
      const experienceResult = await tursoClient.execute(
        'SELECT experience, COUNT(*) as count FROM waitlist_leads WHERE lead_status = "active" GROUP BY experience ORDER BY count DESC'
      );
      const experienceBreakdown: Record<string, number> = {};
      experienceResult.rows.forEach(row => {
        experienceBreakdown[row.experience as string] = row.count as number;
      });

      // 🔝 Top UTM sources
      const utmResult = await tursoClient.execute(
        'SELECT utm_source as source, COUNT(*) as count FROM waitlist_leads WHERE lead_status = "active" GROUP BY utm_source ORDER BY count DESC LIMIT 10'
      );
      const topUtmSources = utmResult.rows.map(row => ({
        source: row.source as string,
        count: row.count as number
      }));

      return {
        totalLeads,
        todaySignups,
        countryBreakdown,
        experienceBreakdown,
        topUtmSources
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        totalLeads: 0,
        todaySignups: 0,
        countryBreakdown: {},
        experienceBreakdown: {},
        topUtmSources: []
      };
    }
  }

  // 🔄 Actualizar lead
  async updateLead(id: number, updates: Partial<UpdateLeadInput>): Promise<boolean> {
    try {
      const setClause = Object.keys(updates)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.values(updates);
      values.push(id); // Para el WHERE

      await tursoClient.execute(
        `UPDATE waitlist_leads SET ${setClause} WHERE id = ?`,
        values
      );

      return true;
    } catch (error) {
      console.error('❌ Error actualizando lead:', error);
      return false;
    }
  }

  // 📧 Marcar email como verificado
  async verifyEmail(email: string): Promise<boolean> {
    try {
      await tursoClient.execute(
        'UPDATE waitlist_leads SET email_verified = TRUE WHERE email = ?',
        [email.toLowerCase().trim()]
      );
      return true;
    } catch (error) {
      console.error('❌ Error verificando email:', error);
      return false;
    }
  }

  // 🗑️ Remover lead de la waitlist (GDPR compliance)
  async removeLead(email: string): Promise<boolean> {
    try {
      await tursoClient.execute(
        'UPDATE waitlist_leads SET lead_status = "unsubscribed" WHERE email = ?',
        [email.toLowerCase().trim()]
      );
      return true;
    } catch (error) {
      console.error('❌ Error removiendo lead:', error);
      return false;
    }
  }

  // 📈 Obtener leads recientes para admin dashboard
  async getRecentLeads(limit: number = 50): Promise<WaitlistLead[]> {
    try {
      const result = await tursoClient.execute(
        `
          SELECT * FROM waitlist_leads 
          WHERE lead_status = "active" 
          ORDER BY created_at DESC 
          LIMIT ?
        `,
        [limit]
      );

      return result.rows.map(row => ({
        id: row.id as number,
        name: row.name as string,
        email: row.email as string,
        country: row.country as string,
        experience: row.experience as WaitlistLead['experience'],
        utm_source: row.utm_source as string,
        utm_medium: row.utm_medium as string,
        utm_campaign: row.utm_campaign as string,
        created_at: row.created_at as string,
      }));
    } catch (error) {
      console.error('❌ Error obteniendo leads recientes:', error);
      return [];
    }
  }
}

// 🏭 Exportar instancia singleton del servicio
export const waitlistService = new WaitlistService(); 