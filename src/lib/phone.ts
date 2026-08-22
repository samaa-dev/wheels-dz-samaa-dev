import { formatAlgerianPhone } from "@/lib/validation/rules";

/** E.164-style number for tel: links, e.g. +213555123456 */
export function toTelNumber(phone: string): string {
  const formatted = formatAlgerianPhone(phone.trim());
  const digits = formatted.replace(/\D/g, "");
  if (digits.startsWith("213")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+213${digits.slice(1)}`;
  if (digits.length >= 8) return `+${digits}`;
  return formatted || phone;
}

export function canOpenPhoneDialer(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;
  return /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export async function callOrCopyPhone(phone: string): Promise<"call" | "copy"> {
  const tel = toTelNumber(phone);
  if (canOpenPhoneDialer()) {
    window.location.href = `tel:${tel}`;
    return "call";
  }

  try {
    await navigator.clipboard.writeText(tel);
  } catch {
    /* clipboard may be blocked */
  }
  return "copy";
}
