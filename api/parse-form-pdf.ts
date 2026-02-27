// api/parse-form-pdf.ts
// Vercel API route: POST /api/parse-form-pdf
// Accepts base64 PDF, sends to Claude via raw fetch, returns form schema JSON
// NO SDK REQUIRED — uses plain fetch

const SYSTEM_PROMPT = `You are a form digitization expert for food manufacturing facilities. 
You analyze uploaded paper forms (PDF/image) and convert them into a structured JSON schema.

Output ONLY valid JSON with this exact structure — no markdown, no explanation, no backticks:

{
  "name": "Form Title",
  "description": "Brief description",
  "docId": "DOC-ID if visible on form, otherwise generate one like QA-FORM-001",
  "category": "quality|safety|sanitation|maintenance|production|general",
  "complianceRefs": ["SQF 2.8.1", "FDA 21 CFR 117"],
  "sections": [
    {
      "id": "sec_1",
      "title": "SECTION TITLE FROM FORM",
      "fields": [
        {
          "id": "field_1",
          "label": "Field Label (exactly as on form)",
          "fieldType": "text_input|text_area|number|date|time|dropdown|radio|checkbox|pass_fail|initials|label",
          "required": true,
          "width": "full|half|third",
          "placeholder": "hint text",
          "options": [{"value": "opt1", "label": "Option 1"}],
          "helpText": "instructions if any on form"
        }
      ]
    }
  ],
  "signatures": [
    {
      "id": "sig_1",
      "label": "Signature Label (e.g. QA Manager, Supervisor)",
      "required": true
    }
  ]
}

FIELD TYPE RULES:
- "text_input": Single-line text (names, codes, lot numbers)
- "text_area": Multi-line text (descriptions, comments, corrective actions)
- "number": Numeric values (temperatures, counts, measurements)
- "date": Date fields
- "time": Time fields  
- "dropdown": Pick one from list (provide options array)
- "radio": Pick one from small set like Yes/No, Pass/Fail (provide options)
- "checkbox": Check multiple from list (provide options)
- "pass_fail": A checklist row with Pass/Fail toggle + initials — use for inspection items
- "initials": Small initials-only field (max 4 chars)
- "label": Read-only instruction text (not an input, just displayed)

LAYOUT RULES:
- "full": Takes entire row width
- "half": Two fields side by side  
- "third": Three fields in a row
- Group related fields that appear on the same line with matching widths

IMPORTANT:
- Preserve the EXACT section structure from the paper form
- Preserve ALL fields, even blank spaces for dates/signatures
- If a field has pre-printed options (checkboxes, radio), include them in options array
- For tables with repeated rows (like inspection checklists), create one field per column and note in helpText if rows repeat
- For signature lines, add to the signatures array, not as fields
- Generate unique IDs: sec_1, sec_2 for sections; field names as snake_case of label
- Every field that a human must fill in should be required: true
- If the form has a header with doc ID, revision, compliance references — capture those`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' });
  }

  try {
    const { pdfBase64, imageBase64, mimeType, instructions } = req.body;

    if (!pdfBase64 && !imageBase64) {
      return res.status(400).json({ error: 'No PDF or image provided' });
    }

    const content: any[] = [];

    if (pdfBase64) {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfBase64,
        },
      });
    } else if (imageBase64) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType || 'image/png',
          data: imageBase64,
        },
      });
    }

    let userPrompt = 'Analyze this form and convert it to a JSON schema following the exact structure specified. Return ONLY the JSON, no other text.';
    if (instructions) {
      userPrompt += `\n\nAdditional context from the user: ${instructions}`;
    }
    content.push({ type: 'text', text: userPrompt });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[parse-form-pdf] Anthropic API error:', response.status, errorBody);
      return res.status(502).json({ error: `Anthropic API error: ${response.status}` });
    }

    const data = await response.json();

    const text = (data.content || [])
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const schema = JSON.parse(cleaned);

    return res.status(200).json({ schema });
  } catch (err: any) {
    console.error('[parse-form-pdf] Error:', err);

    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'AI returned invalid JSON. Please try again.' });
    }

    return res.status(500).json({ error: err.message || 'Failed to parse form' });
  }
}
