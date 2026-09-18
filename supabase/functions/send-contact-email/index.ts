// Edge Function: send-contact-email
// Envia um e-mail de notificação para o endereço configurado em
// site_settings.contact_recipient_email sempre que alguém preenche o
// formulário de contato do site.
//
// Deploy (com Supabase CLI já logado no seu projeto):
//   supabase functions deploy send-contact-email
//   supabase secrets set RESEND_API_KEY=sua_chave_da_resend
//
// Crie uma conta gratuita em https://resend.com para obter a chave.
// Sem essa função implantada, o site continua funcionando normalmente:
// as mensagens são sempre salvas na tabela contact_messages e ficam
// visíveis no painel admin em "Mensagens".

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: settings } = await supabase
      .from('site_settings')
      .select('contact_recipient_email, company_name')
      .eq('id', 1)
      .maybeSingle();

    const recipient = settings?.contact_recipient_email;

    if (!recipient || !RESEND_API_KEY) {
      // Configuração incompleta — a mensagem já está salva no banco, então
      // não é um erro fatal, apenas não há e-mail para enviar.
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyName = settings?.company_name || 'Marcos Cozatti';

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} <onboarding@resend.dev>`,
        to: [recipient],
        reply_to: email,
        subject: `Novo contato pelo site — ${name}`,
        html: `
          <h2>Nova mensagem recebida pelo site</h2>
          <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
          <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
          ${phone ? `<p><strong>Telefone:</strong> ${escapeHtml(phone)}</p>` : ''}
          <p><strong>Mensagem:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      throw new Error(`Falha ao enviar e-mail: ${errText}`);
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
