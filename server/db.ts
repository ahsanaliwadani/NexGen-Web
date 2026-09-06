import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  VolunteerApplication,
  Volunteer,
  Program,
  EventItem,
  NewsItem,
  TeamMember,
  GalleryItem,
  ContactMessage,
  WebsiteSettings,
  ActivityLog,
  DashboardStats
} from '../src/types.ts';
import { syncSchemaToMongo, loadOrSeedMongo, mongoUpsert, mongoDelete } from './mongo.ts';

export interface DatabaseSchema {
  users: (User & { passwordHash: string; salt: string })[];
  applications: VolunteerApplication[];
  volunteers: Volunteer[];
  programs: Program[];
  events: EventItem[];
  news: NewsItem[];
  team: TeamMember[];
  gallery: GalleryItem[];
  contacts: ContactMessage[];
  settings: WebsiteSettings;
  activityLogs: ActivityLog[];
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return computed === hash;
}

const defaultSettings: WebsiteSettings = {
  organizationName: 'NexGen Women Empowerment & Youth Leadership Council',
  tagline: 'Cultivating the next generation of visionary female leaders and civic changemakers.',
  heroHeading: 'Empowering Women. Inspiring Youth. Transforming Communities.',
  heroSubheading: 'NexGen Council is an international civil society organization dedicated to accelerating female leadership, youth civic engagement, and socio-economic advancement through rigorous mentorship and grassroots innovation.',
  missionStatement: 'To dismantle socio-economic barriers by providing young women and emerging youth leaders with world-class leadership training, mentorship networks, and platforms to enact systemic change in their communities.',
  visionStatement: 'A globally equitable society where every young woman has the agency, resources, and leadership opportunities to shape policy, enterprise, and social progress.',
  coreValues: [
    { title: 'Inclusivity & Dignity', description: 'Upholding equity, safe learning spaces, and respect for diverse backgrounds across all regional chapters.' },
    { title: 'Ethical Leadership', description: 'Fostering integrity, accountability, and compassionate governance in modern public and corporate life.' },
    { title: 'Civic Innovation', description: 'Empowering grassroots changemakers with modern technology and collaborative problem-solving frameworks.' },
    { title: 'Sustainable Impact', description: 'Building enduring institutional capacity and long-term socio-economic self-reliance.' }
  ],
  historyStatement: 'Founded in 2021 by a coalition of educators, civic leaders, and youth advocates, NexGen Council began as an intensive 30-Day Leadership Series. Today, the organization has mobilized thousands of young women, supported grassroots micro-initiatives, and forged partnerships with international universities and development bodies.',
  stats: {
    volunteersCount: '1,450+',
    beneficiariesCount: '8,200+',
    programsCount: '28',
    communitiesCount: '46'
  },
  contactEmail: 'contact@nexgencouncil.org',
  contactPhone: '+1 (800) 482-9380',
  officeAddress: 'Executive Secretariat, 100 Leadership Plaza, Suite 400, Global District',
  socialLinks: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
    twitter: 'https://twitter.com',
    youtube: 'https://youtube.com'
  },
  announcementBanner: {
    enabled: true,
    text: 'Applications are currently open for the 2026 Leadership Development Cohort & Volunteer Network!',
    linkUrl: '#volunteer',
    linkText: 'Apply Now'
  }
};

function getSeedData(): DatabaseSchema {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nexgencouncil.org';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const superAdmin = hashPassword(adminPassword);
  const volunteerMgr = hashPassword('volunteer123');
  const contentMgr = hashPassword('editor123');

  return {
    users: [
      {
        id: 'usr_super_1',
        username: adminUsername,
        name: 'Executive Director (Super Admin)',
        email: adminEmail,
        role: 'SUPER_ADMIN',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-01-10T10:00:00.000Z',
        passwordHash: superAdmin.hash,
        salt: superAdmin.salt
      },
      {
        id: 'usr_vol_2',
        username: 'fatima.volunteer',
        name: 'Fatima Zahra',
        email: 'fatima.z@nexgencouncil.org',
        role: 'VOLUNTEER_MANAGER',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-02-14T09:30:00.000Z',
        passwordHash: volunteerMgr.hash,
        salt: volunteerMgr.salt
      },
      {
        id: 'usr_content_3',
        username: 'sarah.content',
        name: 'Sarah Jenkins',
        email: 'sarah.j@nexgencouncil.org',
        role: 'CONTENT_MANAGER',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-03-01T11:00:00.000Z',
        passwordHash: contentMgr.hash,
        salt: contentMgr.salt
      }
    ],
    applications: [],
    volunteers: [],
    programs: [
      {
        id: 'prg_1',
        title: '30-Day Leadership Development Series',
        slug: '30-day-leadership-development-series',
        category: 'Leadership & Civic Action',
        shortDescription: 'Our flagship accelerated cohort program designed to transform young women into self-aware, articulate, and action-oriented civic leaders.',
        fullDescription: 'The 30-Day Leadership Development Series is the foundational initiative of NexGen Council. Through 30 immersive days of daily modules, guest executive masterclasses, peer group circles, and civic capstone projects, participants discover their leadership voice, develop strategic negotiation techniques, and build lifelong professional solidarity networks.',
        coverImage: 'https://images.unsplash.com/photo-1573497491768-dccce02ce85f?w=900&auto=format&fit=crop&q=80',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        featured: true,
        status: 'Published',
        targetAudience: 'Young women aged 18-28 passionate about public service, social innovation, and leadership.',
        curriculumHighlights: [
          'Module 1: Emotional Intelligence & Authentic Self-Leadership',
          'Module 2: Strategic Communication & Public Narrative',
          'Module 3: Project Design, Budgeting & Community Needs Assessment',
          'Module 4: Coalition Building, Advocacy & Institutional Governance',
          'Module 5: Capstone Showcase & Certificate of Distinction'
        ],
        createdAt: '2026-01-05T08:00:00.000Z'
      },
      {
        id: 'prg_2',
        title: 'Women in Tech & Emerging AI Fellowship',
        slug: 'women-in-tech-emerging-ai-fellowship',
        category: 'Technology & STEM',
        shortDescription: 'Pairing aspiring women technologists with senior industry engineers to build open-source civic technology and AI-driven social interventions.',
        fullDescription: 'Bridging the gender gap in cutting-edge computing. The Women in Tech & Emerging AI Fellowship offers comprehensive hands-on training in modern software engineering, data analysis, and generative AI systems, matched with 1-on-1 industry mentorship from global tech leaders.',
        coverImage: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&auto=format&fit=crop&q=80',
        startDate: '2026-05-15',
        endDate: '2026-08-15',
        featured: true,
        status: 'Published',
        targetAudience: 'Female university students, recent graduates, and career-switchers in STEM disciplines.',
        curriculumHighlights: [
          'Modern Full-Stack Architectures & Cloud Deployments',
          'Responsible AI & Machine Learning Workflows',
          'Technical Interview Preparation & Portfolio Building',
          'Executive Mentorship Circles with Senior Female CTOs'
        ],
        createdAt: '2026-01-12T09:30:00.000Z'
      },
      {
        id: 'prg_3',
        title: 'Grassroots Economic Independence & Entrepreneurship',
        slug: 'grassroots-economic-independence',
        category: 'Economic Empowerment',
        shortDescription: 'Micro-grant funding, financial literacy, and digital commerce workshops for women micro-entrepreneurs in peri-urban communities.',
        fullDescription: 'Targeting economic vulnerability at its roots. This program empowers women artisans, home bakers, and service creators with mobile banking skills, bookkeeping fundamentals, product branding, and direct seed grants to scale sustainable micro-enterprises.',
        coverImage: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=900&auto=format&fit=crop&q=80',
        startDate: '2026-06-01',
        endDate: '2026-09-30',
        featured: true,
        status: 'Published',
        targetAudience: 'Women entrepreneurs seeking to formalize and digitize their micro-enterprises.',
        curriculumHighlights: [
          'Digital Banking, E-Wallets & Micro-Credit Literacy',
          'Social Commerce & Customer Relationship Building',
          'Inventory Management & Sustainable Cashflow',
          'Seed Capital Competition with Seed Micro-Grants'
        ],
        createdAt: '2026-01-20T10:15:00.000Z'
      },
      {
        id: 'prg_4',
        title: 'Youth Civic Policy & Parliamentary Fellowship',
        slug: 'youth-civic-policy-fellowship',
        category: 'Civic Engagement',
        shortDescription: 'Equipping youth representatives with legislative drafting skills, debate etiquette, and direct interaction with policymakers.',
        fullDescription: 'An immersive fellowship providing deep exposure into public policy formulating, stakeholder consensus building, and sustainable municipal governance. Fellows shadow civil servants and draft whitepapers presented to provincial authorities.',
        coverImage: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=900&auto=format&fit=crop&q=80',
        startDate: '2026-07-01',
        endDate: '2026-10-31',
        featured: false,
        status: 'Published',
        targetAudience: 'Youth advocates, law students, and emerging public administration scholars.',
        curriculumHighlights: [
          'Comparative Constitutional Law & Human Rights Norms',
          'Evidence-Based Policy Analysis & Qualitative Field Research',
          'Simulated Youth Parliamentary Debates & Bill Drafting',
          'Delegation Visits to Government Ministries'
        ],
        createdAt: '2026-02-01T14:00:00.000Z'
      }
    ],
    events: [
      {
        id: 'evt_1',
        title: 'Annual Women Leadership & Social Innovation Summit 2026',
        category: 'Conference',
        description: 'Our premier annual flagship gathering bringing together over 500 delegates, diplomats, grassroots activists, and industry trailblazers for visionary keynotes, breakout strategy workshops, and the NexGen Young Changemaker Awards.',
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&auto=format&fit=crop&q=80',
        date: '2026-05-18',
        time: '09:00 AM - 05:00 PM',
        location: 'Grand Convention Hall, Diplomatic Enclave & Live Streamed Globally',
        isVirtual: false,
        registrationUrl: '#volunteer',
        status: 'Upcoming',
        capacity: 500,
        registeredCount: 385
      },
      {
        id: 'evt_2',
        title: 'Interactive Masterclass: Breaking the Glass Ceiling in Public Governance',
        category: 'Masterclass',
        description: 'An executive seminar led by former parliamentarians and legal experts exploring institutional strategies to overcome systemic barriers and foster inclusive policy formulation.',
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&auto=format&fit=crop&q=80',
        date: '2026-04-12',
        time: '03:00 PM - 05:30 PM',
        location: 'NexGen Innovation Hub & Zoom Live',
        isVirtual: true,
        registrationUrl: '#volunteer',
        status: 'Upcoming',
        capacity: 250,
        registeredCount: 198
      },
      {
        id: 'evt_3',
        title: 'Grassroots Community Health & Wellness Clinic',
        category: 'Community Outreach',
        description: 'Mobile community medical camp offering free preventive health screenings, mental health counselling, and maternal health kits for over 400 families.',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&auto=format&fit=crop&q=80',
        date: '2026-03-22',
        time: '10:00 AM - 04:00 PM',
        location: 'Community Center, Sector 8-A',
        isVirtual: false,
        registrationUrl: '#volunteer',
        status: 'Upcoming',
        capacity: 400,
        registeredCount: 310
      },
      {
        id: 'evt_4',
        title: 'Graduation Ceremony: 30-Day Leadership Cohort IV',
        category: 'Graduation',
        description: 'Celebrating 120 remarkable graduates who completed our intensive leadership and community development curriculum with honors.',
        image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&auto=format&fit=crop&q=80',
        date: '2025-12-10',
        time: '04:00 PM - 07:00 PM',
        location: 'National Library Auditorium',
        isVirtual: false,
        status: 'Past',
        capacity: 300,
        registeredCount: 300
      }
    ],
    news: [
      {
        id: 'news_1',
        title: 'NexGen Council Expands 30-Day Leadership Cohorts to Five New Districts',
        slug: 'nexgen-expands-leadership-cohorts-new-districts',
        category: 'Expansion',
        author: 'Council Media Office',
        authorRole: 'Communications Directorate',
        coverImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&auto=format&fit=crop&q=80',
        summary: 'In response to record participation, NexGen Council announces formal expansion across 5 additional regional zones with dedicated community hubs.',
        content: 'NexGen Women Empowerment & Youth Leadership Council is proud to announce the regional rollout of our signature civic leadership curriculum across five new metropolitan and peri-urban districts. Supported by our growing cadre of trained volunteer mentors and educational partners, this expansion will open up access for more than 2,000 new female participants over the next twelve months.',
        publishedAt: '2026-03-01T12:00:00.000Z',
        status: 'Published',
        featured: true
      },
      {
        id: 'news_2',
        title: 'Global Youth Solidarity Accord Signed with International Partners',
        slug: 'global-youth-solidarity-accord-signed',
        category: 'Partnership',
        author: 'Sarah Jenkins',
        authorRole: 'Senior Program Coordinator',
        coverImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&auto=format&fit=crop&q=80',
        summary: 'A new bilateral cooperation framework unlocks global exchange fellowships and research grants for NexGen youth leaders.',
        content: 'During the international NGO Forum on Youth and Gender Equality, NexGen Council formalized a long-term cooperation charter with youth leadership foundations across North America, Europe, and South Asia. The framework provides funding for cross-border research sabbaticals, virtual debate exchanges, and institutional mentorship.',
        publishedAt: '2026-02-18T10:00:00.000Z',
        status: 'Published',
        featured: false
      },
      {
        id: 'news_3',
        title: 'Spotlight on Grassroots Impact: Meet the 2025 NexGen Community Fellows',
        slug: 'spotlight-on-grassroots-impact-2025-fellows',
        category: 'Stories',
        author: 'Fatima Zahra',
        authorRole: 'Head of Volunteer Engagement',
        coverImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=900&auto=format&fit=crop&q=80',
        summary: 'Discover how four alumni transformed their communities through micro-water purification, digital libraries, and youth advocacy circles.',
        content: 'From creating mobile coding caravans in rural villages to launching community grievance redressal channels for female workers, our 2025 fellows demonstrate the immense transformative power of intentional, values-driven youth leadership.',
        publishedAt: '2026-01-29T14:30:00.000Z',
        status: 'Published',
        featured: false
      }
    ],
    team: [
      {
        id: 'tm_1',
        name: 'Dr. Nisha Aslam',
        position: 'Founder & Executive President',
        department: 'Executive Directorate',
        bio: 'Visionary educator, international development practitioner, and human rights advocate with over 15 years championing equitable gender policies and youth civic leadership across the region.',
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
        displayOrder: 1,
        active: true,
        linkedinUrl: 'https://linkedin.com',
        twitterUrl: 'https://twitter.com',
        email: 'president@nexgencouncil.org'
      },
      {
        id: 'tm_2',
        name: 'Fatima Zahra',
        position: 'Director of Volunteer Operations & Youth Networks',
        department: 'Operations',
        bio: 'Community organizer and certified youth leadership trainer who has structured volunteer networks across 30+ regional chapters with an emphasis on safe, inclusive civic spaces.',
        image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80',
        displayOrder: 2,
        active: true,
        linkedinUrl: 'https://linkedin.com',
        email: 'fatima.z@nexgencouncil.org'
      },
      {
        id: 'tm_3',
        name: 'Sarah Jenkins',
        position: 'Head of Strategic Programs & Curriculum',
        department: 'Academics & Strategy',
        bio: 'Curriculum specialist and former university lecturer focusing on experiential pedagogy, public speaking, and institutional governance.',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
        displayOrder: 3,
        active: true,
        linkedinUrl: 'https://linkedin.com',
        email: 'sarah.j@nexgencouncil.org'
      },
      {
        id: 'tm_4',
        name: 'Ayla Malik',
        position: 'Director of Partnerships & Resource Mobilization',
        department: 'Partnerships',
        bio: 'Philanthropy strategist and institutional liaison specialized in multilateral donor cooperation, corporate sustainability, and social impact bonds.',
        image: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&auto=format&fit=crop&q=80',
        displayOrder: 4,
        active: true,
        linkedinUrl: 'https://linkedin.com',
        email: 'partnerships@nexgencouncil.org'
      }
    ],
    gallery: [
      {
        id: 'gal_1',
        title: '30-Day Leadership Cohort Masterclass on Public Speaking',
        category: 'Workshops',
        imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&auto=format&fit=crop&q=80',
        date: '2026-02-15',
        displayOrder: 1
      },
      {
        id: 'gal_2',
        title: 'Women in Tech Civic Coding Hackathon',
        category: 'Technology',
        imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&auto=format&fit=crop&q=80',
        date: '2026-01-20',
        displayOrder: 2
      },
      {
        id: 'gal_3',
        title: 'Annual Youth Leadership Summit Keynote Session',
        category: 'Summit',
        imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=900&auto=format&fit=crop&q=80',
        date: '2025-11-18',
        displayOrder: 3
      },
      {
        id: 'gal_4',
        title: 'Community Health Camp Volunteer Mobilization',
        category: 'Outreach',
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&auto=format&fit=crop&q=80',
        date: '2025-10-05',
        displayOrder: 4
      },
      {
        id: 'gal_5',
        title: 'Fellows Group Discussion & Policy Drafting',
        category: 'Workshops',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&auto=format&fit=crop&q=80',
        date: '2025-09-12',
        displayOrder: 5
      },
      {
        id: 'gal_6',
        title: 'Graduation Day Honors & Certificate Presentation',
        category: 'Ceremony',
        imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&auto=format&fit=crop&q=80',
        date: '2025-08-30',
        displayOrder: 6
      }
    ],
    contacts: [],
    settings: defaultSettings,
    activityLogs: []
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    // Initialize in-memory state with seed data
    this.data = getSeedData();
    this.syncSuperAdminFromEnv();
  }

  public async initFromMongo(): Promise<void> {
    try {
      this.data = await loadOrSeedMongo(this.data);
      this.syncSuperAdminFromEnv();
      console.log('[Database] Synchronized state with real-time MongoDB.');
    } catch (err: any) {
      console.warn('[Database] Sync with MongoDB error:', err.message);
    }
  }

  public syncSuperAdminFromEnv() {
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nexgencouncil.org').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Find any existing super admin or user with username "admin" or id usr_super_1
    let superAdmin = this.data.users.find(
      u => u.role === 'SUPER_ADMIN' || u.role === 'Super Admin' || u.id === 'usr_super_1' || u.username.toLowerCase() === adminUsername.toLowerCase()
    );

    const { hash, salt } = hashPassword(adminPassword);

    if (superAdmin) {
      superAdmin.username = adminUsername;
      superAdmin.email = adminEmail;
      superAdmin.role = 'SUPER_ADMIN';
      superAdmin.passwordHash = hash;
      superAdmin.salt = salt;
    } else {
      superAdmin = {
        id: 'usr_super_1',
        username: adminUsername,
        name: 'Executive Director (Super Admin)',
        email: adminEmail,
        role: 'SUPER_ADMIN',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        passwordHash: hash,
        salt
      };
      this.data.users.unshift(superAdmin);
    }
    this.save();
    console.log(`[Database] Super Admin credentials active from .env: user="${adminUsername}", email="${adminEmail}"`);
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      // Persist directly and asynchronously into MongoDB collections without modifying db.json
      syncSchemaToMongo(data).catch(() => {});
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }

  public async syncAllToMongo() {
    return syncSchemaToMongo(this.data);
  }

  // --- Auth & Users ---
  getUsers() {
    return this.data.users.map(({ passwordHash, salt, ...safeUser }) => safeUser);
  }

  getUserById(id: string) {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  authenticate(usernameOrEmail: string, passwordPlain: string) {
    const user = this.data.users.find(
      u => u.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
           u.email.toLowerCase() === usernameOrEmail.toLowerCase()
    );
    if (!user) return null;
    const isValid = verifyPassword(passwordPlain, user.passwordHash, user.salt);
    if (!isValid) return null;
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  createUser(userData: { username: string; name: string; email: string; role: any; password: string }) {
    const { hash, salt } = hashPassword(userData.password);
    const newUser: DatabaseSchema['users'][0] = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}`,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      salt
    };
    this.data.users.push(newUser);
    this.save();
    const { passwordHash: _, salt: __, ...safeUser } = newUser;
    return safeUser;
  }

  deleteUser(id: string) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.save();
  }

  updateUser(id: string, updates: { username?: string; name?: string; email?: string; role?: any; password?: string }) {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;

    if (updates.name && updates.name.trim()) {
      user.name = updates.name.trim();
    }
    if (updates.email && updates.email.trim()) {
      user.email = updates.email.trim().toLowerCase();
    }
    if (updates.username && updates.username.trim()) {
      user.username = updates.username.trim().toLowerCase();
    }
    if (updates.role) {
      user.role = updates.role;
    }
    if (updates.password && updates.password.trim()) {
      const { hash, salt } = hashPassword(updates.password.trim());
      user.passwordHash = hash;
      user.salt = salt;
    }

    this.save();
    const { passwordHash: _, salt: __, ...safeUser } = user;
    return safeUser;
  }

  // --- Volunteer Applications ---
  getApplications(query: {
    search?: string;
    status?: string;
    city?: string;
    fromDate?: string;
    toDate?: string;
    sort?: 'newest' | 'oldest';
    page?: number;
    perPage?: number;
  } = {}) {
    let list = [...this.data.applications];

    if (query.search) {
      const q = query.search.toLowerCase();
      list = list.filter(a =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.referenceCode.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        (a.preferredRole && a.preferredRole.toLowerCase().includes(q))
      );
    }

    if (query.status) {
      list = list.filter(a => a.status === query.status);
    }

    if (query.city) {
      list = list.filter(a => a.city.toLowerCase().includes(query.city!.toLowerCase()));
    }

    if (query.fromDate) {
      const from = new Date(query.fromDate).getTime();
      list = list.filter(a => new Date(a.createdAt).getTime() >= from);
    }

    if (query.toDate) {
      const to = new Date(query.toDate).getTime() + 86400000;
      list = list.filter(a => new Date(a.createdAt).getTime() <= to);
    }

    list.sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return query.sort === 'oldest' ? tA - tB : tB - tA;
    });

    const total = list.length;
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const perPage = query.perPage && query.perPage > 0 ? Number(query.perPage) : 10;
    const start = (page - 1) * perPage;
    const paginated = list.slice(start, start + perPage);

    return {
      data: paginated,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    };
  }

  getApplicationById(id: string) {
    return this.data.applications.find(a => a.id === id || a.referenceCode === id) || null;
  }

  createApplication(payload: Omit<VolunteerApplication, 'id' | 'referenceCode' | 'status' | 'createdAt' | 'updatedAt'>) {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceCode = `NXG-${year}-${randomSuffix}`;
    const now = new Date().toISOString();

    const application: VolunteerApplication = {
      ...payload,
      id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      referenceCode,
      status: 'Pending',
      createdAt: now,
      updatedAt: now
    };

    this.data.applications.unshift(application);
    this.save();
    return application;
  }

  updateApplication(id: string, updates: Partial<VolunteerApplication>) {
    const idx = this.data.applications.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.data.applications[idx] = {
      ...this.data.applications[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.applications[idx];
  }

  updateApplicationStatus(id: string, status: VolunteerApplication['status'], internalNotes?: string, reviewer?: { name: string; id: string }) {
    const app = this.getApplicationById(id);
    if (!app) return null;

    app.status = status;
    if (internalNotes !== undefined) app.internalNotes = internalNotes;
    if (reviewer) {
      app.reviewerName = reviewer.name;
      app.reviewedAt = new Date().toISOString();
    }
    app.updatedAt = new Date().toISOString();

    // If approved, verify if already converted to volunteer, else add to volunteers table
    if (status === 'Approved') {
      const existingVol = this.data.volunteers.find(v => v.applicationId === app.id || v.email === app.email);
      if (!existingVol) {
        const newVolunteer: Volunteer = {
          id: `vol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          applicationId: app.id,
          fullName: app.fullName,
          email: app.email,
          phone: app.phone,
          city: app.city,
          skills: app.skills || [],
          assignedRole: app.preferredRole || 'General Volunteer',
          assignedProgram: '30-Day Leadership Development Series',
          hoursLogged: 0,
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'Active',
          emergencyContact: app.emergencyContactName ? `${app.emergencyContactName} (${app.emergencyContactPhone || ''})` : undefined
        };
        this.data.volunteers.unshift(newVolunteer);
      }
    }

    this.save();
    return app;
  }

  deleteApplication(id: string) {
    const initialLen = this.data.applications.length;
    this.data.applications = this.data.applications.filter(a => a.id !== id);
    this.save();
    return this.data.applications.length < initialLen;
  }

  // --- Volunteers Directory ---
  getVolunteers(search?: string, status?: string) {
    let list = [...this.data.volunteers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.fullName.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.assignedRole.toLowerCase().includes(q) ||
        v.skills.some(s => s.toLowerCase().includes(q))
      );
    }
    if (status) {
      list = list.filter(v => v.status === status);
    }
    return list;
  }

  updateVolunteer(id: string, updates: Partial<Volunteer>) {
    const idx = this.data.volunteers.findIndex(v => v.id === id);
    if (idx === -1) return null;
    this.data.volunteers[idx] = { ...this.data.volunteers[idx], ...updates };
    this.save();
    return this.data.volunteers[idx];
  }

  deleteVolunteer(id: string) {
    this.data.volunteers = this.data.volunteers.filter(v => v.id !== id);
    this.save();
  }

  // --- Programs ---
  getPrograms(publishedOnly = false) {
    if (publishedOnly) {
      return this.data.programs.filter(p => p.status === 'Published');
    }
    return this.data.programs;
  }

  getProgramBySlugOrId(identifier: string) {
    return this.data.programs.find(p => p.id === identifier || p.slug === identifier) || null;
  }

  createProgram(programData: Omit<Program, 'id' | 'createdAt'>) {
    const newProgram: Program = {
      ...programData,
      id: `prg_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.data.programs.unshift(newProgram);
    this.save();
    return newProgram;
  }

  updateProgram(id: string, updates: Partial<Program>) {
    const idx = this.data.programs.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.programs[idx] = { ...this.data.programs[idx], ...updates };
    this.save();
    return this.data.programs[idx];
  }

  deleteProgram(id: string) {
    this.data.programs = this.data.programs.filter(p => p.id !== id);
    this.save();
  }

  // --- Events ---
  getEvents(filter?: 'Upcoming' | 'Past' | 'All') {
    if (filter === 'Upcoming') {
      return this.data.events.filter(e => e.status === 'Upcoming');
    }
    if (filter === 'Past') {
      return this.data.events.filter(e => e.status === 'Past');
    }
    return this.data.events;
  }

  createEvent(eventData: Omit<EventItem, 'id'>) {
    const newEvent: EventItem = {
      ...eventData,
      id: `evt_${Date.now()}`
    };
    this.data.events.unshift(newEvent);
    this.save();
    return newEvent;
  }

  updateEvent(id: string, updates: Partial<EventItem>) {
    const idx = this.data.events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.data.events[idx] = { ...this.data.events[idx], ...updates };
    this.save();
    return this.data.events[idx];
  }

  deleteEvent(id: string) {
    this.data.events = this.data.events.filter(e => e.id !== id);
    this.save();
  }

  // --- News ---
  getNews(publishedOnly = false) {
    if (publishedOnly) {
      return this.data.news.filter(n => n.status === 'Published');
    }
    return this.data.news;
  }

  createNews(newsData: Omit<NewsItem, 'id'>) {
    const item: NewsItem = {
      ...newsData,
      id: `news_${Date.now()}`
    };
    this.data.news.unshift(item);
    this.save();
    return item;
  }

  updateNews(id: string, updates: Partial<NewsItem>) {
    const idx = this.data.news.findIndex(n => n.id === id);
    if (idx === -1) return null;
    this.data.news[idx] = { ...this.data.news[idx], ...updates };
    this.save();
    return this.data.news[idx];
  }

  deleteNews(id: string) {
    this.data.news = this.data.news.filter(n => n.id !== id);
    this.save();
  }

  // --- Team ---
  getTeam(activeOnly = false) {
    let list = [...this.data.team];
    if (activeOnly) {
      list = list.filter(t => t.active);
    }
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  createTeamMember(member: Omit<TeamMember, 'id'>) {
    const newMember: TeamMember = {
      ...member,
      id: `tm_${Date.now()}`
    };
    this.data.team.push(newMember);
    this.save();
    return newMember;
  }

  updateTeamMember(id: string, updates: Partial<TeamMember>) {
    const idx = this.data.team.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.data.team[idx] = { ...this.data.team[idx], ...updates };
    this.save();
    return this.data.team[idx];
  }

  deleteTeamMember(id: string) {
    this.data.team = this.data.team.filter(t => t.id !== id);
    this.save();
  }

  // --- Gallery ---
  getGallery() {
    return [...this.data.gallery].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  createGalleryItem(item: Omit<GalleryItem, 'id'>) {
    const newItem: GalleryItem = {
      ...item,
      id: `gal_${Date.now()}`
    };
    this.data.gallery.push(newItem);
    this.save();
    return newItem;
  }

  deleteGalleryItem(id: string) {
    this.data.gallery = this.data.gallery.filter(g => g.id !== id);
    this.save();
  }

  // --- Contacts ---
  getContacts() {
    return [...this.data.contacts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  createContact(contact: Omit<ContactMessage, 'id' | 'status' | 'createdAt'>) {
    const newMsg: ContactMessage = {
      ...contact,
      id: `cnt_${Date.now()}`,
      status: 'Unread',
      createdAt: new Date().toISOString()
    };
    this.data.contacts.unshift(newMsg);
    this.save();
    return newMsg;
  }

  updateContactStatus(id: string, status: ContactMessage['status']) {
    const msg = this.data.contacts.find(c => c.id === id);
    if (!msg) return null;
    msg.status = status;
    this.save();
    return msg;
  }

  deleteContact(id: string) {
    this.data.contacts = this.data.contacts.filter(c => c.id !== id);
    this.save();
  }

  // --- Settings ---
  getSettings() {
    return this.data.settings;
  }

  updateSettings(updates: Partial<WebsiteSettings>) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  }

  // --- Activity Logs ---
  logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
    const item: ActivityLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toISOString()
    };
    this.data.activityLogs.unshift(item);
    if (this.data.activityLogs.length > 200) {
      this.data.activityLogs.pop();
    }
    this.save();
    return item;
  }

  getActivityLogs(limit = 50) {
    return this.data.activityLogs.slice(0, limit);
  }

  // --- Analytics & Stats ---
  getDashboardStats(): DashboardStats {
    const apps = this.data.applications;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const pending = apps.filter(a => a.status === 'Pending').length;
    const approved = apps.filter(a => a.status === 'Approved').length;
    const rejected = apps.filter(a => a.status === 'Rejected').length;
    const today = apps.filter(a => a.createdAt.startsWith(todayStr)).length;

    // Monthly breakdown for the last 6 months
    const monthsMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short' });
      monthsMap.set(key, 0);
    }
    apps.forEach(a => {
      const d = new Date(a.createdAt);
      const key = d.toLocaleString('default', { month: 'short' });
      if (monthsMap.has(key)) {
        monthsMap.set(key, (monthsMap.get(key) || 0) + 1);
      }
    });

    const monthlyApplications = Array.from(monthsMap.entries()).map(([month, count]) => ({
      month,
      count
    }));

    // Interest distribution
    const interestCounts: Record<string, number> = {};
    apps.forEach(a => {
      (a.interestAreas || []).forEach(ia => {
        interestCounts[ia] = (interestCounts[ia] || 0) + 1;
      });
    });

    const interestDistribution = Object.entries(interestCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      totalVolunteers: this.data.volunteers.length,
      totalApplications: apps.length,
      pendingApplications: pending,
      approvedApplications: approved,
      rejectedApplications: rejected,
      newApplicationsToday: today,
      totalPrograms: this.data.programs.length,
      totalEvents: this.data.events.length,
      totalNewsPosts: this.data.news.length,
      totalInquiries: this.data.contacts.length,
      unreadInquiries: this.data.contacts.filter(c => c.status === 'Unread').length,
      recentActivity: this.data.activityLogs.slice(0, 8),
      monthlyApplications,
      interestDistribution
    };
  }
}

export const db = new Database();
