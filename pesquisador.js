const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Armazena as pautas em memória
let pautasAtivas = {};

function getPautas() {
  return pautasAtivas;
}

async function pesquisarPautas(sugestao) {
  const sugestaoTexto = sugestao
    ? `O editor solicitou atenção especial para: "${sugestao}". Priorize esse tema.`
    : '';

  const prompt = `Você é um pesquisador especializado em direito bancário brasileiro, trabalhando para o escritório SMA Advogados de Niterói/RJ.

O escritório atua com fraudes bancárias, crédito consignado indevido, superendividamento e direitos do consumidor bancário. O público do Instagram são vítimas de fraude bancária e pessoas físicas com problemas com bancos.

${sugestaoTexto}

Pesquise na web notícias, decisões judiciais e tendências recentes sobre:
- Fraudes e golpes em crédito consignado (Agibank, BMG, outros)
- Decisões recentes do STJ e STF sobre direito bancário
- Golpes financeiros em banco digital em alta
- Superendividamento e renegociação de dívidas
- Direitos do consumidor bancário — cobranças indevidas, RMC, RCC
- Dados e estatísticas sobre fraudes bancárias no Brasil

Para cada pauta encontrada, classifique em um dos 3 tipos:
- EDUCATIVO: ensina o público, gera autoridade para o SMA
- VENDAS: converte seguidor em cliente, destaca que o SMA pode ajudar
- INFORMATIVO: dados, alertas, notícias relevantes

Retorne APENAS um JSON válido, sem texto antes ou depois, sem markdown:

{
  "pautas": [
    {
      "titulo": "Título chamativo da pauta",
      "tipo": "EDUCATIVO ou VENDAS ou INFORMATIVO",
      "formato": "CARROSSEL ou REEL ou ESTÁTICO",
      "fonte": "Nome da fonte",
      "data": "Data aproximada",
      "resumo": "Resumo em 3 linhas",
      "angulo": "Como transformar em post",
      "cta": "Call to action sugerido"
    }
  ]
}

Gere 5 pautas equilibrando os 3 tipos.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  console.log('Status API:', response.status);
  console.log('Resposta API:', JSON.stringify(data).substring(0, 500));

  if (!data.content || !Array.isArray(data.content)) {
    throw new Error('Resposta inesperada: ' + JSON.stringify(data).substring(0, 200));
  }

  let rawText = '';
  for (const block of data.content) {
    if (block && block.type === 'text') rawText += block.text;
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON não encontrado na resposta');

  return JSON.parse(jsonMatch[0]);
}

function montarEmail(pautas) {
  const BASE_URL = process.env.BASE_URL || 'https://sma-pesquisador.onrender.com';

  const cores = {
    EDUCATIVO: { bg: '#e8f4fd', borda: '#2980b9', badge: '#2980b9' },
    VENDAS: { bg: '#fdf0e8', borda: '#c41c1c', badge: '#c41c1c' },
    INFORMATIVO: { bg: '#f0fdf4', borda: '#1a6b3a', badge: '#1a6b3a' }
  };

  const now = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  const cardsHtml = pautas.map((p, i) => {
    const cor = cores[p.tipo] || cores.INFORMATIVO;
    return `
      <div style="background:${cor.bg};border-left:4px solid ${cor.borda};border-radius:8px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
          <span style="background:${cor.badge};color:#fff;border-radius:4px;padding:3px 10px;font-size:11px;font-weight:600;">${p.tipo}</span>
          <span style="background:#fff;border:1px solid #ddd;border-radius:4px;padding:3px 10px;font-size:11px;color:#666;">${p.formato}</span>
          <span style="font-size:11px;color:#888;margin-left:auto;">${p.fonte} · ${p.data}</span>
        </div>
        <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px;line-height:1.3;">${i + 1}. ${p.titulo}</div>
        <div style="font-size:13px;color:#444;line-height:1.6;margin-bottom:12px;">${p.resumo}</div>
        <div style="background:#fff;border-radius:6px;padding:12px;margin-bottom:10px;">
          <div style="font-size:10px;font-weight:600;letter-spacing:0.12em;color:${cor.borda};margin-bottom:4px;">ÂNGULO SUGERIDO</div>
          <div style="font-size:13px;color:#333;">${p.angulo}</div>
        </div>
        <div style="background:#fff;border-radius:6px;padding:12px;margin-bottom:16px;">
          <div style="font-size:10px;font-weight:600;letter-spacing:0.12em;color:${cor.borda};margin-bottom:4px;">CALL TO ACTION</div>
          <div style="font-size:13px;color:#333;">${p.cta}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="${BASE_URL}/aprovar/${i}" style="flex:1;background:#1a6b3a;color:#fff;text-decoration:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;text-align:center;display:block;">✅ Aprovar</a>
          <a href="${BASE_URL}/substituir/${i}" style="flex:1;background:#c9a84c;color:#fff;text-decoration:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;text-align:center;display:block;">🔄 Substituir</a>
          <a href="${BASE_URL}/descartar/${i}" style="flex:1;background:#888;color:#fff;text-decoration:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;text-align:center;display:block;">❌ Descartar</a>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#f5f5f5;padding:24px;">
      <div style="background:#0d0d0d;border-radius:12px 12px 0 0;padding:28px 32px;">
        <div style="font-size:10px;letter-spacing:0.2em;color:#c41c1c;text-transform:uppercase;margin-bottom:6px;">SMA Advogados</div>
        <div style="font-size:22px;font-weight:700;color:#fff;">Pautas da Semana</div>
        <div style="font-size:13px;color:#666;margin-top:4px;">${now}</div>
      </div>
      <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;">
        <div style="font-size:13px;color:#888;margin-bottom:20px;">Clique nos botões abaixo para aprovar, substituir ou descartar cada pauta.</div>
        ${cardsHtml}
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center;">
          SMA Advogados · Pipeline de Conteúdo Automático · Niterói/RJ
        </div>
      </div>
    </div>
  `;
}

async function substituirPauta(id, sugestao) {
  console.log(`Substituindo pauta ${id} por: ${sugestao}`);
  const resultado = await pesquisarPautas(sugestao);
  const novasPautas = resultado.pautas || [];

  if (novasPautas.length > 0) {
    pautasAtivas[id] = { ...novasPautas[0], status: 'pendente' };
    console.log(`Pauta ${id} substituída por: ${novasPautas[0].titulo}`);

    await resend.emails.send({
      from: 'SMA Pesquisador <onboarding@resend.dev>',
      to: process.env.EMAIL_DESTINATARIO,
      subject: `🔄 SMA — Pauta ${parseInt(id) + 1} substituída`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
          <div style="font-size:10px;letter-spacing:0.2em;color:#c41c1c;text-transform:uppercase;margin-bottom:8px;">SMA Advogados</div>
          <div style="font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:16px;">Pauta ${parseInt(id) + 1} substituída com sucesso!</div>
          <div style="background:#f0fdf4;border-left:4px solid #1a6b3a;border-radius:8px;padding:16px;">
            <div style="font-size:13px;font-weight:600;color:#1a6b3a;margin-bottom:6px;">Nova pauta:</div>
            <div style="font-size:15px;font-weight:700;color:#1a1a1a;">${novasPautas[0].titulo}</div>
            <div style="font-size:13px;color:#444;margin-top:8px;">${novasPautas[0].resumo}</div>
          </div>
        </div>
      `
    });
  }
}

async function executarPesquisador(sugestao) {
  console.log('Iniciando pesquisador...', sugestao ? `Sugestão: ${sugestao}` : '');
  console.log('Executando pesquisa...');

  const resultado = await pesquisarPautas(sugestao);
  const pautas = resultado.pautas || [];
  console.log(`Pautas geradas: ${pautas.length}`);

  // Salva pautas em memória com status pendente
  pautasAtivas = {};
  pautas.forEach((p, i) => {
    pautasAtivas[i] = { ...p, status: 'pendente' };
  });

  console.log('Enviando email via Resend...');

  try {
    const { data, error } = await resend.emails.send({
      from: 'SMA Pesquisador <onboarding@resend.dev>',
      to: process.env.EMAIL_DESTINATARIO,
      subject: `📋 SMA — ${pautas.length} pautas para aprovação — ${new Date().toLocaleDateString('pt-BR')}`,
      html: montarEmail(pautas)
    });

    if (error) {
      console.error('Erro Resend:', error);
    } else {
      console.log('Email enviado com sucesso! ID:', data.id);
    }
  } catch (emailErr) {
    console.error('Erro ao enviar email:', emailErr.message);
  }

  console.log('Pesquisa concluída.');
}

module.exports = { executarPesquisador, substituirPauta, aprovarPauta: () => {}, descartarPauta: () => {}, getPautas };
