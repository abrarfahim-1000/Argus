import tiktoken

_encoding = tiktoken.get_encoding("cl100k_base")


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    tokens = _encoding.encode(text)
    if len(tokens) <= chunk_size:
        return [text]

    chunks: list[str] = []
    stride = chunk_size - overlap
    for start in range(0, len(tokens), stride):
        window = tokens[start : start + chunk_size]
        chunks.append(_encoding.decode(window))
        if start + chunk_size >= len(tokens):
            break
    return chunks
