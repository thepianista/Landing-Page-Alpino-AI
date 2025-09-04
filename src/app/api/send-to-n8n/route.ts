import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 });
    }

    // Here you would make the actual call to your N8n webhook
    // Replace 'YOUR_N8N_WEBHOOK_URL' with your actual N8n webhook URL
    // const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'YOUR_N8N_WEBHOOK_URL';
    const n8nWebhookUrl = 'https://ai.alpino-ai.com/webhook/ideas';
    // const n8nWebhookUrl = 'https://ai.alpino-ai.com/webhook-test/ideas';

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        timestamp: new Date().toISOString(),
        source: 'linkedin-post-interface',
      }),
    });

    if (!response.ok) {
      throw new Error('Error al enviar a N8n');
    }

    return NextResponse.json({
      success: true,
      message: 'Idea enviada correctamente',
    });
  } catch (error) {
    console.error('Error sending to N8n:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
