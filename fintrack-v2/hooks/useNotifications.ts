import { useMemo, useState } from 'react';
import { CreditCard } from '../types';
import { getDaysUntil } from '../utils/financeUtils';

export interface AppNotification {
  id: string;
  type: 'CLOSING' | 'DUE';
  title: string;
  description: string;
  daysRemaining: number;
  cardName: string;
}

export function useNotifications(creditCards: CreditCard[]) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const notifications = useMemo<AppNotification[]>(() => {
    const today = new Date();
    const result: AppNotification[] = [];

    creditCards.forEach(card => {
      const closingDay = card.closing_day;
      const dueDay = card.due_day;

      let closingDate = new Date(today.getFullYear(), today.getMonth(), closingDay);
      if (closingDate < today) closingDate.setMonth(closingDate.getMonth() + 1);

      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1);

      const daysToClosing = getDaysUntil(closingDate);
      const daysToDue = getDaysUntil(dueDate);

      if (daysToClosing >= 0 && daysToClosing <= 7) {
        result.push({
          id: `closing-${card.id}`,
          type: 'CLOSING',
          title: `Fechamento em ${daysToClosing === 0 ? 'hoje' : `${daysToClosing}d`}`,
          description: `Cartão ${card.name} fecha dia ${closingDay}`,
          daysRemaining: daysToClosing,
          cardName: card.name,
        });
      }

      if (daysToDue >= 0 && daysToDue <= 7) {
        result.push({
          id: `due-${card.id}`,
          type: 'DUE',
          title: `Vencimento em ${daysToDue === 0 ? 'hoje' : `${daysToDue}d`}`,
          description: `Fatura ${card.name} vence dia ${dueDay}`,
          daysRemaining: daysToDue,
          cardName: card.name,
        });
      }
    });

    return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [creditCards]);

  const hasUnread = notifications.some(n => !readIds.has(n.id));

  const markAllRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  return { notifications, hasUnread, readIds, markAllRead };
}
