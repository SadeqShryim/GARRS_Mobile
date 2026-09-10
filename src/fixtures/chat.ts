import type { ChatMessage } from './types';

export const CHAT_SCRIPT: ChatMessage[] = [
  { from: 'them', content: "Good afternoon, Alexander. I'm your Aegis concierge. I can see the open recall on your Model S Plaid — would you like me to handle it?" },
  { from: 'me', content: 'Yes please. What does the repair actually involve?' },
  { from: 'them', content: 'Firmware 2026.4.2 restores the rear camera feed on start-up. About 45 minutes at Tesla Service on Bay Street, no cost to you.' },
  { from: 'me', content: "Can someone collect the car? I can't take the morning off." },
  { from: 'them', content: 'Pro membership includes concierge pick-up. I can have a driver at your address Thursday at 10:30 and returned by early afternoon.' },
  { from: 'me', content: 'That works. Book it.' },
  { from: 'them', content: "Booked. You'll get a confirmation and driver details in this thread, and the recall will clear once the dealer files the work against your VIN." },
];

export const CANNED_REPLY: ChatMessage = { from: 'them', content: 'Noted. A specialist will pick this up with your Model S Plaid record attached — expect a reply in this thread within the hour.' };

export const CHAT_COPY = {
  title: 'Aegis Concierge',
  online: 'Online · replies in minutes',
  typing: 'Typing…',
  replay: 'Replay',
  placeholder: 'Ask the concierge…',
} as const;
