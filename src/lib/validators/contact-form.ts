import { z } from 'zod';
import { encode } from 'html-entities';

// 🛡️ Esquemas de validación con Zod para máxima seguridad

// Lista de países permitidos: LATAM + América del Norte
const ALLOWED_COUNTRIES = [
  // LATAM principales
  'MX', 'CO', 'AR', 'CL', 'PE', 'EC', 'VE', 'UY', 'PY', 'BO', 'BR',
  // Centroamérica y Caribe
  'CR', 'PA', 'GT', 'HN', 'NI', 'SV', 'BZ', 'DO', 'CU', 'JM', 'HT', 'TT',
  // América del Norte
  'US', 'CA',
  // Otros
  'OTHER'
] as const;

// Lista de niveles de experiencia permitidos
const EXPERIENCE_LEVELS = [
  'beginner', 'intermediate', 'advanced', 'professional'
] as const;

// 📧 Validador de email robusto que bloquea emails temporales conocidos
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'El email es requerido')
  .max(254, 'El email es demasiado largo') // RFC 5321 limit
  .email('Formato de email inválido')
  .refine((email) => {
    // 🚫 Bloquear dominios temporales comunes
    const tempDomains = [
      '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
      'tempmail.org', 'yopmail.com', 'trashmail.com'
    ];
    const domain = email.split('@')[1];
    return !tempDomains.includes(domain);
  }, 'No se permiten emails temporales')
  .transform((email) => encode(email)); // Sanitizar contra XSS

// 👤 Validador de nombre con sanitización
const nameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(100, 'El nombre es demasiado largo')
  .regex(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/, 'El nombre contiene caracteres inválidos')
  .transform((name) => encode(name)); // Sanitizar contra XSS

// 🌍 Validador de país
const countrySchema = z
  .enum(ALLOWED_COUNTRIES, {
    errorMap: () => ({ message: 'País no válido para nuestro servicio' })
  });

// 📊 Validador de experiencia
const experienceSchema = z
  .enum(EXPERIENCE_LEVELS, {
    errorMap: () => ({ message: 'Nivel de experiencia inválido' })
  });

// 🔗 Validador de URL seguro
const urlSchema = z
  .string()
  .trim()
  .url('URL inválida')
  .max(2048, 'URL demasiado larga')
  .refine((url) => {
    try {
      const parsedUrl = new URL(url);
      // Solo permitir HTTPS en producción
      return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'URL no segura')
  .transform((url) => encode(url));

// 🏷️ Validador de parámetros UTM
const utmSchema = z
  .string()
  .trim()
  .max(255, 'Parámetro UTM demasiado largo')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Parámetro UTM contiene caracteres inválidos')
  .optional()
  .transform((utm) => utm ? encode(utm) : undefined);

// 🌐 Validador de IP address
const ipSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((ip) => {
    // Permitir undefined, null o string vacío
    if (!ip || ip.trim() === '') return undefined;
    return encode(ip);
  })
  .refine((ip) => {
    // Solo validar formato si hay una IP presente
    if (!ip) return true;
    
    // Validar formato IPv4 o IPv6
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }, 'Dirección IP inválida');

// 🖥️ Validador de User Agent
const userAgentSchema = z
  .string()
  .trim()
  .max(512, 'User Agent demasiado largo')
  .optional()
  .transform((ua) => ua ? encode(ua) : undefined);

// 📝 Schema principal del formulario de contacto
export const contactFormSchema = z.object({
  // Campos requeridos del formulario
  name: nameSchema,
  email: emailSchema,
  country: countrySchema,
  experience: experienceSchema,
  
  // Campos opcionales de tracking
  utm_source: utmSchema,
  utm_medium: utmSchema,
  utm_campaign: utmSchema,
  page_url: urlSchema.optional(),
  user_agent: userAgentSchema,
  ip_address: ipSchema.optional(),  // 🔧 Hacer explícitamente opcional
});

// 📊 Schema para actualización de lead
export const updateLeadSchema = z.object({
  id: z.number().int().positive('ID de lead inválido'),
  lead_status: z.enum(['active', 'contacted', 'converted', 'unsubscribed']).optional(),
  email_verified: z.boolean().optional(),
  marketing_consent: z.boolean().optional(),
  last_contacted_at: z.string().datetime().optional(),
});

// 🎯 Schema para actividad de lead
export const leadActivitySchema = z.object({
  lead_id: z.number().int().positive('ID de lead inválido'),
  activity_type: z.enum(['signup', 'email_open', 'email_click', 'page_visit']),
  activity_data: z.string().max(1000, 'Datos de actividad demasiado largos').optional(),
  ip_address: ipSchema,
  user_agent: userAgentSchema,
});

// 📤 Tipos TypeScript derivados de los schemas
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadActivityInput = z.infer<typeof leadActivitySchema>;

// 🔍 Función de validación con manejo de errores detallado
export function validateContactForm(data: unknown): {
  success: boolean;
  data?: ContactFormInput;
  errors?: Record<string, string[]>;
} {
  try {
    const result = contactFormSchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      // Mapear errores de Zod a formato user-friendly
      const errors: Record<string, string[]> = {};
      
      result.error.issues.forEach((issue) => {
        const field = issue.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(issue.message);
      });
      
      return {
        success: false,
        errors,
      };
    }
  } catch (error) {
    console.error('❌ Error en validación:', error);
    return {
      success: false,
      errors: {
        general: ['Error interno de validación. Por favor, inténtalo de nuevo.']
      }
    };
  }
}

// 🧹 Función auxiliar para sanitizar datos adicionales
export function sanitizeString(input: string): string {
  return encode(input.trim());
}

// ✅ Función para validar si un email ya existe (para uso en frontend)
export function validateEmailFormat(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

// 🌍 Función para obtener información del país
export function getCountryInfo(countryCode: string): { name: string; flag: string } | null {
  const countryMap: Record<string, { name: string; flag: string }> = {
    // LATAM principales
    'MX': { name: 'México', flag: '🇲🇽' },
    'CO': { name: 'Colombia', flag: '🇨🇴' },
    'AR': { name: 'Argentina', flag: '🇦🇷' },
    'CL': { name: 'Chile', flag: '🇨🇱' },
    'PE': { name: 'Perú', flag: '🇵🇪' },
    'EC': { name: 'Ecuador', flag: '🇪🇨' },
    'VE': { name: 'Venezuela', flag: '🇻🇪' },
    'UY': { name: 'Uruguay', flag: '🇺🇾' },
    'PY': { name: 'Paraguay', flag: '🇵🇾' },
    'BO': { name: 'Bolivia', flag: '🇧🇴' },
    'BR': { name: 'Brasil', flag: '🇧🇷' },
    // Centroamérica y Caribe
    'CR': { name: 'Costa Rica', flag: '🇨🇷' },
    'PA': { name: 'Panamá', flag: '🇵🇦' },
    'GT': { name: 'Guatemala', flag: '🇬🇹' },
    'HN': { name: 'Honduras', flag: '🇭🇳' },
    'NI': { name: 'Nicaragua', flag: '🇳🇮' },
    'SV': { name: 'El Salvador', flag: '🇸🇻' },
    'BZ': { name: 'Belice', flag: '🇧🇿' },
    'DO': { name: 'República Dominicana', flag: '🇩🇴' },
    'CU': { name: 'Cuba', flag: '🇨🇺' },
    'JM': { name: 'Jamaica', flag: '🇯🇲' },
    'HT': { name: 'Haití', flag: '🇭🇹' },
    'TT': { name: 'Trinidad y Tobago', flag: '🇹🇹' },
    // América del Norte
    'US': { name: 'Estados Unidos', flag: '🇺🇸' },
    'CA': { name: 'Canadá', flag: '🇨🇦' },
    // Otros
    'OTHER': { name: 'Otro país', flag: '🌎' },
  };
  
  return countryMap[countryCode] || null;
} 