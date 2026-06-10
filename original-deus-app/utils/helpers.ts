import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function timeAgo(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: tr });
  } catch {
    return 'bilinmiyor';
  }
}

export function formatDateTime(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'dd.MM.yyyy HH:mm', { locale: tr });
  } catch {
    return '-';
  }
}

export function formatTime(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'HH:mm:ss', { locale: tr });
  } catch {
    return '-';
  }
}

export function getMagnitudeLevel(mag: number): 'low' | 'moderate' | 'high' | 'severe' {
  if (mag >= 5.0) return 'severe';
  if (mag >= 4.0) return 'high';
  if (mag >= 3.0) return 'moderate';
  return 'low';
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Şifre en az 8 karakter olmalı.';
  if (!/[A-Z]/.test(password)) return 'En az bir büyük harf içermeli.';
  if (!/[0-9]/.test(password)) return 'En az bir rakam içermeli.';
  return null;
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * A wrapper around the global fetch that supports request timeouts using AbortController.
 * This is crucial in mobile networks to prevent hanging requests when local servers are offline.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}
