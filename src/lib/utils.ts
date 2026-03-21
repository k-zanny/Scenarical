export function formatCurrency(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1_000) {
    return '$' + (value / 1_000).toFixed(1) + 'K';
  }
  return '$' + value.toFixed(decimals);
}

export function formatNumber(value: number, decimals = 0): string {
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toFixed(1) + 'K';
  }
  return value.toFixed(decimals);
}

export function formatPercent(value: number, decimals = 1): string {
  return value.toFixed(decimals) + '%';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function encodeInputsToUrl(inputs: Record<string, number>): string {
  const params = new URLSearchParams();
  Object.entries(inputs).forEach(([key, value]) => {
    params.set(key, String(value));
  });
  return params.toString();
}

export function decodeInputsFromUrl(searchParams: URLSearchParams): Record<string, number> {
  const result: Record<string, number> = {};
  searchParams.forEach((value, key) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      result[key] = num;
    }
  });
  return result;
}

export function saveToLocalStorage(key: string, data: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`scenarical_${key}`, JSON.stringify(data));
  } catch {}
}

export function loadFromLocalStorage(key: string): Record<string, number> | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(`scenarical_${key}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function getShareUrl(slug: string, inputs: Record<string, number>): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/tools/${slug}?${encodeInputsToUrl(inputs)}`;
}

export function getSensitivityData(
  inputs: Record<string, number>,
  calculateFn: (inputs: Record<string, number>) => number,
  variableKeys: string[],
  variations: number[] = [-30, -20, -10, 10, 20, 30]
): { variable: string; impacts: { variation: number; value: number; change: number }[] }[] {
  const baseResult = calculateFn(inputs);

  return variableKeys.map(key => {
    const impacts = variations.map(variation => {
      const modified = { ...inputs, [key]: inputs[key] * (1 + variation / 100) };
      const newResult = calculateFn(modified);
      return {
        variation,
        value: newResult,
        change: ((newResult - baseResult) / Math.abs(baseResult)) * 100,
      };
    });
    return { variable: key, impacts };
  });
}
