import { HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
}

const padMap = { sm: styles.padSm, md: styles.padMd, lg: styles.padLg };
const shadowMap = { sm: styles.shadowSm, md: styles.shadowMd, lg: styles.shadowLg };

export function Card({ padding = 'md', shadow = 'md', className, children, ...props }: CardProps) {
  const cls = [styles.card, padMap[padding], shadowMap[shadow], className].filter(Boolean).join(' ');
  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}
