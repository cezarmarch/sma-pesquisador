const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { executarPesquisador } = require('./pesquisador');

const app = express();
app.use(cors());
app.use(express.json());

// Rota para disparar manualmente
app.post('/pesquisar', async (req, res) => {
  const { sugestao } = req.body;
  try {
    await executarPesquisador(sugestao || '');
    res.json({ status: 'Pesquisa iniciada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota de status
app.get('/', (req, res) => {
  res.json({ status: 'SMA Pesquisador rodando!', hora: new Date().toLocaleString('pt-BR') });
});

// Agendamento: todo domingo às 9h (horário de Brasília = UTC-3, então 12h UTC)
cron.schedule('0 12 * * 0', async () => {
  console.log('Iniciando pesquisa automática de domingo...');
  await executarPesquisador('');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor SMA rodando na porta ${PORT}`));
