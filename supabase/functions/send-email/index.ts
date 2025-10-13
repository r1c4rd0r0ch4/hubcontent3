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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { to, subject, body, userId, status } = payload;

    if (!to || !subject || !body || !userId || !status) {
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

    // Fetch SMTP settings from the database
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

    // Fetch user's profile to get full_name for a more personalized email, if available
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.warn('Failed to fetch user profile for email personalization:', profileError?.message || 'User not found');
      // Continue without full_name if not found
    }

    const client = new SmtpClient();
    try {
      await client.connect({
        hostname: smtpSettings.host,
        port: smtpSettings.port,
        tls: smtpSettings.secure,
        username: smtpSettings.username,
        password: smtpSettings.password,
      });

      await client.send({
        from: smtpSettings.from_email,
        to: to,
        subject: subject,
        content: body,
        html: true, // Indicate that the content is HTML
      });

      console.log(`Email sent to ${to} for user ${userId} with status ${status}`);

      return new Response(JSON.stringify({ message: 'Email sent successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (emailError: any) {
      console.error('Error sending email:', emailError);
      return new Response(JSON.stringify({ error: `Failed to send email: ${emailError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      await client.close();
    }
  } catch (error: any) {
    console.error('General error in send-email function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
