export interface ActivityItem {
  id: string;
  type: 'session' | 'redemption';
  title: string;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  badgeText: string;
  badgeVariant: 'primary' | 'gold' | 'warning' | 'success' | 'danger';
}
