'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Props {
  address: string | null;
  email: string | null;
}

export function HubSpotForm({ address, email }: Props) {
  const [formEmail, setFormEmail] = useState(email ?? '');
  const [formAddress, setFormAddress] = useState(address ?? '');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Replace with real HubSpot form submission
    // window.hbspt.forms.create({ portalId: '...', formId: '...' })
    console.log('HubSpot submit:', { email: formEmail, address: formAddress });
    toast.success('Report sent! Check your inbox.');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="font-medium text-green-600">Report sent to {formEmail}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Email me this report</CardTitle>
        <p className="text-sm text-gray-500">Review and confirm your details, then we&apos;ll send the report to your inbox.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Property Address</label>
            <input
              type="text"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St, Springfield, IL"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
              className="rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@email.com"
            />
          </div>
          <div className="space-y-2">
            <Button type="submit" className="w-full">Send Report to My Inbox</Button>
            <div className="flex justify-center">
              <div className="group relative inline-flex items-center gap-2 text-center text-xs text-gray-500">
                <span>Privacy notice</span>
                <button
                  type="button"
                  aria-label="View inbox privacy notice"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm transition-colors hover:border-gray-400 hover:text-gray-700"
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-80 -translate-x-1/2 rounded-md border border-slate-200 bg-white p-3 text-left text-[11px] leading-5 text-slate-600 shadow-lg group-hover:block group-focus-within:block">
                  By submitting, you acknowledge that your information may be routed through our CMS and automation
                  software to deliver this report and follow up about highlighted services. Submission also authorizes
                  SFW Construction and Painting to contact you for marketing related to those services.
                </div>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
