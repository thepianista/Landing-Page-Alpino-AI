'use client';

import Benefits from '@/components/landing/site-benefits';
import UseCases from '@/components/landing/site-cases';
import Contact from '@/components/landing/site-contact';
import Focus from '@/components/landing/site-focus';
import Footer from '@/components/landing/site-footer';
import Header from '@/components/landing/site-header';
import Industries from '@/components/landing/site-industries';
import Modules from '@/components/landing/site-modules';
import { createChat } from '@n8n/chat';
import { useEffect } from 'react';
import '@n8n/chat/style.css';

export default function Home() {
  useEffect(() => {
    createChat({
      webhookUrl: 'https://ai.alpino-ai.com/webhook/a747a88f-4d5b-4281-8676-3260481693a9/chat',
      initialMessages: ['Hi there! 👋', 'My name is Julian. How can I assist you today?'],
    });
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
    </>
  );
}
