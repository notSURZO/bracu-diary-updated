from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from google import generativeai as genai
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-deployed-frontend.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.environ['GEMINI_API_KEY'] = 'AIzaSyAGmDm5i5tZClM28ilkfByLqxpIf0l5h70'  # Replace with your Gemini API key
genai.configure(api_key=os.environ['GEMINI_API_KEY'])

client = chromadb.PersistentClient(path="./chroma_db")
embedding_function = DefaultEmbeddingFunction()
collection = client.get_or_create_collection(name="rag_collection", embedding_function=embedding_function)

def load_documents(file_path="documents.txt"):
    if collection.count() > 0:
        print("Documents already loaded in Chroma.")
        return
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            documents = [line.strip() for line in file if line.strip()]
        ids = [f"doc{i+1}" for i in range(len(documents))]
        collection.add(documents=documents, ids=ids)
        print(f"Loaded {len(documents)} documents into Chroma.")
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        raise

load_documents()

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5

@app.post("/ask")
async def ask(request: QueryRequest):
    try:
        results = collection.query(query_texts=[request.question], n_results=request.top_k)
        relevant_docs = results['documents'][0]
        context = "\n".join(relevant_docs)
        prompt = f"Context: {context}\n\nQuestion: {request.question}\n\nAnswer strictly based on the context Do not make anything up by yourself."
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        return {"answer": response.text, "sources": relevant_docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))