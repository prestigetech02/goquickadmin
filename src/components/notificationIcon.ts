import { Bell, LifeBuoy, MessageSquare, Package, Scale, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react';

export function notificationIcon(type: string): LucideIcon {
  if (type.includes('support')) return LifeBuoy;
  if (type.includes('withdrawal') || type.includes('payout') || type.includes('payment') || type.includes('escrow')) return Wallet;
  if (type.includes('verification') || type.includes('kyc')) return ShieldCheck;
  if (type.includes('dispute')) return Scale;
  if (type.includes('chat')) return MessageSquare;
  if (type.includes('offer') || type.includes('errand') || type.includes('proof')) return Package;
  return Bell;
}
