// Variáveis globais
let ultimoArquivo = null;
let downloadCount = 0;

// Função para adicionar log
function adicionarLog(message, type = 'info') {
    const logPanel = document.getElementById('logPanel');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const logClass = `log-${type}`;
    logEntry.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <span class="${logClass}">${message}</span>
    `;
    
    logPanel.appendChild(logEntry);
    logPanel.scrollTop = logPanel.scrollHeight;
}

// Função para atualizar progresso
function atualizarProgresso(porcentagem, tarefa) {
    const progressBar = document.getElementById('progressBar');
    const currentTask = document.getElementById('currentTask');
    
    progressBar.style.width = `${porcentagem}%`;
    progressBar.setAttribute('aria-valuenow', porcentagem);
    progressBar.textContent = `${porcentagem}%`;
    
    if (tarefa) {
        currentTask.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${tarefa}`;
    }
}

// Função para resetar progresso
function resetarProgresso() {
    atualizarProgresso(0, '<i class="fas fa-clock"></i> Aguardando comando...');
}

// Função para atualizar status do último arquivo
function atualizarUltimoArquivo(nomeArquivo) {
    const lastFileElement = document.getElementById('lastFile');
    lastFileElement.textContent = nomeArquivo;
    ultimoArquivo = nomeArquivo;
}

// Função para atualizar última execução
function atualizarUltimaExecucao() {
    const lastExecutionElement = document.getElementById('lastExecution');
    const agora = new Date().toLocaleTimeString();
    lastExecutionElement.textContent = agora;
}

// Função para habilitar/desabilitar botões
function habilitarBotoes(verificar = true, baixar = false, ler = false) {
    document.getElementById('verificarBtn').disabled = !verificar;
    document.getElementById('baixarBtn').disabled = !baixar;
    document.getElementById('lerBtn').disabled = !ler;
}

// Função principal para verificar maior ZIP
async function verificarMaiorZip() {
    try {
        // Desabilitar botão e mostrar loading
        habilitarBotoes(false, false, false);
        atualizarProgresso(10, 'Conectando ao site do INPI...');
        adicionarLog('Iniciando verificação do maior arquivo ZIP...', 'info');
        
        // Simular progresso
        setTimeout(() => atualizarProgresso(30, 'Analisando arquivos disponíveis...'), 500);
        setTimeout(() => atualizarProgresso(60, 'Processando resultados...'), 1000);
        
        // Fazer requisição para a API
        const response = await fetch('/api/verificar-maior-zip');
        const data = await response.json();
        
        atualizarProgresso(90, 'Finalizando...');
        
        if (data.success) {
            atualizarProgresso(100, 'Concluído com sucesso!');
            adicionarLog(`✓ ${data.message}`, 'success');
            
            // Atualizar interface
            atualizarUltimoArquivo(data.nome_arquivo);
            atualizarUltimaExecucao();
            
            // Habilitar botão de download
            habilitarBotoes(true, true, false);
            
            // Mostrar link do arquivo
            if (data.arquivo) {
                adicionarLog(`📁 URL completa: ${data.arquivo}`, 'info');
            }
            
        } else {
            atualizarProgresso(0, 'Erro na execução');
            adicionarLog(`✗ Erro: ${data.message}`, 'error');
            habilitarBotoes(true, false, false);
        }
        
    } catch (error) {
        atualizarProgresso(0, 'Erro na conexão');
        adicionarLog(`✗ Erro de conexão: ${error.message}`, 'error');
        habilitarBotoes(true, false, false);
    }
    
    // Resetar progresso após 3 segundos
    setTimeout(resetarProgresso, 3000);
}

// Função para baixar arquivo (placeholder)
async function baixarArquivo() {
    try {
        habilitarBotoes(false, false, false);
        atualizarProgresso(20, 'Preparando download...');
        adicionarLog('Iniciando download do arquivo...', 'info');
        
        const response = await fetch('/api/baixar-zip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ arquivo: ultimoArquivo })
        });
        
        const data = await response.json();
        
        if (data.success) {
            atualizarProgresso(100, 'Download concluído!');
            adicionarLog(`✓ ${data.message}`, 'success');
            downloadCount++;
            document.getElementById('downloadCount').textContent = downloadCount;
            habilitarBotoes(true, true, true);
        } else {
            atualizarProgresso(0, 'Erro no download');
            adicionarLog(`✗ Erro: ${data.message}`, 'error');
            habilitarBotoes(true, true, false);
        }
        
    } catch (error) {
        atualizarProgresso(0, 'Erro na conexão');
        adicionarLog(`✗ Erro de conexão: ${error.message}`, 'error');
        habilitarBotoes(true, true, false);
    }
    
    setTimeout(resetarProgresso, 3000);
}

// Função para ler conteúdo (placeholder)
async function lerConteudo() {
    try {
        habilitarBotoes(false, false, false);
        atualizarProgresso(30, 'Lendo conteúdo do arquivo...');
        adicionarLog('Iniciando leitura do conteúdo...', 'info');
        
        const response = await fetch('/api/ler-conteudo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ arquivo: ultimoArquivo })
        });
        
        const data = await response.json();
        
        if (data.success) {
            atualizarProgresso(100, 'Leitura concluída!');
            adicionarLog(`✓ ${data.message}`, 'success');
            habilitarBotoes(true, true, true);
        } else {
            atualizarProgresso(0, 'Erro na leitura');
            adicionarLog(`✗ Erro: ${data.message}`, 'error');
            habilitarBotoes(true, true, true);
        }
        
    } catch (error) {
        atualizarProgresso(0, 'Erro na conexão');
        adicionarLog(`✗ Erro de conexão: ${error.message}`, 'error');
        habilitarBotoes(true, true, true);
    }
    
    setTimeout(resetarProgresso, 3000);
}

// Função para limpar logs
function limparLogs() {
    const logPanel = document.getElementById('logPanel');
    logPanel.innerHTML = '';
    adicionarLog('Logs limpos - Sistema pronto para nova operação', 'info');
}

// Função para resetar URL
function resetarUrl() {
    document.getElementById('urlInput').value = 'https://revistas.inpi.gov.br/rpi/';
    adicionarLog('URL resetada para o padrão', 'info');
}

// Função para atualizar página
function atualizarPagina() {
    location.reload();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Definir timestamp inicial
    const initialTimestamp = document.getElementById('initialTimestamp');
    if (initialTimestamp) {
        initialTimestamp.textContent = `[${new Date().toLocaleTimeString()}]`;
    }
    
    // Botões principais
    document.getElementById('verificarBtn').addEventListener('click', verificarMaiorZip);
    document.getElementById('baixarBtn').addEventListener('click', baixarArquivo);
    document.getElementById('lerBtn').addEventListener('click', lerConteudo);
    document.getElementById('limparBtn').addEventListener('click', limparLogs);
    
    // Botões auxiliares
    document.getElementById('resetUrlBtn').addEventListener('click', resetarUrl);
    document.getElementById('refreshBtn').addEventListener('click', atualizarPagina);
    
    // Log inicial
    adicionarLog('Sistema iniciado e pronto para uso', 'success');
});