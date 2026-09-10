import type { Article } from './types';

export const ARTICLES: Article[] = [
  {
    id: 'a1', kicker: 'RECALL BASICS', icon: 'alarm-warning-line', read: '4 MIN READ', date: 'FEB 2026',
    wash: ['#2E93C4', '#0B4E73'],
    title: 'What actually happens after a recall is issued',
    dek: 'From the manufacturer filing a 573 report to the letter landing in your mailbox.',
    body: [
      { text: 'A recall starts when a manufacturer, or NHTSA, determines a vehicle or piece of equipment has a defect that creates an unreasonable safety risk, or fails to meet a federal safety standard.' },
      { heading: 'The filing', text: 'Within five working days the manufacturer files a defect and noncompliance report — the Part 573 report — naming the affected build range, the defect, and the remedy. This is the document that gives your recall its NHTSA campaign number.' },
      { heading: 'The notice', text: 'Owners of record are notified by first-class mail within 60 days. If you bought the car used, or moved, that letter may never reach you. This is the single most common reason open recalls go unrepaired.' },
      { heading: 'The remedy', text: 'The manufacturer must repair, replace, refund, or in rare cases repurchase, at no cost to you. There is no expiry on a safety recall remedy for the original defect.' },
      { heading: 'Why it stays open', text: 'A recall clears against your VIN only when a franchised dealer performs the work and files it. An independent shop doing the same repair does not close the campaign.' },
    ],
  },
  {
    id: 'a2', kicker: 'MAINTENANCE', icon: 'oil-line', read: '3 MIN READ', date: 'JAN 2026',
    wash: ['#C98A1F', '#8A5A0C'],
    title: 'Oil intervals: why the sticker and the manual disagree',
    dek: 'Quick-lube shops still write 3,000 miles. Your manufacturer usually does not.',
    body: [
      { text: 'Full synthetic oil and closed-loop engine management moved most modern service intervals to somewhere between 7,500 and 10,000 miles. The windshield sticker rarely reflects that.' },
      { heading: 'Read the manual, not the sticker', text: 'Your maintenance schedule is defined by the manufacturer and tied to warranty coverage. A shorter interval costs you money; a longer one can cost you a claim.' },
      { heading: 'Severe service is not unusual', text: 'Short trips under ten minutes, towing, extended idling, dusty roads and sustained cold all put a vehicle on the severe schedule — which is typically half the normal interval.' },
      { heading: 'Oil life monitors', text: 'Systems that estimate remaining oil life from load, temperature and revolutions are generally more accurate than a fixed mileage figure. Reset the monitor at every change or it drifts.' },
    ],
  },
  {
    id: 'a3', kicker: 'TYRES', icon: 'loader-2-line', read: '3 MIN READ', date: 'DEC 2025',
    wash: ['#3F3F46', '#18181B'],
    title: 'Reading a tyre sidewall in thirty seconds',
    dek: 'Size, load, speed rating and the four digits that tell you its age.',
    body: [
      { text: 'Every legal tyre carries its full specification moulded into the sidewall. Four things matter for day-to-day ownership.' },
      { heading: 'The size code', text: 'In 225/45R18 95Y, 225 is the section width in millimetres, 45 is the sidewall height as a percentage of that width, R is radial construction, and 18 is the wheel diameter in inches.' },
      { heading: 'Load and speed', text: '95 is the load index, roughly 690 kg per tyre. Y is the speed rating. Fitting a lower rating than the placard on your door jamb specifies is a failure point at inspection.' },
      { heading: 'The DOT date', text: 'Find the DOT code and read the last four digits: week, then year. 2224 means the 22nd week of 2024. Most manufacturers consider a tyre finished at six years regardless of tread depth.' },
      { heading: 'Pressure', text: 'The correct cold pressure is on the door jamb placard, never the tyre sidewall — the sidewall figure is a maximum, not a recommendation.' },
    ],
  },
  {
    id: 'a4', kicker: 'ELECTRIC', icon: 'battery-charge-line', read: '4 MIN READ', date: 'NOV 2025',
    wash: ['#01a08c', '#046056'],
    title: 'Battery health, degradation and what warranty covers',
    dek: 'Why the first year loses the most, and where the 70% floor comes from.',
    body: [
      { text: 'Lithium-ion packs lose capacity fastest early on, then settle into a slow linear decline. A pack that drops 3% in its first year may lose only 1 to 2% a year afterwards.' },
      { heading: 'What accelerates it', text: 'Sustained high state of charge, deep discharges, heat, and frequent DC fast charging. Keeping the pack between 20% and 80% for daily use is the single most effective habit.' },
      { heading: 'The warranty floor', text: 'Federal rules require eight years or 100,000 miles of coverage on EV traction batteries, and most manufacturers define failure as capacity falling below 70% of original.' },
      { heading: 'Reading your own number', text: 'Range estimates move with temperature and driving style. Compare usable kWh from a full charge against the original spec instead — that is the figure a warranty claim rests on.' },
    ],
  },
];
