import requests
import re
import logging
import time
import os
import zipfile
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# Configurar logging para capturar mensagens
class DashboardLogHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.logs = []
    
    def emit(self, record):
        timestamp = time.strftime('%H:%M:%S', time.localtime())
        
        log_entry = {
            'timestamp': timestamp,
            'level': record.levelname,
            'message': record.getMessage()
        }
        self.logs.append(log_entry)
        if len(self.logs) > 200:
            self.logs.pop(0)
    
    def get_logs(self):
        return self.logs.copy()
    
    def clear_logs(self):
        self.logs.clear()

# Instância global do handler
dashboard_handler = DashboardLogHandler()
logger = logging.getLogger('scraper')
logger.addHandler(dashboard_handler)
logger.setLevel(logging.INFO)

def encontrar_maior_zip(url):
    logger.info(f"Iniciando busca por maior arquivo ZIP em: {url}")
    
    try:
        response = requests.get(url)
        logger.info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"Erro ao acessar URL: {url}")
            return None
        
        soup = BeautifulSoup(response.text, "html.parser")
        logger.info("HTML parseado com sucesso")
        
        maior_numero = 0
        maior_arquivo = ""
        arquivos_encontrados = 0

        for link in soup.find_all("a"):
            href = link.get("href")
            if href and ".zip" in href:
                arquivos_encontrados += 1
                partes = href.split("/")
                filename = partes[-1]
                padrao = re.compile(r"^P\d+\.zip$")
                if padrao.match(filename):
                    numero = int(filename[1:-4])
                    logger.info(f"Arquivo encontrado: {filename} (número: {numero})")
                    if numero > maior_numero:
                        maior_numero = numero
                        maior_arquivo = href
                        logger.info(f"Novo maior arquivo: {filename}")
        
        logger.info(f"Total de arquivos ZIP encontrados: {arquivos_encontrados}")
        
        if maior_arquivo:
            # Construir URL completa se necessário
            if not maior_arquivo.startswith('http'):
                maior_arquivo = urljoin(url, maior_arquivo)
            logger.info(f"Maior arquivo encontrado: {maior_arquivo} (número: {maior_numero})")
        else:
            logger.warning("Nenhum arquivo ZIP válido encontrado")
        
        return maior_arquivo
        
    except Exception as e:
        logger.error(f"Erro durante execução: {str(e)}")
        return None

def baixar_arquivo_zip(url_arquivo, pasta_destino="downloads"):
    """Baixa o arquivo ZIP da URL especificada"""
    logger.info(f"Iniciando download do arquivo: {url_arquivo}")
    
    try:
        # Criar pasta de downloads se não existir
        if not os.path.exists(pasta_destino):
            os.makedirs(pasta_destino)
            logger.info(f"Pasta '{pasta_destino}' criada")
        
        # Extrair nome do arquivo da URL
        nome_arquivo = url_arquivo.split('/')[-1]
        caminho_arquivo = os.path.join(pasta_destino, nome_arquivo)
        
        # Fazer download do arquivo
        logger.info("Conectando ao servidor para download...")
        response = requests.get(url_arquivo, stream=True)
        response.raise_for_status()
        
        # Salvar arquivo
        total_size = int(response.headers.get('content-length', 0))
        downloaded_size = 0
        
        with open(caminho_arquivo, 'wb') as arquivo:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    arquivo.write(chunk)
                    downloaded_size += len(chunk)
                    if total_size > 0:
                        progresso = (downloaded_size / total_size) * 100
                        if downloaded_size % (1024 * 1024) == 0:  # Log a cada MB
                            logger.info(f"Download: {progresso:.1f}% ({downloaded_size}/{total_size} bytes)")
        
        logger.info(f"✓ Arquivo baixado com sucesso: {caminho_arquivo}")
        logger.info(f"Tamanho do arquivo: {os.path.getsize(caminho_arquivo)} bytes")
        
        return caminho_arquivo
        
    except Exception as e:
        logger.error(f"Erro durante download: {str(e)}")
        return None

def extrair_arquivo_txt(caminho_zip, pasta_extracao="extracted"):
    """Extrai arquivos .txt do ZIP"""
    logger.info(f"Iniciando extração do arquivo: {caminho_zip}")
    
    try:
        # Criar pasta de extração se não existir
        if not os.path.exists(pasta_extracao):
            os.makedirs(pasta_extracao)
            logger.info(f"Pasta '{pasta_extracao}' criada")
        
        arquivos_txt = []
        
        with zipfile.ZipFile(caminho_zip, 'r') as zip_ref:
            # Listar todos os arquivos no ZIP
            lista_arquivos = zip_ref.namelist()
            logger.info(f"Arquivos encontrados no ZIP: {len(lista_arquivos)}")
            
            # Filtrar apenas arquivos .txt
            arquivos_txt_zip = [f for f in lista_arquivos if f.lower().endswith('.txt')]
            logger.info(f"Arquivos .txt encontrados: {len(arquivos_txt_zip)}")
            
            # Extrair arquivos .txt
            for arquivo_txt in arquivos_txt_zip:
                logger.info(f"Extraindo: {arquivo_txt}")
                zip_ref.extract(arquivo_txt, pasta_extracao)
                caminho_completo = os.path.join(pasta_extracao, arquivo_txt)
                arquivos_txt.append(caminho_completo)
                
                # Log do tamanho do arquivo extraído
                tamanho = os.path.getsize(caminho_completo)
                logger.info(f"✓ Extraído: {arquivo_txt} ({tamanho} bytes)")
        
        if arquivos_txt:
            logger.info(f"✓ Extração concluída. {len(arquivos_txt)} arquivo(s) .txt extraído(s)")
        else:
            logger.warning("Nenhum arquivo .txt encontrado no ZIP")
        
        return arquivos_txt
        
    except Exception as e:
        logger.error(f"Erro durante extração: {str(e)}")
        return []


def extrair_contexto_completo(conteudo, indice_linha_encontrada, string_busca):
    """
    Extrai o contexto completo de uma ocorrência seguindo as regras específicas:
    1. Linhas anteriores até encontrar linha iniciada com "(Cd)" (não incluindo essa linha)
    2. Linha onde a string foi encontrada
    3. Linhas posteriores até encontrar linha iniciada com "(Cd)" (incluindo essa linha)
    """
    try:
        total_linhas = len(conteudo)
        linha_inicio = indice_linha_encontrada
        linha_fim = indice_linha_encontrada
        
        # 1. Buscar linhas anteriores até encontrar "(Cd)"
        for i in range(indice_linha_encontrada - 1, -1, -1):
            linha_atual = conteudo[i].strip()
            if linha_atual.startswith("(Cd)"):
                # Não incluir a linha "(Cd)" anterior
                break
            linha_inicio = i
        
        # 2. Buscar linhas posteriores até encontrar "(Cd)"
        for i in range(indice_linha_encontrada + 1, total_linhas):
            linha_atual = conteudo[i].strip()
            linha_fim = i
            if linha_atual.startswith("(Cd)"):
                # Incluir a linha "(Cd)" posterior
                break
        
        # Extrair as linhas do contexto
        linhas_contexto = []
        for i in range(linha_inicio, linha_fim + 1):
            if i < total_linhas:
                linhas_contexto.append(conteudo[i].rstrip('\n\r'))
        
        # Criar texto completo do contexto
        texto_contexto = '\n'.join(linhas_contexto)
        
        # Log detalhado para debug
        logger.info(f"🔍 Contexto extraído - Linha string: {indice_linha_encontrada + 1}")
        logger.info(f"📍 Intervalo: L{linha_inicio + 1} até L{linha_fim + 1} ({len(linhas_contexto)} linhas)")
        
        # Verificar se encontrou delimitadores "(Cd)"
        linha_anterior_cd = None
        linha_posterior_cd = None
        
        # Verificar linha anterior com "(Cd)"
        if linha_inicio > 0:
            for i in range(linha_inicio - 1, -1, -1):
                if i < total_linhas and conteudo[i].strip().startswith("(Cd)"):
                    linha_anterior_cd = i + 1
                    break
        
        # Verificar linha posterior com "(Cd)"
        if linha_fim < total_linhas - 1:
            linha_posterior = conteudo[linha_fim].strip()
            if linha_posterior.startswith("(Cd)"):
                linha_posterior_cd = linha_fim + 1
        
        if linha_anterior_cd:
            logger.info(f"🏷️  Delimitador anterior (Cd) encontrado na linha {linha_anterior_cd}")
        if linha_posterior_cd:
            logger.info(f"🏷️  Delimitador posterior (Cd) encontrado na linha {linha_posterior_cd}")
        
        return {
            'texto': texto_contexto,
            'linhas': linhas_contexto,
            'linha_inicio': linha_inicio + 1,  # +1 para numeração humana
            'linha_fim': linha_fim + 1,        # +1 para numeração humana
            'linha_string': indice_linha_encontrada + 1,
            'delimitador_anterior': linha_anterior_cd,
            'delimitador_posterior': linha_posterior_cd
        }
        
    except Exception as e:
        logger.error(f"Erro ao extrair contexto: {str(e)}")
        # Retornar apenas a linha original em caso de erro
        linha_original = conteudo[indice_linha_encontrada].strip() if indice_linha_encontrada < len(conteudo) else ""
        return {
            'texto': linha_original,
            'linhas': [linha_original],
            'linha_inicio': indice_linha_encontrada + 1,
            'linha_fim': indice_linha_encontrada + 1,
            'linha_string': indice_linha_encontrada + 1,
            'delimitador_anterior': None,
            'delimitador_posterior': None
        }



def buscar_string_em_arquivos(arquivos_txt, string_busca):
    """Busca uma string nos arquivos .txt e retorna as linhas encontradas"""
    logger.info(f"Iniciando busca pela string: '{string_busca}'")
    logger.info(f"Arquivos a serem analisados: {len(arquivos_txt)}")
    
    resultados = []
    total_linhas_encontradas = 0
    
    try:
        for caminho_arquivo in arquivos_txt:
            logger.info(f"Analisando arquivo: {os.path.basename(caminho_arquivo)}")
            
            try:
                # Tentar diferentes encodings
                encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
                conteudo = None
                
                for encoding in encodings:
                    try:
                        with open(caminho_arquivo, 'r', encoding=encoding) as arquivo:
                            conteudo = arquivo.readlines()
                        logger.info(f"Arquivo lido com encoding: {encoding}")
                        break
                    except UnicodeDecodeError:
                        continue
                
                if conteudo is None:
                    logger.error(f"Não foi possível ler o arquivo: {caminho_arquivo}")
                    continue
                
                logger.info(f"Total de linhas no arquivo: {len(conteudo)}")
                
                # Buscar string em cada linha
                linhas_encontradas = 0
                for numero_linha, linha in enumerate(conteudo, 1):
                    if string_busca.lower() in linha.lower():
                        linhas_encontradas += 1
                        total_linhas_encontradas += 1
                        
                        # Extrair contexto completo da ocorrência
                        contexto = extrair_contexto_completo(conteudo, numero_linha - 1, string_busca)
                        
                        resultado = {
                            'arquivo': os.path.basename(caminho_arquivo),
                            'linha_encontrada': numero_linha,
                            'linha_string': linha.strip(),
                            'contexto_completo': contexto['texto'],
                            'linha_inicio': contexto['linha_inicio'],
                            'linha_fim': contexto['linha_fim'],
                            'total_linhas_contexto': len(contexto['linhas'])
                        }
                        resultados.append(resultado)
                        
                        # Log da ocorrência encontrada
                        logger.info(f"🔍 ENCONTRADO - Arquivo: {os.path.basename(caminho_arquivo)}, Linha {numero_linha}")
                        logger.info(f"📄 String: {linha.strip()[:100]}{'...' if len(linha.strip()) > 100 else ''}")
                        logger.info(f"📋 Contexto: {len(contexto['linhas'])} linhas (L{contexto['linha_inicio']}-L{contexto['linha_fim']})")
                        
                        # Log do contexto completo (limitado para não sobrecarregar)
                        if len(contexto['texto']) <= 500:
                            logger.info(f"📝 Contexto completo: {contexto['texto']}")
                        else:
                            logger.info(f"📝 Contexto (primeiras 500 chars): {contexto['texto'][:500]}...")
                
                logger.info(f"✓ Arquivo analisado: {linhas_encontradas} ocorrência(s) encontrada(s)")

                
            except Exception as e:
                logger.error(f"Erro ao processar arquivo {caminho_arquivo}: {str(e)}")
                continue
        
        logger.info(f"🎯 BUSCA CONCLUÍDA: {total_linhas_encontradas} ocorrência(s) encontrada(s) em {len(arquivos_txt)} arquivo(s)")
        
        return resultados
        
    except Exception as e:
        logger.error(f"Erro durante busca: {str(e)}")
        return []

def processar_arquivo_completo(url, string_busca):
    """Executa todo o processo: encontrar, baixar, extrair e buscar"""
    logger.info("=== INICIANDO PROCESSO COMPLETO ===")
    
    try:
        # 1. Encontrar maior arquivo ZIP
        logger.info("ETAPA 1: Encontrando maior arquivo ZIP...")
        url_arquivo = encontrar_maior_zip(url)
        if not url_arquivo:
            logger.error("Falha na etapa 1: Nenhum arquivo encontrado")
            return None
        
        # 2. Baixar arquivo
        logger.info("ETAPA 2: Baixando arquivo ZIP...")
        caminho_zip = baixar_arquivo_zip(url_arquivo)
        if not caminho_zip:
            logger.error("Falha na etapa 2: Erro no download")
            return None
        
        # 3. Extrair arquivos .txt
        logger.info("ETAPA 3: Extraindo arquivos .txt...")
        arquivos_txt = extrair_arquivo_txt(caminho_zip)
        if not arquivos_txt:
            logger.error("Falha na etapa 3: Nenhum arquivo .txt encontrado")
            return None
        
        # 4. Buscar string
        logger.info("ETAPA 4: Buscando string nos arquivos...")
        resultados = buscar_string_em_arquivos(arquivos_txt, string_busca)
        
        logger.info("=== PROCESSO COMPLETO FINALIZADO ===")
        
        return {
            'url_arquivo': url_arquivo,
            'caminho_zip': caminho_zip,
            'arquivos_txt': arquivos_txt,
            'resultados': resultados,
            'total_encontrados': len(resultados)
        }
        
    except Exception as e:
        logger.error(f"Erro no processo completo: {str(e)}")
        return None

def get_scraper_logs():
    """Função para obter os logs do scraper"""
    return dashboard_handler.get_logs()

def clear_scraper_logs():
    """Função para limpar os logs do scraper"""
    dashboard_handler.clear_logs()
