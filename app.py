from flask import Flask, render_template, jsonify, request
from scraper import (
    encontrar_maior_zip, 
    get_scraper_logs, 
    clear_scraper_logs,
    baixar_arquivo_zip,
    extrair_arquivo_txt,
    buscar_string_em_arquivos,
    processar_arquivo_completo
)
import os
from datetime import datetime

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/verificar-maior-zip", methods=['GET'])
def verificar_maior_zip():
    try:
        # Limpar logs anteriores
        clear_scraper_logs()
        
        # URL padrão ou personalizada
        url = request.args.get('url', 'https://revistas.inpi.gov.br/rpi/')
        
        # Executar scraper
        arquivo = encontrar_maior_zip(url)
        
        if arquivo:
            # Extrair nome do arquivo
            nome_arquivo = arquivo.split('/')[-1] if arquivo else 'Não encontrado'
            
            return jsonify({
                "success": True,
                "message": f"Maior arquivo encontrado: {nome_arquivo}",
                "arquivo": arquivo,
                "nome_arquivo": nome_arquivo
            })
        else:
            return jsonify({
                "success": False,
                "message": "Nenhum arquivo ZIP encontrado"
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erro durante execução: {str(e)}"
        })

@app.route("/api/processar-completo", methods=['POST'])
def processar_completo():
    """Endpoint para executar todo o processo"""
    try:
        clear_scraper_logs()
        
        data = request.get_json()
        url = data.get('url', 'https://revistas.inpi.gov.br/rpi/')
        string_busca = data.get('string_busca', '')
        
        if not string_busca:
            return jsonify({
                "success": False,
                "message": "String de busca é obrigatória"
            })
        
        resultado = processar_arquivo_completo(url, string_busca)
        
        if resultado:
            return jsonify({
                "success": True,
                "message": f"Processo concluído! {resultado['total_encontrados']} ocorrência(s) encontrada(s)",
                "resultado": resultado
            })
        else:
            return jsonify({
                "success": False,
                "message": "Falha no processamento"
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erro durante execução: {str(e)}"
        })

@app.route("/api/logs", methods=['GET'])
def get_logs():
    try:
        logs = get_scraper_logs()
        return jsonify({'logs': logs})
    except Exception as e:
        return jsonify({'logs': [], 'error': str(e)})

@app.route("/api/clear-logs", methods=['POST'])
def clear_logs():
    try:
        clear_scraper_logs()
        return jsonify({'success': True, 'message': 'Logs limpos'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route("/api/baixar-zip", methods=["POST"])
def baixar_zip():
    # Implementar lógica de download
    return jsonify({
        "success": True,
        "message": "Download simulado com sucesso"
    })

@app.route("/api/ler-conteudo", methods=["POST"])
def ler_conteudo():
    # Implementar lógica de leitura
    return jsonify({
        "success": True,
        "message": "Conteúdo lido com sucesso"
    })

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({'status': 'online', 'timestamp': datetime.now().isoformat()})

if __name__ == "__main__":
    app.run(debug=True)