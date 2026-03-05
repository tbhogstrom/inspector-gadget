// components/HubSpotForm.tsx
'use client';

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
          <p className="text-green-600 font-medium">Report sent to {formEmail}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Email me this report</CardTitle>
        <p className="text-sm text-gray-500">Review and confirm your details, then we'll send the report to your inbox.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Property Address</label>
            <input
              type="text"
              value={formAddress}
              onChange={e => setFormAddress(e.target.value)}
              className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="123 Main St, Springfield, IL"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              required
              className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="you@email.com"
            />
          </div>
          <Button type="submit" className="w-full">Send Report to My Inbox</Button>
        </form>
      </CardContent>
    </Card>
  );
}
