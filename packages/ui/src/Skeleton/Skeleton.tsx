import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius, className }: SkeletonProps) {
  const cls = [styles.skeleton, className].filter(Boolean).join(' ');
  return (
    <span
      className={cls}
      style={{
        width,
        height,
        ...(borderRadius != null ? { borderRadius } : {}),
      }}
    />
  );
}
