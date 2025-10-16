import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { Resend } from 'https://esm.sh/resend@1.1.0'; // Import Resend

// Define the expected payload for the email function
interface EmailPayload {
  to: string;
  subject: string;
  body: string; // HTML content
  userId: string; // User ID for fetching profile details if needed
  status: 'approved' | 'rejected'; // Status for logging/context
}

serve(async (req) => {
  console.log('[send-email Edge Function] Function started.');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[send-email Edge Function] Handling OPTIONS preflight request.');
    return new Response(null, {
      status: 204, // No Content
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method !== 'POST') {
    console.warn('[send-email Edge Function] Method Not Allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { to, subject, body, userId, status } = payload;
    console.log('[send-email Edge Function] Received payload:', { to, subject, userId, status, bodyLength: body.length });

    if (!to || !subject || !body || !userId || !status) {
      console.error('[send-email Edge Function] Missing required fields in payload.');
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, body, userId, status' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Initialize Supabase client for the Edge Function (still needed for profile fetching)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for profile fetching
      {
        auth: {
          persistSession: false,
        },
      }
    );
    console.log('[send-email Edge Function] Supabase client initialized.');
    console.log('[send-email Edge Function] SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? 'Loaded' : 'Missing');
    console.log('[send-email Edge Function] SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Loaded' : 'Missing');

    // Fetch user's profile to get full_name for a more personalized email, if available
    console.log('[send-email Edge Function] Attempting to fetch user profile for personalization...');
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.warn('Failed to fetch user profile for email personalization:', profileError?.message || 'User not found');
      // Continue without full_name if not found
    } else {
      console.log('[send-email Edge Function] User profile fetched. Full Name:', userProfile.full_name);
    }

    // Initialize Resend client
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[send-email Edge Function] RESEND_API_KEY is not set.');
      return new Response(JSON.stringify({ error: 'Resend API key not configured.' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
    const resend = new Resend(resendApiKey);
    console.log('[send-email Edge Function] Resend client initialized.');

    try {
      console.log('[send-email Edge Function] Sending email via Resend...');
      const { data, error } = await resend.emails.send({
        from: 'ricardo@ihackmyfuture.com', // ALTERADO: Usando o endereço de e-mail verificado
        to: to,
        subject: subject,
        html: body,
      });

      if (error) {
        console.error('[send-email Edge Function] Error sending email with Resend:', error);
        return new Response(JSON.stringify({ error: `Failed to send email: ${error.message}` }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }

      console.log(`[send-email Edge Function] Email sent successfully to ${to} for user ${userId} with status ${status}. Resend ID: ${data?.id}`);

      return new Response(JSON.stringify({ message: 'Email sent successfully' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch (emailError: any) {
      console.error('[send-email Edge Function] Error during Resend email send operation:', emailError.message, emailError);
      return new Response(JSON.stringify({ error: `Failed to send email: ${emailError.message}` }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  } catch (error: any) {
    console.error('[send-email Edge Function] General error in send-email function:', error.message, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});
