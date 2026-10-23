// --- CONTROLE DE SESSÃO E AUTENTICAÇÃO ---
const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

if (!usuarioLogado) {
  window.location.href = 'login.html';
}

function realizarLogout() {
  sessionStorage.removeItem('usuarioLogado');
  window.location.href = 'login.html';
}

// Dados Iniciais (SEEDS)
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
  const elNomeUsuario = document.getElementById('nomeUsuarioLogado');
  if (elNomeUsuario && usuarioLogado?.nome) {
    elNomeUsuario.textContent = usuarioLogado.nome;
  }

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

  // Campo Nome Colaborador - Apenas letras e espaços (Máx 40)
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

  // Nome EPI - Apenas letras
  const inputNomeEpi = document.getElementById('nomeEpi');
  if (inputNomeEpi) {
    inputNomeEpi.addEventListener('input', (e) => {
      let v = e.target.value.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ\s]/g, '');
      e.target.value = v.slice(0, 40);
    });
  }

  // C.A. EPI - Apenas números com prefixo 'CA-'
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
      // Permite apenas letras (com acentos) e espaços
      v = v.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ\s]/g, '');
    } else if (tipo === 'cpf' || tipo === 'matricula') {
      // Permite apenas números
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
      aplicarRestricaoPesquisa(); // Revalida e limpa caracteres inválidos do modo anterior
      renderizarColaboradores();
    });
  }
  // Renderização e Eventos
  renderizarColaboradores();
  renderizarEpis();
  preencherSelectsEmprestimo();
  renderizarEmprestimos();

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

// =============================================================================
// MÓDULO 1: GERENCIAMENTO DE COLABORADORES
// =============================================================================
async function renderizarColaboradores() {
  const termo = document.getElementById('pesquisaColab')?.value?.toLowerCase()?.trim() ?? '';
  const tipo = document.getElementById('tipoPesquisaColab')?.value ?? 'nome';
  const tbody = document.getElementById('tabelaColaboradoresBody');
  if (!tbody) return;

  try {
    let colaboradoresAPI = [];
    let colaboradoresLocais = obterDados('colaboradores');

    try {
      const resposta = await fetch('http://localhost:3000/api/colaboradores');
      if (resposta.ok) {
        colaboradoresAPI = await resposta.json();
      }
    } catch {
      console.warn('Backend indisponível. Utilizando apenas dados locais.');
    }

    let colaboradores = colaboradoresAPI.length > 0 ? colaboradoresAPI : colaboradoresLocais;

    if (colaboradoresLocais && colaboradoresLocais.length > 0 && colaboradoresAPI.length > 0) {
      const mapaLocais = new Map(colaboradoresLocais.map(item => [String(item.id), item]));
      colaboradores = colaboradoresAPI.map(cAPI => mapaLocais.get(String(cAPI.id)) || cAPI);

      const idsAPI = new Set(colaboradoresAPI.map(c => String(c.id)));
      const novosLocais = colaboradoresLocais.filter(c => !idsAPI.has(String(c.id)));
      colaboradores = [...colaboradores, ...novosLocais];
    }

    const filtrados = colaboradores.filter(c => {
      if (!termo) return true;

      let campoValor = '';
      switch (tipo) {
        case 'setor': 
          campoValor = c.setor ?? ''; 
          break;
        case 'cpf': 
          // Remove pontos e traços do CPF cadastrado para comparar com os números digitados
          campoValor = (c.cpf ?? '').replace(/\D/g, ''); 
          break;
        case 'matricula': 
          campoValor = c.matricula ?? ''; 
          break;
        case 'nome': 
        default: 
          campoValor = c.nome ?? ''; 
          break;
      }

      return campoValor.toLowerCase().includes(termo);
    });

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
  } catch (erro) {
    console.error('Erro ao carregar colaboradores:', erro);
    exibirAlerta('Erro ao carregar colaboradores do sistema.', 'danger');
  }
}

async function carregarColaboradorEdicao(id) {
  try {
    let colab = null;

    // Busca primeiro na API
    try {
      const res = await fetch('http://localhost:3000/api/colaboradores');
      if (res.ok) {
        const colaboradoresAPI = await res.json();
        colab = colaboradoresAPI.find(c => String(c.id) === String(id));
      }
    } catch {
      console.warn('Backend indisponível ao carregar para edição.');
    }

    // Se houver alteração pendente no LocalStorage, sobrepõe
    const listaLocal = obterDados('colaboradores');
    const colabLocal = listaLocal.find(c => String(c.id) === String(id));
    if (colabLocal) colab = colabLocal;

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

  // CORREÇÃO PRINCIPAL: Se o item veio da API e não existia no localStorage, insere-o
  let listaLocal = obterDados('colaboradores');
  if (id) {
    const existeNoLocal = listaLocal.some(c => String(c.id) === String(id));
    if (existeNoLocal) {
      listaLocal = listaLocal.map(c => String(c.id) === String(id) ? { ...c, ...dadosColaborador, id: c.id } : c);
    } else {
      listaLocal.push({ id: Number(id) || id, ...dadosColaborador });
    }
  } else {
    const novoId = listaLocal.length > 0 ? Math.max(...listaLocal.map(c => Number(c.id) || 0)) + 1 : Date.now();
    listaLocal.push({ id: novoId, ...dadosColaborador });
  }
  salvarDados('colaboradores', listaLocal);

  // Tenta sincronizar com o backend
  try {
    if (id) {
      await fetch(`http://localhost:3000/api/colaboradores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosColaborador)
      });
    } else {
      await fetch('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosColaborador)
      });
    }
  } catch (erro) {
    console.warn('Servidor sem rota individual de edição. Alteração mantida localmente.');
  }

  exibirAlerta(`Colaborador <strong>${nome}</strong> ${id ? 'atualizado' : 'cadastrado'} com sucesso!`, 'success');
  resetarFormColaborador();
  renderizarColaboradores();
  preencherSelectsEmprestimo();
}

async function executarExclusaoColaborador() {
  if (!idColabExcluir) return;

  let listaLocal = obterDados('colaboradores');
  let colab = listaLocal.find(c => String(c.id) === String(idColabExcluir));
  
  // Se veio da API e não estava no local, busca a referência
  if (!colab) {
    try {
      const res = await fetch('http://localhost:3000/api/colaboradores');
      if (res.ok) {
        const apiCols = await res.json();
        colab = apiCols.find(c => String(c.id) === String(idColabExcluir));
      }
    } catch {}
  }

  if (!colab) return;

  const novoStatus = (colab.status === 'INATIVO') ? 'ATIVO' : 'INATIVO';

  const existeNoLocal = listaLocal.some(c => String(c.id) === String(idColabExcluir));
  if (existeNoLocal) {
    listaLocal = listaLocal.map(c => String(c.id) === String(idColabExcluir) ? { ...c, status: novoStatus } : c);
  } else {
    listaLocal.push({ ...colab, status: novoStatus, id: Number(idColabExcluir) || idColabExcluir });
  }
  salvarDados('colaboradores', listaLocal);

  try {
    await fetch(`http://localhost:3000/api/colaboradores/${idColabExcluir}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus })
    });
  } catch (e) {
    console.warn('Backend sem rota de status. Alteração salva localmente.');
  }

  modalColabInst?.hide();
  exibirAlerta(`O colaborador <strong>${colab.nome}</strong> agora está <strong>${novoStatus}</strong>.`, novoStatus === 'INATIVO' ? 'warning' : 'success');
  renderizarColaboradores();
  preencherSelectsEmprestimo();
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

function carregarEpiEdicao(id) {
  const epis = obterDados('epis');
  const epi = epis.find(e => String(e.id) === String(id));
  if (!epi) return;

  document.getElementById('epiId').value = epi.id;
  document.getElementById('nomeEpi').value = epi.nome || '';
  document.getElementById('caEpi').value = epi.ca || '';
  document.getElementById('estoqueEpi').value = epi.estoque ?? 0;
  document.getElementById('validadeCaEpi').value = epi.validadeCa || '';

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
    epis = epis.map(item => String(item.id) === String(id) ? { id: Number(id), nome, ca, estoque, validadeCa } : item);
    exibirAlerta(`Equipamento <strong>${nome}</strong> atualizado com sucesso!`, 'success');
  } else {
    const novoId = epis.length > 0 ? Math.max(...epis.map(item => Number(item.id) || 0)) + 1 : 1;
    epis.push({ id: novoId, nome, ca, estoque, validadeCa });
    exibirAlerta(`Equipamento <strong>${nome}</strong> cadastrado no estoque!`, 'success');
  }

  salvarDados('epis', epis);
  resetarFormEpi();
  renderizarEpis();
  preencherSelectsEmprestimo();
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

function abrirModalExcluirEpi(id, nome, ca) {
  idEpiExcluir = id;
  document.getElementById('modalNomeEpi').textContent = nome;
  document.getElementById('modalCaEpi').textContent = ca;
  modalEpiInst?.show();
}

function executarExclusaoEpi() {
  if (!idEpiExcluir) return;

  let epis = obterDados('epis').filter(e => String(e.id) !== String(idEpiExcluir));
  salvarDados('epis', epis);
  modalEpiInst?.hide();

  exibirAlerta('Equipamento removido do estoque.', 'warning');
  renderizarEpis();
  preencherSelectsEmprestimo();
}

// =============================================================================
// MÓDULO 3: CONTROLE DE EMPRÉSTIMO DE EPI
// =============================================================================
async function preencherSelectsEmprestimo() {
  const selectColab = document.getElementById('empColaborador');
  const selectEpi = document.getElementById('empEquipamento');
  if (!selectColab || !selectEpi) return;

  let colaboradores = [];
  
  try {
    const response = await fetch('/api/colaboradores');
    if (response.ok) colaboradores = await response.json();
    else colaboradores = obterDados('colaboradores') || [];
  } catch (error) {
    colaboradores = obterDados('colaboradores') || [];
  }

  const epis = obterDados('epis') || [];

  const colaboradoresAtivos = colaboradores.filter(c => {
    const statusLimpo = c.status ? String(c.status).trim().toUpperCase() : 'ATIVO';
    return statusLimpo === 'ATIVO';
  });

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
      if (String(emp.id) === String(id)) {
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
    const epiObj = epis.find(item => String(item.id) === String(epiId));
    if (!epiObj || epiObj.estoque <= 0) {
      exibirAlerta('Equipamento sem estoque disponível no momento!', 'danger');
      return;
    }

    epiObj.estoque -= 1;
    salvarDados('epis', epis);

    const novoId = emprestimos.length > 0 ? Math.max(...emprestimos.map(emp => Number(emp.id) || 0)) + 1 : 1;
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
    const colab = colaboradores.find(c => String(c.id) === String(emp.colaboradorId)) ?? { nome: 'Colaborador não encontrado' };
    const epi = epis.find(e => String(e.id) === String(emp.epiId)) ?? { nome: 'EPI não encontrado' };

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

function carregarEmprestimoEdicao(id) {
  const emprestimos = obterDados('emprestimos');
  const emp = emprestimos.find(e => String(e.id) === String(id));
  if (!emp) return;

  document.getElementById('emprestimoId').value = emp.id;
  document.getElementById('empColaborador').value = emp.colaboradorId;
  document.getElementById('empColaborador').disabled = true;
  document.getElementById('empEquipamento').value = emp.epiId;
  document.getElementById('empEquipamento').disabled = true;
  document.getElementById('empDataRetirada').value = emp.dataRetirada || '';
  document.getElementById('empDataRetirada').disabled = true;
  document.getElementById('empDataPrevista').value = emp.dataPrevista || '';
  document.getElementById('empDataPrevista').disabled = true;

  preencherOpcoesStatus(true);
  document.getElementById('empStatus').value = emp.status || 'Emprestado';

  if (emp.dataDevolucao) {
    document.getElementById('empDataDevolucao').value = emp.dataDevolucao;
  }
  document.getElementById('empObservacao').value = emp.observacao || '';

  tratarMudancaStatusEmprestimo();

  const title = document.getElementById('formEmpTitle');
  const btnText = document.getElementById('btnSalvarEmpText');
  const btnCancel = document.getElementById('btnCancelarEmp');

  if (title) title.textContent = 'Editar Status do Empréstimo';
  if (btnText) btnText.textContent = 'Atualizar Empréstimo';
  if (btnCancel) btnCancel.classList.remove('d-none');

  document.getElementById('emprestimoForm')?.scrollIntoView({ behavior: 'smooth' });
}

function visualizarInfoStatus(id) {
  const emprestimos = obterDados('emprestimos');
  const colaboradores = obterDados('colaboradores');
  const epis = obterDados('epis');

  const emp = emprestimos.find(e => String(e.id) === String(id));
  if (!emp) return;

  const colab = colaboradores.find(c => String(c.id) === String(emp.colaboradorId));
  const epi = epis.find(e => String(e.id) === String(emp.epiId));

  document.getElementById('infoColaborador').textContent = colab ? colab.nome : 'N/A';
  document.getElementById('infoEquipamento').textContent = epi ? epi.nome : 'N/A';

  const badge = document.getElementById('infoStatusBadge');
  if (badge) {
    badge.textContent = emp.status;
    let badgeClass = 'bg-primary';
    if (emp.status === 'Devolvido') badgeClass = 'bg-success';
    if (emp.status === 'Danificado' || emp.status === 'Perdido') badgeClass = 'bg-danger';
    badge.className = `badge ${badgeClass} fs-7`;
  }

  document.getElementById('infoDataDevolucao').textContent = emp.dataDevolucao 
    ? new Date(emp.dataDevolucao).toLocaleString('pt-BR') 
    : 'Pendente';

  document.getElementById('infoObservacao').innerHTML = emp.observacao 
    ? emp.observacao 
    : '<em>Nenhuma observação registrada.</em>';

  modalInfoInst?.show();
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