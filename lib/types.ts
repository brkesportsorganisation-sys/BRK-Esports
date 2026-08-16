export type Role = 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN' | 'VENDOR';
export type Mode = 'SOLO' | 'DUO' | 'SQUAD';
export type Format = 'BR_RANKED' | 'CS_RANKED';
export type TournamentStatus = 'DRAFT' | 'UPCOMING' | 'LIVE' | 'FINISHED' | 'CANCELLED';
export type PaymentMethod = 'BKASH' | 'NAGAD' | 'ROCKET' | 'WALLET';
export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type CommunityAccessType = 'WHATSAPP' | 'DISCORD' | 'TELEGRAM' | 'FACEBOOK_GROUP' | 'MESSENGER_GROUP' | 'CUSTOM_LINK';
export type CommunityUnlockMode = 'SLOT_PURCHASE_ONLY' | 'PAYMENT_VERIFICATION_ONLY' | 'ADMIN_APPROVAL_ONLY';

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
  freeFireUid: string;
  inGameName: string;
  walletBalance: number;
  coinBalance?: number;
  totalKills: number;
  totalWins: number;
  earnings: number;
  isBanned: boolean;
  referralCode: string;
  totalReferrals?: number;
  claimedMilestones?: number[];
  adminPermissions?: string[];
  createdAt: string;
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
  tournamentStart?: string | Date;
  tournamentEnd?: string | Date;
  registrationStart?: string | Date;
  registrationEnd?: string | Date;
  timeZone?: string;
  isPaused?: boolean;
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
  communityAccessUnlocked?: boolean;
  communityAccessRevoked?: boolean;
  createdAt: string;
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
  kills: number;
  wins: number;
  earnings: number;
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

export interface SpinReward {
  id: string;
  label: string;
  type: 'DIAMONDS' | 'WALLET' | 'ROOM_CARD' | 'TRY_AGAIN';
  value: number;
  color: string;
}
