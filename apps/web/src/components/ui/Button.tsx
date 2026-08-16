import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { buttonClass, type ButtonVariant, type ButtonSize } from './buttonStyles'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClass(variant, size), className)} {...props} />
}