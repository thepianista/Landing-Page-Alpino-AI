'use client';

import Benefits from '@/components/landing/site-benefits';
import UseCases from '@/components/landing/site-cases';
import Contact from '@/components/landing/site-contact';
import Focus from '@/components/landing/site-focus';
import Footer from '@/components/landing/site-footer';
import Header from '@/components/landing/site-header';
import Industries from '@/components/landing/site-industries';
import Modules from '@/components/landing/site-modules';

import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';
import { useEffect, useRef } from 'react';

export default function Home() {
  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (chatRef.current) return;

    chatRef.current = createChat({
      webhookUrl: 'https://ai.alpino-ai.com/webhook/a747a88f-4d5b-4281-8676-3260481693a9/chat',
      target: '#landing-chat', // <- montamos en un div propio
      mode: 'window', // <- evita fullscreen
      showWelcomeScreen: false,
      initialMessages: ['Hi there! 👋', 'My name is Julian. How can I assist you today?'],
      // si necesitás headers: webhookConfig: { method: 'POST', headers: { 'x-api-key': '...' } }
    });

    return () => {
      chatRef.current?.destroy?.();
      chatRef.current = null;
    };
  }, []);

  return (
    <>
      <Header />
      <Benefits />
      <Focus />
      <UseCases />
      <Modules />
      <Industries />
      <Contact />
      <Footer />

      {/* ancla del chat (flotante en la landing) */}
      <div id="landing-chat" className="fixed bottom-6 right-6 z-[9999]" />
    </>
  );
}
