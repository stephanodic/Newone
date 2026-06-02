export const COLORS = {
  primary:      '#1D9E75',
  primaryLight: '#11cc98',
  bgLight:      '#F5F5F0',
  danger:       '#E24B4A',
  dangerLight:  '#ff5f5e',
} as const;

export type AppColor = typeof COLORS[keyof typeof COLORS];
