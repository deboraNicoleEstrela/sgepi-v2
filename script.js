// =============================================================================
// PERSISTÊNCIA E NORMALIZAÇÃO DE DADOS NO LOCALSTORAGE
// =============================================================================

// Dados Iniciais (SEEDS) definidos sem campos nulos/undefined
const SEEDS = {
  colaboradores: [
    { 
      id: 1, 
      nome: "Carlos Eduardo Silva", 
      cpf: "111.222.333-44", 
      matricula: "TEX-1001", 
      setor: "Obra / Campo", 
      cargo: "Armador",
      status: "ATIVO"
    },
    { 
      id: 2, 
      nome: "Ana Maria Souza", 
      cpf: "222.333.444-55", 
      matricula: "TEX-1002", 
      setor: "Tinturaria", 
      cargo: "Auxiliar de Tinturaria",
      status: "ATIVO"
    }
  ],
  epis: [
    { 
      id: 1, 
      nome: "Capacete de Segurança Classe B", 
      ca: "CA-12345", 
      estoque: 25, 
      validadeCa: "2027-12-31" 
    },
    { 
      id: 2, 
      nome: "Óculos de Proteção Incolor", 
      ca: "CA-67890", 
      estoque: 50, 
      validadeCa: "2026-10-15" 
    }
  ],
  emprestimos: []
};

function obterDados(chave) {
  try {
    const dadosSalvos = localStorage.getItem(`sgepi_${chave}`);
    if (!dadosSalvos) {
      localStorage.setItem(`sgepi_${chave}`, JSON.stringify(SEEDS[chave] || []));
      return SEEDS[chave] || [];
    }

    const lista = JSON.parse(dadosSalvos);
    if (!Array.isArray(lista)) return SEEDS[chave] || [];

    return lista.map(item => sanitizarItem(chave, item));
  } catch (error) {
    console.error(`Erro ao carregar chave sgepi_${chave}:`, error);
    return SEEDS[chave] || [];
  }
}

// Previne erros atribuindo valores padrão (fallback)
function sanitizarItem(chave, item) {
  if (!item || typeof item !== 'object') return {};

  if (chave === 'colaboradores') {
    return {
      id: item.id ?? Date.now(),
      nome: item.nome ?? 'Sem Nome',
      cpf: item.cpf ?? '000.000.000-00',
      matricula: item.matricula ?? 'S/M',
      setor: item.setor ?? 'Outros',
      cargo: item.cargo ?? 'Geral',
      status: item.status ?? 'ATIVO'
    };
  }

  if (chave === 'epis') {
    return {
      id: item.id ?? Date.now(),
      nome: item.nome ?? 'Equipamento Indefinido',
      ca: item.ca ?? 'CA-00000',
      estoque: Number.isInteger(item.estoque) ? item.estoque : 0,
      validadeCa: item.validadeCa ?? new Date().toISOString().split('T')[0]
    };
  }

  if (chave === 'emprestimos') {
    return {
      id: item.id ?? Date.now(),
      colaboradorId: item.colaboradorId ?? null,
      epiId: item.epiId ?? null,
      dataRetirada: item.dataRetirada ?? new Date().toISOString().slice(0, 16),
      dataPrevista: item.dataPrevista ?? new Date().toISOString().split('T')[0],
      status: item.status ?? 'Emprestado',
      dataDevolucao: item.dataDevolucao ?? null,
      observacao: item.observacao ?? ''
    };
  }

  return item;
}

function salvarDados(chave, dados) {
  try {
    localStorage.setItem(`sgepi_${chave}`, JSON.stringify(dados));
  } catch (error) {
    console.error(`Erro ao salvar em sgepi_${chave}:`, error);
  }
}

// Controle de Modais
let idColabExcluir = null;
let idEpiExcluir = null;
let modalColabInst = null;
let modalEpiInst = null;
let modalInfoInst = null;

// =============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const elModalColab = document.getElementById('modalExcluir');
  const elModalEpi = document.getElementById('modalExcluirEpi');
  const elModalInfo = document.getElementById('modalInfoStatus');

  if (elModalColab) modalColabInst = new bootstrap.Modal(elModalColab);
  if (elModalEpi) modalEpiInst = new bootstrap.Modal(elModalEpi);
  if (elModalInfo) modalInfoInst = new bootstrap.Modal(elModalInfo);

  renderizarColaboradores();
  renderizarEpis();
  preencherSelectsEmprestimo();
  renderizarEmprestimos();

  document.getElementById('colaboradorForm')?.addEventListener('submit', tratarSubmitColaborador);
  document.getElementById('pesquisaColab')?.addEventListener('input', renderizarColaboradores);
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

// =============================================================================
// MÓDULO 1: GERENCIAMENTO DE COLABORADORES
// =============================================================================
function renderizarColaboradores() {
  const colaboradores = obterDados('colaboradores');
  const termo = document.getElementById('pesquisaColab')?.value?.toLowerCase()?.trim() ?? '';
  const tbody = document.getElementById('tabelaColaboradoresBody');
  if (!tbody) return;

  const filtrados = colaboradores.filter(c => (c.nome ?? '').toLowerCase().includes(termo));
  tbody.innerHTML = '';

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
}

function tratarSubmitColaborador(e) {
  e.preventDefault();
  const id = document.getElementById('colaboradorId').value;
  const nome = document.getElementById('nomeColab').value.trim();
  const cpf = document.getElementById('cpfColab').value.trim();
  const matricula = document.getElementById('matriculaColab').value.trim();
  const setor = document.getElementById('setorColab').value;
  const cargo = document.getElementById('cargoColab').value.trim();
  const status = document.getElementById('statusColab')?.value ?? 'ATIVO';

  if (!nome || !cpf || !matricula || !setor || !cargo) {
    exibirAlerta('Preencha todos os campos obrigatórios (*)!', 'danger');
    return;
  }

  let colaboradores = obterDados('colaboradores');

  if (id) {
    colaboradores = colaboradores.map(c => c.id == id ? { id: Number(id), nome, cpf, matricula, setor, cargo, status } : c);
    exibirAlerta(`Cadastro de <strong>${nome}</strong> atualizado com sucesso!`, 'success');
  } else {
    const novoId = colaboradores.length > 0 ? Math.max(...colaboradores.map(c => c.id)) + 1 : 1;
    colaboradores.push({ id: novoId, nome, cpf, matricula, setor, cargo, status: 'ATIVO' });
    exibirAlerta(`Colaborador <strong>${nome}</strong> cadastrado com sucesso!`, 'success');
  }

  salvarDados('colaboradores', colaboradores);
  resetarFormColaborador();
  renderizarColaboradores();
  preencherSelectsEmprestimo();
}

function carregarColaboradorEdicao(id) {
  const colab = obterDados('colaboradores').find(c => c.id == id);
  if (!colab) return;

  document.getElementById('colaboradorId').value = colab.id;
  document.getElementById('nomeColab').value = colab.nome ?? '';
  document.getElementById('cpfColab').value = colab.cpf ?? '';
  document.getElementById('matriculaColab').value = colab.matricula ?? '';
  document.getElementById('setorColab').value = colab.setor ?? '';
  document.getElementById('cargoColab').value = colab.cargo ?? '';
  
  const selectStatus = document.getElementById('statusColab');
  if (selectStatus) selectStatus.value = colab.status ?? 'ATIVO';

  document.getElementById('formColabTitle').textContent = 'Editar Colaborador';
  document.getElementById('badgeColabStatus').textContent = 'Edição';
  document.getElementById('btnSalvarColabText').textContent = 'Atualizar Dados';
  document.getElementById('btnCancelarColab').classList.remove('d-none');
}

function resetarFormColaborador() {
  document.getElementById('colaboradorForm').reset();
  document.getElementById('colaboradorId').value = '';
  document.getElementById('formColabTitle').textContent = 'Cadastrar Colaborador';
  document.getElementById('badgeColabStatus').textContent = 'Novo';
  document.getElementById('btnSalvarColabText').textContent = 'Salvar Colaborador';
  document.getElementById('btnCancelarColab').classList.add('d-none');
}

function abrirModalExcluirColab(id, nome, matricula, statusAtual) {
  idColabExcluir = id;
  const isAtivo = statusAtual === 'ATIVO';

  document.getElementById('modalNomeColaborador').textContent = nome;
  document.getElementById('modalMatriculaColaborador').textContent = matricula;

  const btnConfirmar = document.getElementById('btnConfirmarExclusao');
  const txtMensagem = document.getElementById('modalMensagemAcaoColab');

  if (isAtivo) {
    txtMensagem.textContent = 'Deseja inativar o colaborador abaixo? Ele não poderá receber novos EPIs, mas seu histórico será mantido.';
    btnConfirmar.textContent = 'Inativar Colaborador';
    btnConfirmar.className = 'btn btn-warning fw-bold';
  } else {
    txtMensagem.textContent = 'Deseja reativar o colaborador abaixo para que ele volte a receber EPIs?';
    btnConfirmar.textContent = 'Reativar Colaborador';
    btnConfirmar.className = 'btn btn-success fw-bold';
  }

  modalColabInst?.show();
}

function executarExclusaoColaborador() {
  if (!idColabExcluir) return;

  let colaboradores = obterDados('colaboradores');
  const targetIndex = colaboradores.findIndex(c => c.id == idColabExcluir);

  if (targetIndex !== -1) {
    const colab = colaboradores[targetIndex];
    const novoStatus = (colab.status === 'INATIVO') ? 'ATIVO' : 'INATIVO';
    colaboradores[targetIndex].status = novoStatus;

    salvarDados('colaboradores', colaboradores);
    modalColabInst?.hide();

    exibirAlerta(`O colaborador <strong>${colab.nome}</strong> agora está <strong>${novoStatus}</strong>.`, novoStatus === 'INATIVO' ? 'warning' : 'success');
    renderizarColaboradores();
    preencherSelectsEmprestimo();
  }
}

// =============================================================================
// MÓDULO 2: GERENCIAMENTO DE EQUIPAMENTOS (EPI)
// =============================================================================
function renderizarEpis() {
  const epis = obterDados('epis');
  const tbody = document.getElementById('tabelaEpisBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (epis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum equipamento cadastrado.</td></tr>`;
    return;
  }

  epis.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-bold text-secondary">${e.ca}</td>
      <td class="fw-semibold">${e.nome}</td>
      <td><span class="badge ${e.estoque > 0 ? 'bg-success' : 'bg-danger'}">${e.estoque} un</span></td>
      <td>${e.validadeCa}</td>
      <td class="text-center">
        <div class="d-inline-flex gap-2">
          <button class="btn btn-sm btn-outline-warning" onclick="carregarEpiEdicao(${e.id})" title="Editar"><i class="bi bi-pencil-fill me-1"></i> Editar</button>
          <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExcluirEpi(${e.id}, '${e.nome.replace(/'/g, "\\'")}', '${e.ca}')" title="Excluir"><i class="bi bi-trash-fill me-1"></i> Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function tratarSubmitEpi(e) {
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

  let epis = obterDados('epis');

  if (id) {
    epis = epis.map(item => item.id == id ? { id: Number(id), nome, ca, estoque, validadeCa } : item);
    exibirAlerta(`Equipamento <strong>${nome}</strong> atualizado com sucesso!`, 'success');
  } else {
    const novoId = epis.length > 0 ? Math.max(...epis.map(item => item.id)) + 1 : 1;
    epis.push({ id: novoId, nome, ca, estoque, validadeCa });
    exibirAlerta(`Equipamento <strong>${nome}</strong> cadastrado no estoque!`, 'success');
  }

  salvarDados('epis', epis);
  resetarFormEpi();
  renderizarEpis();
  preencherSelectsEmprestimo();
}

function carregarEpiEdicao(id) {
  const epi = obterDados('epis').find(e => e.id == id);
  if (!epi) return;

  document.getElementById('epiId').value = epi.id;
  document.getElementById('nomeEpi').value = epi.nome ?? '';
  document.getElementById('caEpi').value = epi.ca ?? '';
  document.getElementById('estoqueEpi').value = epi.estoque ?? 0;
  document.getElementById('validadeCaEpi').value = epi.validadeCa ?? '';

  document.getElementById('formEpiTitle').textContent = 'Editar Equipamento';
  document.getElementById('badgeEpiStatus').textContent = 'Edição';
  document.getElementById('btnSalvarEpiText').textContent = 'Atualizar Equipamento';
  document.getElementById('btnCancelarEpi').classList.remove('d-none');
}

function resetarFormEpi() {
  document.getElementById('epiForm').reset();
  document.getElementById('epiId').value = '';
  document.getElementById('formEpiTitle').textContent = 'Cadastrar Equipamento';
  document.getElementById('badgeEpiStatus').textContent = 'Novo';
  document.getElementById('btnSalvarEpiText').textContent = 'Salvar Equipamento';
  document.getElementById('btnCancelarEpi').classList.add('d-none');
}

function abrirModalExcluirEpi(id, nome, ca) {
  idEpiExcluir = id;
  document.getElementById('modalNomeEpi').textContent = nome;
  document.getElementById('modalCaEpi').textContent = ca;
  modalEpiInst?.show();
}

function executarExclusaoEpi() {
  if (!idEpiExcluir) return;

  let epis = obterDados('epis').filter(e => e.id != idEpiExcluir);
  salvarDados('epis', epis);
  modalEpiInst?.hide();

  exibirAlerta('Equipamento removido do estoque.', 'warning');
  renderizarEpis();
  preencherSelectsEmprestimo();
}

// =============================================================================
// MÓDULO 3: CONTROLE DE EMPRÉSTIMO DE EPI
// =============================================================================
function preencherSelectsEmprestimo() {
  const selectColab = document.getElementById('empColaborador');
  const selectEpi = document.getElementById('empEquipamento');
  if (!selectColab || !selectEpi) return;

  const colaboradores = obterDados('colaboradores');
  const epis = obterDados('epis');

  // Filtra apenas colaboradores ATIVOS para impedir novas retiradas por colaboradores inativos
  const colaboradoresAtivos = colaboradores.filter(c => (c.status ?? 'ATIVO') === 'ATIVO');

  selectColab.innerHTML = '<option value="" selected disabled>Selecione um colaborador ativo...</option>' +
    colaboradoresAtivos.map(c => `<option value="${c.id}">${c.nome} (${c.matricula})</option>`).join('');

  selectEpi.innerHTML = '<option value="" selected disabled>Selecione um equipamento...</option>' +
    epis.map(e => `<option value="${e.id}">${e.nome} - C.A. ${e.ca} (Estoque: ${e.estoque})</option>`).join('');

  preencherOpcoesStatus(false);
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

function tratarSubmitEmprestimo(e) {
  e.preventDefault();
  const id = document.getElementById('emprestimoId').value;
  const colaboradorId = document.getElementById('empColaborador').value;
  const epiId = document.getElementById('empEquipamento').value;
  const dataRetirada = document.getElementById('empDataRetirada').value;
  const dataPrevista = document.getElementById('empDataPrevista').value;
  const status = document.getElementById('empStatus').value;
  const dataDevolucao = document.getElementById('empDataDevolucao').value;
  const observacao = document.getElementById('empObservacao').value.trim();

  const hoje = new Date().toISOString().split('T')[0];
  if (dataPrevista < hoje) {
    exibirAlerta('A data prevista para devolução deve ser posterior ou igual à data atual!', 'danger');
    return;
  }

  let emprestimos = obterDados('emprestimos');
  let epis = obterDados('epis');

  if (id) {
    emprestimos = emprestimos.map(emp => {
      if (emp.id == id) {
        return {
          ...emp,
          status,
          dataDevolucao: ['Devolvido', 'Danificado', 'Perdido'].includes(status) ? dataDevolucao : null,
          observacao
        };
      }
      return emp;
    });

    exibirAlerta('Status do empréstimo atualizado com sucesso!', 'success');
  } else {
    const epiObj = epis.find(item => item.id == epiId);
    if (!epiObj || epiObj.estoque <= 0) {
      exibirAlerta('Equipamento sem estoque disponível no momento!', 'danger');
      return;
    }

    epiObj.estoque -= 1;
    salvarDados('epis', epis);

    const novoId = emprestimos.length > 0 ? Math.max(...emprestimos.map(emp => emp.id)) + 1 : 1;
    emprestimos.push({
      id: novoId,
      colaboradorId: Number(colaboradorId),
      epiId: Number(epiId),
      dataRetirada,
      dataPrevista,
      status,
      dataDevolucao: null,
      observacao: ''
    });

    exibirAlerta('Empréstimo registrado e saída de estoque confirmada!', 'success');
  }

  salvarDados('emprestimos', emprestimos);
  resetarFormEmprestimo();
  renderizarEpis();
  renderizarEmprestimos();
}

function renderizarEmprestimos() {
  const emprestimos = obterDados('emprestimos');
  const colaboradores = obterDados('colaboradores');
  const epis = obterDados('epis');
  const tbody = document.getElementById('tabelaEmprestimosBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (emprestimos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum registro de empréstimo realizado.</td></tr>`;
    return;
  }

  emprestimos.forEach(emp => {
    // Preserva o nome do colaborador mesmo que ele esteja inativo
    const colab = colaboradores.find(c => c.id == emp.colaboradorId) ?? { nome: 'Colaborador não encontrado' };
    const epi = epis.find(e => e.id == emp.epiId) ?? { nome: 'EPI não encontrado' };

    let badgeClass = 'bg-primary';
    if (emp.status === 'Devolvido') badgeClass = 'bg-success';
    if (emp.status === 'Danificado' || emp.status === 'Perdido') badgeClass = 'bg-danger';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-semibold">${colab.nome}</td>
      <td>${epi.nome}</td>
      <td>${emp.dataRetirada ? new Date(emp.dataRetirada).toLocaleString('pt-BR') : '-'}</td>
      <td>${emp.dataPrevista ?? '-'}</td>
      <td><span class="badge ${badgeClass}">${emp.status}</span></td>
      <td class="text-center">
        <div class="d-inline-flex gap-2">
          <button class="btn btn-sm btn-outline-info" onclick="visualizarInfoStatus(${emp.id})" title="Ver Detalhes do Status">
            <i class="bi bi-eye-fill me-1"></i> Info
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="carregarEmprestimoEdicao(${emp.id})" title="Atualizar Status">
            <i class="bi bi-pencil-square me-1"></i> Editar
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function visualizarInfoStatus(id) {
  const emp = obterDados('emprestimos').find(e => e.id == id);
  if (!emp) return;

  const colaboradores = obterDados('colaboradores');
  const epis = obterDados('epis');

  const colab = colaboradores.find(c => c.id == emp.colaboradorId) ?? { nome: 'Não identificado' };
  const epi = epis.find(e => e.id == emp.epiId) ?? { nome: 'Não identificado' };

  document.getElementById('infoColaborador').textContent = colab.nome;
  document.getElementById('infoEquipamento').textContent = epi.nome;

  const badgeStatus = document.getElementById('infoStatusBadge');
  badgeStatus.textContent = emp.status;

  let badgeClass = 'badge bg-primary fs-7';
  if (emp.status === 'Devolvido') badgeClass = 'badge bg-success fs-7';
  if (emp.status === 'Danificado' || emp.status === 'Perdido') badgeClass = 'badge bg-danger fs-7';
  badgeStatus.className = badgeClass;

  document.getElementById('infoDataDevolucao').textContent = emp.dataDevolucao
    ? new Date(emp.dataDevolucao).toLocaleString('pt-BR')
    : 'Ainda não devolvido';

  const elObs = document.getElementById('infoObservacao');
  if (emp.observacao && emp.observacao.trim() !== '') {
    elObs.innerHTML = emp.observacao;
  } else {
    elObs.innerHTML = '<em>Nenhuma observação informada neste status.</em>';
  }

  modalInfoInst?.show();
}

function carregarEmprestimoEdicao(id) {
  const emp = obterDados('emprestimos').find(e => e.id == id);
  if (!emp) return;

  document.getElementById('emprestimoId').value = emp.id;

  const selectColab = document.getElementById('empColaborador');
  const selectEpi = document.getElementById('empEquipamento');
  const inputRetirada = document.getElementById('empDataRetirada');
  const inputPrevista = document.getElementById('empDataPrevista');

  selectColab.value = emp.colaboradorId ?? '';
  selectEpi.value = emp.epiId ?? '';
  inputRetirada.value = emp.dataRetirada ?? '';
  inputPrevista.value = emp.dataPrevista ?? '';

  selectColab.disabled = true;
  selectEpi.disabled = true;
  inputRetirada.disabled = true;
  inputPrevista.disabled = true;

  preencherOpcoesStatus(true);
  document.getElementById('empStatus').value = emp.status ?? 'Emprestado';
  tratarMudancaStatusEmprestimo();

  if (emp.dataDevolucao) {
    document.getElementById('empDataDevolucao').value = emp.dataDevolucao;
  }
  document.getElementById('empObservacao').value = emp.observacao ?? '';

  document.getElementById('formEmpTitle').textContent = 'Atualizar Status do Empréstimo';
  document.getElementById('btnSalvarEmpText').textContent = 'Salvar Alterações';
  document.getElementById('btnCancelarEmp').classList.remove('d-none');
}

function resetarFormEmprestimo() {
  document.getElementById('emprestimoForm').reset();
  document.getElementById('emprestimoId').value = '';

  const selectColab = document.getElementById('empColaborador');
  const selectEpi = document.getElementById('empEquipamento');
  const inputRetirada = document.getElementById('empDataRetirada');
  const inputPrevista = document.getElementById('empDataPrevista');

  selectColab.disabled = false;
  selectEpi.disabled = false;
  inputRetirada.disabled = false;
  inputPrevista.disabled = false;

  document.getElementById('empDataRetirada').value = new Date().toISOString().slice(0, 16);
  preencherOpcoesStatus(false);

  document.getElementById('formEmpTitle').textContent = 'Registrar Empréstimo';
  document.getElementById('btnSalvarEmpText').textContent = 'Confirmar Retirada';
  document.getElementById('btnCancelarEmp').classList.add('d-none');
}