const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { executarPesquisador, aprovarPauta, descartarPauta, substituirPauta, getPautas } = require('./pesquisador');

const app = express();
app.use(cors());
app.use(express.json());

// Rota para disparar pesquisa
app.post('/pesquisar', async (req, res) => {
  const { sugestao } = req.body;
  res.json({ status: 'Pesquisa iniciada! O email chegará em alguns minutos.' });
  executarPesquisador(sugestao || '').catch(err => {
    console.error('Erro no pesquisador:', err.message);
  });
});

// Aprovar pauta
app.get('/aprovar/:id', async (req, res) => {
  const { id } = req.params;
  const pautas = getPautas();
  const pauta = pautas[id];

  if (!pauta) {
    return res.send(paginaResposta('❌ Pauta não encontrada.', 'vermelho'));
  }

  pauta.status = 'aprovada';
  console.log(`Pauta ${id} aprovada: ${pauta.titulo}`);
  res.send(paginaResposta(`✅ Pauta aprovada!`, 'verde', pauta.titulo));
});

// Descartar pauta
app.get('/descartar/:id', async (req, res) => {
  const { id } = req.params;
  const pautas = getPautas();
  const pauta = pautas[id];

  if (!pauta) {
    return res.send(paginaResposta('❌ Pauta não encontrada.', 'vermelho'));
  }

  pauta.status = 'descartada';
  console.log(`Pauta ${id} descartada: ${pauta.titulo}`);
  res.send(paginaResposta(`❌ Pauta descartada.`, 'cinza', pauta.titulo));
});

// Página de substituição
app.get('/substituir/:id', async (req, res) => {
  const { id } = req.params;
  const pautas = getPautas();
  const pauta = pautas[id];

  if (!pauta) {
    return res.send(paginaResposta('❌ Pauta não encontrada.', 'vermelho'));
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Substituir Pauta</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
        .card { background: #fff; border-radius: 12px; padding: 24px; }
        .tag { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #c41c1c; margin-bottom: 8px; }
        h2 { font-size: 16px; color: #1a1a1a; margin-bottom: 4px; }
        .atual { font-size: 13px; color: #888; margin-bottom: 24px; }
        textarea { width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 12px; font-size: 14px; height: 100px; resize: none; box-sizing: border-box; }
        button { width: 100%; background: #c41c1c; color: #fff; border: none; border-radius: 8px; padding: 14px; font-size: 14px; cursor: pointer; margin-top: 12px; }
        button:hover { background: #a51818; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="tag">SMA Advogados — Substituir Pauta</div>
        <h2>Pauta atual:</h2>
        <div class="atual">${pauta.titulo}</div>
        <textarea id="sugestao" placeholder="Descreva o novo tema. Ex: Quero um post sobre golpe do Pix em idosos"></textarea>
        <button onclick="enviar()">Substituir pauta</button>
      </div>
      <script>
        async function enviar() {
          const sugestao = document.getElementById('sugestao').value;
          if (!sugestao.trim()) { alert('Digite o novo tema.'); return; }
          const res = await fetch('/substituir/${id}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sugestao })
          });
          const data = await res.json();
          document.body.innerHTML = '<div style="text-align:center;padding:60px;font-family:Arial"><div style="font-size:40px">🔄</div><h2>Substituição solicitada!</h2><p style="color:#888">A nova pauta chegará por email em alguns minutos.</p></div>';
        }
      </script>
    </body>
    </html>
  `);
});

// Processar substituição
app.post('/substituir/:id', async (req, res) => {
  const { id } = req.params;
  const { sugestao } = req.body;
  res.json({ status: 'Substituição iniciada!' });
  substituirPauta(id, sugestao).catch(err => console.error('Erro substituição:', err.message));
});

// Status geral das pautas
app.get('/status', (req, res) => {
  const pautas = getPautas();
  res.json(pautas);
});

// Página de resposta simples
function paginaResposta(mensagem, cor, titulo) {
  const cores = { verde: '#1a6b3a', vermelho: '#c41c1c', cinza: '#666' };
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SMA Pesquisador</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .card { background: #fff; border-radius: 12px; padding: 40px; text-align: center; max-width: 400px; }
        h2 { color: ${cores[cor] || '#333'}; font-size: 20px; margin-bottom: 8px; }
        p { color: #888; font-size: 13px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>${mensagem}</h2>
        ${titulo ? `<p>${titulo}</p>` : ''}
        <p style="margin-top:16px;font-size:11px;color:#bbb;">SMA Advogados · Pipeline de Conteúdo</p>
      </div>
    </body>
    </html>
  `;
}

// Agendamento todo domingo às 9h
cron.schedule('0 12 * * 0', async () => {
  console.log('Iniciando pesquisa automática de domingo...');
  await executarPesquisador('');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor SMA rodando na porta ${PORT}`));
