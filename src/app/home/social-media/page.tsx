'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/sellemond-bakery/ui/button';
import { Textarea } from '@/components/sellemond-bakery/ui/textarea';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

type SubmitState = 'idle' | 'success' | 'error';

const MAX_CHARS = 3000;
const DRAFT_KEY = 'linkedin_post_draft';

export default function Page() {
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitState>('idle');
  const [characterCount, setCharacterCount] = useState(0);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [toastTitle, setToastTitle] = useState<string>('');
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restaura borrador
  useEffect(() => {
    const draft = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_KEY) : null;
    if (draft) {
      setPostContent(draft);
      setCharacterCount(draft.length);
    }
  }, []);

  // Guarda borrador (throttle muy simple)
  useEffect(() => {
    const t = setTimeout(() => {
      if (postContent.trim()) localStorage.setItem(DRAFT_KEY, postContent);
      else localStorage.removeItem(DRAFT_KEY);
    }, 300);
    return () => clearTimeout(t);
  }, [postContent]);

  const closeToast = () => {
    setSubmitStatus('idle');
    setToastMsg('');
    setToastTitle('');
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  };

  const showToast = (state: Exclude<SubmitState, 'idle'>, title: string, msg: string) => {
    setSubmitStatus(state);
    setToastTitle(title);
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(closeToast, 4000);
  };

  const handleContentChange = (value: string) => {
    setPostContent(value);
    setCharacterCount(value.length);
    if (submitStatus !== 'idle') closeToast();
  };

  const handleSubmit = async () => {
    const content = postContent.trim();
    if (!content) return;

    setIsSubmitting(true);
    closeToast();

    const controller = new AbortController();
    try {
      const res = await fetch('/api/send-to-n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });

      let detail = '';
      try {
        const json = await res.clone().json();
        // si viene message/detail desde backend, úsalo
        detail = json?.message || json?.detail || '';
      } catch {
        // ignore si no es JSON
      }

      if (!res.ok) {
        throw new Error(detail || `Failed to send post (HTTP ${res.status})`);
      }

      showToast('success', 'Idea sent successfully!', 'Your idea will be published on LinkedIn soon.');
      setPostContent('');
      setCharacterCount(0);
      localStorage.removeItem(DRAFT_KEY);
    } catch (err: any) {
      showToast('error', 'Error sending', err?.message || 'There was a problem sending your idea. Please try again.');
    } finally {
      setIsSubmitting(false);
    }

    return () => controller.abort();
  };

  const disabled = isSubmitting || !postContent.trim() || characterCount > MAX_CHARS;

  return (
    <div className="flex flex-row min-h-screen bg-background relative">
      {/* Toast */}
      {(submitStatus === 'success' || submitStatus === 'error') && (
        <div
          className={`fixed top-6 right-6 z-50 min-w-[320px] max-w-md px-6 py-4 rounded-xl shadow-lg flex items-center gap-4 transition-all duration-300
            ${
              submitStatus === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          role="status"
          aria-live="polite"
        >
          {submitStatus === 'success' ? (
            <CheckCircle className="h-6 w-6 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-0.5">{toastTitle}</h3>
            <p className="text-sm">{toastMsg}</p>
          </div>
          <button
            onClick={closeToast}
            className="ml-2 text-xl font-bold text-inherit hover:opacity-60 focus:outline-none"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-20 items-center justify-between px-8">
            <div>
              <h1 className="text-xl font-bold text-black">Social Media Automatization</h1>
              <p className="text-gray-700">LinkedIn Posts</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6">
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance leading-tight">
              Share your idea on LinkedIn
            </h1>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto leading-relaxed">
              {"Write your idea and we'll automatically send it to LinkedIn."}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-full max-w-2xl mx-auto">
              <label htmlFor="post-content" className="block text-xl font-semibold text-foreground mb-4 text-center">
                Write your idea here:
              </label>

              <Textarea
                id="post-content"
                placeholder="Share your experience, knowledge, or reflection for LinkedIn..."
                value={postContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="min-h-[240px] text-lg p-6 resize-none border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl bg-background mx-auto"
                maxLength={MAX_CHARS}
                disabled={isSubmitting}
                aria-describedby="char-counter"
              />

              {/* Character Counter */}
              <div className="mt-3 text-right" id="char-counter">
                <span
                  className={`text-base font-medium ${
                    characterCount > MAX_CHARS * 0.9 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {characterCount} / {MAX_CHARS} characters
                </span>
              </div>

              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleSubmit}
                  disabled={disabled}
                  size="lg"
                  className="text-xl px-12 py-6 h-auto min-w-[240px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-3 h-6 w-6" />
                      Send to LinkedIn
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              Tips: Share personal experiences, professional insights, or useful knowledge for your network.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
