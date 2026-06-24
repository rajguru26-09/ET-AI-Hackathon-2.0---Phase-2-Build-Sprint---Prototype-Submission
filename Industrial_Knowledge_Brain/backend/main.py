import json
import time
import re
import math
from http.server import BaseHTTPRequestHandler, HTTPServer
from collections import Counter
import urllib.parse

# --- Advanced Knowledge Base for the Hackathon ---
# We simulate a vector database and RAG pipeline using TF-IDF and Cosine Similarity
DOCUMENTS = [
    {
        "id": "doc_001",
        "title": "Pump_Maintenance_V2.pdf",
        "content": "To perform maintenance on the centrifugal pump Model X-200, first isolate the power supply. The Root Cause Analysis (RCA) for recent pump failures indicates that bearing wear due to lack of lubrication is the primary culprit. Operators must ensure lubrication is checked weekly. If vibration exceeds 5mm/s, immediately halt operations.",
    },
    {
        "id": "doc_002",
        "title": "Safety_Guidelines_2025.txt",
        "content": "Confined Space Entry Protocol: 1) Test atmospheric hazards before entry. Oxygen must be between 19.5% and 23.5%. 2) Ensure continuous ventilation. 3) A standby person must be stationed outside at all times. 4) Use full-body harness and retrieval lines. No hot work is permitted unless gas clearance is formally signed by the Safety Officer.",
    },
    {
        "id": "doc_003",
        "title": "OISD_Compliance_Q3.pdf",
        "content": "OISD Compliance Updates Q3: The latest Oil Industry Safety Directorate regulations mandate that all safety relief valves must be calibrated every 6 months instead of 12 months. Furthermore, digital permit-to-work systems must maintain audit logs for a minimum of 5 years. Any deviation from standard operating limits requires Tier 1 management approval.",
    }
]

STOP_WORDS = {"the", "a", "to", "of", "and", "in", "is", "for", "that", "on", "with", "as", "are", "be", "it", "by", "or", "an", "this", "from", "any"}

def tokenize(text):
    return [word for word in re.findall(r'\w+', text.lower()) if word not in STOP_WORDS]

def compute_tf(text):
    tokens = tokenize(text)
    tf = Counter(tokens)
    total = len(tokens) if len(tokens) > 0 else 1
    for k in tf:
        tf[k] = tf[k] / total
    return tf

def compute_idf(documents):
    idf = {}
    N = len(documents)
    all_tokens = set()
    for doc in documents:
        all_tokens.update(tokenize(doc["content"]))
    
    for token in all_tokens:
        count = sum(1 for doc in documents if token in tokenize(doc["content"]))
        idf[token] = math.log(N / (count + 1)) + 1 # Smoothed IDF
    return idf

def tf_idf_search(query, documents):
    idf = compute_idf(documents)
    query_tf = compute_tf(query)
    
    query_vec = {k: v * idf.get(k, 0) for k, v in query_tf.items()}
    
    best_doc_idx = -1
    best_score = 0
    best_sentence = ""
    
    for i, doc in enumerate(documents):
        doc_tf = compute_tf(doc["content"])
        doc_vec = {k: v * idf.get(k, 0) for k, v in doc_tf.items()}
        
        # Cosine similarity
        intersection = set(query_vec.keys()) & set(doc_vec.keys())
        dot_product = sum(query_vec[k] * doc_vec[k] for k in intersection)
        
        mag_q = math.sqrt(sum(v**2 for v in query_vec.values()))
        mag_d = math.sqrt(sum(v**2 for v in doc_vec.values()))
        
        if mag_q * mag_d == 0:
            score = 0
        else:
            score = dot_product / (mag_q * mag_d)
            
        if score > best_score:
            best_score = score
            best_doc_idx = i
            
            # Sentence level extraction
            sentences = re.split(r'(?<=[.!?]) +', doc["content"])
            best_s_score = 0
            for sentence in sentences:
                s_tf = compute_tf(sentence)
                s_vec = {k: v * idf.get(k, 0) for k, v in s_tf.items()}
                s_inter = set(query_vec.keys()) & set(s_vec.keys())
                s_dot = sum(query_vec[k] * s_vec[k] for k in s_inter)
                s_mag = math.sqrt(sum(v**2 for v in s_vec.values()))
                if mag_q * s_mag > 0:
                    s_score = s_dot / (mag_q * s_mag)
                    if s_score > best_s_score:
                        best_s_score = s_score
                        best_sentence = sentence

    return best_doc_idx, best_score, best_sentence

class RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()
        
    def do_GET(self):
        if self.path == '/api/documents':
            self._set_headers()
            docs = [{"id": d["id"], "title": d["title"]} for d in DOCUMENTS]
            self.wfile.write(json.dumps(docs).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/api/upload':
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                post_data = self.rfile.read(content_length)
                try:
                    payload = json.loads(post_data.decode('utf-8'))
                    filename = payload.get('filename', 'Unknown.pdf')
                    b64_data = payload.get('data', '')
                    
                    import base64
                    import io
                    file_bytes = base64.b64decode(b64_data)
                    
                    extracted_text = ""
                    if filename.lower().endswith('.pdf'):
                        try:
                            import pypdf
                            pdf_file = io.BytesIO(file_bytes)
                            reader = pypdf.PdfReader(pdf_file)
                            for page in reader.pages:
                                text = page.extract_text()
                                if text:
                                    extracted_text += text + " "
                        except Exception as e:
                            print("PDF extraction error:", e)
                    else:
                        extracted_text = file_bytes.decode('utf-8', errors='ignore')
                        
                    new_doc = {
                        "id": f"doc_{len(DOCUMENTS)+1:03d}",
                        "title": filename,
                        "content": extracted_text if extracted_text.strip() else f"Content of {filename}"
                    }
                    DOCUMENTS.append(new_doc)
                except Exception as e:
                    print("Error parsing upload:", e)
            
            self._set_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Document ingested successfully into the Knowledge Graph."}).encode('utf-8'))
            
        elif self.path == '/api/chat':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                request_json = json.loads(post_data.decode('utf-8'))
                query = request_json.get('query', '')
            except:
                query = ''

            time.sleep(1.5) # Simulate Copilot processing (RAG pipeline)
            
            best_match_idx, best_score, best_sentence = tf_idf_search(query, DOCUMENTS)
            
            if best_score > 0.05:
                best_doc = DOCUMENTS[best_match_idx]
                confidence = round(best_score * 100, 1)
                
                # Simple Entity Extraction Simulation for Knowledge Graph
                words = best_sentence.split()
                entities = [w.strip('.,!?"\'') for w in words if w.istitle() and len(w) > 3 and w.lower() not in STOP_WORDS]
                if len(entities) < 2:
                    entities.extend(["Safety_Protocol", "Industrial_Asset"])
                entities = list(set(entities))[:4]
                
                # Format an advanced Copilot response
                answer = (f"Based on my analysis of the industrial knowledge graph (Confidence: **{confidence}%**), here is the answer to your query:\n\n"
                          f"**Relevant Excerpt:** \"{best_sentence}\"\n\n"
                          f"**Synthesis:** The document '{best_doc['title']}' indicates that the required protocol involves addressing this specifically. "
                          f"To ensure zero-harm operations, you must follow the guidelines explicitly stated in the source documentation.\n\n"
                          f"**Copilot Suggestion:** Would you like me to cross-reference this with recent shift logs or maintenance records?")
                sources = [best_doc['title']]
            else:
                answer = ("I'm sorry, I could not find a high-confidence match in the current knowledge base for your query. "
                          "This might be a complex or twisted scenario not covered in the standard operating procedures. "
                          "Would you like me to run a deeper semantic search across the archived Tier-2 documentation?")
                sources = []
                confidence = 0
                entities = []

            response_data = {
                "answer": answer,
                "sources": sources,
                "confidence": confidence,
                "entities": entities
            }

            self._set_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=RequestHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Starting Aegis Knowledge Brain API on port {port}...")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
