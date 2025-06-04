from flask import Flask, render_template, jsonify, request
from scraper import encontrar_maior_zip
import os
from datetime import datetime

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/verificar-maior-zip")
def verificar_maior_zip():
    try:
        url = "https://revistas.inpi.gov.br/rpi/"
        arquivo_zip = encontrar_maior_zip(url)
        
        if arquivo_zip:
            # Extrair apenas o nome do arquivo da URL completa
            nome_arquivo = arquivo_zip.split('/')[-1] if '/' in arquivo_zip else arquivo_zip
            
            return jsonify({
                "success": True,
                "arquivo": arquivo_zip,
                "nome_arquivo": nome_arquivo,
                "message": f"Maior arquivo ZIP encontrado: {nome_arquivo}",
                "timestamp": datetime.now().strftime("%H:%M:%S")
            })
        else:
            return jsonify({
                "success": False,
                "error": "Nenhum arquivo ZIP encontrado",
                "message": "Não foi possível encontrar arquivos ZIP no site",
                "timestamp": datetime.now().strftime("%H:%M:%S")
            })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": f"Erro ao buscar arquivo ZIP: {str(e)}",
            "timestamp": datetime.now().strftime("%H:%M:%S")
        })

@app.route("/api/baixar-zip", methods=["POST"])
def baixar_zip():
    # Função placeholder - será implementada
    return jsonify({
        "success": True,
        "message": "Função de download será implementada em breve",
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

@app.route("/api/ler-conteudo", methods=["POST"])
def ler_conteudo():
    # Função placeholder - será implementada
    return jsonify({
        "success": True,
        "message": "Função de leitura de conteúdo será implementada em breve",
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

if __name__ == "__main__":
    app.run(debug=True)