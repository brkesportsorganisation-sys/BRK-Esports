-- =========================================================
-- Blackrock Esports - Complete Supabase PostgreSQL Master Schema
-- Paste and Run this script in your Supabase SQL Editor:
-- It creates all missing tables AND safely adds all missing columns
-- to existing tables without deleting or corrupting any data!
-- =========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 1. User Table (Players, Admins, Vendors)
-- =========================================================
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Player',
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "accountNumber" TEXT UNIQUE,
    "freeFireUid" TEXT,
    "inGameName" TEXT,
    "phone" TEXT,
    "whatsApp" TEXT,
    "bio" TEXT,
    "bkashNumber" TEXT,
    "nagadNumber" TEXT,
    "rocketNumber" TEXT,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "promoBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "winningBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "coinBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "playerStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "bannedAt" TIMESTAMP WITH TIME ZONE,
    "bannedBy" TEXT,
    "referralCode" TEXT,
    "referredBy" TEXT,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "claimedMilestones" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "adminPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceToken" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStreakClaimDate" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safe migrations for User table if already exists
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "freeFireUid" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inGameName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsApp" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bkashNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nagadNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rocketNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "promoBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "winningBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "coinBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalKills" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalWins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "playerStatus" TEXT NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedBy" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredBy" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalReferrals" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "claimedMilestones" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deviceToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastStreakClaimDate" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetOtp" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;


-- =========================================================
-- 2. Team Table
-- =========================================================
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "logo" TEXT,
    "captainId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "captainName" TEXT,
    "inviteCode" TEXT NOT NULL,
    "membersCount" INTEGER NOT NULL DEFAULT 1,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "captainName" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "membersCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "wins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;


-- =========================================================
-- 3. TeamMember Table
-- =========================================================
CREATE TABLE IF NOT EXISTS "TeamMember" (
    "id" TEXT PRIMARY KEY,
    "teamId" TEXT NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE("teamId", "userId")
);


-- =========================================================
-- 4. Tournament Table
-- =========================================================
CREATE TABLE IF NOT EXISTS "Tournament" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "banner" TEXT,
    "bannerImage" TEXT,
    "thumbnailImage" TEXT,
    "logoImage" TEXT,
    "galleryImages" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'SQUAD',
    "format" TEXT NOT NULL DEFAULT 'BR_RANKED',
    "entryFee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "prizePool" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "firstPrize" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "secondPrize" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "thirdPrize" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "perKillPrize" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxTeams" INTEGER NOT NULL DEFAULT 12,
    "registeredCount" INTEGER NOT NULL DEFAULT 0,
    "matchTime" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    "registrationDeadline" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    "tournamentStart" TIMESTAMP WITH TIME ZONE,
    "tournamentEnd" TIMESTAMP WITH TIME ZONE,
    "registrationStart" TIMESTAMP WITH TIME ZONE,
    "registrationEnd" TIMESTAMP WITH TIME ZONE,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "session" TEXT DEFAULT 'AM',
    "serialOrder" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "roomId" TEXT,
    "roomPassword" TEXT,
    "roomEnabled" BOOLEAN NOT NULL DEFAULT false,
    "roomReleaseTime" TIMESTAMP WITH TIME ZONE,
    "rules" TEXT DEFAULT 'Standard tournament rules apply.',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT true,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "liveMatchToggle" BOOLEAN NOT NULL DEFAULT false,
    "communityEnabled" BOOLEAN NOT NULL DEFAULT false,
    "communityAccessType" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "communityInviteLink" TEXT,
    "communityName" TEXT,
    "communityDescription" TEXT,
    "hideInviteLinkFromPublic" BOOLEAN NOT NULL DEFAULT true,
    "communityUnlockMode" TEXT NOT NULL DEFAULT 'SLOT_PURCHASE_ONLY',
    "communityIsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "game" TEXT DEFAULT 'FREE_FIRE';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "gameName" TEXT DEFAULT 'Free Fire';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "bannerImage" TEXT;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "thumbnailImage" TEXT;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "logoImage" TEXT;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "galleryImages" TEXT;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "firstPrize" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "secondPrize" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "thirdPrize" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "perKillPrize" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "tournamentStart" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "tournamentEnd" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "registrationStart" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "registrationEnd" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "timeZone" TEXT NOT NULL DEFAULT 'Asia/Dhaka';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "isPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT 'AM';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "serialOrder" INTEGER DEFAULT 0;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "roomReleaseTime" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "showOnHomepage" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "registrationOpen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "liveMatchToggle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "communityEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "communityAccessType" TEXT NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "communityInviteLink" TEXT;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "communityName" TEXT;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "communityDescription" TEXT;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "hideInviteLinkFromPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "communityUnlockMode" TEXT NOT NULL DEFAULT 'SLOT_PURCHASE_ONLY';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "communityIsDisabled" BOOLEAN NOT NULL DEFAULT false;


-- =========================================================
-- 5. Participant Table (Registrations & Squad Rosters)
-- =========================================================
CREATE TABLE IF NOT EXISTS "Participant" (
    "id" TEXT PRIMARY KEY,
    "tournamentId" TEXT NOT NULL REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "teamId" TEXT REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "registrationId" TEXT,
    "squadName" TEXT,
    "iglName" TEXT,
    "captainWhatsApp" TEXT,
    "captainDiscord" TEXT,
    "player1Name" TEXT,
    "player2Name" TEXT,
    "player3Name" TEXT,
    "player4Name" TEXT,
    "backupPlayerName" TEXT
);

ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "registrationId" TEXT;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "squadName" TEXT;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "iglName" TEXT;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "captainWhatsApp" TEXT;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "captainDiscord" TEXT;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "player1Name" TEXT;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "player2Name" TEXT;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "player3Name" TEXT;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "player4Name" TEXT;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "backupPlayerName" TEXT;


-- =========================================================
-- 6. Payment Table (Deposits, Withdrawals, Slot Purchases)
-- =========================================================
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "tournamentId" TEXT REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "userName" TEXT,
    "userEmail" TEXT,
    "tournamentTitle" TEXT,
    "method" TEXT NOT NULL DEFAULT 'BKASH',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "trxId" TEXT NOT NULL,
    "screenshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "walletType" TEXT DEFAULT 'WINNING',
    "notes" TEXT,
    "senderNumber" TEXT,
    "communityAccessUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "communityAccessRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "userName" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "userEmail" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "tournamentTitle" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "screenshot" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "walletType" TEXT DEFAULT 'WINNING';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "senderNumber" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "communityAccessUnlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "communityAccessRevoked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;


-- =========================================================
-- 7. MatchResult Table (Scoreboards & Kill Stats)
-- =========================================================
CREATE TABLE IF NOT EXISTS "MatchResult" (
    "id" TEXT PRIMARY KEY,
    "tournamentId" TEXT NOT NULL REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "teamId" TEXT REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "playerName" TEXT NOT NULL,
    "teamOrPlayerName" TEXT,
    "ffUid" TEXT,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "placement" INTEGER NOT NULL DEFAULT 0,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "MatchResult" ADD COLUMN IF NOT EXISTS "teamOrPlayerName" TEXT;
ALTER TABLE "MatchResult" ADD COLUMN IF NOT EXISTS "ffUid" TEXT;
ALTER TABLE "MatchResult" ADD COLUMN IF NOT EXISTS "points" DOUBLE PRECISION NOT NULL DEFAULT 0.0;


-- =========================================================
-- 8. Notification Table (In-App Push Alerts)
-- =========================================================
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT DEFAULT 'GENERAL',
    "link" TEXT,
    "imageUrl" TEXT,
    "icon" TEXT,
    "priority" TEXT DEFAULT 'NORMAL',
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'GENERAL';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "link" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'NORMAL';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;


-- =========================================================
-- 8.1. NotificationSchedule Table (AI Automated Timer & Cron)
-- =========================================================
CREATE TABLE IF NOT EXISTS "NotificationSchedule" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "naturalPrompt" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
    "tournamentId" TEXT,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "startTime" TIMESTAMP WITH TIME ZONE,
    "endTime" TIMESTAMP WITH TIME ZONE,
    "maxRuns" INTEGER,
    "specificTimes" TEXT[],
    "imageUrl" TEXT,
    "actionLink" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP WITH TIME ZONE,
    "nextRunAt" TIMESTAMP WITH TIME ZONE,
    "totalDispatched" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "prompt" TEXT;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "naturalPrompt" TEXT;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "targetAudience" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "tournamentId" TEXT;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "intervalMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "startTime" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "endTime" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "maxRuns" INTEGER;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "specificTimes" TEXT[];
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "actionLink" TEXT;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "nextRunAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "totalDispatched" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "NotificationSchedule" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;


-- =========================================================
-- 9. Announcement Table (Public Notice Board)
-- =========================================================
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "imageUrl" TEXT,
    "postedBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "link" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "postedBy" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;


-- =========================================================
-- 10. SpinHistory Table (Lucky Spin Wheel Rewards)
-- =========================================================
CREATE TABLE IF NOT EXISTS "SpinHistory" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "reward" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- =========================================================
-- 11. SiteSetting Table (Config, Keys, Pricing)
-- =========================================================
CREATE TABLE IF NOT EXISTS "SiteSetting" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT UNIQUE NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- =========================================================
-- 12. DeleteRequest Table (Owner-Approval Workflow)
-- =========================================================
CREATE TABLE IF NOT EXISTS "DeleteRequest" (
    "id" TEXT PRIMARY KEY,
    "requestedBy" TEXT NOT NULL,
    "requestedByName" TEXT,
    "targetTable" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetTitle" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "DeleteRequest" ADD COLUMN IF NOT EXISTS "requestedByName" TEXT;
ALTER TABLE "DeleteRequest" ADD COLUMN IF NOT EXISTS "targetTitle" TEXT;
ALTER TABLE "DeleteRequest" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "DeleteRequest" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "DeleteRequest" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;


-- =========================================================
-- 13. LFGPost Table (Player & Squad Finder)
-- =========================================================
CREATE TABLE IF NOT EXISTS "LFGPost" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "authorName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "avatar" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PLAYER_LOOKING_FOR_SQUAD',
    "gameMode" TEXT NOT NULL DEFAULT 'BR_SQUAD',
    "roleNeeded" TEXT DEFAULT 'RUSHER',
    "contactWhatsApp" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "squadName" TEXT,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "LFGPost" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE "LFGPost" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "LFGPost" ADD COLUMN IF NOT EXISTS "roleNeeded" TEXT DEFAULT 'RUSHER';
ALTER TABLE "LFGPost" ADD COLUMN IF NOT EXISTS "contactWhatsApp" TEXT;
ALTER TABLE "LFGPost" ADD COLUMN IF NOT EXISTS "squadName" TEXT;
ALTER TABLE "LFGPost" ADD COLUMN IF NOT EXISTS "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "LFGPost" ADD COLUMN IF NOT EXISTS "kills" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LFGPost" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;


-- =========================================================
-- 14. AdminAccount Table (Custom Credential Sub-Admins)
-- =========================================================
CREATE TABLE IF NOT EXISTS "AdminAccount" (
    "id" TEXT PRIMARY KEY,
    "username" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUB_ADMIN',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "AdminAccount" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AdminAccount" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AdminAccount" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;


-- =========================================================
-- 15. AdminActivityLog Table (Audit Trail)
-- =========================================================
CREATE TABLE IF NOT EXISTS "AdminActivityLog" (
    "id" TEXT PRIMARY KEY,
    "adminUsername" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- =========================================================
-- 16. Conversation Table (Buyer-Seller Direct Chat)
-- =========================================================
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT PRIMARY KEY,
    "buyerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "sellerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "buyerName" TEXT,
    "sellerName" TEXT,
    "buyerAvatar" TEXT,
    "sellerAvatar" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE("buyerId", "sellerId")
);

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "buyerName" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "sellerName" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "buyerAvatar" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "sellerAvatar" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "lastMessage" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;


-- =========================================================
-- 17. Message Table (with Filter Violations & Moderation)
-- =========================================================
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "senderName" TEXT,
    "senderAvatar" TEXT,
    "content" TEXT NOT NULL,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "senderName" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "senderAvatar" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "isFlagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "flagReason" TEXT;


-- =========================================================
-- 18. ContactUnlock Table (Paid WhatsApp / Phone Transactions)
-- =========================================================
CREATE TABLE IF NOT EXISTS "ContactUnlock" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "sellerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "buyerName" TEXT,
    "sellerName" TEXT,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "sellerPhone" TEXT,
    "sellerWhatsApp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "unlockedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "ContactUnlock" ADD COLUMN IF NOT EXISTS "buyerName" TEXT;
ALTER TABLE "ContactUnlock" ADD COLUMN IF NOT EXISTS "sellerName" TEXT;
ALTER TABLE "ContactUnlock" ADD COLUMN IF NOT EXISTS "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 20.0;
ALTER TABLE "ContactUnlock" ADD COLUMN IF NOT EXISTS "sellerPhone" TEXT;
ALTER TABLE "ContactUnlock" ADD COLUMN IF NOT EXISTS "sellerWhatsApp" TEXT;
ALTER TABLE "ContactUnlock" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'COMPLETED';


-- =========================================================
-- Disable Row Level Security (RLS) for API Access
-- =========================================================
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMember" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Tournament" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Participant" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MatchResult" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SpinHistory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteSetting" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DeleteRequest" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "LFGPost" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAccount" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminActivityLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactUnlock" DISABLE ROW LEVEL SECURITY;


-- =========================================================
-- Performance Indexes (Fast Lookups)
-- =========================================================
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User"("email");
CREATE INDEX IF NOT EXISTS "idx_user_accountNumber" ON "User"("accountNumber");
CREATE INDEX IF NOT EXISTS "idx_user_referralCode" ON "User"("referralCode");
CREATE INDEX IF NOT EXISTS "idx_tournament_status" ON "Tournament"("status");
CREATE INDEX IF NOT EXISTS "idx_participant_tournamentId" ON "Participant"("tournamentId");
CREATE INDEX IF NOT EXISTS "idx_participant_userId" ON "Participant"("userId");
CREATE INDEX IF NOT EXISTS "idx_payment_userId" ON "Payment"("userId");
CREATE INDEX IF NOT EXISTS "idx_payment_trxId" ON "Payment"("trxId");
CREATE INDEX IF NOT EXISTS "idx_payment_status" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "idx_notification_userId" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "idx_message_conversationId" ON "Message"("conversationId");
CREATE INDEX IF NOT EXISTS "idx_conversation_buyerId" ON "Conversation"("buyerId");
CREATE INDEX IF NOT EXISTS "idx_conversation_sellerId" ON "Conversation"("sellerId");
CREATE INDEX IF NOT EXISTS "idx_contactunlock_conversationId" ON "ContactUnlock"("conversationId");
CREATE INDEX IF NOT EXISTS "idx_sitesetting_key" ON "SiteSetting"("key");


-- =========================================================
-- Storage Bucket Setup (Images & Receipts)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-images', 'tournament-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING ( bucket_id = 'tournament-images' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Service Role Upload' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Service Role Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'tournament-images' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Service Role Delete' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Service Role Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'tournament-images' );
    END IF;
END $$;


-- =========================================================
-- Pre-Seed Essential Default Site Settings
-- =========================================================
INSERT INTO "SiteSetting" ("id", "key", "value") VALUES
    ('setting_min_deposit', 'min_deposit', '20'),
    ('setting_bkash_number', 'bkash_number', '01700000000'),
    ('setting_nagad_number', 'nagad_number', '01800000000'),
    ('setting_rocket_number', 'rocket_number', '01900000000'),
    ('setting_whatsapp_unlock_fee', 'whatsapp_unlock_fee', '20'),
    ('setting_platform_revenue_share', 'platform_revenue_share', '80'),
    ('setting_seller_revenue_share', 'seller_revenue_share', '20'),
    ('setting_is_live_active', 'is_live_active', 'false'),
    ('setting_live_stream_url', 'live_stream_url', ''),
    ('setting_contact_email', 'contact_email', 'support@blackrock.gg'),
    ('setting_telegram_channel', 'telegram_channel', 'https://t.me/blackrock_esports')
ON CONFLICT ("key") DO NOTHING;


-- =========================================================
-- 20. VendorAccount Table (Vendor Credential & Access Matrix)
-- =========================================================
CREATE TABLE IF NOT EXISTS "VendorAccount" (
    "id" TEXT PRIMARY KEY,
    "vendorId" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "orgName" TEXT,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "whatsApp" TEXT,
    "logo" TEXT,
    "banner" TEXT,
    "bio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accessLevel" TEXT NOT NULL DEFAULT 'LIMITED_ACCESS',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedTournaments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "escrowBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "orgName" TEXT;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "whatsApp" TEXT;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "banner" TEXT;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "accessLevel" TEXT NOT NULL DEFAULT 'LIMITED_ACCESS';
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "assignedTournaments" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 80.0;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "escrowBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "VendorAccount" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_vendoraccount_vendorId" ON "VendorAccount"("vendorId");
CREATE INDEX IF NOT EXISTS "idx_vendoraccount_email" ON "VendorAccount"("email");
CREATE INDEX IF NOT EXISTS "idx_vendoraccount_status" ON "VendorAccount"("status");


-- =========================================================
-- 21. VendorPayoutRequest Table (Earnings Cashout Review)
-- =========================================================
CREATE TABLE IF NOT EXISTS "VendorPayoutRequest" (
    "id" TEXT PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "method" TEXT NOT NULL DEFAULT 'BKASH',
    "accountNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trxId" TEXT,
    "notes" TEXT,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_vendorpayout_vendorId" ON "VendorPayoutRequest"("vendorId");
CREATE INDEX IF NOT EXISTS "idx_vendorpayout_status" ON "VendorPayoutRequest"("status");

-- =========================================================
-- 22. Banner Table (Hero Carousel & Side Promo Banners)
-- =========================================================
CREATE TABLE IF NOT EXISTS "Banner" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "badge" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL DEFAULT '/tournaments',
    "buttonText" TEXT DEFAULT 'JOIN TOURNAMENT',
    "placement" TEXT NOT NULL DEFAULT 'MAIN_SLIDER', -- 'MAIN_SLIDER', 'SIDE_TOP', 'SIDE_BOTTOM'
    "order" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_banner_placement" ON "Banner"("placement");
CREATE INDEX IF NOT EXISTS "idx_banner_order" ON "Banner"("order");
CREATE INDEX IF NOT EXISTS "idx_banner_active" ON "Banner"("isActive");

-- =========================================================
-- 23. SupportTicket Table (Player Helpdesk & Support Threads)
-- =========================================================
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT,
    "userPhone" TEXT,
    "lastMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED'
    "unreadCountAdmin" INTEGER NOT NULL DEFAULT 1,
    "unreadCountUser" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_supportticket_userId" ON "SupportTicket"("userId");
CREATE INDEX IF NOT EXISTS "idx_supportticket_status" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "idx_supportticket_updatedAt" ON "SupportTicket"("updatedAt");

-- =========================================================
-- 24. SupportMessage Table (Live Messages & Discord Welcomes)
-- =========================================================
CREATE TABLE IF NOT EXISTS "SupportMessage" (
    "id" TEXT PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userAvatar" TEXT,
    "senderRole" TEXT NOT NULL DEFAULT 'USER', -- 'USER', 'ADMIN', 'SYSTEM'
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_supportmessage_ticketId" ON "SupportMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "idx_supportmessage_createdAt" ON "SupportMessage"("createdAt");





