// --- CONTROLE DE SESSÃO E AUTENTICAÇÃO ---
const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
const tokenLogado = sessionStorage.getItem('token');

if (!usuarioLogado) {
  window.location.href = 'login.html';
}

function realizarLogout() {
  sessionStorage.removeItem('usuarioLogado');
  sessionStorage.removeItem('token');
  window.location.href = 'login.html';
}

function carregarDadosUsuario() {
  if (!usuarioLogado) return;

  // 1. Atualiza o nome do utilizador no cabeçalho superior
  const elNomeHeader = document.getElementById('nomeUsuarioLogado');
  if (elNomeHeader) {
    elNomeHeader.textContent = usuarioLogado.nome || 'Administrador';
  }

  // 2. Atualiza o nome no canto inferior da sidebar
  const elNomeSidebar = document.getElementById('nomeUsuarioSidebar');
  if (elNomeSidebar) {
    elNomeSidebar.textContent = usuarioLogado.nome || 'Usuário';
  }

  // 3. Atualiza o perfil/cargo no canto inferior da sidebar
  const elPerfilSidebar = document.getElementById('perfilUsuarioSidebar');
  if (elPerfilSidebar) {
    elPerfilSidebar.textContent = usuarioLogado.perfil || 'Técnico em SST';
  }

  // 4. Gera as iniciais do avatar dinamicamente
  const elAvatarSidebar = document.getElementById('avatarUsuarioSidebar');
  if (elAvatarSidebar && usuarioLogado.nome) {
    const nomeEncoded = encodeURIComponent(usuarioLogado.nome);
    elAvatarSidebar.src = `https://ui-avatars.com/api/?name=${nomeEncoded}&background=0D6EFD&color=fff`;
  }
}

// Variáveis Globais de Controle de Modais
let idColabExcluir = null;
let idEpiExcluir = null;
let modalColabInst = null;
let modalEpiInst = null;
let modalInfoInst = null;

// =============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO & EVENTOS
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Carrega nome e avatar do utilizador logado
  carregarDadosUsuario();

  const elModalColab = document.getElementById('modalColaborador') || document.getElementById('modalExcluir');
  const elModalEpi = document.getElementById('modalEpi') || document.getElementById('modalExcluirEpi');
  const elModalInfo = document.getElementById('modalInfo') || document.getElementById('modalInfoStatus');

  if (elModalColab) modalColabInst = new bootstrap.Modal(elModalColab);
  if (elModalEpi) modalEpiInst = new bootstrap.Modal(elModalEpi);
  if (elModalInfo) modalInfoInst = new bootstrap.Modal(elModalInfo);

  // Aplica limite de 40 caracteres
  document.querySelectorAll('input, textarea').forEach(campo => {
    if (campo.type !== 'date' && campo.type !== 'datetime-local') {
      campo.setAttribute('maxlength', '40');
    }
  });

  // Campo Nome Colaborador
  const inputNome = document.getElementById('nomeColab');
  if (inputNome) {
    inputNome.addEventListener('input', (e) => {
      let v = e.target.value.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ\s]/g, '');
      e.target.value = v.slice(0, 40);
    });
  }

  // Máscara CPF
  const inputCpf = document.getElementById('cpfColab');
  if (inputCpf) {
    inputCpf.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      e.target.value = v.slice(0, 40);
    });
  }

  // Campo Matrícula
  const inputMatricula = document.getElementById('matriculaColab');
  if (inputMatricula) {
    inputMatricula.addEventListener('input', (e) => {
      let v = e.target.value.replace(/[^a-zA-Z0-9\s\-]/g, '-');
      e.target.value = v.slice(0, 40);
    });
  }

  // Campo Cargo
  const inputCargo = document.getElementById('cargoColab');
  if (inputCargo) {
    inputCargo.addEventListener('input', (e) => {
      let v = e.target.value.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ\s\/\-]/g, '-');
      e.target.value = v.slice(0, 40);
    });
  }

  // Nome EPI
  const inputNomeEpi = document.getElementById('nomeEpi');
  if (inputNomeEpi) {
    inputNomeEpi.addEventListener('input', (e) => {
      let v = e.target.value.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ\s]/g, '');
      e.target.value = v.slice(0, 40);
    });
  }

  // C.A. EPI
  const inputCaEpi = document.getElementById('caEpi');
  if (inputCaEpi) {
    inputCaEpi.addEventListener('input', (e) => {
      const apenasNumeros = e.target.value.replace(/\D/g, '');
      if (apenasNumeros.length > 0) {
        e.target.value = `CA-${apenasNumeros}`.slice(0, 40);
      } else {
        e.target.value = '';
      }
    });

    inputCaEpi.addEventListener('keydown', (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.value === 'CA-') {
        e.target.value = '';
      }
    });
  }

  // Observação Empréstimo
  const inputObservacao = document.getElementById('empObservacao');
  if (inputObservacao) {
    inputObservacao.addEventListener('input', (e) => {
      e.target.value = e.target.value.slice(0, 40);
    });
  }

  // Filtro e Pesquisa Colaboradores
  const inputPesquisa = document.getElementById('pesquisaColab');
  const selectTipoPesquisa = document.getElementById('tipoPesquisaColab');

  function aplicarRestricaoPesquisa() {
    if (!inputPesquisa || !selectTipoPesquisa) return;

    const tipo = selectTipoPesquisa.value;
    let v = inputPesquisa.value;

    if (tipo === 'nome' || tipo === 'setor') {
      v = v.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ\s]/g, '');
    } else if (tipo === 'cpf' || tipo === 'matricula') {
      v = v.replace(/\D/g, '');
    }

    inputPesquisa.value = v.slice(0, 40);
  }

  if (inputPesquisa) {
    inputPesquisa.addEventListener('input', () => {
      aplicarRestricaoPesquisa();
      renderizarColaboradores();
    });
  }

  if (selectTipoPesquisa && inputPesquisa) {
    selectTipoPesquisa.addEventListener('change', () => {
      const placeholders = {
        nome: 'Pesquisar por nome (apenas letras)...',
        setor: 'Pesquisar por setor (apenas letras)...',
        cpf: 'Pesquisar por CPF (apenas números)...',
        matricula: 'Pesquisar por matrícula (apenas números)...'
      };
      
      inputPesquisa.placeholder = placeholders[selectTipoPesquisa.value] || 'Pesquisar...';
      aplicarRestricaoPesquisa(); 
      renderizarColaboradores();
    });
  }

  // Renderização Inicial
  renderizarColaboradores();
  renderizarEpis();
  preencherSelectsEmprestimo();
  renderizarEmprestimos();

  // Event Listeners dos Formulários
  document.getElementById('colaboradorForm')?.addEventListener('submit', tratarSubmitColaborador);
  document.getElementById('btnCancelarColab')?.addEventListener('click', resetarFormColaborador);
  document.getElementById('btnConfirmarExclusao')?.addEventListener('click', executarExclusaoColaborador);

  document.getElementById('epiForm')?.addEventListener('submit', tratarSubmitEpi);
  document.getElementById('btnCancelarEpi')?.addEventListener('click', resetarFormEpi);
  document.getElementById('btnConfirmarExclusaoEpi')?.addEventListener('click', executarExclusaoEpi);

  document.getElementById('emprestimoForm')?.addEventListener('submit', tratarSubmitEmprestimo);
  document.getElementById('btnCancelarEmp')?.addEventListener('click', resetarFormEmprestimo);
  document.getElementById('empStatus')?.addEventListener('change', tratarMudancaStatusEmprestimo);

  const inputDataRetirada = document.getElementById('empDataRetirada');
  if (inputDataRetirada) {
    inputDataRetirada.value = new Date().toISOString().slice(0, 16);
  }
});

function exibirAlerta(mensagem, tipo = 'success') {
  const container = document.getElementById('alertContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show shadow-sm" role="alert">
      <i class="bi bi-${tipo === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-2"></i>
      ${mensagem}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  `;

  setTimeout(() => {
    const alertEl = container.querySelector('.alert');
    if (alertEl) {
      const bsAlert = bootstrap.Alert.getInstance(alertEl) || new bootstrap.Alert(alertEl);
      bsAlert.close();
    }
  }, 4000);
}

// Helper para cabeçalhos HTTP autenticados
function getHeadersAuth() {
  const headers = { 'Content-Type': 'application/json' };
  if (tokenLogado) {
    headers['Authorization'] = `Bearer ${tokenLogado}`;
  }
  return headers;
}

// =============================================================================
// MÓDULO 1: GERENCIAMENTO DE COLABORADORES
// =============================================================================
async function renderizarColaboradores() {
  const termo = document.getElementById('pesquisaColab')?.value?.toLowerCase()?.trim() ?? '';
  const tipo = document.getElementById('tipoPesquisaColab')?.value ?? 'nome';
  const tbody = document.getElementById('tabelaColaboradoresBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">A carregar dados...</td></tr>';

  try {
    const resposta = await fetch('/api/colaboradores', { headers: getHeadersAuth() });
    if (!resposta.ok) throw new Error('Erro ao buscar dados do servidor.');
    
    const colaboradores = await resposta.json();
    tbody.innerHTML = '';

    const filtrados = colaboradores.filter(c => {
      if (!termo) return true;

      let campoValor = '';
      switch (tipo) {
        case 'setor': campoValor = c.setor ?? ''; break;
        case 'cpf': campoValor = (c.cpf ?? '').replace(/\D/g, ''); break;
        case 'matricula': campoValor = c.matricula ?? ''; break;
        case 'nome': default: campoValor = c.nome ?? ''; break;
      }

      return campoValor.toLowerCase().includes(termo);
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Nenhum colaborador encontrado.</td></tr>`;
      return;
    }

    filtrados.forEach(c => {
      const isAtivo = (c.status ?? 'ATIVO') === 'ATIVO';
      const badgeStatus = isAtivo 
        ? '<span class="badge bg-success">ATIVO</span>' 
        : '<span class="badge bg-secondary">INATIVO</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-bold text-secondary ps-3">${c.matricula}</td>
        <td class="fw-semibold">${c.nome}</td>
        <td>${c.cpf}</td>
        <td><span class="badge bg-light text-dark border">${c.setor}</span></td>
        <td>${c.cargo}</td>
        <td>${badgeStatus}</td>
        <td class="text-center">
          <div class="d-inline-flex gap-2">
            <button class="btn btn-sm btn-outline-warning" onclick="carregarColaboradorEdicao(${c.id})" title="Editar"><i class="bi bi-pencil-fill me-1"></i> Editar</button>
            <button class="btn btn-sm ${isAtivo ? 'btn-outline-danger' : 'btn-outline-success'}" 
                    onclick="abrirModalExcluirColab(${c.id}, '${c.nome.replace(/'/g, "\\'")}', '${c.matricula}', '${c.status}')" 
                    title="${isAtivo ? 'Inativar Colaborador' : 'Reativar Colaborador'}">
              <i class="bi ${isAtivo ? 'bi-person-x-fill' : 'bi-person-check-fill'} me-1"></i> ${isAtivo ? 'Inativar' : 'Reativar'}
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (erro) {
    console.error('Erro ao carregar colaboradores:', erro);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Erro ao carregar os colaboradores.</td></tr>`;
  }
}

async function carregarColaboradorEdicao(id) {
  try {
    const res = await fetch('/api/colaboradores', { headers: getHeadersAuth() });
    if (!res.ok) throw new Error('Erro na resposta do servidor.');
    
    const colaboradores = await res.json();
    const colab = colaboradores.find(c => String(c.id) === String(id));

    if (!colab) {
      exibirAlerta('Colaborador não encontrado!', 'danger');
      return;
    }

    const inputId = document.getElementById('colaboradorId') || document.getElementById('idColaborador');
    if (inputId) inputId.value = colab.id;

    document.getElementById('nomeColab').value = colab.nome || '';
    document.getElementById('cpfColab').value = colab.cpf || '';
    document.getElementById('matriculaColab').value = colab.matricula || '';
    document.getElementById('setorColab').value = colab.setor || '';
    document.getElementById('cargoColab').value = colab.cargo || '';
    document.getElementById('statusColab').value = colab.status || 'ATIVO';

    const title = document.getElementById('formColabTitle');
    const badge = document.getElementById('badgeColabStatus');
    const btnText = document.getElementById('btnSalvarColabText');
    const btnCancel = document.getElementById('btnCancelarColab');

    if (title) title.textContent = 'Editar Colaborador';
    if (badge) {
      badge.textContent = 'Edição';
      badge.className = 'badge bg-warning text-dark';
    }
    if (btnText) btnText.textContent = 'Atualizar Colaborador';
    if (btnCancel) btnCancel.classList.remove('d-none');

    document.getElementById('colaboradorForm')?.scrollIntoView({ behavior: 'smooth' });
  } catch (erro) {
    console.error('Erro ao carregar colaborador para edição:', erro);
    exibirAlerta('Não foi possível carregar os dados do colaborador.', 'danger');
  }
}

function abrirModalExcluirColab(id, nome, matricula, status) {
  idColabExcluir = id;
  
  const elNome = document.getElementById('modalNomeColaborador');
  const elMatricula = document.getElementById('modalMatriculaColaborador');
  const elMsg = document.getElementById('modalMensagemAcaoColab');

  if (elNome) elNome.textContent = nome;
  if (elMatricula) elMatricula.textContent = matricula;

  const acao = (status === 'INATIVO') ? 'reativar' : 'inativar';
  if (elMsg) elMsg.textContent = `Deseja realmente ${acao} o colaborador abaixo?`;
  
  document.getElementById('btnConfirmarExclusao').setAttribute('data-status-atual', status);

  modalColabInst?.show();
}

async function tratarSubmitColaborador(e) {
  e.preventDefault();

  const inputId = document.getElementById('colaboradorId') || document.getElementById('idColaborador');
  const id = inputId ? inputId.value : '';
  const nome = document.getElementById('nomeColab').value.trim();
  const cpf = document.getElementById('cpfColab').value.trim();
  const matricula = document.getElementById('matriculaColab').value.trim();
  const setor = document.getElementById('setorColab').value;
  const cargo = document.getElementById('cargoColab').value.trim();
  const status = document.getElementById('statusColab').value;

  if (!nome || !cpf || !matricula || !setor || !cargo) {
    exibirAlerta('Preencha todos os campos obrigatórios (*)!', 'danger');
    return;
  }

  const dadosColaborador = { nome, cpf, matricula, setor, cargo, status };

  try {
    if (id) {
      await fetch(`/api/colaboradores/${id}`, {
        method: 'PUT',
        headers: getHeadersAuth(),
        body: JSON.stringify(dadosColaborador)
      });
      exibirAlerta(`Colaborador <strong>${nome}</strong> atualizado com sucesso!`, 'success');
    } else {
      await fetch('/api/colaboradores', {
        method: 'POST',
        headers: getHeadersAuth(),
        body: JSON.stringify(dadosColaborador)
      });
      exibirAlerta(`Colaborador <strong>${nome}</strong> cadastrado com sucesso!`, 'success');
    }
  } catch (erro) {
    console.error('Erro ao salvar colaborador:', erro);
    exibirAlerta('Erro de comunicação com o servidor.', 'danger');
    return;
  }

  resetarFormColaborador();
  renderizarColaboradores();
  preencherSelectsEmprestimo();
}

async function executarExclusaoColaborador() {
  if (!idColabExcluir) return;

  const btnConfirmar = document.getElementById('btnConfirmarExclusao');
  const statusAtual = btnConfirmar.getAttribute('data-status-atual');
  const novoStatus = (statusAtual === 'INATIVO') ? 'ATIVO' : 'INATIVO';

  try {
    await fetch(`/api/colaboradores/${idColabExcluir}/status`, {
      method: 'PATCH',
      headers: getHeadersAuth(),
      body: JSON.stringify({ status: novoStatus })
    });
    
    modalColabInst?.hide();
    exibirAlerta(`Status do colaborador atualizado para <strong>${novoStatus}</strong>.`, novoStatus === 'INATIVO' ? 'warning' : 'success');
    renderizarColaboradores();
    preencherSelectsEmprestimo();
  } catch (erro) {
    console.error('Erro ao atualizar status do colaborador:', erro);
    exibirAlerta('Erro de comunicação com o servidor.', 'danger');
  }
}

function resetarFormColaborador() {
  const form = document.getElementById('colaboradorForm');
  if (form) form.reset();
  
  const inputId = document.getElementById('colaboradorId') || document.getElementById('idColaborador');
  if (inputId) inputId.value = '';

  const title = document.getElementById('formColabTitle');
  const badge = document.getElementById('badgeColabStatus');
  const btnText = document.getElementById('btnSalvarColabText');
  const btnCancel = document.getElementById('btnCancelarColab');

  if (title) title.textContent = 'Cadastrar Colaborador';
  if (badge) {
    badge.textContent = 'Novo';
    badge.className = 'badge bg-white text-primary';
  }
  if (btnText) btnText.textContent = 'Salvar Colaborador';
  if (btnCancel) btnCancel.classList.add('d-none');
}

// =============================================================================
// MÓDULO 2: GERENCIAMENTO DE EQUIPAMENTOS (EPI)
// =============================================================================
async function renderizarEpis() {
  const tbody = document.getElementById('tabelaEpisBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">A carregar dados...</td></tr>';

  try {
    const resposta = await fetch('/api/epis', { headers: getHeadersAuth() });
    if (!resposta.ok) throw new Error('Erro ao buscar dados do servidor.');
    
    const epis = await resposta.json();
    tbody.innerHTML = '';

    if (epis.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum equipamento cadastrado.</td></tr>`;
      return;
    }

    epis.forEach(e => {
      const dataValidade = e.validade_ca ? e.validade_ca.split('T')[0] : 'N/A';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-bold text-secondary">${e.ca_numero}</td>
        <td class="fw-semibold">${e.nome}</td>
        <td><span class="badge ${e.quantidade_estoque > 0 ? 'bg-success' : 'bg-danger'}">${e.quantidade_estoque} un</span></td>
        <td>${dataValidade}</td>
        <td class="text-center">
          <div class="d-inline-flex gap-2">
            <button class="btn btn-sm btn-outline-warning" onclick="carregarEpiEdicao(${e.id})" title="Editar"><i class="bi bi-pencil-fill me-1"></i> Editar</button>
            <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExcluirEpi(${e.id}, '${e.nome.replace(/'/g, "\\'")}', '${e.ca_numero}')" title="Excluir"><i class="bi bi-trash-fill me-1"></i> Excluir</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (erro) {
    console.error('Erro ao carregar EPIs:', erro);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Erro ao carregar os equipamentos.</td></tr>`;
  }
}

async function carregarEpiEdicao(id) {
  try {
    const res = await fetch('/api/epis', { headers: getHeadersAuth() });
    if (!res.ok) throw new Error('Erro na resposta do servidor.');
    
    const epis = await res.json();
    const epi = epis.find(e => String(e.id) === String(id));
    
    if (!epi) {
      exibirAlerta('EPI não encontrado!', 'danger');
      return;
    }

    document.getElementById('epiId').value = epi.id;
    document.getElementById('nomeEpi').value = epi.nome || '';
    document.getElementById('caEpi').value = epi.ca_numero || '';
    document.getElementById('estoqueEpi').value = epi.quantidade_estoque ?? 0;
    
    if (epi.validade_ca) {
      document.getElementById('validadeCaEpi').value = epi.validade_ca.split('T')[0];
    }

    const title = document.getElementById('formEpiTitle');
    const badge = document.getElementById('badgeEpiStatus');
    const btnText = document.getElementById('btnSalvarEpiText');
    const btnCancel = document.getElementById('btnCancelarEpi');

    if (title) title.textContent = 'Editar Equipamento';
    if (badge) {
      badge.textContent = 'Edição';
      badge.className = 'badge bg-warning text-dark';
    }
    if (btnText) btnText.textContent = 'Atualizar Equipamento';
    if (btnCancel) btnCancel.classList.remove('d-none');

    document.getElementById('epiForm')?.scrollIntoView({ behavior: 'smooth' });
  } catch (erro) {
    console.error('Erro ao carregar EPI para edição:', erro);
    exibirAlerta('Não foi possível carregar os dados do equipamento.', 'danger');
  }
}

async function tratarSubmitEpi(e) {
  e.preventDefault();
  const id = document.getElementById('epiId').value;
  const nome = document.getElementById('nomeEpi').value.trim();
  const ca = document.getElementById('caEpi').value.trim();
  const estoque = parseInt(document.getElementById('estoqueEpi').value, 10);
  const validadeCa = document.getElementById('validadeCaEpi').value;

  if (!nome || !ca || isNaN(estoque) || !validadeCa) {
    exibirAlerta('Preencha todos os campos do equipamento!', 'danger');
    return;
  }

  const dadosEpi = {
    nome: nome,
    descricao: "",
    ca_numero: ca,
    quantidade_estoque: estoque,
    validade_ca: validadeCa
  };

  try {
    if (id) {
      await fetch(`/api/epis/${id}`, {
        method: 'PUT',
        headers: getHeadersAuth(),
        body: JSON.stringify(dadosEpi)
      });
      exibirAlerta(`Equipamento <strong>${nome}</strong> atualizado com sucesso!`, 'success');
    } else {
      await fetch('/api/epis', {
        method: 'POST',
        headers: getHeadersAuth(),
        body: JSON.stringify(dadosEpi)
      });
      exibirAlerta(`Equipamento <strong>${nome}</strong> cadastrado no estoque!`, 'success');
    }
    
    resetarFormEpi();
    renderizarEpis(); 
    preencherSelectsEmprestimo();
  } catch (error) {
    console.error('Erro ao salvar EPI:', error);
    exibirAlerta('Erro de comunicação com o servidor.', 'danger');
  }
}

function abrirModalExcluirEpi(id, nome, ca) {
  idEpiExcluir = id;
  document.getElementById('modalNomeEpi').textContent = nome;
  document.getElementById('modalCaEpi').textContent = ca;
  modalEpiInst?.show();
}

async function executarExclusaoEpi() {
  if (!idEpiExcluir) return;

  try {
    const resposta = await fetch(`/api/epis/${idEpiExcluir}`, {
      method: 'DELETE',
      headers: getHeadersAuth()
    });

    if (resposta.ok) {
      exibirAlerta('Equipamento removido do estoque.', 'warning');
    } else {
      const erro = await resposta.json();
      exibirAlerta(erro.erro || 'Erro ao remover o equipamento.', 'danger'); 
    }
  } catch (erro) {
    console.error('Erro ao deletar EPI:', erro);
    exibirAlerta('Erro de comunicação com o servidor.', 'danger');
  } finally {
    modalEpiInst?.hide();
    renderizarEpis();
    preencherSelectsEmprestimo();
  }
}

function resetarFormEpi() {
  document.getElementById('epiForm')?.reset();
  const inputId = document.getElementById('epiId');
  if (inputId) inputId.value = '';

  const title = document.getElementById('formEpiTitle');
  const badge = document.getElementById('badgeEpiStatus');
  const btnText = document.getElementById('btnSalvarEpiText');
  const btnCancel = document.getElementById('btnCancelarEpi');

  if (title) title.textContent = 'Cadastrar Equipamento';
  if (badge) {
    badge.textContent = 'Novo';
    badge.className = 'badge bg-white text-primary';
  }
  if (btnText) btnText.textContent = 'Salvar Equipamento';
  if (btnCancel) btnCancel.classList.add('d-none');
}

// =============================================================================
// MÓDULO 3: CONTROLE DE EMPRÉSTIMO DE EPI
// =============================================================================
async function preencherSelectsEmprestimo() {
  const selectColab = document.getElementById('empColaborador');
  const selectEpi = document.getElementById('empEquipamento');
  if (!selectColab || !selectEpi) return;

  try {
    const [resColabs, resEpis] = await Promise.all([
      fetch('/api/colaboradores', { headers: getHeadersAuth() }),
      fetch('/api/epis', { headers: getHeadersAuth() })
    ]);

    const colaboradores = resColabs.ok ? await resColabs.json() : [];
    const epis = resEpis.ok ? await resEpis.json() : [];

    const colaboradoresAtivos = colaboradores.filter(c => 
      (c.status ? String(c.status).trim().toUpperCase() : 'ATIVO') === 'ATIVO'
    );

    selectColab.innerHTML = '<option value="" selected disabled>Selecione um colaborador ativo...</option>' +
      colaboradoresAtivos.map(c => `<option value="${c.id}">${c.nome} (${c.matricula})</option>`).join('');

    selectEpi.innerHTML = '<option value="" selected disabled>Selecione um equipamento...</option>' +
      epis.map(e => `<option value="${e.id}">${e.nome} - C.A. ${e.ca_numero} (Estoque: ${e.quantidade_estoque})</option>`).join('');

    preencherOpcoesStatus(false);
  } catch (erro) {
    console.error('Erro ao preencher selects:', erro);
  }
}

function preencherOpcoesStatus(modoEdicao = false) {
  const selectStatus = document.getElementById('empStatus');
  if (!selectStatus) return;

  selectStatus.innerHTML = '';

  if (!modoEdicao) {
    selectStatus.innerHTML = `
      <option value="Emprestado" selected>1. Emprestado (Retornável)</option>
      <option value="Fornecido">2. Fornecido (Definitivo / Uniforme)</option>
    `;
  } else {
    selectStatus.innerHTML = `
      <option value="Emprestado">1. Emprestado</option>
      <option value="Fornecido">2. Fornecido</option>
      <option value="Devolvido">3. Devolvido</option>
      <option value="Danificado">4. Danificado (Manutenção)</option>
      <option value="Perdido">5. Perdido (Extravio)</option>
    `;
  }
  tratarMudancaStatusEmprestimo();
}

function tratarMudancaStatusEmprestimo() {
  const status = document.getElementById('empStatus')?.value;
  const container = document.getElementById('containerCamposDevolucao');
  const dataDev = document.getElementById('empDataDevolucao');

  if (!container || !dataDev) return;

  if (['Devolvido', 'Danificado', 'Perdido'].includes(status)) {
    container.classList.remove('d-none');
    dataDev.required = true;
    if (!dataDev.value) {
      dataDev.value = new Date().toISOString().slice(0, 16);
    }
  } else {
    container.classList.add('d-none');
    dataDev.required = false;
  }
}

async function tratarSubmitEmprestimo(e) {
  e.preventDefault();
  const id = document.getElementById('emprestimoId').value;
  const status = document.getElementById('empStatus').value;
  const observacao = document.getElementById('empObservacao').value.trim();

  try {
    if (id) {
      let condicao_devolucao = 'PERFEITO';
      if (status === 'Danificado') condicao_devolucao = 'DANIFICADO';
      if (status === 'Perdido') condicao_devolucao = 'DESCARTE';

      const resposta = await fetch(`/api/emprestimos/${id}/devolucao`, {
        method: 'PUT',
        headers: getHeadersAuth(),
        body: JSON.stringify({ condicao_devolucao, observacao })
      });

      if (resposta.ok) {
        exibirAlerta('Status do empréstimo atualizado com sucesso!', 'success');
      } else {
        const erro = await resposta.json();
        exibirAlerta(erro.erro || 'Erro ao processar devolução.', 'danger');
      }

    } else {
      const colaborador_id = document.getElementById('empColaborador').value;
      const epi_id = document.getElementById('empEquipamento').value;
      const data_devolucao_prevista = document.getElementById('empDataPrevista').value;
      
      const hoje = new Date().toISOString().split('T')[0];
      if (data_devolucao_prevista < hoje) {
        exibirAlerta('A data prevista para devolução deve ser posterior ou igual à data atual!', 'danger');
        return;
      }

      const resposta = await fetch('/api/emprestimos', {
        method: 'POST',
        headers: getHeadersAuth(),
        body: JSON.stringify({
          colaborador_id,
          epi_id,
          usuario_id: usuarioLogado.id, 
          data_devolucao_prevista,
          quantidade: 1
        })
      });

      if (resposta.ok) {
        exibirAlerta('Empréstimo registrado e saída de estoque confirmada!', 'success');
      } else {
        const erro = await resposta.json();
        exibirAlerta(erro.erro || 'Erro ao registar o empréstimo.', 'danger');
      }
    }

    resetarFormEmprestimo();
    renderizarEpis();
    renderizarEmprestimos();

  } catch (error) {
    console.error('Erro ao processar empréstimo:', error);
    exibirAlerta('Erro de comunicação com o servidor.', 'danger');
  }
}

async function renderizarEmprestimos() {
  const tbody = document.getElementById('tabelaEmprestimosBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">A carregar dados...</td></tr>';

  try {
    const resposta = await fetch('/api/emprestimos', { headers: getHeadersAuth() });
    if (!resposta.ok) throw new Error('Erro ao buscar empréstimos.');
    
    const emprestimos = await resposta.json();
    tbody.innerHTML = '';

    if (emprestimos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum registro de empréstimo realizado.</td></tr>`;
      return;
    }

    emprestimos.forEach(emp => {
      let badgeClass = 'bg-primary';
      if (emp.status === 'DEVOLVIDO') badgeClass = 'bg-success';
      if (emp.status === 'DANIFICADO' || emp.status === 'DESCARTE') badgeClass = 'bg-danger';

      const dataRetiradaFormatada = emp.data_retirada ? new Date(emp.data_retirada).toLocaleString('pt-BR') : '-';
      const dataPrevistaFormatada = emp.data_devolucao_prevista ? emp.data_devolucao_prevista.split('T')[0] : '-';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-semibold">${emp.colaborador_nome}</td>
        <td>${emp.epi_nome}</td>
        <td>${dataRetiradaFormatada}</td>
        <td>${dataPrevistaFormatada}</td>
        <td><span class="badge ${badgeClass}">${emp.status}</span></td>
        <td class="text-center">
          <div class="d-inline-flex gap-2">
            <button class="btn btn-sm btn-outline-info" onclick="visualizarInfoStatus(${emp.id})" title="Ver Detalhes do Status">
              <i class="bi bi-eye-fill me-1"></i> Info
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="carregarEmprestimoEdicao(${emp.id})" title="Atualizar Status" ${emp.status === 'DEVOLVIDO' ? 'disabled' : ''}>
              <i class="bi bi-pencil-square me-1"></i> Devolver
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (erro) {
    console.error('Erro ao renderizar empréstimos:', erro);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Erro ao carregar o histórico.</td></tr>`;
  }
}

async function carregarEmprestimoEdicao(id) {
  try {
    const resposta = await fetch('/api/emprestimos', { headers: getHeadersAuth() });
    const emprestimos = await resposta.json();
    const emp = emprestimos.find(e => String(e.id) === String(id));
    
    if (!emp) return;

    document.getElementById('emprestimoId').value = emp.id;
    
    const selectColab = document.getElementById('empColaborador');
    selectColab.innerHTML = `<option value="${emp.colaborador_id}" selected>${emp.colaborador_nome}</option>`;
    selectColab.disabled = true;

    const selectEpi = document.getElementById('empEquipamento');
    selectEpi.innerHTML = `<option value="${emp.epi_id}" selected>${emp.epi_nome}</option>`;
    selectEpi.disabled = true;

    document.getElementById('empDataRetirada').value = emp.data_retirada ? new Date(emp.data_retirada).toISOString().slice(0, 16) : '';
    document.getElementById('empDataRetirada').disabled = true;
    
    document.getElementById('empDataPrevista').value = emp.data_devolucao_prevista ? emp.data_devolucao_prevista.split('T')[0] : '';
    document.getElementById('empDataPrevista').disabled = true;

    preencherOpcoesStatus(true); 
    document.getElementById('empStatus').value = emp.status || 'Emprestado';

    if (emp.data_devolucao_real) {
      document.getElementById('empDataDevolucao').value = new Date(emp.data_devolucao_real).toISOString().slice(0, 16);
    }
    document.getElementById('empObservacao').value = emp.observacao || '';

    tratarMudancaStatusEmprestimo();

    const title = document.getElementById('formEmpTitle');
    const btnText = document.getElementById('btnSalvarEmpText');
    const btnCancel = document.getElementById('btnCancelarEmp');

    if (title) title.textContent = 'Registrar Devolução';
    if (btnText) btnText.textContent = 'Confirmar Devolução';
    if (btnCancel) btnCancel.classList.remove('d-none');

    document.getElementById('emprestimoForm')?.scrollIntoView({ behavior: 'smooth' });
  } catch (erro) {
    console.error('Erro ao carregar empréstimo para edição:', erro);
    exibirAlerta('Erro ao carregar os dados do empréstimo.', 'danger');
  }
}

async function visualizarInfoStatus(id) {
  try {
    const resposta = await fetch('/api/emprestimos', { headers: getHeadersAuth() });
    const emprestimos = await resposta.json();
    const emp = emprestimos.find(e => String(e.id) === String(id));
    
    if (!emp) return;

    document.getElementById('infoColaborador').textContent = emp.colaborador_nome || 'N/A';
    document.getElementById('infoEquipamento').textContent = emp.epi_nome || 'N/A';

    const badge = document.getElementById('infoStatusBadge');
    if (badge) {
      badge.textContent = emp.status;
      let badgeClass = 'bg-primary';
      if (emp.status === 'DEVOLVIDO') badgeClass = 'bg-success';
      if (emp.status === 'DANIFICADO' || emp.status === 'DESCARTE') badgeClass = 'bg-danger';
      badge.className = `badge ${badgeClass} fs-7`;
    }

    document.getElementById('infoDataDevolucao').textContent = emp.data_devolucao_real 
      ? new Date(emp.data_devolucao_real).toLocaleString('pt-BR') 
      : 'Pendente';

    document.getElementById('infoObservacao').innerHTML = emp.observacao 
      ? emp.observacao 
      : '<em>Nenhuma observação registrada.</em>';

    modalInfoInst?.show();
  } catch (erro) {
    console.error('Erro ao carregar info do status:', erro);
  }
}

function resetarFormEmprestimo() {
  const form = document.getElementById('emprestimoForm');
  if (form) form.reset();

  const inputId = document.getElementById('emprestimoId');
  if (inputId) inputId.value = '';

  const selectColab = document.getElementById('empColaborador');
  const selectEpi = document.getElementById('empEquipamento');
  const inputRetirada = document.getElementById('empDataRetirada');
  const inputPrevista = document.getElementById('empDataPrevista');

  if (selectColab) selectColab.disabled = false;
  if (selectEpi) selectEpi.disabled = false;
  if (inputRetirada) {
    inputRetirada.disabled = false;
    inputRetirada.value = new Date().toISOString().slice(0, 16);
  }
  if (inputPrevista) inputPrevista.disabled = false;

  const title = document.getElementById('formEmpTitle');
  const btnText = document.getElementById('btnSalvarEmpText');
  const btnCancel = document.getElementById('btnCancelarEmp');

  if (title) title.textContent = 'Registrar Empréstimo';
  if (btnText) btnText.textContent = 'Confirmar Retirada';
  if (btnCancel) btnCancel.classList.add('d-none');

  preencherOpcoesStatus(false);
}