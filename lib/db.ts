import { User, Tournament, Team, Payment, Announcement, MatchResult, PaymentStatus, Banner, SupportTicket, SupportMessage } from './types';
import { initialUsers, initialTournaments, initialTeams, initialPayments, initialAnnouncements, initialBanners } from './mock-data';

class LocalDatabase {
  private users: User[] = [...initialUsers];
  private tournaments: Tournament[] = [...initialTournaments];
  private teams: Team[] = [...initialTeams];
  private payments: Payment[] = [...initialPayments];
  private announcements: Announcement[] = [...initialAnnouncements];
  private banners: Banner[] = [...initialBanners];
  private supportTickets: SupportTicket[] = [];
  private supportMessages: SupportMessage[] = [];
  private bannerSettings: { autoSlideInterval: number; isEnabled: boolean } = {
    autoSlideInterval: 4000,
    isEnabled: true,
  };
  private matchResults: MatchResult[] = [];
  private registrations: any[] = [];
  private currentUser: User | null = null;
  private adSettings: { isActive: boolean, ads: { id: string, videoId: string, rewardAmount: number, isActive: boolean }[] } = {
    isActive: true,
    ads: [
      { id: 'ad_default_1', videoId: 'dQw4w9WgXcQ', rewardAmount: 5, isActive: true }
    ],
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const savedUsers = localStorage.getItem('helian_users');
      if (savedUsers) this.users = JSON.parse(savedUsers);

      const savedTournaments = localStorage.getItem('helian_tournaments');
      if (savedTournaments) this.tournaments = JSON.parse(savedTournaments);

      const savedPayments = localStorage.getItem('helian_payments');
      if (savedPayments) this.payments = JSON.parse(savedPayments);

      const savedRegs = localStorage.getItem('helian_registrations');
      if (savedRegs) this.registrations = JSON.parse(savedRegs);

      const savedUser = localStorage.getItem('helian_current_user');
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
        } catch {
          this.currentUser = null;
        }
      } else {
        this.currentUser = null;
      }
      
      const savedAnn = localStorage.getItem('helian_announcements');
      if (savedAnn) this.announcements = JSON.parse(savedAnn);

      const savedBanners = localStorage.getItem('helian_banners');
      if (savedBanners) {
        try {
          this.banners = JSON.parse(savedBanners);
        } catch {}
      }

      const savedBannerSettings = localStorage.getItem('helian_banner_settings');
      if (savedBannerSettings) {
        try {
          this.bannerSettings = JSON.parse(savedBannerSettings);
        } catch {}
      }

      const savedTickets = localStorage.getItem('helian_support_tickets');
      if (savedTickets) {
        try { this.supportTickets = JSON.parse(savedTickets); } catch {}
      }

      const savedMsgs = localStorage.getItem('helian_support_messages');
      if (savedMsgs) {
        try { this.supportMessages = JSON.parse(savedMsgs); } catch {}
      }
      
      const savedAdSettings = localStorage.getItem('helian_ad_settings');
      if (savedAdSettings) {
        const parsed = JSON.parse(savedAdSettings);
        // Migration logic for old single-ad structure
        if (parsed.videoId !== undefined) {
          this.adSettings = {
            isActive: parsed.isActive ?? true,
            ads: [
              { id: 'ad_' + Date.now(), videoId: parsed.videoId, rewardAmount: parsed.rewardAmount || 5, isActive: true }
            ]
          };
        } else {
          this.adSettings = parsed;
        }
      }
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('helian_users', JSON.stringify(this.users));
      localStorage.setItem('helian_tournaments', JSON.stringify(this.tournaments));
      localStorage.setItem('helian_payments', JSON.stringify(this.payments));
      localStorage.setItem('helian_registrations', JSON.stringify(this.registrations));
      localStorage.setItem('helian_banners', JSON.stringify(this.banners));
      localStorage.setItem('helian_banner_settings', JSON.stringify(this.bannerSettings));
      localStorage.setItem('helian_support_tickets', JSON.stringify(this.supportTickets));
      localStorage.setItem('helian_support_messages', JSON.stringify(this.supportMessages));
      if (this.currentUser) {
        localStorage.setItem('helian_current_user', JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem('helian_current_user');
      }
      localStorage.setItem('helian_ad_settings', JSON.stringify(this.adSettings));
    }
  }

  // Registrations (Tournament Squad Participants)
  getRegistrations(): any[] {
    return this.registrations;
  }

  getRegistrationsByTournament(tournamentId: string): any[] {
    return this.registrations.filter((r) => r.tournamentId === tournamentId);
  }

  getRegistrationsByUser(userId: string): any[] {
    return this.registrations.filter((r) => r.userId === userId);
  }

  createRegistration(registration: any): any {
    const newReg = {
      ...registration,
      id: registration.id || `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: registration.status || 'VERIFIED',
      joinedAt: registration.joinedAt || new Date().toISOString(),
    };
    this.registrations.unshift(newReg);
    
    // Also increment tournament count
    if (registration.tournamentId) {
      const t = this.getTournamentById(registration.tournamentId);
      if (t) {
        this.updateTournament(t.id, { registeredCount: (t.registeredCount || 0) + 1 });
      }
    }

    this.save();
    return newReg;
  }

  // User Auth & Management
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  setCurrentUser(user: User | null) {
    if (user && this.currentUser && user.id === this.currentUser.id) {
      this.currentUser = {
        ...this.currentUser,
        ...user,
        lastStreakClaimDate: user.lastStreakClaimDate ?? this.currentUser.lastStreakClaimDate,
        currentStreak: user.currentStreak ?? this.currentUser.currentStreak,
      };
    } else {
      this.currentUser = user;
    }

    if (this.currentUser) {
      const idx = this.users.findIndex(u => u.id === this.currentUser!.id);
      if (idx >= 0) {
        this.users[idx] = { ...this.users[idx], ...this.currentUser };
      } else {
        this.users.push(this.currentUser);
      }
    }
    this.save();
  }

  logout() {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('helian_current_user');
    }
  }

  loginWithEmailAndPassword(email: string, password: string): User | null {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    return this.users.find((user) => {
      const storedPassword = String(user.password ?? '').trim();
      return user.email.trim().toLowerCase() === trimmedEmail && storedPassword === trimmedPassword;
    }) ?? null;
  }

  getUsers(): User[] {
    return this.users;
  }

  getUserById(id: string): User | null {
    if (this.currentUser && this.currentUser.id === id) {
      return this.currentUser;
    }
    return this.users.find((u) => u.id === id) || null;
  }

  createVendor(details: { name: string; email: string; password: string; inGameName?: string }): User | null {
    const name = details.name?.trim();
    const email = details.email?.trim();
    const password = details.password?.trim();

    if (!name || !email || !password) return null;

    const emailExists = this.users.some((user) => user.email.toLowerCase() === email.toLowerCase());
    if (emailExists) return null;

    const newVendor: User = {
      id: `vendor_${Date.now()}`,
      name,
      email,
      password,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      role: 'VENDOR',
      freeFireUid: `VENDOR_${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      inGameName: (details.inGameName || name).toUpperCase().replace(/\s+/g, '_'),
      walletBalance: 0,
      coinBalance: 0,
      totalKills: 0,
      totalWins: 0,
      earnings: 0,
      isBanned: false,
      referralCode: `VENDOR${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };

    this.users.unshift(newVendor);
    this.save();
    return newVendor;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], ...updates };
      if (this.currentUser && this.currentUser.id === id) {
        this.currentUser = this.users[idx];
      }
      this.save();
      return this.users[idx];
    } else if (this.currentUser && this.currentUser.id === id) {
      this.currentUser = { ...this.currentUser, ...updates };
      this.users.push(this.currentUser);
      this.save();
      return this.currentUser;
    }
    return null;
  }

  toggleBanUser(id: string): User | null {
    const user = this.users.find(u => u.id === id);
    if (!user) return null;
    return this.updateUser(id, { isBanned: !user.isBanned });
  }

  claimReferralMilestone(userId: string, milestoneId: number, rewardType: 'COIN' | 'WALLET', rewardAmount: number): User | null {
    const user = this.users.find(u => u.id === userId);
    if (!user) return null;
    
    const claimed = user.claimedMilestones || [];
    if (claimed.includes(milestoneId)) return null; // Already claimed

    const updates: Partial<User> = {
      claimedMilestones: [...claimed, milestoneId],
    };

    if (rewardType === 'COIN') {
      updates.coinBalance = (user.coinBalance || 0) + rewardAmount;
    } else if (rewardType === 'WALLET') {
      updates.walletBalance = (user.walletBalance || 0) + rewardAmount;
      updates.earnings = (user.earnings || 0) + rewardAmount;
    }

    return this.updateUser(userId, updates);
  }

  incrementReferral(referralCode: string) {
    const referrer = this.users.find(u => u.referralCode === referralCode);
    if (referrer) {
      this.updateUser(referrer.id, {
        totalReferrals: (referrer.totalReferrals || 0) + 1
      });
    }
  }

  // Tournaments
  getTournaments(): Tournament[] {
    return this.tournaments;
  }

  getTournamentById(id: string): Tournament | undefined {
    return this.tournaments.find(t => t.id === id);
  }

  createTournament(data: Omit<Tournament, 'id' | 'registeredCount'>): Tournament {
    const newTournament: Tournament = {
      ...data,
      id: `tour_${Date.now()}`,
      registeredCount: 0,
    };
    this.tournaments.unshift(newTournament);
    this.save();
    return newTournament;
  }

  updateTournament(id: string, updates: Partial<Tournament>): Tournament | null {
    const idx = this.tournaments.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.tournaments[idx] = { ...this.tournaments[idx], ...updates };
    this.save();
    return this.tournaments[idx];
  }

  getCommunityAccessState(tournamentId: string, userId: string) {
    const tournament = this.getTournamentById(tournamentId);
    const user = this.users.find((entry) => entry.id === userId);

    if (!tournament?.community?.enabled || tournament.community.isDisabled) {
      return { canAccess: false, reason: 'community-disabled' };
    }

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MODERATOR') {
      return { canAccess: true, reason: 'admin' };
    }

    const payment = this.payments.find((entry) => entry.tournamentId === tournamentId && entry.userId === userId);
    if (!payment) {
      return { canAccess: false, reason: 'no-slot' };
    }

    if (payment.communityAccessRevoked) {
      return { canAccess: false, reason: 'revoked' };
    }

    if (tournament.community.unlockMode === 'SLOT_PURCHASE_ONLY') {
      return { canAccess: true, reason: 'slot-purchase' };
    }

    if (tournament.community.unlockMode === 'PAYMENT_VERIFICATION_ONLY') {
      return payment.status === 'VERIFIED' ? { canAccess: true, reason: 'payment-verified' } : { canAccess: false, reason: 'payment-pending' };
    }

    if (tournament.community.unlockMode === 'ADMIN_APPROVAL_ONLY') {
      return payment.communityAccessUnlocked && payment.status === 'VERIFIED'
        ? { canAccess: true, reason: 'admin-approved' }
        : { canAccess: false, reason: 'approval-pending' };
    }

    return { canAccess: false, reason: 'unknown' };
  }

  grantCommunityAccess(tournamentId: string, userId: string) {
    const payment = this.payments.find((entry) => entry.tournamentId === tournamentId && entry.userId === userId);
    if (!payment) return null;
    payment.communityAccessUnlocked = true;
    payment.communityAccessRevoked = false;
    this.save();
    return payment;
  }

  revokeCommunityAccess(tournamentId: string, userId: string) {
    const payment = this.payments.find((entry) => entry.tournamentId === tournamentId && entry.userId === userId);
    if (!payment) return null;
    payment.communityAccessUnlocked = false;
    payment.communityAccessRevoked = true;
    this.save();
    return payment;
  }

  getCommunityUnlockCount(tournamentId: string) {
    return this.payments.filter((entry) => entry.tournamentId === tournamentId && entry.communityAccessUnlocked && !entry.communityAccessRevoked).length;
  }

  getTournamentCommunityUsers(tournamentId: string) {
    return this.payments.filter((entry) => entry.tournamentId === tournamentId && entry.communityAccessUnlocked && !entry.communityAccessRevoked);
  }

  updatePayment(id: string, updates: Partial<Payment>): Payment | null {
    const idx = this.payments.findIndex((payment) => payment.id === id);
    if (idx === -1) return null;
    this.payments[idx] = { ...this.payments[idx], ...updates };
    this.save();
    return this.payments[idx];
  }

  deleteTournament(id: string): boolean {
    const previousLength = this.tournaments.length;
    this.tournaments = this.tournaments.filter(t => t.id !== id);
    if (this.tournaments.length === previousLength) return false;
    this.save();
    return true;
  }

  // Payments & Registration
  getPayments(): Payment[] {
    return this.payments;
  }

  submitPayment(payment: Omit<Payment, 'id' | 'status' | 'createdAt'> & { status?: PaymentStatus }): Payment {
    const newPayment: Payment = {
      ...payment,
      id: `pay_${Date.now()}`,
      status: payment.status || 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.payments.unshift(newPayment);
    this.save();
    return newPayment;
  }

  verifyPayment(paymentId: string, status: 'VERIFIED' | 'REJECTED'): Payment | null {
    const payIdx = this.payments.findIndex(p => p.id === paymentId);
    if (payIdx === -1) return null;

    this.payments[payIdx].status = status;
    const payment = this.payments[payIdx];

    if (status === 'VERIFIED' && payment.tournamentId) {
      const tour = this.getTournamentById(payment.tournamentId);
      if (tour) {
        this.updateTournament(tour.id, { registeredCount: tour.registeredCount + 1 });
      }
    }
    this.save();
    return payment;
  }

  // Teams
  getTeams(): Team[] {
    return this.teams;
  }

  createTeam(name: string, tag: string, logo?: string): Team {
    const newTeam: Team = {
      id: `team_${Date.now()}`,
      name,
      tag: tag.toUpperCase(),
      logo: logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      captainId: this.currentUser?.id || 'usr_guest',
      captainName: this.currentUser?.inGameName || this.currentUser?.name || 'Captain',
      membersCount: 1,
      wins: 0,
      inviteCode: `${tag.toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
    };
    this.teams.unshift(newTeam);
    this.save();
    return newTeam;
  }

  // Announcements
  getAnnouncements(): Announcement[] {
    return this.announcements;
  }

  createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
    const newAnnouncement: Announcement = {
      ...announcement,
      id: `ann_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.announcements.unshift(newAnnouncement);
    // Not persisting to localStorage right now since it wasn't added to save() initially, but let's add it there too.
    this.saveAnnouncements();
    return newAnnouncement;
  }

  deleteAnnouncement(id: string): boolean {
    const prevLen = this.announcements.length;
    this.announcements = this.announcements.filter(a => a.id !== id);
    if (this.announcements.length < prevLen) {
      this.saveAnnouncements();
      return true;
    }
    return false;
  }

  private saveAnnouncements() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('helian_announcements', JSON.stringify(this.announcements));
    }
  }

  // Match Results
  getMatchResults(tournamentId: string): MatchResult[] {
    return this.matchResults.filter(r => r.tournamentId === tournamentId);
  }

  addMatchResult(result: Omit<MatchResult, 'id'>): MatchResult {
    const newRes: MatchResult = {
      ...result,
      id: `res_${Date.now()}_${Math.random()}`,
    };
    this.matchResults.push(newRes);
    return newRes;
  }

  // Ad Settings
  getAdSettings() {
    return this.adSettings;
  }
  
  setAdSettings(settings: { isActive: boolean, ads: { id: string, videoId: string, rewardAmount: number, isActive: boolean }[] }) {
    this.adSettings = settings;
    this.save();
  }

  private vendors: import('./types').VendorAccount[] = [];

  getVendors(): import('./types').VendorAccount[] {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('helian_vendors');
      if (saved) {
        try {
          this.vendors = JSON.parse(saved);
        } catch {}
      }
    }
    return this.vendors;
  }

  getVendorById(id: string): import('./types').VendorAccount | undefined {
    return this.getVendors().find((v) => v.id === id || v.vendorId.toLowerCase() === id.toLowerCase());
  }

  createVendorAccount(data: Omit<import('./types').VendorAccount, 'id' | 'createdAt' | 'updatedAt'>): import('./types').VendorAccount {
    const newVendor: import('./types').VendorAccount = {
      ...data,
      id: `vendor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.vendors.unshift(newVendor);
    if (typeof window !== 'undefined') {
      localStorage.setItem('helian_vendors', JSON.stringify(this.vendors));
    }
    return newVendor;
  }

  updateVendorAccount(id: string, updates: Partial<import('./types').VendorAccount>): import('./types').VendorAccount | null {
    const list = this.getVendors();
    const idx = list.findIndex((v) => v.id === id || v.vendorId === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.vendors = list;
    if (typeof window !== 'undefined') {
      localStorage.setItem('helian_vendors', JSON.stringify(this.vendors));
    }
    return list[idx];
  }

  deleteVendorAccount(id: string): boolean {
    const list = this.getVendors();
    const filtered = list.filter((v) => v.id !== id && v.vendorId !== id);
    if (filtered.length === list.length) return false;
    this.vendors = filtered;
    if (typeof window !== 'undefined') {
      localStorage.setItem('helian_vendors', JSON.stringify(this.vendors));
    }
    return true;
  }

  // Banner & Slider Management
  getBanners(): Banner[] {
    return [...this.banners].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getBannerById(id: string): Banner | null {
    return this.banners.find((b) => b.id === id) || null;
  }

  createBanner(banner: Omit<Banner, 'id' | 'createdAt'>): Banner {
    const newBanner: Banner = {
      ...banner,
      id: `banner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.banners.push(newBanner);
    this.save();
    return newBanner;
  }

  updateBanner(id: string, updates: Partial<Banner>): Banner | null {
    const idx = this.banners.findIndex((b) => b.id === id);
    if (idx === -1) return null;

    this.banners[idx] = {
      ...this.banners[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.banners[idx];
  }

  deleteBanner(id: string): boolean {
    const beforeCount = this.banners.length;
    this.banners = this.banners.filter((b) => b.id !== id);
    if (this.banners.length === beforeCount) return false;
    this.save();
    return true;
  }

  getBannerSettings(): { autoSlideInterval: number; isEnabled: boolean } {
    return this.bannerSettings;
  }

  updateBannerSettings(settings: Partial<{ autoSlideInterval: number; isEnabled: boolean }>) {
    this.bannerSettings = {
      ...this.bannerSettings,
      ...settings,
    };
    this.save();
    return this.bannerSettings;
  }

  // Support Tickets & Live Admin Messaging
  getSupportTickets(): SupportTicket[] {
    return [...this.supportTickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getSupportTicketById(id: string): SupportTicket | null {
    return this.supportTickets.find((t) => t.id === id) || null;
  }

  getSupportTicketByUserId(userId: string): SupportTicket | null {
    return this.supportTickets.find((t) => t.userId === userId) || null;
  }

  createOrGetSupportTicket(userId: string, userName: string, userEmail?: string, userPhone?: string): SupportTicket {
    let ticket = this.getSupportTicketByUserId(userId);
    if (!ticket) {
      ticket = {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        userName: userName || 'Player',
        userEmail: userEmail || '',
        userPhone: userPhone || '',
        lastMessage: 'Ticket Opened',
        status: 'OPEN',
        unreadCountAdmin: 1,
        unreadCountUser: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.supportTickets.unshift(ticket);
      this.save();
    }
    return ticket;
  }

  getSupportMessages(ticketId: string): SupportMessage[] {
    return this.supportMessages
      .filter((m) => m.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  addSupportMessage(msg: Omit<SupportMessage, 'id' | 'createdAt'>): SupportMessage {
    const newMsg: SupportMessage = {
      ...msg,
      id: `smsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.supportMessages.push(newMsg);

    const ticketIdx = this.supportTickets.findIndex((t) => t.id === msg.ticketId);
    if (ticketIdx !== -1) {
      this.supportTickets[ticketIdx].lastMessage = msg.content;
      this.supportTickets[ticketIdx].updatedAt = new Date().toISOString();
      if (msg.senderRole === 'USER') {
        this.supportTickets[ticketIdx].unreadCountAdmin += 1;
      } else if (msg.senderRole === 'ADMIN') {
        this.supportTickets[ticketIdx].unreadCountUser += 1;
        this.supportTickets[ticketIdx].unreadCountAdmin = 0;
      }
    }
    this.save();
    return newMsg;
  }

  getAllSupportMessages(): SupportMessage[] {
    return [...this.supportMessages];
  }

  purgeSupportMessages(olderThanIsoDate: string): number {
    const cutoffTime = new Date(olderThanIsoDate).getTime();
    const initialCount = this.supportMessages.length;
    this.supportMessages = this.supportMessages.filter(m => new Date(m.createdAt).getTime() >= cutoffTime);
    const deletedCount = initialCount - this.supportMessages.length;
    if (deletedCount > 0) {
      this.save();
    }
    return deletedCount;
  }

  purgeAllSupportMessages(): number {
    const count = this.supportMessages.length;
    this.supportMessages = [];
    this.save();
    return count;
  }

  resolveSupportTicket(id: string): boolean {
    const ticket = this.getSupportTicketById(id);
    if (!ticket) return false;
    ticket.status = 'RESOLVED';
    ticket.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }
}

export const db = new LocalDatabase();

