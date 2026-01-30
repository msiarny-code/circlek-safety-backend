#!/usr/bin/env python3
"""
Generate Circle K Store Personnel Safety Walk PDF report
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import sys
import json
import base64
import io

def generate_store_personnel_pdf(data):
    """Generate PDF for Store Personnel Safety Walk"""
    
    buffer = io.BytesIO()
    # Use landscape orientation
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), topMargin=0.4*inch, bottomMargin=0.4*inch,
                           leftMargin=0.5*inch, rightMargin=0.5*inch)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#C8102E'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        spaceAfter=8,
        fontName='Helvetica-Oblique'
    )
    
    # Title
    title = Paragraph("Circle K - Store Personnel Daily Safety Walk", title_style)
    story.append(title)
    
    subtitle = Paragraph("Safety First - Every Day, Every Store", subtitle_style)
    story.append(subtitle)
    story.append(Spacer(1, 0.1*inch))
    
    # Header info table
    header_data = [
        ['Name:', data.get('name', ''), 'Store #:', data.get('storeNumber', '')],
        ['Shift:', data.get('employeeRole', ''), 'Date/Time:', f"{data.get('date', '')} {data.get('time', '')} UTC-5" if data.get('time') else data.get('date', '')]
    ]
    
    header_table = Table(header_data, colWidths=[0.8*inch, 2.5*inch, 0.8*inch, 2.5*inch])
    header_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#333333')),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#333333')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.15*inch))
    
    # Questions table
    questions = [
        "Is the parking lot free of cracks, pot holes, or any other tripping or slipping hazards?",
        "Are all dispensers operational and are hoses and nozzles in good repair?",
        'Are the "Wet Floor" cones/signs visible in all areas during rain and mopping? (Please ensure we dry mop often during these times and remove "Wet Floor" cones/signs when area is dry)',
        "Is the dispensed beverage floor area dry and free of any ice and spills?",
        "Are all Dispensed Beverage flavors and CO2 available?",
        "Is the sales floor free of boxes, totes, mop bucket, or anything else a customer could trip over?",
        "Are backroom doors closed or held open with a door stop? (Do not prop open with water or other merchandise)"
    ]
    
    responses = data.get('responses', {})
    
    # Build table data
    table_data = [['#', 'Question', 'Yes/No', 'Work Order', 'Corrective Action']]
    
    for i, question in enumerate(questions, 1):
        response_data = responses.get(question, {})
        if isinstance(response_data, dict):
            answer = response_data.get('value', '')
            work_order = response_data.get('workOrder', '')
            corrective = response_data.get('correctiveAction', '')
        else:
            answer = response_data
            work_order = ''
            corrective = ''
        
        table_data.append([
            str(i),
            Paragraph(question, ParagraphStyle('Question', fontSize=9, leading=10)),
            answer,
            work_order,
            Paragraph(corrective, ParagraphStyle('Notes', fontSize=9, leading=10)) if corrective else ''
        ])
    
    # Create table with adjusted column widths for landscape
    questions_table = Table(table_data, colWidths=[0.3*inch, 5.5*inch, 0.6*inch, 0.8*inch, 2.3*inch])
    
    # Style the table
    table_style = [
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF6B35')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data rows
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Numbers
        ('ALIGN', (2, 1), (2, -1), 'CENTER'),  # Yes/No
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Work Order
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        
        # Borders
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#333333')),
        
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]
    
    # Color code Yes/No answers
    for i, question in enumerate(questions, 1):
        response_data = responses.get(question, {})
        answer = response_data.get('value', '') if isinstance(response_data, dict) else response_data
        if answer == 'Yes':
            table_style.append(('TEXTCOLOR', (2, i), (2, i), colors.HexColor('#2ecc71')))
            table_style.append(('FONTNAME', (2, i), (2, i), 'Helvetica-Bold'))
        elif answer == 'No':
            table_style.append(('TEXTCOLOR', (2, i), (2, i), colors.HexColor('#C8102E')))
            table_style.append(('FONTNAME', (2, i), (2, i), 'Helvetica-Bold'))
    
    questions_table.setStyle(TableStyle(table_style))
    story.append(questions_table)
    
    # Build PDF
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    # Generate filename
    role_short = data.get('employeeRole', '').replace(' ', '')
    filename = f"CircleK_Store{data.get('storeNumber', '')}_{role_short}_{data.get('date', '')}.pdf"
    
    return pdf_bytes, filename

if __name__ == '__main__':
    # Read JSON data from stdin
    data_json = sys.stdin.read()
    data = json.loads(data_json)
    
    # Generate PDF
    pdf_bytes, filename = generate_store_personnel_pdf(data)
    
    # Encode as base64
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    
    # Output result as JSON
    result = {
        'pdfBuffer': pdf_base64,
        'filename': filename
    }
    print(json.dumps(result))
