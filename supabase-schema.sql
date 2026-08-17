-- =========================================================
-- Blackrock Esports - Supabase PostgreSQL Schema
-- Run this script in your Supabase SQL Editor to create/update all tables
-- =========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "accountNumber" TEXT UNIQUE,
    "freeFireUid" TEXT UNIQUE,
    "inGameName" TEXT,
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
    "referralCode" TEXT UNIQUE NOT NULL,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "claimedMilestones" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "adminPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Team Table
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tag" TEXT UNIQUE NOT NULL,
    "logo" TEXT,
    "captainId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "inviteCode" TEXT UNIQUE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TeamMember Table
CREATE TABLE IF NOT EXISTS "TeamMember" (
    "id" TEXT PRIMARY KEY,
    "teamId" TEXT NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE("teamId", "userId")
);

-- 4. Tournament Table
CREATE TABLE IF NOT EXISTS "Tournament" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
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
    "matchTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "registrationDeadline" TIMESTAMP WITH TIME ZONE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "roomId" TEXT,
    "roomPassword" TEXT,
    "roomEnabled" BOOLEAN NOT NULL DEFAULT false,
    "roomReleaseTime" TIMESTAMP WITH TIME ZONE,
    "rules" TEXT,
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
    "tournamentStart" TIMESTAMP WITH TIME ZONE,
    "tournamentEnd" TIMESTAMP WITH TIME ZONE,
    "registrationStart" TIMESTAMP WITH TIME ZONE,
    "registrationEnd" TIMESTAMP WITH TIME ZONE,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Participant Table
CREATE TABLE IF NOT EXISTS "Participant" (
    "id" TEXT PRIMARY KEY,
    "tournamentId" TEXT NOT NULL REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "teamId" TEXT REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "registrationId" TEXT UNIQUE,
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

-- 6. Payment Table
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "tournamentId" TEXT REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "userName" TEXT,
    "userEmail" TEXT,
    "tournamentTitle" TEXT,
    "method" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "trxId" TEXT UNIQUE NOT NULL,
    "screenshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "walletType" TEXT DEFAULT 'WINNING',
    "notes" TEXT,
    "communityAccessUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "communityAccessRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. MatchResult Table
CREATE TABLE IF NOT EXISTS "MatchResult" (
    "id" TEXT PRIMARY KEY,
    "tournamentId" TEXT NOT NULL REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "teamId" TEXT REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "playerName" TEXT NOT NULL,
    "ffUid" TEXT,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "placement" INTEGER NOT NULL DEFAULT 0,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Notification Table
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT DEFAULT 'GENERAL',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Announcement Table
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. SpinHistory Table
CREATE TABLE IF NOT EXISTS "SpinHistory" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "reward" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. SiteSetting Table
CREATE TABLE IF NOT EXISTS "SiteSetting" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT UNIQUE NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. DeleteRequest Table (Owner-approval workflow)
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

-- 13. LFGPost Table (Player & Squad Finder)
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
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. AdminAccount Table (Discord-style custom credentials)
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

-- 15. AdminActivityLog Table (Audit Trail)
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

-- 16. Conversation Table (Buyer-Seller Private Threads)
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT PRIMARY KEY,
    "buyerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "sellerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "buyerName" TEXT,
    "sellerName" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE("buyerId", "sellerId")
);

-- 17. Message Table (with Security & Moderation Flags)
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "senderName" TEXT,
    "content" TEXT NOT NULL,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. ContactUnlock Table (Paid WhatsApp / Phone Unlock Transactions)
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

-- Disable Row Level Security (RLS) or add open access policy so the app API keys can query freely
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
-- Storage Bucket Setup
-- Create the tournament-images bucket for image uploads
-- =========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-images', 'tournament-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'tournament-images' );

CREATE POLICY IF NOT EXISTS "Service Role Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'tournament-images' );

CREATE POLICY IF NOT EXISTS "Service Role Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'tournament-images' );
