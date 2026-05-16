import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'dark'
  | 'secondary'
  | 'on-dark'
  | 'secondary-on-dark'
  | 'ghost'
  | 'link';

type BaseProps = {
  variant?: ButtonVariant;
  className?: string;
  children?: ReactNode;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps | 'href'> & {
    href?: undefined;
  };

type ButtonAsAnchor = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary text-button-md rounded-md px-[18px] py-[10px] border border-transparent',
  dark:
    'bg-brand-navy text-on-dark text-button-md rounded-md px-[18px] py-[10px] border border-transparent',
  secondary:
    'bg-canvas text-ink text-button-md rounded-md px-[18px] py-[10px] border border-hairline-strong',
  'on-dark':
    'bg-canvas text-ink text-button-md rounded-md px-[18px] py-[10px] border border-transparent',
  'secondary-on-dark':
    'bg-transparent text-on-dark text-button-md rounded-md px-[18px] py-[10px] border border-on-dark',
  ghost:
    'bg-transparent text-ink text-button-md rounded-md px-[18px] py-[10px] border border-transparent',
  link:
    'bg-transparent text-link-blue text-button-md rounded-none px-0 py-0 border-0 underline underline-offset-2',
};

export const buttonDisabledClasses =
  'bg-hairline text-muted border-transparent cursor-not-allowed';
