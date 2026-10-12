"""Illustrative rendering of the fields and styling in api/lib/invoices.php."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
FONT_DIR = ROOT / "api/lib/dompdf/vendor/dompdf/dompdf/lib/fonts"
OUTPUT = ROOT / "output/pdf/pawpad-invoice-illustrative-sample.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("DejaVu", str(FONT_DIR / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFontFamily("DejaVu", normal="DejaVu", bold="DejaVu-Bold")

body = ParagraphStyle("body", fontName="DejaVu", fontSize=9, leading=14, textColor=colors.HexColor("#202020"))
small = ParagraphStyle("small", parent=body, fontSize=8, leading=11)
muted = ParagraphStyle("muted", parent=body, fontSize=8, textColor=colors.HexColor("#555555"))
heading = ParagraphStyle("heading", parent=body, fontName="DejaVu-Bold", fontSize=21, leading=28)
bold = ParagraphStyle("bold", parent=body, fontName="DejaVu-Bold")
right = ParagraphStyle("right", parent=body, alignment=TA_RIGHT)


def p(value, style=body):
    return Paragraph(value, style)


def ruled_table(rows, widths, header=False):
    table = Table(rows, colWidths=widths, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
    ]
    if header:
        commands.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f4f1eb")))
    table.setStyle(TableStyle(commands))
    return table


doc = SimpleDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    leftMargin=15 * mm,
    rightMargin=15 * mm,
    topMargin=17 * mm,
    bottomMargin=17 * mm,
)
width = A4[0] - doc.leftMargin - doc.rightMargin

story = [
    p("Tax Invoice", heading),
    p("Original for recipient · No. PP/2026-27/0001 · Issued 2026-10-12", muted),
    Spacer(1, 5 * mm),
    p("<b>From</b><br/>[Accountant-approved legal issuer name]<br/>[Registered address]<br/>State: Karnataka (29)<br/>GSTIN: [approved GSTIN]"),
    Spacer(1, 5 * mm),
    p("<b>Bill to</b><br/>Asha Rao<br/>12 Sample Street, Bengaluru, Karnataka<br/>asha@example.com<br/>Place of supply: Karnataka (29)<br/>Delivery address: 12 Sample Street, Bengaluru, Karnataka"),
    Spacer(1, 5 * mm),
]

line_widths = [width * n for n in (0.32, 0.07, 0.13, 0.14, 0.18, 0.16)]
story.append(ruled_table([
    [p("<b>Service / SAC</b>", small), p("<b>Qty</b>", small), p("<b>Unit price</b>", small), p("<b>Value</b>", small), p("<b>GST</b>", small), p("<b>Amount</b>", small)],
    [p("Grooming sessions<br/><font size='7'>SAC [approved code]</font>", small), p("2", small), p("590.00", small), p("₹1,000.00", small), p("18% / ₹180.00", small), p("₹1,180.00", small)],
], line_widths, header=True))

totals = [
    ("Taxable value", "₹1,000.00"),
    ("CGST", "₹90.00"),
    ("SGST", "₹90.00"),
    ("IGST", "₹0.00"),
    ("Total", "₹1,180.00"),
]
story.append(Spacer(1, 4 * mm))
story.append(ruled_table([[p(f"<b>{label}</b>" if label == "Total" else label), p(f"<b>{amount}</b>" if label == "Total" else amount, right)] for label, amount in totals], [width * 0.72, width * 0.28]))
story += [Spacer(1, 5 * mm), p("<b>Verified payments</b>")]
story.append(ruled_table([
    [p("<b>Date</b>", small), p("<b>Mode</b>", small), p("<b>Reference</b>", small), p("<b>Amount</b>", small)],
    [p("2026-10-10", small), p("UPI", small), p("DEMO-UPI-001", small), p("₹500.00", small)],
    [p("2026-10-12", small), p("Card", small), p("DEMO-CARD-002", small), p("₹680.00", small)],
], [width * n for n in (0.21, 0.17, 0.42, 0.20)], header=True))
story += [
    Spacer(1, 5 * mm),
    p("Reverse charge: No"),
    Spacer(1, 5 * mm),
    p("[Authorized signature image]", muted),
    p("Authorized signatory: [approved signatory]"),
    Spacer(1, 4 * mm),
    p("Issued by admin@example.com. This invoice is a fixed record; corrections are logged separately.", muted),
]


def sample_mark(canvas, document):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#8f3333"))
    canvas.setFont("DejaVu-Bold", 8)
    canvas.drawRightString(A4[0] - document.rightMargin, A4[1] - 10 * mm, "ILLUSTRATIVE SAMPLE - NOT ISSUED")
    canvas.restoreState()


doc.build(story, onFirstPage=sample_mark, onLaterPages=sample_mark)
print(OUTPUT)
