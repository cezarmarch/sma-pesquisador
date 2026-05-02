const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { executarPesquisador, confirmarAprovacao } = require('./pesquisador');

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

// Rota para aprovar pautas
app.post('/aprovar', async (req, res) => {
  const { indices } = req.body;
  try {
    await confirmarAprovacao(indices);
    res.json({ status: 'Aprovação registrada! Email de confirmação enviado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota de status
app.get('/', (req, res) => {
  res.json({ status: 'SMA Pesquisador rodando!', hora: new Date().toLocaleString('pt-BR') });
});

// Agendamento todo domingo às 9h
cron.schedule('0 12 * * 0', async () => {
  console.log('Iniciando pesquisa automática de domingo...');
  await executarPesquisador('');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor SMA rodando na porta ${PORT}`));
