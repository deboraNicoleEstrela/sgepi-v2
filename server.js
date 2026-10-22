const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors()); // Permite que o Front-end aceda à API
app.use(express.json()); // Permite receber dados em formato JSON

// 1. Configuração da ligação ao banco de dados MySQL (sgepi_db)
const db = mysql.createPool({
  host: 'localhost',
  user: 'usuario_aqui',          // Substitua pelo seu utilizador do MySQL
  password: 'senha_aqui',  // Substitua pela sua palavra-passe do MySQL
  database: 'sgepi_db',   // Nome da base de dados do ficheiro
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


app.get('/api/colaboradores', (req, res) => {
  const sql = 'SELECT * FROM colaboradores ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 3. Rota para Cadastrar Colaborador (CREATE)
app.post('/api/colaboradores', (req, res) => {
  const { nome, cpf, matricula, setor, cargo } = req.body;
  const sql = 'INSERT INTO colaboradores (nome, cpf, matricula, setor, cargo) VALUES (?, ?, ?, ?, ?)';
  
  db.query(sql, [nome, cpf, matricula, setor, cargo], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, message: 'Colaborador registado com sucesso!' });
  });
});

// 4. Rota para Inativar/Atualizar Status do Colaborador (UPDATE)
app.patch('/api/colaboradores/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = 'UPDATE colaboradores SET status = ? WHERE id = ?';

  db.query(sql, [status, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Status atualizado com sucesso!' });
  });
});

// Inicialização do servidor na porta 3000
app.listen(3000, () => {
  console.log('Servidor backend a rodar em http://localhost:3000');
});

// Rota de Autenticação / Login
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body; // O campo 'usuario' do formulário será tratado como o e-mail

  if (!usuario || !senha) {
    return res.status(400).json({ error: 'Preencha e-mail e senha!' });
  }

  // Consulta ajustada para usar 'email' e 'senha_hash'
  const sql = 'SELECT id, nome, email, perfil FROM usuarios WHERE email = ? AND senha_hash = ?';
  
  db.query(sql, [usuario, senha], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro no servidor de autenticação.' });

    if (results.length > 0) {
      const user = results[0];
      return res.json({ 
        success: true, 
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil
        }
      });
    } else {
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos!' });
    }
  });
});
