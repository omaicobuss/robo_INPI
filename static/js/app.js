// Variáveis globais
let ultimoArquivo = null;
let downloadCount = 0;
let logUpdateInterval = null;
let logsPausados = false;
let occurrenceCount = 0;

// Função para adicionar log
function adicionarLog(message, type = 'info') {
    if (logsPausados) return;
    
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

// Função para buscar logs do servidor
async function buscarLogs() {
    if (logsPausados) return;
    
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        
        if (data.logs && data.logs.length > 0) {
            const logPanel = document.getElementById('logPanel');
            
            data.logs.forEach(logData => {
                const existingLogs = logPanel.querySelectorAll('[data-scraper]');
                const logExists = Array.from(existingLogs).some(entry => 
                    entry.textContent.includes(logData.message)
                );
                
                if (!logExists) {
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.setAttribute('data-scraper', 'true');
                    
                    let logClass = 'log-info';
                    if (logData.level === 'ERROR') {
                        logClass = 'log-error';
                    } else if (logData.level === 'WARNING') {
                        logClass = 'log-warning';
                    }
                    
                    logEntry.innerHTML = `
                        <span class="timestamp">[${logData.timestamp}]</span>
                        <span class="${logClass}">${logData.message}</span>
                    `;
                    
                    logPanel.appendChild(logEntry);
                }
            });
            
            logPanel.scrollTop = logPanel.scrollHeight;
        }
    } catch (error) {
        console.error('Erro ao buscar logs:', error);
    }
}


function exibirResultadosDetalhados(resultados) {
    if (!resultados || resultados.length === 0) return;
    
    adicionarLog('📊 === RESULTADOS DETALHADOS ===', 'success');
    
    resultados.forEach((resultado, index) => {
        adicionarLog(`\n🔍 OCORRÊNCIA ${index + 1}:`, 'info');
        adicionarLog(`📁 Arquivo: ${resultado.arquivo}`, 'info');
        adicionarLog(`📍 Linha da string: ${resultado.linha_encontrada}`, 'info');
        adicionarLog(`📋 Contexto: ${resultado.total_linhas_contexto} linhas (L${resultado.linha_inicio}-L${resultado.linha_fim})`, 'info');
        
        // Exibir contexto completo se não for muito grande
        if (resultado.contexto_completo.length <= 1000) {
            adicionarLog(`📝 CONTEXTO COMPLETO:\n${resultado.contexto_completo}`, 'info');
        } else {
            adicionarLog(`📝 CONTEXTO (primeiros 1000 chars):\n${resultado.contexto_completo.substring(0, 1000)}...`, 'info');
        }
        
        adicionarLog('─'.repeat(50), 'info');
    });
}



// Função para iniciar monitoramento de logs
function iniciarMonitoramentoLogs() {
    if (logUpdateInterval) {
        clearInterval(logUpdateInterval);
    }
    logUpdateInterval = setInterval(buscarLogs, 1000);
}

// Função para parar monitoramento de logs
function pararMonitoramentoLogs() {
    if (logUpdateInterval) {
        clearInterval(logUpdateInterval);
        logUpdateInterval = null;
    }
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

// Função para atualizar status
function atualizarStatus(etapa, arquivo = null, stringBusca = null) {
    document.getElementById('currentStep').textContent = etapa;
    if (arquivo) document.getElementById('currentFile').textContent = arquivo;
    if (stringBusca) document.getElementById('currentSearch').textContent = stringBusca;
}

// Função para atualizar contadores
function atualizarContadores(arquivo = null, ocorrencias = null) {
    if (arquivo) {
        document.getElementById('lastFile').textContent = arquivo;
        ultimoArquivo = arquivo;
    }
    if (ocorrencias !== null) {
        occurrenceCount = ocorrencias;
        document.getElementById('occurrenceCount').textContent = ocorrencias;
    }
    
    const agora = new Date().toLocaleTimeString();
    document.getElementById('lastExecution').textContent = agora;
}

// Função para habilitar/desabilitar botões
function habilitarBotoes(verificar = true, processar = true, baixar = false) {
    document.getElementById('verificarBtn').disabled = !verificar;
    document.getElementById('processarCompletoBtn').disabled = !processar;
    document.getElementById('baixarBtn').disabled = !baixar;
}

// Função principal para verificar maior ZIP
async function verificarMaiorZip() {
    try {
        habilitarBotoes(false, false, false);
        atualizarProgresso(10, 'Conectando ao site do INPI...');
        atualizarStatus('Verificando maior ZIP');
        adicionarLog('Iniciando verificação do maior arquivo ZIP...', 'info');
        
        iniciarMonitoramentoLogs();
        
        const urlInput = document.getElementById('urlInput').value;
        const url = urlInput || 'https://revistas.inpi.gov.br/rpi/';
        
        setTimeout(() => atualizarProgresso(30, 'Analisando arquivos disponíveis...'), 500);
        setTimeout(() => atualizarProgresso(60, 'Processando resultados...'), 1000);
        
        const response = await fetch(`/api/verificar-maior-zip?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        atualizarProgresso(90, 'Finalizando...');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (data.success) {
            atualizarProgresso(100, 'Concluído com sucesso!');
            adicionarLog(`✓ ${data.message}`, 'success');
            
            atualizarContadores(data.nome_arquivo);
            atualizarStatus('Concluído', data.nome_arquivo);
            habilitarBotoes(true, true, true);
            
            if (data.arquivo) {
                adicionarLog(`📁 URL completa: ${data.arquivo}`, 'info');
            }
            
        } else {
            atualizarProgresso(0, 'Erro na execução');
            adicionarLog(`✗ Erro: ${data.message}`, 'error');
            atualizarStatus('Erro');
            habilitarBotoes(true, true, false);
        }
        
    } catch (error) {
        atualizarProgresso(0, 'Erro na conexão');
        adicionarLog(`✗ Erro de conexão: ${error.message}`, 'error');
        atualizarStatus('Erro de conexão');
        habilitarBotoes(true, true, false);
    } finally {
        setTimeout(() => {
            pararMonitoramentoLogs();
            resetarProgresso();
        }, 3000);
    }
}

// Função para processar completo
async function processarCompleto() {
    try {
        const stringBusca = document.getElementById('searchStringInput').value.trim();
        
        if (!stringBusca) {
            adicionarLog('✗ Erro: String de busca é obrigatória!', 'error');
            document.getElementById('searchStringInput').focus();
            return;
        }
        
        habilitarBotoes(false, false, false);
        atualizarProgresso(5, 'Iniciando processo completo...');
        atualizarStatus('Processo Completo', null, stringBusca);
        adicionarLog('=== INICIANDO PROCESSO COMPLETO ===', 'info');
        adicionarLog(`String de busca: "${stringBusca}"`, 'info');
        
        iniciarMonitoramentoLogs();
        
        const urlInput = document.getElementById('urlInput').value;
        const url = urlInput || 'https://revistas.inpi.gov.br/rpi/';
        
        // Simular progresso das etapas
        const etapas = [
            { progresso: 15, texto: 'Encontrando maior arquivo ZIP...' },
            { progresso: 35, texto: 'Baixando arquivo ZIP...' },
            { progresso: 60, texto: 'Extraindo arquivos .txt...' },
            { progresso: 85, texto: 'Buscando string nos arquivos...' }
        ];
        
        let etapaAtual = 0;
        const intervalEtapas = setInterval(() => {
            if (etapaAtual < etapas.length) {
                atualizarProgresso(etapas[etapaAtual].progresso, etapas[etapaAtual].texto);
                etapaAtual++;
            } else {
                clearInterval(intervalEtapas);
            }
        }, 2000);
        
        const response = await fetch('/api/processar-completo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                url: url,
                string_busca: stringBusca 
            })
        });
        
        const data = await response.json();
        
        clearInterval(intervalEtapas);
        
        // Aguardar logs finais
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (data.success && data.resultado && data.resultado.resultados) {
            atualizarProgresso(100, 'Processo completo finalizado!');
            adicionarLog(`✓ ${data.message}`, 'success');
            
            if (data.resultado) {
                const resultado = data.resultado;
                atualizarContadores(
                    resultado.url_arquivo ? resultado.url_arquivo.split('/').pop() : null,
                    resultado.total_encontrados
                );
                
                atualizarStatus('Finalizado', 
                    resultado.url_arquivo ? resultado.url_arquivo.split('/').pop() : null, 
                    stringBusca
                );
                
                adicionarLog(`📊 Resumo: ${resultado.total_encontrados} ocorrência(s) encontrada(s)`, 'success');
                adicionarLog(`📁 Arquivos .txt processados: ${resultado.arquivos_txt ? resultado.arquivos_txt.length : 0}`, 'info');
            }
            
            habilitarBotoes(true, true, true);
            
            // Exibir resultados detalhados
            setTimeout(() => {
                exibirResultadosDetalhados(data.resultado.resultados);
            }, 1000);
            
        } else {
            atualizarProgresso(0, 'Erro no processo');
            adicionarLog(`✗ Erro: ${data.message}`, 'error');
            atualizarStatus('Erro no processo');
            habilitarBotoes(true, true, false);
        }
        
    } catch (error) {
        atualizarProgresso(0, 'Erro na conexão');
        adicionarLog(`✗ Erro de conexão: ${error.message}`, 'error');
        atualizarStatus('Erro de conexão');
        habilitarBotoes(true, true, false);
    } finally {
        setTimeout(() => {
            pararMonitoramentoLogs();
            resetarProgresso();
        }, 5000);
    }
}

// Função para baixar arquivo
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
            habilitarBotoes(true, true, true);
        } else {
            atualizarProgresso(0, 'Erro no download');
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
    
    // Limpar também logs do servidor
    fetch('/api/clear-logs', {
        method: 'POST'
    }).catch(error => console.error('Erro ao limpar logs do servidor:', error));
}

// Função para pausar/retomar logs
function togglePausarLogs() {
    logsPausados = !logsPausados;
    const btn = document.getElementById('pauseLogsBtn');
    
    if (logsPausados) {
        btn.innerHTML = '<i class="fas fa-play"></i> Retomar';
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-outline-warning');
        adicionarLog('📋 Logs pausados pelo usuário', 'warning');
    } else {
        btn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
        btn.classList.remove('btn-outline-warning');
        btn.classList.add('btn-outline-secondary');
        adicionarLog('📋 Logs retomados pelo usuário', 'info');
    }
}

// Função para exportar logs
function exportarLogs() {
    const logPanel = document.getElementById('logPanel');
    const logs = logPanel.innerText;
    
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `robo-inpi-logs-${timestamp}.txt`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    adicionarLog('📄 Logs exportados com sucesso', 'success');
}

// Função para resetar URL
function resetarUrl() {
    document.getElementById('urlInput').value = 'https://revistas.inpi.gov.br/rpi/';
    adicionarLog('🔄 URL resetada para o padrão', 'info');
}

// Função para limpar string de busca
function limparStringBusca() {
    document.getElementById('searchStringInput').value = '';
    document.getElementById('currentSearch').textContent = 'Não definida';
    adicionarLog('🔄 String de busca limpa', 'info');
}

// Função para atualizar página
function atualizarPagina() {
    if (confirm('Tem certeza que deseja recarregar a página? Todos os logs serão perdidos.')) {
        location.reload();
    }
}

// Função para validar entrada
function validarEntrada() {
    const stringBusca = document.getElementById('searchStringInput').value.trim();
    const processarBtn = document.getElementById('processarCompletoBtn');
    
    if (stringBusca.length > 0) {
        processarBtn.classList.remove('btn-secondary');
        processarBtn.classList.add('btn-success');
        document.getElementById('currentSearch').textContent = stringBusca;
    } else {
        processarBtn.classList.remove('btn-success');
        processarBtn.classList.add('btn-secondary');
        document.getElementById('currentSearch').textContent = 'Não definida';
    }
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
    document.getElementById('processarCompletoBtn').addEventListener('click', processarCompleto);
    document.getElementById('baixarBtn').addEventListener('click', baixarArquivo);
    document.getElementById('limparBtn').addEventListener('click', limparLogs);
    
    // Botões auxiliares
    document.getElementById('resetUrlBtn').addEventListener('click', resetarUrl);
    document.getElementById('clearSearchBtn').addEventListener('click', limparStringBusca);
    document.getElementById('refreshBtn').addEventListener('click', atualizarPagina);
    document.getElementById('pauseLogsBtn').addEventListener('click', togglePausarLogs);
    document.getElementById('exportLogsBtn').addEventListener('click', exportarLogs);
    
    // Validação em tempo real da string de busca
    document.getElementById('searchStringInput').addEventListener('input', validarEntrada);
    document.getElementById('searchStringInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            processarCompleto();
        }
    });
    
    // Validação da URL
    document.getElementById('urlInput').addEventListener('change', function() {
        const url = this.value.trim();
        if (url && !url.startsWith('http')) {
            this.value = 'https://' + url;
        }
    });
    
    // Inicializar status
    atualizarStatus('Aguardando');
    
    // Log inicial
    adicionarLog('🤖 Sistema Robo INPI iniciado e pronto para uso', 'success');
    adicionarLog('💡 Dica: Digite uma string de busca e clique em "Processar Completo" para executar todo o fluxo', 'info');
    
    // Verificar se há logs do servidor ao iniciar
    setTimeout(buscarLogs, 1000);
});

// Função para adicionar endpoint de logs ao app.py
async function adicionarEndpointLogs() {
    try {
        const response = await fetch('/api/logs');
        return response.ok;
    } catch (error) {
        console.warn('Endpoint de logs não disponível:', error);
        return false;
    }
}

// Verificar conexão com o servidor
async function verificarConexao() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            document.getElementById('systemStatus').innerHTML = '<i class="fas fa-circle text-success"></i> Online';
        } else {
            document.getElementById('systemStatus').innerHTML = '<i class="fas fa-circle text-warning"></i> Instável';
        }
    } catch (error) {
        document.getElementById('systemStatus').innerHTML = '<i class="fas fa-circle text-danger"></i> Offline';
    }
}

// Verificar conexão a cada 30 segundos
setInterval(verificarConexao, 30000);
verificarConexao(); // Verificar imediatamente