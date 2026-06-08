"""
Extract text from downloaded LHDN/PERKESO PDF files using pdfplumber.
Outputs cleaned text to raw/ directory for training data.
"""
import pdfplumber
import os
import re

PDF_DIR = r"C:\Users\johns\.claude\projects\D--\7ab6b370-8bf0-4ad7-ba0b-ca81805a9f32\tool-results"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "raw")

# Map downloaded PDFs to meaningful names
PDF_FILES = {
    "webfetch-1780923628606-wf00am.pdf": "07-lhdn-public-ruling-pr7-2025.md",
    "webfetch-1780923625056-miu0ds.pdf": "08-lhdn-be2025-explanatory-notes.md",
    "webfetch-1780923628121-2bz4uo.pdf": "09-lhdn-ebook-2025.md",
    "webfetch-1780923610005-wggcu7.pdf": "10-socso-act4-rates.md",
}

def clean_text(text):
    """Clean extracted PDF text."""
    if not text:
        return ""
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Remove page numbers like standalone numbers
    text = re.sub(r'\n\d{1,3}\n', '\n', text)
    # Clean up spacing
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()

def extract_pdf(pdf_path, max_pages=None):
    """Extract text from PDF."""
    all_text = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total = len(pdf.pages)
            limit = min(total, max_pages) if max_pages else total
            print(f"  Pages: {total} (extracting {limit})")

            for i, page in enumerate(pdf.pages[:limit]):
                text = page.extract_text()
                if text:
                    all_text.append(f"--- Page {i+1} ---\n{text}")

                # Also extract tables
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        # Convert table to markdown
                        rows = []
                        for row in table:
                            cells = [str(c or "").strip() for c in row]
                            rows.append("| " + " | ".join(cells) + " |")
                        if rows:
                            # Add header separator after first row
                            header_sep = "| " + " | ".join(["---"] * len(table[0])) + " |"
                            rows.insert(1, header_sep)
                            all_text.append("\n[Table]\n" + "\n".join(rows))

    except Exception as e:
        print(f"  ERROR: {e}")
        return ""

    return clean_text("\n\n".join(all_text))

if __name__ == "__main__":
    total_chars = 0
    for pdf_name, out_name in PDF_FILES.items():
        pdf_path = os.path.join(PDF_DIR, pdf_name)
        out_path = os.path.join(OUT_DIR, out_name)

        if not os.path.exists(pdf_path):
            print(f"SKIP: {pdf_name} not found")
            continue

        size_mb = os.path.getsize(pdf_path) / 1024 / 1024
        print(f"\nProcessing: {pdf_name} ({size_mb:.1f}MB)")

        # Limit large PDFs
        max_pages = 50 if size_mb > 3 else None
        text = extract_pdf(pdf_path, max_pages)

        if text and len(text) > 100:
            # Add header
            header = f"# {out_name.replace('.md', '').replace('-', ' ').title()}\n"
            header += f"Source: Extracted from PDF ({pdf_name})\n"
            header += f"Characters: {len(text)}\n\n"

            with open(out_path, "w", encoding="utf-8") as fh:
                fh.write(header + text)

            total_chars += len(text)
            print(f"  -> {len(text)} chars written to {out_name}")
        else:
            print(f"  -> No extractable text (might be scanned/image-based PDF)")

    print(f"\nTotal extracted: {total_chars:,} characters across {len(PDF_FILES)} PDFs")
