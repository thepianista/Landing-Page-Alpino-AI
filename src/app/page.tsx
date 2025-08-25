'use client';

import Benefits from '@/components/landing/site-benefits';
import UseCases from '@/components/landing/site-cases';
import Contact from '@/components/landing/site-contact';
import Focus from '@/components/landing/site-focus';
import Footer from '@/components/landing/site-footer';
import Header from '@/components/landing/site-header';
import Industries from '@/components/landing/site-industries';
import Modules from '@/components/landing/site-modules';

export default function Home() {
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
