/**
 * rankIcons.ts
 * Dedicated icons and tier classes for all 12 Time2Earn ranks
 */

export function getRankIcon(rank: string): string {
  switch (rank) {
    case 'Newbie':
      return '🔰';
    case 'Visitor':
      return '🎟️';
    case 'Regular':
      return '🎮';
    case 'Grinder':
      return '⚡';
    case 'Gamer':
      return '🕹️';
    case 'Elite':
      return '💎';
    case 'VIP':
      return '👑';
    case 'VIP+':
      return '🌟';
    case 'MVP':
      return '🏆';
    case 'MVP+':
      return '🎖️';
    case 'Legend':
      return '🌌';
    case 'OG Player':
      return '🔥';
    default:
      return '🛡️';
  }
}

export function getRankClass(rank: string): string {
  const normalized = rank.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  return `rank-tier-${normalized}`;
}
