import requests
import re
# Importing BeautifulSoup for HTML parsing
from bs4 import BeautifulSoup

def encontrar_maior_zip(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")

    # Improved logging for debugging
    print(f"Status Code: {response.status_code}") # Check if the request was successful
    if response.status_code != 200:
        print(f"Error fetching URL: {url}")
        return None # Handle the error gracefully

    maior_numero = 0
    maior_arquivo = ""

    # Find all links directly, no need to iterate through tables first
    for link in soup.find_all("a"):
        # Check if the link has an href attribute and contains ".zip"
        href = link.get("href")
        if href and ".zip" in href:
            # Print the href for debugging
            # print(f"Found link: {href}")
            # Split the href to extract the number
            partes = href.split("/")
            # Get the filename part
            filename = partes[-1]
            # If the filename starts with "P" followed by a number, extract the number
            padrao = re.compile(r"^P\d+\.zip$")
            if padrao.match(filename):
            # Print the extracted number for debugging
                # print(f"Extracted number: {filename}")
                # compare the number to find the largest
                numero = int(filename[1:-4])  # Extract the number from "P<number>.zip"
                if numero > maior_numero:
                    maior_numero = numero
                    maior_arquivo = href
    # Print the largest file found
    # print(f"Largest file found: {maior_arquivo} with number {maior_numero}")

    return maior_arquivo
