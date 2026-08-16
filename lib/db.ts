import { User, Tournament, Team, Payment, Announcement, MatchResult, PaymentStatus } from './types';
import { initialUsers, initialTournaments, initialTeams, initialPayments, initialAnnouncements } from './mock-data';

class LocalDatabase {
  private users: User[] = [...initialUsers];
  private tournaments: Tournament[] = [...initialTournaments];
  private teams: Team[] = [...initialTeams];
  private payments: Payment[] = [...initialPayments];
  private announcements: Announcement[] = [...initialAnnouncements];
  private matchResults: MatchResult[] = [];
  private currentUser: User = initialUsers[0]; // Admin by default for full preview
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

      const savedUser = localStorage.getItem('helian_current_user');
      if (savedUser) this.currentUser = JSON.parse(savedUser);
      
      const savedAnn = localStorage.getItem('helian_announcements');
      if (savedAnn) this.announcements = JSON.parse(savedAnn);
      
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
      localStorage.setItem('helian_current_user', JSON.stringify(this.currentUser));
      localStorage.setItem('helian_ad_settings', JSON.stringify(this.adSettings));
    }
  }

  // User Auth & Management
  getCurrentUser(): User {
    return this.currentUser;
  }

  setCurrentUser(user: User) {
    this.currentUser = user;
    this.save();
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
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates };
    if (this.currentUser.id === id) {
      this.currentUser = this.users[idx];
    }
    this.save();
    return this.users[idx];
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
      captainId: this.currentUser.id,
      captainName: this.currentUser.inGameName || this.currentUser.name,
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
}

export const db = new LocalDatabase();
