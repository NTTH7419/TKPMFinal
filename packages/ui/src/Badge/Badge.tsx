import { HTMLAttributes } from 'react';
import styles from './Badge.module.css';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  const cls = [styles.badge, styles[variant], className].filter(Boolean).join(' ');
  return <span className={cls} {...props}>{children}</span>;
}
