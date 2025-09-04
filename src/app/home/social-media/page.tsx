'use client';

import { Button } from '@/components/sellemond-bakery/ui/button';
import { Textarea } from '@/components/sellemond-bakery/ui/textarea';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';

const Page = () => {
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [characterCount, setCharacterCount] = useState(0);

  const maxCharacters = 3000;

  const handleContentChange = (value: string) => {
    setPostContent(value);
    setCharacterCount(value.length);
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle');
    }
  };

  const handleSubmit = async () => {
    if (!postContent.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/send-to-n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to send post');
      }

      setSubmitStatus('success');
      setPostContent('');
      setCharacterCount(0);
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-row min-h-screen bg-background relative">
      {/* Toast/Popup Notification */}
      {(submitStatus === 'success' || submitStatus === 'error') && (
        <div
          className={`fixed top-6 right-6 z-50 min-w-[400px] max-w-md px-8 py-4 rounded-xl shadow-lg flex items-center gap-4 transition-all duration-300
            ${
              submitStatus === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
        >
          {submitStatus === 'success' ? (
            <CheckCircle className="h-7 w-7 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-7 w-7 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">
              {submitStatus === 'success' ? 'Idea sent successfully!' : 'Error sending'}
            </h3>
            <p className="text-base">
              {submitStatus === 'success'
                ? 'Your idea has been sent and will be published on LinkedIn soon.'
                : 'There was a problem sending your idea. Please try again.'}
            </p>
          </div>
          <button
            onClick={() => setSubmitStatus('idle')}
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
              <p className="text-gray-700">Linkedin Posts</p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 space-y-6">
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance leading-tight">
              Share your idea on LinkedIn
            </h1>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto leading-relaxed">
              {"Write your idea and we'll automatically send it to LinkedIn"}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-full max-w-2xl mx-auto">
              <label htmlFor="post-content" className="block text-xl font-semibold text-foreground mb-4 text-center">
                Write your idea here:
              </label>
              <Textarea
                id="post-content"
                placeholder="Share your experience, knowledge or reflection for LinkedIn..."
                value={postContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="min-h-[240px] text-lg p-6 resize-none border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl bg-background mx-auto"
                maxLength={maxCharacters}
                disabled={isSubmitting}
              />
              {/* Character Counter */}
              <div className="mt-3 text-right">
                <span
                  className={`text-base font-medium ${
                    characterCount > maxCharacters * 0.9 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {characterCount} / {maxCharacters} characters
                </span>
              </div>
              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleSubmit}
                  disabled={!postContent.trim() || isSubmitting || characterCount > maxCharacters}
                  size="lg"
                  className="text-xl px-12 py-6 h-auto min-w-[240px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm"
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
};

export default Page;
