#!/usr/bin/env python3
"""Comprueba el DOCX generado: sin w:br page forzados, NBSP, año no como monto, bloques básicos."""
import re
import sys
import zipfile
from pathlib import Path


def main() -> int:
    docx = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("outputs/PRUEBA_FORMATO_RAC.docx")
    if not docx.is_file():
        print(f"FAIL: no existe {docx}", file=sys.stderr)
        return 2

    with zipfile.ZipFile(docx) as z:
        xml = z.read("word/document.xml").decode("utf-8")

    hard_page = len(re.findall(r'<w:br[^>]*w:type="page"', xml))
    texts = re.findall(r"<w:t[^>]*>([^<]*)</w:t>", xml)
    blob = "".join(texts)

    checks = [
        ("no_hard_page_breaks", hard_page == 0, f"w:br page={hard_page} (esperado 0)"),
        ("nbsp_for_line_ties", "\u00a0" in blob, "U+00A0 en texto"),
        ("year_not_usd_2025", not bool(re.search(r"\$2,025[.,]00", blob)), "sin $2,025.00 por año"),
        ("legal_money", "pesos" in blob.lower() and "$" in blob, "$ y 'pesos'"),
        ("ordinals", "PRIMERA" in blob and "SEGUNDA" in blob, "PRIMERA y SEGUNDA"),
        ("headings", "DECLARACIONES" in blob and "CLÁUSULAS" in blob, "DECLARACIONES y CLÁUSULAS"),
    ]

    failed = False
    for name, ok, detail in checks:
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {name}: {detail}")
        if not ok:
            failed = True

    if failed:
        print("\nValidación: FALLÓ", file=sys.stderr)
        return 1
    print("\nValidación: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
