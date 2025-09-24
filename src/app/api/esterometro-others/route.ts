import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    // URL de tu webhook en n8n para subir/insertar docs
    const n8nWebhookUrl = 'https://ai.alpino-ai.com/webhook/other-invoices';

    const n8nForm = new FormData();
    n8nForm.append('file', file, file.name);

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      body: n8nForm,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Error al enviar a N8n (${response.status}) ${errText ? '- ' + errText : ''}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error en rag-upload:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
