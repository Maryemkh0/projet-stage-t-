import os
import sys
import requests
import json

# Le point d'entrée pour appeler Gemini (Remplacez avec la vraie URL/SDK Google Gemini)
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "VOTRE_CLE_API_GEMINI_ICI")

def fetch_jenkins_log(build_url):
    """
    Récupère les logs d'échec depuis l'URL de build Jenkins.
    """
    try:
        # En environnement réel, utiliser une authentification si nécessaire
        # response = requests.get(f"{build_url}/consoleText")
        # return response.text[-5000:] # Retourne les 5000 derniers caractères
        
        # Simulation locale pour la démo:
        return "BUILD FAILURE: maven-compiler-plugin:3.14.1:compile (default-compile) on project cicd-ai-app: Compilation failure: Syntax error on line 42."
    except Exception as e:
        return f"Erreur lors de la récupération des logs: {e}"

def analyze_log_with_ai(log_content):
    """
    Envoie le log à l'API Gemini pour analyse.
    """
    prompt = f"""
    Tu es un expert DevOps et un développeur Senior Java.
    Le pipeline d'intégration continue vient d'échouer. 
    Voici la fin du log d'erreur :
    
    {log_content}
    
    1. Explique l'erreur en une phrase simple (en français).
    2. Explique brièvement d'où vient l'erreur techniquement.
    3. Donne la solution ou la commande précise pour corriger le problème.
    Formate la réponse en Markdown.
    """
    
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    try:
        if GEMINI_API_KEY == "VOTRE_CLE_API_GEMINI_ICI":
            return "### [SIMULATION IA]\n**Explication** : Le code Java contient une erreur de syntaxe à la ligne 42.\n**Origine** : Un point-virgule manquant ou un mot-clé incorrect dans le fichier `.java`.\n**Solution** : Ouvrez votre fichier `.java` à la ligne 42 et corrigez la syntaxe, puis relancez un `git commit -am 'fix syntax' && git push`."
            
        url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        return result['candidates'][0]['content']['parts'][0]['text']
        
    except Exception as e:
         return f"Erreur lors de l'appel à l'IA Gemini: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ai-analyzer.py <JENKINS_BUILD_URL>")
        sys.exit(1)
        
    build_url = sys.argv[1]
    
    print(f"[IA] Analyse des logs du build {build_url} en cours...")
    
    log_content = fetch_jenkins_log(build_url)
    analysis_result = analyze_log_with_ai(log_content)
    
    # Sauvegarde du rapport pour être affiché dans le Dashboard UI
    report = {
        "build_url": build_url,
        "status": "FAILED",
        "ai_analysis": analysis_result
    }
    
    # Écriture dans un fichier JSON pour le frontend
    os.makedirs("src/main/resources/static/data", exist_ok=True)
    with open("src/main/resources/static/data/ai-report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=4)
        
    print("[IA] Analyse terminée et sauvegardée dans ai-report.json")
    print(analysis_result)
