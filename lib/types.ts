export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SUPER_ADMIN' | 'MODERATOR' | 'VENDOR' | 'USER';
export type Mode = 'SOLO' | 'DUO' | 'SQUAD';
export type Format = 'BR_RANKED' | 'CS_RANKED';
export type TournamentStatus = 'DRAFT' | 'UPCOMING' | 'LIVE' | 'FINISHED' | 'CANCELLED';
export type PaymentMethod = 'BKASH' | 'NAGAD' | 'ROCKET' | 'WALLET';
export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type CommunityAccessType = 'WHATSAPP' | 'DISCORD' | 'TELEGRAM' | 'FACEBOOK_GROUP' | 'MESSENGER_GROUP' | 'CUSTOM_LINK';
export type CommunityUnlockMode = 'SLOT_PURCHASE_ONLY' | 'PAYMENT_VERIFICATION_ONLY' | 'ADMIN_APPROVAL_ONLY';
export type PlayerStatus = 'AVAILABLE' | 'PENDING' | 'IN_MATCH';
export type LFGType = 'PLAYER_LOOKING_FOR_SQUAD' | 'SQUAD_LOOKING_FOR_PLAYER' | 'NEED_MANAGER' | 'NEED_SPONSOR' | 'NEED_COACH';

export interface TournamentCommunityConfig {
  enabled: boolean;
  accessType: CommunityAccessType;
  inviteLink: string;
  communityName: string;
  communityDescription: string;
  hideInviteLinkFromPublic: boolean;
  unlockMode: CommunityUnlockMode;
  isDisabled: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  role: Role;
  accountNumber?: string; // e.g. BRE-891024 (Bank-style public app ID)
  freeFireUid: string;
  inGameName: string;
  phone?: string;
  whatsApp?: string;
  bio?: string;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  walletBalance: number; // Total balance
  promoBalance?: number; // Promo/Referral Wallet — only for slot purchases
  winningBalance?: number; // Winning Wallet — withdrawable via bKash
  coinBalance?: number;
  totalKills: number;
  totalWins: number;
  earnings: number;
  winRate?: number; // % Win Rate calculated from match stats
  playerStatus?: PlayerStatus;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  referralCode: string;
  referredBy?: string;
  totalReferrals?: number;
  claimedMilestones?: number[];
  adminPermissions?: string[];
  deviceToken?: string;
  isVerified?: boolean;
  passwordResetOtp?: string;
  passwordResetExpires?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  logo: string;
  captainId: string;
  captainName: string;
  membersCount: number;
  wins: number;
  inviteCode: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tournament {
  id: string;
  title: string;
  description: string;
  banner: string;
  mode: Mode;
  format: Format;
  entryFee: number;
  prizePool: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  perKillPrize: number;
  maxTeams: number;
  registeredCount: number;
  matchTime: string;
  registrationDeadline: string;
  status: TournamentStatus;
  roomId?: string;
  roomPassword?: string;
  roomEnabled?: boolean;
  roomReleaseTime?: string | Date;
  rules: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  showOnHomepage?: boolean;
  registrationOpen?: boolean;
  liveMatchToggle?: boolean;
  bannerImage?: string;
  thumbnailImage?: string;
  logoImage?: string;
  galleryImages?: string[];
  community?: TournamentCommunityConfig;
  communityEnabled?: boolean;
  communityAccessType?: string;
  communityInviteLink?: string | null;
  communityName?: string | null;
  communityDescription?: string | null;
  hideInviteLinkFromPublic?: boolean;
  communityUnlockMode?: string;
  communityIsDisabled?: boolean;
  tournamentStart?: string | Date;
  tournamentEnd?: string | Date;
  registrationStart?: string | Date;
  registrationEnd?: string | Date;
  timeZone?: string;
  isPaused?: boolean;
  session?: string;
  serialOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  tournamentId?: string;
  tournamentTitle?: string;
  method: PaymentMethod;
  amount: number;
  trxId: string;
  screenshot?: string;
  status: PaymentStatus;
  walletType?: 'PROMO' | 'WINNING';
  notes?: string;
  senderNumber?: string;
  communityAccessUnlocked?: boolean;
  communityAccessRevoked?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MatchResult {
  id: string;
  tournamentId: string;
  teamOrPlayerName: string;
  ffUid: string;
  kills: number;
  placement: number;
  points: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  tag?: string;
  avatar?: string;
  ffUid?: string;
  accountNumber?: string;
  kills: number;
  wins: number;
  earnings: number;
  winRate?: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'GENERAL' | 'UPDATE' | 'TOURNAMENT';
  isPinned: boolean;
  createdAt: string;
  link?: string;
  imageUrl?: string;
}

export type NotificationType = 'GENERAL' | 'ROOM_ID' | 'PAYOUT' | 'WARNING' | 'MATCH' | 'SYSTEM' | 'REWARD';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: NotificationType;
  link?: string;
  createdAt: string;
}


export interface SpinReward {
  id: string;
  label: string;
  type: 'DIAMONDS' | 'WALLET' | 'ROOM_CARD' | 'TRY_AGAIN';
  value: number;
  color: string;
}

export interface DeleteRequest {
  id: string;
  requestedBy: string;
  requestedByName?: string;
  targetTable: 'Tournament' | 'User' | 'Payment' | 'Announcement' | 'Team';
  targetId: string;
  targetTitle?: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LFGPost {
  id: string;
  userId: string;
  authorName: string;
  accountNumber?: string;
  avatar?: string;
  type: LFGType;
  gameMode: string;
  roleNeeded: string; // e.g. 'RUSHER', 'SNIPER', 'IGL', 'SUPPORT'
  contactWhatsApp?: string;
  description: string;
  status: 'OPEN' | 'PENDING' | 'CLOSED';
  squadName?: string;
  winRate?: number;
  kills?: number;
  createdAt: string;
}

export type AdminPermissionKey = 
  | 'view_dashboard'
  | 'manage_tournaments'
  | 'enter_results'
  | 'manage_users'
  | 'manage_bans'
  | 'moderate_lfg'
  | 'moderate_messages'
  | 'manage_deposits'
  | 'manage_withdrawals'
  | 'adjust_wallets'
  | 'view_financial_reports'
  | 'manage_referrals'
  | 'manage_watch_earn'
  | 'manage_roles' // Owner-only
  | 'approve_deletes' // Owner-only
  | 'send_notifications'
  | 'manage_settings'; // Owner-only

export interface Conversation {
  id: string;
  buyerId: string;
  sellerId: string;
  buyerName?: string;
  sellerName?: string;
  buyerAvatar?: string;
  sellerAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  isUnlocked?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  isFlagged?: boolean;
  flagReason?: string;
  createdAt: string;
}

export interface ContactUnlock {
  id: string;
  conversationId: string;
  buyerId: string;
  sellerId: string;
  buyerName?: string;
  sellerName?: string;
  amountPaid: number;
  sellerPhone?: string;
  sellerWhatsApp?: string;
  status: 'COMPLETED' | 'REFUNDED' | 'DISPUTED';
  createdAt: string;
  unlockedAt: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  password?: string;
  passwordHash?: string;
  displayName: string;
  role: 'OWNER' | 'SUB_ADMIN';
  permissions: AdminPermissionKey[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminActivityLog {
  id: string;
  adminUsername: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

