import { forwardRef, type MouseEvent } from 'react';
import { cn } from '../utils/cn';
import {
  buttonDisabledClasses,
  buttonVariantClasses,
  type ButtonProps,
} from './Button.types';

type AnyRef = HTMLButtonElement | HTMLAnchorElement;

export const Button = forwardRef<AnyRef, ButtonProps>(function Button(
  props,
  ref,
) {
  const { variant = 'primary', className, children, ...rest } = props;
  const variantClass = buttonVariantClasses[variant];

  if ('href' in rest && typeof rest.href === 'string') {
    const { href, onClick, ...anchorRest } = rest as Extract<
      ButtonProps,
      { href: string }
    >;
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={cn('focus-ring inline-flex items-center justify-center', variantClass, className)}
        onClick={onClick as (e: MouseEvent<HTMLAnchorElement>) => void}
        {...anchorRest}
      >
        {children}
      </a>
    );
  }

  const {
    disabled,
    onClick,
    type,
    ...buttonRest
  } = rest as Extract<ButtonProps, { href?: undefined }>;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type ?? 'button'}
      disabled={disabled}
      aria-disabled={disabled ? true : undefined}
      onClick={handleClick}
      className={cn(
        'focus-ring inline-flex items-center justify-center',
        variantClass,
        disabled && buttonDisabledClasses,
        className,
      )}
      {...buttonRest}
    >
      {children}
    </button>
  );
});
