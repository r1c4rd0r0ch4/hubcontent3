import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

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

  if (req.method !== 'POST') {
    console.warn('[send-email Edge Function] Method Not Allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client for the Edge Function
    // Using SUPABASE_SERVICE_ROLE_KEY to bypass RLS for fetching SMTP settings and user profiles
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );
    console.log('[send-email Edge Function] Supabase client initialized.');

    // Fetch SMTP settings from the database
    console.log('[send-email Edge Function] Attempting to fetch SMTP settings...');
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (smtpError || !smtpSettings) {
      console.error('Failed to fetch SMTP settings:', smtpError?.message || 'No settings found');
      return new Response(JSON.stringify({ error: 'Failed to fetch SMTP settings' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.log('[send-email Edge Function] SMTP settings fetched successfully. Host:', smtpSettings.host, 'Port:', smtpSettings.port);

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

    const client = new SmtpClient();
    try {
      console.log('[send-email Edge Function] Connecting to SMTP server...');
      await client.connect({
        hostname: smtpSettings.host,
        port: smtpSettings.port,
        tls: smtpSettings.secure,
        username: smtpSettings.username,
        password: smtpSettings.password,
      });
      console.log('[send-email Edge Function] Connected to SMTP server. Sending email...');

      await client.send({
        from: smtpSettings.from_email,
        to: to,
        subject: subject,
        content: body,
        html: true, // Indicate that the content is HTML
      });

      console.log(`[send-email Edge Function] Email sent successfully to ${to} for user ${userId} with status ${status}`);

      return new Response(JSON.stringify({ message: 'Email sent successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (emailError: any) {
      console.error('[send-email Edge Function] Error sending email:', emailError.message, emailError);
      return new Response(JSON.stringify({ error: `Failed to send email: ${emailError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      console.log('[send-email Edge Function] Closing SMTP client connection.');
      await client.close();
    }
  } catch (error: any) {
    console.error('[send-email Edge Function] General error in send-email function:', error.message, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
