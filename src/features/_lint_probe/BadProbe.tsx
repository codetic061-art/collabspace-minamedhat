import { useState } from 'react';
import { App } from '@/app/App';
import { probeValue } from '@/features/_other_probe/internal';

export interface BadProbeProps {
  enabled: boolean;
}

export function BadProbe({ enabled }: BadProbeProps) {
  if (enabled) {
    useState(0);
  }

  return (
    <div>
      <App />
      <div dangerouslySetInnerHTML={{ __html: probeValue }} />
    </div>
  );
}
