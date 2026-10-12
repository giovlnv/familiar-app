export const fmtTime = (t: number) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(Math.floor(t % 60)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

export const fmtHours = (t: number) => {
  const h = Math.floor(t / 3600);
  const m = Math.round((t % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};
