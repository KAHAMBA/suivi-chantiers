const P: Record<string, string> = {
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  back: "M15 5l-7 7 7 7",
  plus: "M12 5v14M5 12h14",
  next: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8M4 21a8 8 0 0116 0",
  logout: "M10 5H5v14h5M15 8l4 4-4 4M19 12H9",
  building: "M4 21V6l8-3 8 3v15M9 9h2M13 9h2M9 13h2M13 13h2M10 21v-4h4v4",
};
export function Icon({ n, size = 18 }: { n: keyof typeof P; size?: number }) {
  return <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>;
}
