CREATE DATABASE IF NOT EXISTS `sgepi_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sgepi_db`;

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `colaborador_id` INT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `senha_hash` VARCHAR(255) NOT NULL,
  `perfil` VARCHAR(30) NOT NULL DEFAULT 'COMUM',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_usuarios_email` (`email` ASC),
  FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `colaboradores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `cpf` VARCHAR(14) NOT NULL,
  `matricula` VARCHAR(20) NOT NULL,
  `setor` ENUM('Fiação', 'Tecelagem', 'Tinturaria', 'Acabamento', 'Manutenção') NOT NULL,
  `cargo` VARCHAR(50) NOT NULL,
  `telefone` VARCHAR(20) NULL,
  `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_colaboradores_cpf` (`cpf` ASC),
  UNIQUE INDEX `uk_colaboradores_matricula` (`matricula` ASC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `epis` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `ca_numero` VARCHAR(30) NOT NULL,
  `descricao` TEXT NULL,
  `quantidade_estoque` INT NOT NULL DEFAULT 0,
  `validade_ca` DATE NOT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_epis_ca_numero` (`ca_numero` ASC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `emprestimos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `colaborador_id` INT NOT NULL,
  `epi_id` INT NOT NULL,
  `usuario_id` INT NOT NULL,
  `data_retirada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_devolucao_prevista` DATE NOT NULL,
  `data_devolucao_real` DATETIME NULL,
  `quantidade` INT NOT NULL DEFAULT 1,
  `status` ENUM('EMPRESTADO', 'DEVOLVIDO', 'ATRASADO') NOT NULL DEFAULT 'EMPRESTADO',
  `condicao_devolucao` ENUM('PERFEITO', 'DANIFICADO', 'DESCARTE', 'HIGIENIZACAO') NULL,
  `observacao` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (`epi_id`) REFERENCES `epis` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `requisicoes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `epi_id` INT NOT NULL,
  `tipo` ENUM('RETIRADA', 'DEVOLUCAO') NOT NULL DEFAULT 'RETIRADA',
  `status` ENUM('PENDENTE', 'APROVADA', 'REJEITADA') NOT NULL DEFAULT 'PENDENTE',
  `descricao` VARCHAR(255) NOT NULL,
  `condicao_devolucao` ENUM('PERFEITO', 'QUEBRADO', 'PERDIDO') NULL,
  `notificado` TINYINT(1) DEFAULT 0,
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  FOREIGN KEY (`epi_id`) REFERENCES `epis` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- POVOAMENTO
INSERT INTO `colaboradores` (`nome`, `cpf`, `matricula`, `setor`, `cargo`) VALUES
('Carlos Eduardo Silva', '111.222.333-44', 'TEX-1001', 'Tecelagem', 'Operador de Tecelagem'),
('Ana Maria Souza', '222.333.444-55', 'TEX-1002', 'Tinturaria', 'Auxiliar de Tinturaria');

INSERT INTO `epis` (`nome`, `ca_numero`, `descricao`, `quantidade_estoque`, `validade_ca`) VALUES
('Protetor Auricular Plug de Silicone', 'CA-12345', 'Atenuação de ruído', 150, '2027-12-31'),
('Máscara PFF2', 'CA-67890', 'Proteção respiratória', 300, '2026-10-15');

INSERT INTO `usuarios` (`nome`, `email`, `senha_hash`, `perfil`, `ativo`) VALUES
('Administrador do Sistema', 'admin@textil.com.br', '$2a$10$wT8v0G5Xp4A98xPZmQeAuuE4aK3mS1J6G7/3O7T5Z2Q1M9Xy0W5Ke', 'MASTER', 1),
('Colaborador Teste', 'colaborador@textil.com.br', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'COMUM', 1);

INSERT INTO `emprestimos` (`colaborador_id`, `epi_id`, `usuario_id`, `data_devolucao_prevista`, `quantidade`, `status`) VALUES
(1, 1, 1, '2026-11-01', 1, 'EMPRESTADO');