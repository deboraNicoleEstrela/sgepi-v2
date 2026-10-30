// ==========================================
// IMPORTAÇÃO DE MÓDULOS E CONFIGURAÇÕES
// ==========================================
require('dotenv').config(); 
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 

const app = express();
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sgepi_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ==========================================
// FUNÇÕES AUXILIARES DE GERADORES DE ACESSO
// ==========================================
function gerarEmailAcesso(nome, setor) {
  const removerAcentos = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const partesNome = removerAcentos(nome).trim().split(" ");
  const primeiroNome = partesNome[0];
  const setorFormatado = removerAcentos(setor).replace(/[^a-z0-9]/g, "");

  return `${primeiroNome}@${setorFormatado}.com.br`;
}

async function sincronizarUsuariosPendentes() {
  const query = `
    SELECT c.id, c.nome, c.cpf, c.setor 
    FROM colaboradores c
    LEFT JOIN usuarios u ON c.id = u.colaborador_id
    WHERE u.id IS NULL
  `;

  db.query(query, async (err, colaboradoresSemUsuario) => {
    if (err) return console.error('Erro ao consultar colaboradores pendentes:', err);

    if (colaboradoresSemUsuario.length > 0) {
      console.log(`Encontrados ${colaboradoresSemUsuario.length} colaboradores sem usuário. Gerando credenciais...`);

      for (const colab of colaboradoresSemUsuario) {
        const emailAcesso = gerarEmailAcesso(colab.nome, colab.setor);
        const senhaHash = await bcrypt.hash(colab.cpf, 10);

        db.query(
          'INSERT INTO usuarios (colaborador_id, nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?, "COMUM")',
          [colab.id, colab.nome, emailAcesso, senhaHash],
          (errInsert) => {
            if (errInsert) {
              console.error(`Erro ao criar usuário para ${colab.nome}:`, errInsert.message);
            } else {
              console.log(`Usuário criado: ${emailAcesso} (Senha: ${colab.cpf})`);
            }
          }
        );
      }
    }
  });
}

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO JWT
// ==========================================
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado.' });

  jwt.verify(token, process.env.JWT_SECRET || 'chave_secreta_padrao', (err, decodificado) => {
    if (err) return res.status(403).json({ error: 'Token inválido.' });
    req.usuario = decodificado;
    next();
  });
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO E UTILIZADORES
// ==========================================
app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body; 
  if (!usuario || !senha) return res.status(400).json({ error: 'Preencha os campos!' });

  db.query('SELECT id, nome, email, perfil, senha_hash FROM usuarios WHERE email = ?', [usuario], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro no servidor.' });
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Credenciais inválidas!' });

    const user = results[0];
    const senhaValida = await bcrypt.compare(senha, user.senha_hash);

    if (senhaValida) {
      const token = jwt.sign(
        { id: user.id, email: user.email, perfil: user.perfil },
        process.env.JWT_SECRET || 'chave_secreta_padrao',
        { expiresIn: '8h' }
      );
      return res.json({ success: true, token, user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil }});
    } else {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas!' });
    }
  });
});

app.post('/api/usuarios', verificarToken, async (req, res) => {
  const { nome, email, senha, perfil } = req.body;

  try {
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    const sql = 'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)';
    db.query(sql, [nome, email, senhaHash, perfil || 'COMUM'], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Utilizador criado com sucesso!' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar a senha.' });
  }
});

// ==========================================
// ROTAS DE COLABORADORES
// ==========================================
app.post('/api/colaboradores', verificarToken, async (req, res) => {
  const { nome, cpf, matricula, setor, cargo, status } = req.body;

  const sqlColab = 'INSERT INTO colaboradores (nome, cpf, matricula, setor, cargo, status) VALUES (?, ?, ?, ?, ?, ?)';
  
  db.query(sqlColab, [nome, cpf, matricula, setor, cargo, status || 'ATIVO'], async (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const colaboradorId = result.insertId;
    const emailAcesso = gerarEmailAcesso(nome, setor);
    const senhaHash = await bcrypt.hash(cpf, 10);

    const sqlUser = 'INSERT INTO usuarios (colaborador_id, nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?, "COMUM")';
    db.query(sqlUser, [colaboradorId, nome, emailAcesso, senhaHash], (errUser) => {
      if (errUser) {
        console.error('Erro ao gerar usuário automático:', errUser.message);
      }
      res.status(201).json({ message: 'Colaborador e credenciais criados com sucesso!', id: colaboradorId });
    });
  });
});

app.get('/api/colaboradores', verificarToken, (req, res) => {
  db.query('SELECT * FROM colaboradores ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.put('/api/colaboradores/:id', verificarToken, (req, res) => {
  const { id } = req.params;
  const { nome, cpf, matricula, setor, cargo, status } = req.body;

  const sql = 'UPDATE colaboradores SET nome = ?, cpf = ?, matricula = ?, setor = ?, cargo = ?, status = ? WHERE id = ?';
  db.query(sql, [nome, cpf, matricula, setor, cargo, status || 'ATIVO', id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Colaborador não encontrado.' });
    res.json({ message: 'Colaborador atualizado com sucesso!' });
  });
});

app.patch('/api/colaboradores/:id/status', verificarToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const sql = 'UPDATE colaboradores SET status = ? WHERE id = ?';

  db.query(sql, [status, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Status atualizado com sucesso!' });
  });
});

// ==========================================
// ROTAS DE GESTÃO DE ESTOQUE DE EPIs
// ==========================================
app.get('/api/epis', verificarToken, (req, res) => {
    const query = 'SELECT * FROM epis ORDER BY nome ASC';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro interno ao buscar o estoque de EPIs.' });
        res.json(results);
    });
});

app.get('/api/epis/disponiveis', verificarToken, (req, res) => {
    db.query('SELECT id, nome, ca_numero FROM epis WHERE quantidade_estoque > 0', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
});

app.post('/api/epis', verificarToken, (req, res) => {
    const { nome, descricao, ca_numero, quantidade_estoque, validade_ca } = req.body;
    
    if (!nome || quantidade_estoque == null || !ca_numero || !validade_ca) {
        return res.status(400).json({ erro: 'Nome, CA, Quantidade e Validade são obrigatórios.' });
    }

    const query = 'INSERT INTO epis (nome, descricao, ca_numero, quantidade_estoque, validade_ca) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [nome, descricao, ca_numero, quantidade_estoque, validade_ca], (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao cadastrar o EPI no sistema.' });
        res.status(201).json({ mensagem: 'EPI cadastrado com sucesso!', id: results.insertId });
    });
});

app.put('/api/epis/:id', verificarToken, (req, res) => {
    const { id } = req.params;
    const { nome, descricao, ca_numero, quantidade_estoque, validade_ca } = req.body;

    const query = 'UPDATE epis SET nome = ?, descricao = ?, ca_numero = ?, quantidade_estoque = ?, validade_ca = ? WHERE id = ?';
    db.query(query, [nome, descricao, ca_numero, quantidade_estoque, validade_ca, id], (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar os dados do EPI.' });
        if (results.affectedRows === 0) return res.status(404).json({ erro: 'EPI não encontrado.' });
        res.json({ mensagem: 'EPI atualizado com sucesso!' });
    });
});

app.delete('/api/epis/:id', verificarToken, (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM epis WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ erro: 'Não é possível remover este EPI pois existem empréstimos vinculados a ele.' });
            }
            return res.status(500).json({ erro: 'Erro ao remover o EPI.' });
        }
        if (results.affectedRows === 0) return res.status(404).json({ erro: 'EPI não encontrado.' });
        res.json({ mensagem: 'EPI removido com sucesso!' });
    });
});

// ==========================================
// ROTAS DE EMPRÉSTIMOS DE EPIs (Transações)
// ==========================================
app.get('/api/emprestimos', verificarToken, (req, res) => {
    const query = `
        SELECT 
            emp.id, emp.colaborador_id, emp.epi_id, emp.data_retirada, 
            emp.data_devolucao_prevista, emp.data_devolucao_real, 
            emp.status, emp.observacao,
            c.nome AS colaborador_nome, e.nome AS epi_nome
        FROM emprestimos emp
        JOIN colaboradores c ON emp.colaborador_id = c.id
        JOIN epis e ON emp.epi_id = e.id
        ORDER BY emp.data_retirada DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar o histórico de empréstimos.' });
        res.json(results);
    });
});

app.post('/api/emprestimos', verificarToken, (req, res) => {
    const { colaborador_id, epi_id, usuario_id, data_devolucao_prevista, quantidade } = req.body;
    const qtdRetirada = quantidade || 1;

    if (!colaborador_id || !epi_id || !usuario_id || !data_devolucao_prevista) {
        return res.status(400).json({ erro: 'Colaborador, EPI, Usuário e Data Prevista são obrigatórios.' });
    }

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ erro: 'Erro ao obter conexão com o banco de dados.' });

        connection.beginTransaction((err) => {
            if (err) { connection.release(); return res.status(500).json({ erro: 'Erro ao iniciar transação.' }); }

            connection.query('SELECT quantidade_estoque FROM epis WHERE id = ?', [epi_id], (err, results) => {
                if (err || results.length === 0) return connection.rollback(() => { connection.release(); res.status(404).json({ erro: 'EPI não encontrado.' }); });

                const estoqueAtual = results[0].quantidade_estoque;
                if (estoqueAtual < qtdRetirada) return connection.rollback(() => { connection.release(); res.status(400).json({ erro: `Estoque insuficiente. Disponível: ${estoqueAtual}` }); });

                const insertQuery = `INSERT INTO emprestimos (colaborador_id, epi_id, usuario_id, data_devolucao_prevista, quantidade, status) VALUES (?, ?, ?, ?, ?, 'EMPRESTADO')`;
                connection.query(insertQuery, [colaborador_id, epi_id, usuario_id, data_devolucao_prevista, qtdRetirada], (err, result) => {
                    if (err) return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao registar o empréstimo.' }); });

                    connection.query('UPDATE epis SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?', [qtdRetirada, epi_id], (err, result) => {
                        if (err) return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao atualizar o estoque.' }); });

                        connection.commit((err) => {
                            if (err) return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao finalizar transação.' }); });
                            connection.release();
                            res.status(201).json({ mensagem: 'Empréstimo registado e estoque atualizado com sucesso!' });
                        });
                    });
                });
            });
        });
    });
});

app.put('/api/emprestimos/:id/devolucao', verificarToken, (req, res) => {
    const { id } = req.params;
    const { condicao_devolucao, observacao } = req.body;

    let condicaoEnum = 'PERFEITO';
    if (condicao_devolucao === 'DANIFICADO') condicaoEnum = 'DANIFICADO';
    if (condicao_devolucao === 'DESCARTE') condicaoEnum = 'DESCARTE';
    if (condicao_devolucao === 'HIGIENIZACAO') condicaoEnum = 'HIGIENIZACAO';

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ erro: 'Erro ao obter conexão com o banco de dados.' });

        connection.beginTransaction((err) => {
            if (err) { connection.release(); return res.status(500).json({ erro: 'Erro ao iniciar transação.' }); }

            connection.query('SELECT epi_id, quantidade, status FROM emprestimos WHERE id = ?', [id], (err, results) => {
                if (err || results.length === 0) return connection.rollback(() => { connection.release(); res.status(404).json({ erro: 'Empréstimo não encontrado.' }); });

                const emprestimo = results[0];
                if (emprestimo.status === 'DEVOLVIDO') return connection.rollback(() => { connection.release(); res.status(400).json({ erro: 'Este empréstimo já foi devolvido.' }); });

                const updateEmprestimoQuery = `UPDATE emprestimos SET status = 'DEVOLVIDO', data_devolucao_real = NOW(), condicao_devolucao = ?, observacao = ? WHERE id = ?`;
                connection.query(updateEmprestimoQuery, [condicaoEnum, observacao || null, id], (err, result) => {
                    if (err) return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao registar a devolução.' }); });

                    if (condicaoEnum !== 'DESCARTE') {
                        connection.query('UPDATE epis SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?', [emprestimo.quantidade, emprestimo.epi_id], (err, result) => {
                            if (err) return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao repor o estoque.' }); });
                            
                            connection.commit((err) => {
                                if (err) return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao finalizar transação.' }); });
                                connection.release();
                                res.json({ mensagem: 'Devolução registada e estoque reposto com sucesso!' });
                            });
                        });
                    } else {
                        connection.commit((err) => {
                            if (err) return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao finalizar transação.' }); });
                            connection.release();
                            res.json({ mensagem: 'Devolução registada como DESCARTE. O estoque não foi reposto.' });
                        });
                    }
                });
            });
        });
    });
});

// ==========================================
// ROTAS DE REQUISIÇÕES
// ==========================================
app.post('/api/requisicoes', verificarToken, (req, res) => {
  const { usuario_id, epi_id, tipo, descricao } = req.body;
  db.query(`INSERT INTO requisicoes (usuario_id, epi_id, tipo, descricao) VALUES (?, ?, ?, ?)`, 
  [usuario_id, epi_id, tipo, descricao], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/requisicoes/usuario/:id', verificarToken, (req, res) => {
  const sql = `SELECT r.*, e.nome as epi_nome, e.ca_numero FROM requisicoes r JOIN epis e ON r.epi_id = e.id WHERE r.usuario_id = ? ORDER BY r.criado_em DESC`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/requisicoes', verificarToken, (req, res) => {
  const sql = `SELECT r.*, u.nome as usuario_nome, e.nome as epi_nome, e.ca_numero FROM requisicoes r JOIN usuarios u ON r.usuario_id = u.id JOIN epis e ON r.epi_id = e.id ORDER BY r.criado_em DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.put('/api/requisicoes/:id/processar', verificarToken, (req, res) => {
  const { status, condicao_devolucao } = req.body;
  
  const sqlSelect = `SELECT r.*, u.nome as usuario_nome FROM requisicoes r JOIN usuarios u ON r.usuario_id = u.id WHERE r.id = ?`;
  db.query(sqlSelect, [req.params.id], (err, reqs) => {
    if (err || reqs.length === 0) return res.status(404).json({ error: 'Não encontrado' });
    const requisicao = reqs[0];

    db.query('UPDATE requisicoes SET status = ?, condicao_devolucao = ? WHERE id = ?', [status, condicao_devolucao || null, req.params.id], (err) => {
      
      if (status === 'APROVADA' && requisicao.tipo === 'RETIRADA') {
        db.query('UPDATE epis SET quantidade_estoque = quantidade_estoque - 1 WHERE id = ?', [requisicao.epi_id]);
        
        db.query('SELECT id FROM colaboradores WHERE nome LIKE ? LIMIT 1', [`%${requisicao.usuario_nome}%`], (err, colabs) => {
          const colab_id = (colabs && colabs.length > 0) ? colabs[0].id : 1; 
          db.query('INSERT INTO emprestimos (colaborador_id, epi_id, usuario_id, data_devolucao_prevista) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))', 
          [colab_id, requisicao.epi_id, requisicao.usuario_id]);
        });
      }
      
      if (status === 'APROVADA' && requisicao.tipo === 'DEVOLUCAO' && condicao_devolucao === 'PERFEITO') {
        db.query('UPDATE epis SET quantidade_estoque = quantidade_estoque + 1 WHERE id = ?', [requisicao.epi_id]);
      }
      res.json({ success: true });
    });
  });
});

app.put('/api/requisicoes/notificar/:usuario_id', verificarToken, (req, res) => {
  db.query('UPDATE requisicoes SET notificado = 1 WHERE usuario_id = ? AND status = "APROVADA" AND notificado = 0', [req.params.usuario_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR E SINCRONIZAÇÃO
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend a rodar na porta ${PORT}`);
  sincronizarUsuariosPendentes();
});