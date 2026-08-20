export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SUPER_ADMIN' | 'MODERATOR' | 'VENDOR' | 'USER';
export type Mode = 'SOLO' | 'DUO' | 'SQUAD';
export type Format = 'BR_RANKED' | 'CS_RANKED';
export type GameType = 'FREE_FIRE' | 'EFOOTBALL' | 'PUBG_MOBILE' | 'VALORANT' | 'MLBB' | 'COD_MOBILE' | 'LUDO_KING' | 'OTHER';
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
  currentStreak?: number;
  lastStreakClaimDate?: string;
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

export interface PrizeTier {
  rank: number;
  label: string;
  prize: number;
}

export interface Tournament {
  id: string;
  title: string;
  description: string;
  banner: string;
  game?: GameType | string;
  gameName?: string;
  mode: Mode;
  format: Format;
  entryFee: number;
  prizePool: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  perKillPrize: number;
  prizeDistribution?: PrizeTier[];
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
  allowCoinEntry?: boolean;
  coinEntryFee?: number;
  entryFeeType?: 'CASH' | 'COINS' | 'BOTH' | 'FREE';
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
  teamOrPlayerName?: string;
  playerName?: string;
  ffUid?: string;
  kills: number;
  placement: number;
  points: number;
  createdAt?: string;
}

export type BannerPlacement = 'MAIN_SLIDER' | 'SIDE_TOP' | 'SIDE_BOTTOM';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl: string;
  linkUrl: string;
  buttonText?: string;
  placement: BannerPlacement;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
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
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: NotificationType;
  link?: string;
  imageUrl?: string;
  icon?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface NotificationSchedule {
  id: string;
  name: string;
  prompt: string;
  naturalPrompt?: string;
  category: NotificationType;
  targetAudience: 'ALL' | 'ACTIVE_PLAYERS' | 'TOURNAMENT';
  tournamentId?: string;
  intervalMinutes: number;
  startTime?: string;
  endTime?: string;
  maxRuns?: number;
  specificTimes?: string[];
  imageUrl?: string;
  actionLink?: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  totalDispatched: number;
  createdAt: string;
  updatedAt: string;
}


export interface LotteryRewardItem {
  id: string;
  label: string;
  type: 'DIAMONDS' | 'WALLET' | 'COINS' | 'ROOM_CARD' | 'TRY_AGAIN';
  value: number;
  probabilityPercent: number; // Win chance % (e.g. 10 = 10%)
  maxWinnersLimit?: number; // Maximum times this reward can ever be won
  currentWonCount: number; // How many times it has been won so far
  color: string;
  icon?: string;
  isActive: boolean;
}

export interface AdSettingItem {
  id: string;
  title: string;
  adType: 'YOUTUBE' | 'DIRECT_VIDEO' | 'BANNER' | 'CUSTOM_LINK';
  videoId: string;
  rewardAmount: number; // Coins per watch
  durationSeconds: number; // Minimum watch timer (e.g. 15s)
  isActive: boolean;
}

export interface RewardsHubSettings {
  isWatchEarnActive: boolean;
  isLotteryActive: boolean;
  dailyAdLimit: number;
  dailySpinLimit: number;
  spinCoinCost: number;
  coinsToBdtRatio: number;
  minCoinsToConvert: number;
  ads: AdSettingItem[];
  lotteryRewards: LotteryRewardItem[];
}

export interface SpinReward {
  id: string;
  label: string;
  type: 'DIAMONDS' | 'WALLET' | 'COINS' | 'ROOM_CARD' | 'TRY_AGAIN';
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

export interface DuelChallenge {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorIgn: string;
  creatorUid: string;
  challengerId?: string;
  challengerName?: string;
  challengerIgn?: string;
  challengerUid?: string;
  mode: '1v1_CS' | '1v1_SNIPER' | '1v1_DEAGLE' | '2v2_CS' | 'CUSTOM_BERMUDA';
  customRules: string;
  stakeType: 'BDT' | 'COINS';
  entryFee: number;
  prizePool: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  winnerId?: string;
  roomId?: string;
  roomPass?: string;
  createdAt: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  description?: string;
  category: 'DIAMONDS' | 'PASSES' | 'SKINS' | 'TICKETS' | 'CRATES' | 'OTHERS';
  currencyType: 'COINS' | 'WALLET' | 'BOTH';
  priceCoins: number;
  priceBdt: number;
  diamonds?: number;
  bonusDiamonds?: number;
  icon?: string;
  imageUrl?: string;
  badge?: string;
  stock?: number;
  isActive: boolean;
  isFeaturedOnHome?: boolean;
  deliveryType?: 'FF_UID' | 'REDEEM_CODE' | 'INSTANT_PASS' | 'MANUAL';
  createdAt?: string;
}

// Backwards compatibility alias
export type DiamondProduct = ShopProduct;

export const DEFAULT_SHOP_PRODUCTS: ShopProduct[] = [
  // 1. Free Fire Diamonds
  {
    id: 'dia_115',
    name: '115 Free Fire Diamonds',
    description: 'Direct in-game diamond top-up to your Free Fire Player UID.',
    category: 'DIAMONDS',
    currencyType: 'BOTH',
    priceBdt: 85,
    priceCoins: 850,
    diamonds: 115,
    icon: '💎',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    isFeaturedOnHome: true,
    deliveryType: 'FF_UID',
  },
  {
    id: 'dia_240',
    name: '240 + 25 Bonus Diamonds',
    description: 'Instant 240 Diamonds with 25 extra bonus diamonds for Free Fire.',
    category: 'DIAMONDS',
    currencyType: 'BOTH',
    priceBdt: 165,
    priceCoins: 1650,
    diamonds: 240,
    bonusDiamonds: 25,
    icon: '💎',
    badge: 'POPULAR',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    isFeaturedOnHome: true,
    deliveryType: 'FF_UID',
  },
  {
    id: 'dia_610',
    name: '610 + 60 Bonus Diamonds',
    description: 'High value diamond pack with 60 bonus diamonds included.',
    category: 'DIAMONDS',
    currencyType: 'BOTH',
    priceBdt: 410,
    priceCoins: 4100,
    diamonds: 610,
    bonusDiamonds: 60,
    icon: '💎',
    badge: 'BEST VALUE',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    deliveryType: 'FF_UID',
  },
  {
    id: 'dia_1240',
    name: '1,240 + 150 Bonus Diamonds',
    description: 'Mega diamond package for elite Free Fire players and guild leaders.',
    category: 'DIAMONDS',
    currencyType: 'WALLET',
    priceBdt: 820,
    priceCoins: 8200,
    diamonds: 1240,
    bonusDiamonds: 150,
    icon: '💎',
    badge: 'PRO PACK',
    imageUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    deliveryType: 'FF_UID',
  },

  // 2. Memberships & Passes
  {
    id: 'mem_weekly',
    name: 'Weekly Membership (450💎 Total)',
    description: 'Get 450 total diamonds over 7 days with weekly privilege badges.',
    category: 'PASSES',
    currencyType: 'BOTH',
    priceBdt: 175,
    priceCoins: 1750,
    diamonds: 450,
    icon: '🎟️',
    badge: 'HOT',
    imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    deliveryType: 'FF_UID',
  },
  {
    id: 'mem_monthly',
    name: 'Monthly Membership (2,600💎 Total)',
    description: '30-day VIP membership with 2,600 diamonds and discount vouchers.',
    category: 'PASSES',
    currencyType: 'WALLET',
    priceBdt: 860,
    priceCoins: 8600,
    diamonds: 2600,
    icon: '👑',
    badge: 'VIP CLUB',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    deliveryType: 'FF_UID',
  },
  {
    id: 'pass_booyah',
    name: 'Booyah Pass Premium Unlock',
    description: 'Unlock this season Booyah Pass with exclusive weapon skins and emotes.',
    category: 'PASSES',
    currencyType: 'BOTH',
    priceBdt: 350,
    priceCoins: 3500,
    diamonds: 500,
    icon: '🔥',
    badge: 'SEASON PASS',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    deliveryType: 'FF_UID',
  },

  // 3. Redeem Codes & Skins (Coin Special)
  {
    id: 'skin_dragon_ak',
    name: 'Dragon AK47 Redeem Voucher',
    description: 'Special in-game redeem voucher code to unlock Dragon AK weapon crate.',
    category: 'SKINS',
    currencyType: 'COINS',
    priceBdt: 120,
    priceCoins: 600,
    icon: '🔫',
    badge: 'COIN ONLY',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    deliveryType: 'REDEEM_CODE',
  },
  {
    id: 'item_room_cards',
    name: '5x Custom Room Cards Pack',
    description: '5 Custom match room creation cards for team scrims and practice.',
    category: 'SKINS',
    currencyType: 'COINS',
    priceBdt: 80,
    priceCoins: 400,
    icon: '🃏',
    badge: 'COIN SPECIAL',
    imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    deliveryType: 'FF_UID',
  },

  // 4. Tournament Tickets & Crates
  {
    id: 'tkt_vip_pass',
    name: 'VIP Tournament Match Entry Pass',
    description: 'Free entry pass for any BRK Daily Squad or Duo paid tournament match.',
    category: 'TICKETS',
    currencyType: 'BOTH',
    priceBdt: 100,
    priceCoins: 500,
    icon: '🎟️',
    badge: 'MATCH PASS',
    imageUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    deliveryType: 'INSTANT_PASS',
  },
  {
    id: 'crate_mystery_box',
    name: 'BRK Esports Mystery Crate',
    description: 'Open to win up to 520 Diamonds, 1000 Coins, or Free VIP Passes!',
    category: 'CRATES',
    currencyType: 'COINS',
    priceBdt: 50,
    priceCoins: 250,
    icon: '📦',
    badge: 'LUCKY PACK',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    deliveryType: 'INSTANT_PASS',
  },
];

export const DIAMOND_PRODUCTS = DEFAULT_SHOP_PRODUCTS;

export type VendorAccessLevel = 'FULL_ACCESS' | 'LIMITED_ACCESS';

export type VendorPermissionKey =
  | 'create_tournaments'
  | 'edit_own_tournaments'
  | 'manage_own_slots'
  | 'submit_results'
  | 'view_own_earnings'
  | 'request_payout'
  | 'edit_store_profile'
  | 'auto_publish_live'
  | 'set_custom_entry_fees'
  | 'view_registrations'
  | 'manage_room_details'
  | 'enter_match_results'
  | 'manage_tournaments'
  | 'view_analytics';

export interface VendorPermissionMeta {
  key: VendorPermissionKey;
  label: string;
  category: string;
  description: string;
}

export const VENDOR_PERMISSIONS_LIST: VendorPermissionMeta[] = [
  {
    key: 'create_tournaments',
    label: 'Create Tournaments',
    category: 'Tournaments',
    description: 'Create new tournaments and configure format, mode, and slots.',
  },
  {
    key: 'edit_own_tournaments',
    label: 'Edit Own Tournaments',
    category: 'Tournaments',
    description: 'Edit tournament rules, schedules, and details for own tournaments.',
  },
  {
    key: 'manage_own_slots',
    label: 'Manage Slots & Room Passwords',
    category: 'Rooms',
    description: 'Update Room ID, Room Password, and release countdown timers for own matches.',
  },
  {
    key: 'submit_results',
    label: 'Submit Match Results',
    category: 'Results',
    description: 'Submit kill counts, placements, and scoreboard points for own matches.',
  },
  {
    key: 'view_registrations',
    label: 'View Squad Rosters & WhatsApp',
    category: 'Registrations',
    description: 'Inspect registered team squad rosters, player IGNs, and captain contacts.',
  },
  {
    key: 'view_own_earnings',
    label: 'View Own Earnings & Escrow',
    category: 'Finance',
    description: 'Inspect revenue share breakdown, net earnings, and escrow balances.',
  },
  {
    key: 'request_payout',
    label: 'Request Earnings Payout',
    category: 'Finance',
    description: 'Submit withdrawal payout requests for completed tournament earnings.',
  },
  {
    key: 'edit_store_profile',
    label: 'Edit Public Storefront Profile',
    category: 'Profile',
    description: 'Customize public vendor storefront logo, banner, and organization bio.',
  },
  {
    key: 'auto_publish_live',
    label: 'Auto-Publish Tournaments Live',
    category: 'Tournaments',
    description: 'Publish tournaments immediately without requiring Admin pre-approval review.',
  },
  {
    key: 'set_custom_entry_fees',
    label: 'Custom Entry Fee Pricing',
    category: 'Tournaments',
    description: 'Set custom entry fees and prize pool ratios outside default ranges.',
  },
];

export const LIMITED_TIER_DEFAULT_PERMISSIONS: VendorPermissionKey[] = [
  'create_tournaments',
  'edit_own_tournaments',
  'manage_own_slots',
  'submit_results',
  'view_registrations',
  'view_own_earnings',
  'request_payout',
  'manage_room_details',
  'enter_match_results',
];

export const FULL_TIER_DEFAULT_PERMISSIONS: VendorPermissionKey[] = [
  'create_tournaments',
  'edit_own_tournaments',
  'manage_own_slots',
  'submit_results',
  'view_registrations',
  'view_own_earnings',
  'request_payout',
  'edit_store_profile',
  'auto_publish_live',
  'set_custom_entry_fees',
  'manage_room_details',
  'enter_match_results',
  'manage_tournaments',
  'view_analytics',
];

export interface VendorAccount {
  id: string;
  vendorId: string; // e.g. VND-8492 or vendor_01
  name: string;
  orgName?: string;
  email: string;
  password?: string;
  passwordHash?: string;
  phone?: string;
  whatsApp?: string;
  logo?: string;
  banner?: string;
  bio?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  accessLevel: VendorAccessLevel; // FULL_ACCESS vs LIMITED_ACCESS
  permissions: VendorPermissionKey[];
  assignedTournaments: string[]; // List of tournament IDs or ['ALL']
  commissionRate?: number; // % kept by vendor (e.g. 80 = 80% vendor, 20% platform)
  walletBalance?: number;
  escrowBalance?: number;
  totalEarnings?: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPayoutRequest {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  method: 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK';
  accountNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  trxId?: string;
  notes?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  senderRole: 'USER' | 'ADMIN' | 'SYSTEM';
  content: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  lastMessage: string;
  status: 'OPEN' | 'RESOLVED';
  unreadCountAdmin: number;
  unreadCountUser: number;
  createdAt: string;
  updatedAt: string;
}




