export const VIN_SPOTS = [
  { icon: 'window-line', tag: 'MOST COMMON', title: 'Base of the windshield', body: `Stand outside on the driver’s side and look through the glass at the far corner of the dashboard. A small metal plate is riveted there.` },
  { icon: 'car-line', tag: 'DOOR JAMB', title: `Driver’s door frame`, body: `Open the driver’s door and check the sticker on the B-pillar or the edge of the door itself, usually beside the tyre pressure label.` },
  { icon: 'file-text-line', tag: 'PAPERWORK', title: 'Registration or insurance', body: `The VIN is printed on your registration card, title and insurance documents — often the fastest place to read it from.` },
  { icon: 'settings-3-line', tag: 'IN-CAR', title: 'Vehicle software', body: `Many newer cars list the VIN under Settings, Software or Service info on the centre display.` },
] as const;
