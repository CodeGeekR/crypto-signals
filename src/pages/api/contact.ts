import type { APIRoute } from 'astro';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { waitlistService } from '../../lib/services/waitlist-service.js';
import { initDatabase } from '../../lib/database/turso.js';

// 🎯 Configuración para Astro Hybrid: Solo este endpoint necesita SSR
export const prerender = false;

// 🛡️ Rate Limiter: Máximo 5 submissions por IP cada 15 minutos
const rateLimiter = new RateLimiterMemory({
  points: 5, // Número de intentos
  duration: 900, // 15 minutos en segundos
  blockDuration: 1800, // Bloqueo por 30 minutos si se excede
});

// 🌐 Función para extraer IP del cliente (compatible con Netlify)
function getClientIP(request: Request): string | null {
  // Netlify y CDNs populares
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Otros proxies
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  return null;
}

// 🔍 Función para extraer UTM parameters de la URL de referencia
function extractUtmParams(request: Request): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
} {
  const referer = request.headers.get('referer');
  if (!referer) return {};

  try {
    const url = new URL(referer);
    return {
      utm_source: url.searchParams.get('utm_source') || undefined,
      utm_medium: url.searchParams.get('utm_medium') || undefined,
      utm_campaign: url.searchParams.get('utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
}

// 📝 POST - Crear nuevo lead en la waitlist
export const POST: APIRoute = async ({ request }) => {
  try {
    // 🚀 Inicializar base de datos si no existe
    await initDatabase();

    // 🛡️ Verificar rate limiting
    const clientIP = getClientIP(request);
    const rateLimitKey = clientIP || 'unknown';
    
    try {
      await rateLimiter.consume(rateLimitKey);
    } catch (rejRes) {
      console.warn(`🚫 Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Demasiados intentos. Por favor, inténtalo de nuevo en 30 minutos.',
          error: 'RATE_LIMIT_EXCEEDED'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '1800'
          }
        }
      );
    }

    // 📄 Validar Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Content-Type debe ser application/json',
          error: 'INVALID_CONTENT_TYPE'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 📊 Parsear y validar datos del formulario
    let formData;
    try {
      formData = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'JSON inválido en el cuerpo de la petición',
          error: 'INVALID_JSON'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 🏷️ Agregar datos de tracking
    const utmParams = extractUtmParams(request);
    const enrichedFormData = {
      ...formData,
      ...utmParams,
      page_url: request.headers.get('referer') || '',
      user_agent: request.headers.get('user-agent') || '',
      ip_address: clientIP || undefined  // 🔧 Pasar undefined en lugar de string vacío
    };

    // ✅ Crear lead usando el servicio
    const result = await waitlistService.createLead(enrichedFormData, {
      ip: clientIP || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      referer: request.headers.get('referer') || undefined
    });

    // 📊 Log para analytics (en producción usar un servicio de analytics real)
    console.log('📈 New lead signup:', {
      success: result.success,
      email: formData.email,
      country: formData.country,
      utm_source: utmParams.utm_source || 'direct',
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    // 🎉 Respuesta exitosa
    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: result.message,
          leadId: result.leadId,
          isExisting: result.isExisting || false
        }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
    } else {
      // ❌ Error de validación
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message,
          errors: result.errors
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('❌ Error en endpoint /api/contact:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error interno del servidor. Por favor, inténtalo de nuevo.',
        error: 'INTERNAL_SERVER_ERROR'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// 📊 GET - Obtener estadísticas públicas de la waitlist
export const GET: APIRoute = async ({ url }) => {
  try {
    // 🔐 Verificar si se solicitan estadísticas públicas
    const isPublicStats = url.searchParams.get('public') === 'true';
    
    if (!isPublicStats) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Endpoint no disponible sin parámetros correctos'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 📈 Obtener estadísticas básicas para mostrar en el frontend
    const stats = await waitlistService.getWaitlistStats();
    
    // 🎯 Solo devolver información pública (no sensible)
    const publicStats = {
      totalLeads: stats.totalLeads,
      todaySignups: stats.todaySignups,
      // No incluir detalles específicos por seguridad
      isGrowing: stats.todaySignups > 0,
      topCountries: Object.entries(stats.countryBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([country]) => country)
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: publicStats
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache por 5 minutos
        }
      }
    );

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error obteniendo estadísticas'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// 🚫 Métodos no permitidos
export const PUT: APIRoute = () => {
  return new Response(null, { status: 405 });
};

export const DELETE: APIRoute = () => {
  return new Response(null, { status: 405 });
};

export const PATCH: APIRoute = () => {
  return new Response(null, { status: 405 });
}; 