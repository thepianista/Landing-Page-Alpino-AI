import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url, query } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    // Aquí va tu webhook de N8n para extracción de datos
    const n8nWebhookUrl = 'https://ai.alpino-ai.com/webhook/text-extract';

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        query,
        timestamp: new Date().toISOString(),
        source: 'extract-data-interface',
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Error al enviar a N8n (${response.status}) ${errText ? '- ' + errText : ''}`);
    }

    // Intentamos parsear JSON, si no, devolvemos como texto
    const contentType = response.headers.get('content-type') || '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { text };
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error en extract-data:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
