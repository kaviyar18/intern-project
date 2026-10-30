
"""Grounded hybrid RAG for the government scholarship knowledge base."""

import hashlib
import logging
import math
import re
import threading
from pathlib import Path
from typing import Any

import chromadb
from sentence_transformers import SentenceTransformer

from services.document_service import process_document
from services.llm_service import generate_grounded_answer
from services.scheme_service import get_all_schemes

logger = logging.getLogger(__name__)

BASE = Path(__file__).resolve().parents[1]
DOC_DIR = BASE / "data" / "documents"
CHROMA_DIR = BASE / "data" / "chroma_db"

CHUNK_SIZE = 900
CHUNK_OVERLAP = 150
COLLECTION_NAME = "scholarship_knowledge"

EMBEDDING_MODEL_NAME = (
    "sentence-transformers/"
    "paraphrase-multilingual-MiniLM-L12-v2"
)

_chroma_client = None
_chroma_collection = None
_embedding_model = None
_resource_lock = threading.RLock()
_sync_lock = threading.RLock()


def _text(value: Any) -> str:
    """Convert values safely to displayable text."""
    if value is None:
        return ""
    if isinstance(value, (list, tuple, set)):
        return ", ".join(_text(item) for item in value if item is not None)
    if isinstance(value, dict):
        return "; ".join(
            f"{key}: {_text(item)}"
            for key, item in value.items()
        )
    return str(value).strip()


def _tokens(text: str) -> list[str]:
    """Tokenize Latin, numeric, and Unicode Indian-language text."""
    return re.findall(r"[^\W_]+(?:[%₹][^\W_]+)?", (text or "").lower())


def _chunk_text(text: str) -> list[str]:
    """Split long documents into overlapping word chunks."""
    words = (text or "").split()

    if not words:
        return []

    if len(words) <= CHUNK_SIZE:
        return [" ".join(words)]

    chunks = []
    start = 0

    while start < len(words):
        end = min(start + CHUNK_SIZE, len(words))
        chunk = " ".join(words[start:end]).strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(words):
            break

        start = max(end - CHUNK_OVERLAP, start + 1)

    return chunks


def _scheme_id(scheme: dict) -> str:
    return _text(
        scheme.get("scheme_id")
        or scheme.get("id")
        or scheme.get("scheme_key")
    )


def _scheme_name(scheme: dict) -> str:
    return _text(
        scheme.get("scheme_name_official")
        or scheme.get("name")
        or scheme.get("scheme_name")
        or scheme.get("title")
        or _scheme_id(scheme)
    )


def _scheme_documents() -> list[dict]:
    """Convert new and legacy scheme records into searchable documents."""
    documents = []

    for scheme in get_all_schemes():
        if not isinstance(scheme, dict):
            continue

        scheme_id = _scheme_id(scheme)
        name = _scheme_name(scheme)

        if not scheme_id or not name:
            continue

        fields = [
            ("Scheme name", name),
            ("Scheme ID", scheme_id),
            ("Scheme owner/ministry", scheme.get("scheme_owner_ministry")),
            ("Government level", scheme.get("government_level")),
            ("State or UT", scheme.get("state_or_ut") or scheme.get("state")),
            ("Official source title", scheme.get("official_source_title")),
            ("Official source URL", scheme.get("official_source_url")),
            ("Official application URL", scheme.get("official_application_url")),
            ("Academic year", scheme.get("academic_year")),
            ("Scheme status", scheme.get("scheme_status")),
            ("Education levels", scheme.get("education_levels") or scheme.get("education")),
            ("Course/research stage", scheme.get("course_or_research_stage")),
            ("Eligible categories", scheme.get("eligible_categories") or scheme.get("category")),
            ("Eligible communities", scheme.get("eligible_community_groups")),
            ("Gender criteria", scheme.get("gender_criteria")),
            ("Disability criteria", scheme.get("disability_criteria")),
            ("Domicile criteria", scheme.get("domicile_criteria")),
            ("Income limit", scheme.get("income_limit_amount") or scheme.get("income_limit")),
            ("Income currency", scheme.get("income_limit_currency")),
            ("Income period", scheme.get("income_limit_period")),
            ("Academic merit criteria", scheme.get("academic_merit_criteria")),
            ("Other eligibility criteria", scheme.get("other_eligibility_criteria")),
            ("Benefit type", scheme.get("benefit_type")),
            ("Benefit amount", scheme.get("benefit_amount")),
            ("Benefit frequency", scheme.get("benefit_frequency")),
            ("Tuition coverage", scheme.get("tuition_coverage")),
            ("Maintenance allowance", scheme.get("maintenance_allowance")),
            ("Travel/other support", scheme.get("travel_or_other_support")),
            ("Required documents", scheme.get("required_documents") or scheme.get("documents")),
            ("Application process", scheme.get("application_process")),
            ("Application opening date", scheme.get("application_open_date")),
            ("Application deadline", scheme.get("application_deadline")),
            ("Renewal rules", scheme.get("renewal_rules")),
            ("Official contact", scheme.get("official_contact")),
            ("Verification status", scheme.get("verification_status")),
            ("Fields requiring review", scheme.get("fields_requiring_review")),
            ("Description", scheme.get("description")),
        ]

        text = "\n".join(
            f"{label}: {_text(value)}"
            for label, value in fields
            if _text(value)
        )

        documents.append({
            "id": scheme_id,
            "title": name,
            "text": text,
            "source": (
                _text(scheme.get("official_source_title"))
                or name
            ),
            "scheme_id": scheme_id,
            "source_type": "structured scheme dataset",
            "verification_status": _text(
                scheme.get("verification_status") or "not specified"
            ),
            "official_source_url": _text(
                scheme.get("official_source_url")
            ),
        })

    return documents


def _file_documents() -> list[dict]:
    """Load supported local knowledge documents and chunk their contents."""
    DOC_DIR.mkdir(parents=True, exist_ok=True)
    documents = []

    allowed_extensions = {
        ".pdf", ".txt", ".md", ".docx",
        ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp",
    }

    for path in DOC_DIR.iterdir():
        if (
            not path.is_file()
            or path.name.startswith("README")
            or path.suffix.lower() not in allowed_extensions
        ):
            continue

        try:
            text, method = process_document(str(path), path.name)

            for index, chunk in enumerate(_chunk_text(text or "")):
                documents.append({
                    "id": f"file:{path.name}:{index}",
                    "title": path.name,
                    "text": chunk,
                    "source": path.name,
                    "source_type": "local knowledge document",
                    "method": _text(method),
                })

        except Exception:
            logger.warning(
                "Skipping unreadable knowledge file: %s",
                path.name,
                exc_info=True,
            )

    return documents


def _get_embedding_model():
    """Load the multilingual embedding model lazily."""
    global _embedding_model

    if _embedding_model is None:
        with _resource_lock:
            if _embedding_model is None:
                _embedding_model = SentenceTransformer(
                    EMBEDDING_MODEL_NAME
                )

    return _embedding_model


def _get_chroma_collection():
    """Open the persistent ChromaDB collection."""
    global _chroma_client, _chroma_collection

    if _chroma_collection is None:
        with _resource_lock:
            if _chroma_collection is None:
                CHROMA_DIR.mkdir(parents=True, exist_ok=True)

                _chroma_client = chromadb.PersistentClient(
                    path=str(CHROMA_DIR)
                )

                _chroma_collection = (
                    _chroma_client.get_or_create_collection(
                        name=COLLECTION_NAME,
                        metadata={"hnsw:space": "cosine"},
                    )
                )

    return _chroma_collection


def _stable_id(doc: dict) -> str:
    """Generate a stable ID from the document source and content."""
    identity = (
        f"{doc.get('id', '')}|"
        f"{doc.get('source', '')}|"
        f"{doc.get('text', '')}"
    )
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()


def _safe_metadata(doc: dict) -> dict:
    """Keep ChromaDB metadata values to supported scalar types."""
    metadata = {
        "title": _text(doc.get("title")),
        "source": _text(doc.get("source")),
        "source_type": _text(doc.get("source_type")),
        "original_id": _text(doc.get("id")),
    }

    for key in (
        "scheme_id",
        "method",
        "verification_status",
        "official_source_url",
    ):
        value = doc.get(key)
        if value is not None:
            metadata[key] = _text(value)

    return metadata


def _sync_chroma_documents(docs: list[dict]):
    """Synchronize indexed records with current source documents."""
    collection = _get_chroma_collection()

    prepared = [
        {"chroma_id": _stable_id(doc), "document": doc}
        for doc in docs
        if _text(doc.get("text"))
    ]

    expected_ids = [item["chroma_id"] for item in prepared]

    with _sync_lock:
        existing = collection.get(include=["metadatas"])
        existing_ids = set(existing.get("ids", []))
        expected_set = set(expected_ids)

        stale_ids = list(existing_ids - expected_set)
        if stale_ids:
            collection.delete(ids=stale_ids)

        new_items = [
            item for item in prepared
            if item["chroma_id"] not in existing_ids
        ]

        if new_items:
            model = _get_embedding_model()
            texts = [item["document"]["text"] for item in new_items]

            embeddings = model.encode(
                texts,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False,
            )

            collection.upsert(
                ids=[item["chroma_id"] for item in new_items],
                documents=texts,
                metadatas=[
                    _safe_metadata(item["document"])
                    for item in new_items
                ],
                embeddings=embeddings.tolist(),
            )

    return collection


def _embedding_scores(question: str, docs: list[dict]) -> list[float]:
    """Calculate multilingual semantic similarity for each source document."""
    if not docs:
        return []

    collection = _sync_chroma_documents(docs)

    if collection.count() == 0:
        return [0.0] * len(docs)

    model = _get_embedding_model()
    query_embedding = model.encode(
        [question],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )[0]

    result_count = min(collection.count(), max(20, len(docs)))

    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=result_count,
        include=["distances"],
    )

    ids = results.get("ids", [[]])[0]
    distances = results.get("distances", [[]])[0]

    score_by_id = {
        chroma_id: max(0.0, 1.0 - float(distance))
        for chroma_id, distance in zip(ids, distances)
    }

    return [
        score_by_id.get(_stable_id(doc), 0.0)
        for doc in docs
    ]


def _bm25(query: list[str], docs: list[dict]) -> list[float]:
    """Compute BM25 lexical relevance scores."""
    token_docs = [_tokens(doc["text"]) for doc in docs]
    n = len(token_docs)

    if not n:
        return []

    average_length = (
        sum(len(tokens) for tokens in token_docs) / n
    ) or 1.0

    document_frequency = {}
    for tokens in token_docs:
        for token in set(tokens):
            document_frequency[token] = (
                document_frequency.get(token, 0) + 1
            )

    k1, b = 1.5, 0.75
    scores = []

    for tokens in token_docs:
        term_frequency = {}
        for token in tokens:
            term_frequency[token] = term_frequency.get(token, 0) + 1

        length = len(tokens)
        score = 0.0

        for term in query:
            frequency = term_frequency.get(term, 0)
            if not frequency:
                continue

            df = document_frequency.get(term, 0)
            inverse_frequency = math.log(
                1 + (n - df + 0.5) / (df + 0.5)
            )

            score += inverse_frequency * (
                frequency * (k1 + 1)
            ) / (
                frequency
                + k1 * (
                    1 - b + b * length / average_length
                )
            )

        scores.append(score)

    return scores


def _tfidf_scores(query: str, docs: list[dict]) -> list[float]:
    """Compute lightweight TF-IDF cosine similarities."""
    query_tokens = _tokens(query)
    token_docs = [_tokens(doc["text"]) for doc in docs]
    n = len(token_docs)

    if not n:
        return []

    document_frequency = {}
    for tokens in token_docs:
        for token in set(tokens):
            document_frequency[token] = (
                document_frequency.get(token, 0) + 1
            )

    def vector(tokens):
        counts = {}
        for token in tokens:
            counts[token] = counts.get(token, 0) + 1

        length = max(len(tokens), 1)

        return {
            token: (count / length)
            * math.log(
                (1 + n) / (1 + document_frequency.get(token, 0))
            )
            for token, count in counts.items()
        }

    query_vector = vector(query_tokens)
    query_norm = math.sqrt(
        sum(value * value for value in query_vector.values())
    ) or 1.0

    scores = []

    for tokens in token_docs:
        doc_vector = vector(tokens)

        dot_product = sum(
            query_vector.get(token, 0.0) * value
            for token, value in doc_vector.items()
        )

        doc_norm = math.sqrt(
            sum(value * value for value in doc_vector.values())
        ) or 1.0

        scores.append(dot_product / (query_norm * doc_norm))

    return scores


def retrieve(
    question: str,
    scheme_id: str | None = None,
    top_k: int = 5,
) -> tuple[list[dict], str]:
    """Retrieve relevant passages using hybrid lexical and semantic search."""
    question = (question or "").strip()

    if not question:
        return [], "none"

    top_k = max(1, min(int(top_k), 20))

    scheme_docs = _scheme_documents()
    file_docs = _file_documents()

    # Keep the selected scheme's record plus general supporting documents.
    # Do not include unrelated scheme records in a scheme-specific query.
    if scheme_id:
        scheme_docs = [
            doc for doc in scheme_docs
            if doc.get("scheme_id") == str(scheme_id)
        ]

    docs = scheme_docs + file_docs

    if not docs:
        return [], "none"

    bm25_scores = _bm25(_tokens(question), docs)
    tfidf_scores = _tfidf_scores(question, docs)

    embedding_available = True

    try:
        semantic_scores = _embedding_scores(question, docs)
    except Exception:
        logger.warning(
            "Semantic retrieval unavailable; using lexical retrieval.",
            exc_info=True,
        )
        semantic_scores = [0.0] * len(docs)
        embedding_available = False

    def normalize_scores(scores):
        maximum = max(scores, default=0.0)
        if maximum <= 0:
            return [0.0] * len(scores)
        return [score / maximum for score in scores]

    bm25_normalized = normalize_scores(bm25_scores)
    tfidf_normalized = normalize_scores(tfidf_scores)
    semantic_normalized = normalize_scores(semantic_scores)

    scored = []

    for index, doc in enumerate(docs):
        if embedding_available:
            score = (
                0.40 * bm25_normalized[index]
                + 0.20 * tfidf_normalized[index]
                + 0.40 * semantic_normalized[index]
            )
        else:
            score = (
                0.60 * bm25_normalized[index]
                + 0.40 * tfidf_normalized[index]
            )

        if question.lower() in doc["text"].lower():
            score += 0.10

        scored.append((score, doc))

    scored.sort(key=lambda item: item[0], reverse=True)

    selected = []
    seen_sources = set()

    for score, doc in scored:
        source_key = doc.get("source", "")

        # Prefer source diversity without discarding every chunk from a source.
        if source_key in seen_sources and len(selected) < max(2, top_k // 2):
            continue

        item = dict(doc)
        item["retrieval_score"] = round(score, 4)
        selected.append(item)
        seen_sources.add(source_key)

        if len(selected) >= top_k:
            break

    method = (
        "hybrid BM25 + TF-IDF + multilingual ChromaDB embeddings"
        if embedding_available
        else "hybrid BM25 + TF-IDF (semantic retrieval unavailable)"
    )

    return selected, method


def answer(
    question: str,
    scheme_id: str,
    language: str = "en",
) -> dict:
    """Generate an answer grounded in retrieved scheme information."""
    question = (question or "").strip()
    scheme_id = (scheme_id or "").strip()
    language = (language or "en").strip() or "en"

    if not question:
        return {
            "answer": "Please provide a question.",
            "sources": [],
            "retrieval_method": "none",
            "llm_used": False,
        }

    docs, method = retrieve(question, scheme_id, top_k=5)

    if not docs:
        return {
            "answer": (
                "No relevant information was found in the local knowledge "
                "base. Please consult the scheme's official source."
            ),
            "sources": [],
            "retrieval_method": method,
            "llm_used": False,
        }

    context_parts = []

    for doc in docs:
        verification = doc.get("verification_status", "")
        source_url = doc.get("official_source_url", "")

        context_parts.append(
            f"Source: {doc.get('source', 'Unknown source')}\n"
            f"Source type: {doc.get('source_type', 'Unknown')}\n"
            f"Verification status: {verification or 'Not specified'}\n"
            f"Official source URL: {source_url or 'Not provided'}\n"
            f"Content:\n{doc.get('text', '')}"
        )

    context = "\n\n--- RETRIEVED SOURCE ---\n".join(context_parts)

    try:
        generated, used = generate_grounded_answer(
            question,
            context,
            language,
        )
    except Exception:
        logger.exception("Grounded answer generation failed.")
        generated, used = "", False

    if generated and used:
        response = str(generated)
    else:
        response = (
            "The configured language model could not generate a grounded "
            "answer. The following retrieved material may help, but check "
            "all eligibility rules and deadlines against the official source:\n\n"
            + "\n\n".join(
                f"[Source: {doc.get('source', 'Unknown source')}]\n"
                f"{doc.get('text', '')[:2000]}"
                for doc in docs[:2]
            )
        )

    return {
        "answer": response,
        "sources": list(dict.fromkeys(
            doc.get("source", "Unknown source")
            for doc in docs
        )),
        "retrieval_method": method,
        "llm_used": bool(used),
    }
