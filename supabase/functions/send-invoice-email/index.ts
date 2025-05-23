import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, invoiceNumber, customerName, amount, attachmentPath } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate a signed URL that's valid for 24 hours
    const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
      .from('invoicefiles')
      .createSignedUrl(attachmentPath, 86400); // 24 hours in seconds

    if (signedUrlError) throw signedUrlError;

    const emailContent = `
      <h2>Invoice #${invoiceNumber}</h2>
      <p>Dear ${customerName},</p>
      <p>Please find attached your invoice for ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(Number(amount))}.</p>
      <p>You can view your invoice by clicking <a href="${signedUrl}">here</a>.</p>
      <p>Thank you for your business!</p>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'invoicing@resend.dev',
        to,
        subject: `Invoice #${invoiceNumber}`,
        html: emailContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});