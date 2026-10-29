// ==========================================
// IMPORTAÇÃO DE MÓDULOS E CONFIGURAÇÕES
// ==========================================
require('dotenv').config(); 
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Adicionado módulo JWT

const app = express();
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ==========================================
// CONFIGURAÇÃO DA BASE DE DADOS (Usando .env)
// ==========================================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO JWT
// ==========================================
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extrai "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'chave_secreta_padrao', (err, usuarioDecodificado) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
    req.usuario = usuarioDecodificado;
    next();
  });
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO E UTILIZADORES
// ==========================================

// Rota de Autenticação / Login (COM BCRYPT E JWT)
// ROTA DEFINITIVA DE LOGIN NO SERVER.JS
app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body; 

  if (!usuario || !senha) {
    return res.status(400).json({ error: 'Preencha e-mail e senha!' });
  }

  const sql = 'SELECT id, nome, email, perfil, senha_hash FROM usuarios WHERE email = ?';
  
  db.query(sql, [usuario], async (err, results) => {
    if (err) {
      console.error('Erro na consulta do Banco:', err);
      return res.status(500).json({ error: 'Erro no servidor de autenticação.' });
    }

    if (results.length > 0) {
      const user = results[0];
      
      const senhaValida = await bcrypt.compare(senha, user.senha_hash);

      if (senhaValida) {
        const token = jwt.sign(
          { id: user.id, email: user.email, perfil: user.perfil },
          process.env.JWT_SECRET || 'chave_secreta_padrao',
          { expiresIn: '8h' }
        );

        return res.json({ 
          success: true, 
          token: token,
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
    } else {
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos!' });
    }
  });
});

// Rota para Cadastrar Utilizadores com Senha Encriptada (CREATE)
app.post('/api/usuarios', async (req, res) => {
  const { nome, email, senha, perfil } = req.body;

  try {
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    const sql = 'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)';
    db.query(sql, [nome, email, senhaHash, perfil || 'usuario'], (err, result) => {
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

app.get('/api/colaboradores', (req, res) => {
  const sql = 'SELECT * FROM colaboradores ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/colaboradores', (req, res) => {
  const { nome, cpf, matricula, setor, cargo } = req.body;
  const sql = 'INSERT INTO colaboradores (nome, cpf, matricula, setor, cargo) VALUES (?, ?, ?, ?, ?)';
  
  db.query(sql, [nome, cpf, matricula, setor, cargo], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, message: 'Colaborador registado com sucesso!' });
  });
});

// ADICIONADO: Rota de Atualização Total de Colaborador (PUT)
app.put('/api/colaboradores/:id', (req, res) => {
  const { id } = req.params;
  const { nome, cpf, matricula, setor, cargo, status } = req.body;

  const sql = 'UPDATE colaboradores SET nome = ?, cpf = ?, matricula = ?, setor = ?, cargo = ?, status = ? WHERE id = ?';
  db.query(sql, [nome, cpf, matricula, setor, cargo, status || 'ATIVO', id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Colaborador não encontrado.' });
    res.json({ message: 'Colaborador atualizado com sucesso!' });
  });
});

app.patch('/api/colaboradores/:id/status', (req, res) => {
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

app.get('/api/epis', (req, res) => {
    const query = 'SELECT * FROM epis ORDER BY nome ASC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar EPIs:', err);
            return res.status(500).json({ erro: 'Erro interno ao buscar o estoque de EPIs.' });
        }
        res.json(results);
    });
});

app.post('/api/epis', (req, res) => {
    const { nome, descricao, ca_numero, quantidade_estoque, validade_ca } = req.body;
    
    if (!nome || quantidade_estoque == null || !ca_numero || !validade_ca) {
        return res.status(400).json({ erro: 'Nome, CA, Quantidade e Validade são obrigatórios.' });
    }

    const query = 'INSERT INTO epis (nome, descricao, ca_numero, quantidade_estoque, validade_ca) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [nome, descricao, ca_numero, quantidade_estoque, validade_ca], (err, results) => {
        if (err) {
            console.error('Erro ao inserir EPI:', err);
            return res.status(500).json({ erro: 'Erro ao cadastrar o EPI no sistema.' });
        }
        res.status(201).json({ mensagem: 'EPI cadastrado com sucesso!', id: results.insertId });
    });
});

app.put('/api/epis/:id', (req, res) => {
    const { id } = req.params;
    const { nome, descricao, ca_numero, quantidade_estoque, validade_ca } = req.body;

    const query = 'UPDATE epis SET nome = ?, descricao = ?, ca_numero = ?, quantidade_estoque = ?, validade_ca = ? WHERE id = ?';
    db.query(query, [nome, descricao, ca_numero, quantidade_estoque, validade_ca, id], (err, results) => {
        if (err) {
            console.error('Erro ao atualizar EPI:', err);
            return res.status(500).json({ erro: 'Erro ao atualizar os dados do EPI.' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ erro: 'EPI não encontrado.' });
        }
        res.json({ mensagem: 'EPI atualizado com sucesso!' });
    });
});

app.delete('/api/epis/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM epis WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Erro ao deletar EPI:', err);
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ erro: 'Não é possível remover este EPI pois existem empréstimos vinculados a ele.' });
            }
            return res.status(500).json({ erro: 'Erro ao remover o EPI.' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ erro: 'EPI não encontrado.' });
        }
        res.json({ mensagem: 'EPI removido com sucesso!' });
    });
});


// ==========================================
// ROTAS DE EMPRÉSTIMOS DE EPIs (Transações)
// ==========================================

app.post('/api/emprestimos', (req, res) => {
    const { colaborador_id, epi_id, usuario_id, data_devolucao_prevista, quantidade } = req.body;
    
    const qtdRetirada = quantidade || 1;

    if (!colaborador_id || !epi_id || !usuario_id || !data_devolucao_prevista) {
        return res.status(400).json({ erro: 'Colaborador, EPI, Usuário e Data Prevista são obrigatórios.' });
    }

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ erro: 'Erro ao obter conexão com o banco de dados.' });

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                return res.status(500).json({ erro: 'Erro ao iniciar transação.' });
            }

            connection.query('SELECT quantidade_estoque FROM epis WHERE id = ?', [epi_id], (err, results) => {
                if (err || results.length === 0) {
                    return connection.rollback(() => { connection.release(); res.status(404).json({ erro: 'EPI não encontrado.' }); });
                }

                const estoqueAtual = results[0].quantidade_estoque;
                if (estoqueAtual < qtdRetirada) {
                    return connection.rollback(() => { connection.release(); res.status(400).json({ erro: `Estoque insuficiente. Disponível: ${estoqueAtual}` }); });
                }

                const insertQuery = `
                    INSERT INTO emprestimos 
                    (colaborador_id, epi_id, usuario_id, data_devolucao_prevista, quantidade, status) 
                    VALUES (?, ?, ?, ?, ?, 'EMPRESTADO')
                `;
                connection.query(insertQuery, [colaborador_id, epi_id, usuario_id, data_devolucao_prevista, qtdRetirada], (err, result) => {
                    if (err) {
                        return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao registar o empréstimo.' }); });
                    }

                    const updateQuery = 'UPDATE epis SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?';
                    connection.query(updateQuery, [qtdRetirada, epi_id], (err, result) => {
                        if (err) {
                            return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao atualizar o estoque.' }); });
                        }

                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao finalizar transação.' }); });
                            }
                            connection.release();
                            res.status(201).json({ mensagem: 'Empréstimo registado e estoque atualizado com sucesso!' });
                        });
                    });
                });
            });
        });
    });
});

app.put('/api/emprestimos/:id/devolucao', (req, res) => {
    const { id } = req.params;
    const { condicao_devolucao, observacao } = req.body;

    let condicaoEnum = 'PERFEITO';
    if (condicao_devolucao === 'DANIFICADO') condicaoEnum = 'DANIFICADO';
    if (condicao_devolucao === 'DESCARTE') condicaoEnum = 'DESCARTE';
    if (condicao_devolucao === 'HIGIENIZACAO') condicaoEnum = 'HIGIENIZACAO';

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ erro: 'Erro ao obter conexão com o banco de dados.' });

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                return res.status(500).json({ erro: 'Erro ao iniciar transação.' });
            }

            connection.query('SELECT epi_id, quantidade, status FROM emprestimos WHERE id = ?', [id], (err, results) => {
                if (err || results.length === 0) {
                    return connection.rollback(() => { connection.release(); res.status(404).json({ erro: 'Empréstimo não encontrado.' }); });
                }

                const emprestimo = results[0];
                if (emprestimo.status === 'DEVOLVIDO') {
                    return connection.rollback(() => { connection.release(); res.status(400).json({ erro: 'Este empréstimo já foi devolvido.' }); });
                }

                const updateEmprestimoQuery = `
                    UPDATE emprestimos 
                    SET status = 'DEVOLVIDO', data_devolucao_real = NOW(), condicao_devolucao = ?, observacao = ? 
                    WHERE id = ?
                `;
                connection.query(updateEmprestimoQuery, [condicaoEnum, observacao || null, id], (err, result) => {
                    if (err) {
                        return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao registar a devolução.' }); });
                    }

                    if (condicaoEnum !== 'DESCARTE') {
                        const updateEstoqueQuery = 'UPDATE epis SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?';
                        connection.query(updateEstoqueQuery, [emprestimo.quantidade, emprestimo.epi_id], (err, result) => {
                            if (err) {
                                return connection.rollback(() => { connection.release(); res.status(500).json({ erro: 'Erro ao repor o estoque.' }); });
                            }
                            
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

app.get('/api/emprestimos', (req, res) => {
    const query = `
        SELECT 
            emp.id, 
            emp.colaborador_id, 
            emp.epi_id, 
            emp.data_retirada, 
            emp.data_devolucao_prevista, 
            emp.data_devolucao_real, 
            emp.status, 
            emp.observacao,
            c.nome AS colaborador_nome,
            e.nome AS epi_nome
        FROM emprestimos emp
        JOIN colaboradores c ON emp.colaborador_id = c.id
        JOIN epis e ON emp.epi_id = e.id
        ORDER BY emp.data_retirada DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar empréstimos:', err);
            return res.status(500).json({ erro: 'Erro ao buscar o histórico de empréstimos.' });
        }
        res.json(results);
    });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend a rodar na porta ${PORT}`);
});