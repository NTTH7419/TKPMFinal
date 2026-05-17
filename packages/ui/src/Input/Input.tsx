import { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  const inputCls = [styles.input, error ? styles.inputError : '', className].filter(Boolean).join(' ');
  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={inputCls} {...props} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
