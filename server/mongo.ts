import { MongoClient, Db } from 'mongodb';
import { execSync } from 'child_process';
import fs from 'fs';
import { DatabaseSchema } from './db.ts';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let isConnected = false;
let lastPingTime = 0;
let connectionError: string | null = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexgen_council';
const DB_NAME = process.env.MONGODB_DB_NAME || 'nexgen_council';

/**
 * Ensures the mongod daemon is running locally when targeting localhost/127.0.0.1
 */
export function ensureLocalMongoDaemon(): boolean {
  // If connection is configured to a remote host, skip local daemon startup
  if (!MONGODB_URI.includes('localhost') && !MONGODB_URI.includes('127.0.0.1')) {
    return true;
  }

  try {
    // Check if mongod is already running by checking port or process
    const isRunning = execSync("pgrep -x mongod || ss -tulpn | grep ':27017' || echo ''", {
      encoding: 'utf-8'
    }).trim();

    if (isRunning) {
      return true;
    }

    // Check if mongod binary is available
    const mongodPath = fs.existsSync('/usr/local/bin/mongod')
      ? '/usr/local/bin/mongod'
      : execSync('which mongod || echo ""', { encoding: 'utf-8' }).trim();

    if (!mongodPath) {
      console.warn('[MongoDB] mongod binary not found in PATH.');
      return false;
    }

    console.log('[MongoDB] Auto-starting local MongoDB daemon on port 27017...');
    fs.mkdirSync('/var/lib/mongodb', { recursive: true });
    fs.mkdirSync('/var/log', { recursive: true });

    execSync(
      `${mongodPath} --dbpath /var/lib/mongodb --bind_ip 127.0.0.1 --port 27017 --fork --logpath /var/log/mongodb.log`,
      { stdio: 'inherit' }
    );
    console.log('[MongoDB] Local MongoDB daemon successfully launched.');
    return true;
  } catch (err: any) {
    console.warn('[MongoDB] Notice starting local MongoDB daemon:', err.message);
    return false;
  }
}

export async function initMongo(): Promise<boolean> {
  ensureLocalMongoDaemon();

  try {
    console.log(`[MongoDB] Connecting to MongoDB at ${MONGODB_URI.replace(/:([^:@]{1,})@/, ':****@')}...`);
    client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 6000,
      serverSelectionTimeoutMS: 6000
    });

    await client.connect();
    dbInstance = client.db(DB_NAME);
    isConnected = true;
    lastPingTime = Date.now();
    connectionError = null;
    console.log(`[MongoDB] Successfully connected to database: ${DB_NAME}`);

    // Create high-performance indexes
    try {
      await dbInstance.collection('users').createIndex({ username: 1 }, { unique: true });
      await dbInstance.collection('users').createIndex({ email: 1 });
      await dbInstance.collection('applications').createIndex({ id: 1 }, { unique: true });
      await dbInstance.collection('applications').createIndex({ referenceCode: 1 });
      await dbInstance.collection('applications').createIndex({ status: 1 });
      await dbInstance.collection('applications').createIndex({ createdAt: -1 });
      await dbInstance.collection('volunteers').createIndex({ id: 1 }, { unique: true });
      await dbInstance.collection('contacts').createIndex({ id: 1 }, { unique: true });
      await dbInstance.collection('contacts').createIndex({ createdAt: -1 });
      await dbInstance.collection('activityLogs').createIndex({ timestamp: -1 });
      await dbInstance.collection('analytics_events').createIndex({ timestamp: -1 });
      await dbInstance.collection('analytics_events').createIndex({ sessionId: 1 });
      await dbInstance.collection('active_visitors').createIndex({ lastSeen: -1 });
      await dbInstance.collection('active_visitors').createIndex({ sessionId: 1 }, { unique: true });
    } catch (idxErr) {
      console.warn('[MongoDB] Index creation notice:', idxErr);
    }

    return true;
  } catch (err: any) {
    isConnected = false;
    connectionError = err.message || 'Connection failed';
    console.warn('[MongoDB] MongoDB Connection failed:', err.message);
    return false;
  }
}

export function isMongoConnected(): boolean {
  return isConnected && dbInstance !== null;
}

export function getDb(): Db | null {
  return dbInstance;
}

export async function getMongoStatus() {
  let pingMs = -1;
  if (isMongoConnected() && dbInstance) {
    try {
      const start = Date.now();
      await dbInstance.command({ ping: 1 });
      pingMs = Date.now() - start;
      lastPingTime = Date.now();
    } catch (err: any) {
      isConnected = false;
      connectionError = err.message;
    }
  }

  let collectionsList: string[] = [];
  let counts: Record<string, number> = {};
  if (isMongoConnected() && dbInstance) {
    try {
      const cols = await dbInstance.listCollections().toArray();
      collectionsList = cols.map(c => c.name);
      for (const colName of collectionsList) {
        counts[colName] = await dbInstance.collection(colName).countDocuments();
      }
    } catch {
      // ignore
    }
  }

  return {
    connected: isConnected,
    configured: true,
    uriRedacted: MONGODB_URI.replace(/:([^:@]{1,})@/, ':****@'),
    dbName: DB_NAME,
    pingMs: pingMs >= 0 ? pingMs : null,
    collections: collectionsList,
    documentCounts: counts,
    lastPing: lastPingTime ? new Date(lastPingTime).toISOString() : null,
    error: connectionError
  };
}

/**
 * Loads all state from MongoDB or seeds it if empty
 */
export async function loadOrSeedMongo(seedData: DatabaseSchema): Promise<DatabaseSchema> {
  if (!isMongoConnected() || !dbInstance) {
    return seedData;
  }

  try {
    const usersCount = await dbInstance.collection('users').countDocuments();
    if (usersCount === 0) {
      console.log('[MongoDB] Collections empty in MongoDB. Initializing with full seed data...');
      await syncSchemaToMongo(seedData);
      return seedData;
    }

    console.log('[MongoDB] Loading real-time collections from MongoDB...');
    const users = await dbInstance.collection('users').find({}).toArray();
    const applications = await dbInstance.collection('applications').find({}).sort({ createdAt: -1 }).toArray();
    const volunteers = await dbInstance.collection('volunteers').find({}).toArray();
    const programs = await dbInstance.collection('programs').find({}).toArray();
    const events = await dbInstance.collection('events').find({}).toArray();
    const news = await dbInstance.collection('news').find({}).toArray();
    const team = await dbInstance.collection('team').find({}).toArray();
    const gallery = await dbInstance.collection('gallery').find({}).toArray();
    const contacts = await dbInstance.collection('contacts').find({}).sort({ createdAt: -1 }).toArray();
    const activityLogs = await dbInstance.collection('activityLogs').find({}).sort({ timestamp: -1 }).limit(200).toArray();

    const settingsDoc = await dbInstance.collection('settings').findOne({ _id: 'global_settings' as any });

    // Strip MongoDB _id fields to match schema
    const stripMongoId = (arr: any[]) => arr.map(({ _id, ...rest }) => rest);

    return {
      users: (users.length > 0 ? stripMongoId(users) : seedData.users) as any,
      applications: (applications.length > 0 ? stripMongoId(applications) : seedData.applications) as any,
      volunteers: (volunteers.length > 0 ? stripMongoId(volunteers) : seedData.volunteers) as any,
      programs: (programs.length > 0 ? stripMongoId(programs) : seedData.programs) as any,
      events: (events.length > 0 ? stripMongoId(events) : seedData.events) as any,
      news: (news.length > 0 ? stripMongoId(news) : seedData.news) as any,
      team: (team.length > 0 ? stripMongoId(team) : seedData.team) as any,
      gallery: (gallery.length > 0 ? stripMongoId(gallery) : seedData.gallery) as any,
      contacts: (contacts.length > 0 ? stripMongoId(contacts) : seedData.contacts) as any,
      settings: settingsDoc ? (({ _id, ...s }) => s)(settingsDoc as any) : seedData.settings,
      activityLogs: (activityLogs.length > 0 ? stripMongoId(activityLogs) : seedData.activityLogs) as any
    };
  } catch (err: any) {
    console.error('[MongoDB] Error loading data from MongoDB, using memory fallback:', err.message);
    return seedData;
  }
}

/**
 * Real-time direct entity upsert to MongoDB
 */
export async function mongoUpsert(collectionName: string, id: string, doc: any) {
  if (!isMongoConnected() || !dbInstance) return;
  try {
    const col = dbInstance.collection(collectionName);
    if (collectionName === 'settings') {
      await col.updateOne(
        { _id: 'global_settings' as any },
        { $set: { ...doc, updatedAt: new Date() } },
        { upsert: true }
      );
    } else {
      await col.updateOne(
        { id: id },
        { $set: doc },
        { upsert: true }
      );
    }
  } catch (err: any) {
    console.error(`[MongoDB] Error upserting to ${collectionName}:`, err.message);
  }
}

/**
 * Real-time direct entity delete from MongoDB
 */
export async function mongoDelete(collectionName: string, id: string) {
  if (!isMongoConnected() || !dbInstance) return;
  try {
    await dbInstance.collection(collectionName).deleteOne({ id: id });
  } catch (err: any) {
    console.error(`[MongoDB] Error deleting from ${collectionName}:`, err.message);
  }
}

export async function syncSchemaToMongo(schema: DatabaseSchema) {
  if (!isMongoConnected() || !dbInstance) return;

  try {
    const collectionsMap: Record<keyof DatabaseSchema, any[]> = {
      users: schema.users,
      applications: schema.applications,
      volunteers: schema.volunteers,
      programs: schema.programs,
      events: schema.events,
      news: schema.news,
      team: schema.team,
      gallery: schema.gallery,
      contacts: schema.contacts,
      settings: [schema.settings],
      activityLogs: schema.activityLogs
    };

    for (const [colName, items] of Object.entries(collectionsMap)) {
      if (!Array.isArray(items) || items.length === 0) continue;
      const col = dbInstance.collection(colName);
      
      if (colName === 'settings') {
        await col.updateOne(
          { _id: 'global_settings' as any },
          { $set: { ...schema.settings, updatedAt: new Date() } },
          { upsert: true }
        );
      } else {
        const operations = items.map(item => ({
          updateOne: {
            filter: { id: item.id },
            update: { $set: item },
            upsert: true
          }
        }));
        if (operations.length > 0) {
          await col.bulkWrite(operations);
        }
      }
    }
  } catch (err) {
    console.error('[MongoDB] Error syncing data:', err);
  }
}

// ----------------------------------------------------
// REALTIME ANALYTICS & INSIGHTS ENGINE (MongoDB + Live Synchronized)
// ----------------------------------------------------

export interface AnalyticsEvent {
  sessionId: string;
  path: string;
  referrer?: string;
  device?: string;
  browser?: string;
  os?: string;
  screenWidth?: number;
  ip?: string;
  timestamp: string;
}

export interface ActiveVisitor {
  sessionId: string;
  lastSeen: Date;
  currentPath: string;
  device?: string;
  browser?: string;
  os?: string;
  ip?: string;
}

// In-memory real-time live cache (persists during runtime & syncs with MongoDB)
const inMemoryEvents: AnalyticsEvent[] = [];
const inMemoryVisitors = new Map<string, ActiveVisitor>();

export async function recordAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  const eventObj: AnalyticsEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  };

  // 1. Store in live in-memory registry
  inMemoryEvents.unshift(eventObj);
  if (inMemoryEvents.length > 5000) {
    inMemoryEvents.pop();
  }

  // 2. Track / update active visitor
  inMemoryVisitors.set(event.sessionId, {
    sessionId: event.sessionId,
    lastSeen: new Date(),
    currentPath: event.path,
    device: event.device || 'Desktop',
    browser: event.browser || 'Unknown',
    os: event.os || 'Unknown',
    ip: event.ip || 'Unknown'
  });

  // 3. Persist to MongoDB if connected
  if (isMongoConnected() && dbInstance) {
    try {
      await dbInstance.collection('analytics_events').insertOne({
        ...eventObj,
        createdAt: new Date(eventObj.timestamp)
      });

      await dbInstance.collection('active_visitors').updateOne(
        { sessionId: event.sessionId },
        {
          $set: {
            sessionId: event.sessionId,
            lastSeen: new Date(),
            currentPath: event.path,
            device: event.device || 'Desktop',
            browser: event.browser || 'Unknown',
            os: event.os || 'Unknown',
            ip: event.ip || 'Unknown'
          }
        },
        { upsert: true }
      );
    } catch (err: any) {
      console.warn('[Analytics] MongoDB insert warning:', err.message);
    }
  }
}

export async function recordVisitorHeartbeat(sessionId: string, path: string): Promise<void> {
  const existing = inMemoryVisitors.get(sessionId);
  if (existing) {
    existing.lastSeen = new Date();
    existing.currentPath = path;
  } else {
    inMemoryVisitors.set(sessionId, {
      sessionId,
      lastSeen: new Date(),
      currentPath: path
    });
  }

  if (isMongoConnected() && dbInstance) {
    try {
      await dbInstance.collection('active_visitors').updateOne(
        { sessionId },
        {
          $set: {
            lastSeen: new Date(),
            currentPath: path
          }
        },
        { upsert: true }
      );
    } catch {
      // ignore
    }
  }
}

export async function getRealtimeInsights(totalApplicationsCount = 0, totalVolunteersCount = 0) {
  // If MongoDB is connected and has records, use MongoDB aggregation
  if (isMongoConnected() && dbInstance) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const activeVisitors = await dbInstance
        .collection('active_visitors')
        .countDocuments({ lastSeen: { $gte: fiveMinutesAgo } });

      const totalPageViews = await dbInstance.collection('analytics_events').countDocuments();
      const todayPageViews = await dbInstance
        .collection('analytics_events')
        .countDocuments({ createdAt: { $gte: startOfToday } });

      const uniqueSessionDocs = await dbInstance.collection('analytics_events').distinct('sessionId');
      const uniqueVisitors = uniqueSessionDocs.length;

      const pageAgg = await dbInstance.collection('analytics_events').aggregate([
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]).toArray();

      const topPages = pageAgg.map(p => ({
        page: p._id || '/',
        views: p.count,
        percentage: totalPageViews > 0 ? Math.round((p.count / totalPageViews) * 100) : 0
      }));

      const deviceAgg = await dbInstance.collection('analytics_events').aggregate([
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      const deviceBreakdown = deviceAgg.map(d => ({
        name: d._id || 'Desktop',
        count: d.count,
        percentage: totalPageViews > 0 ? Math.round((d.count / totalPageViews) * 100) : 0
      }));

      const browserAgg = await dbInstance.collection('analytics_events').aggregate([
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).toArray();

      const browserBreakdown = browserAgg.map(b => ({
        name: b._id || 'Chrome',
        count: b.count,
        percentage: totalPageViews > 0 ? Math.round((b.count / totalPageViews) * 100) : 0
      }));

      const osAgg = await dbInstance.collection('analytics_events').aggregate([
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).toArray();

      const osBreakdown = osAgg.map(o => ({
        name: o._id || 'Other',
        count: o.count,
        percentage: totalPageViews > 0 ? Math.round((o.count / totalPageViews) * 100) : 0
      }));

      const conversionRate = uniqueVisitors > 0
        ? Number(((totalApplicationsCount / uniqueVisitors) * 100).toFixed(1))
        : 0;

      const recentActivity = await dbInstance
        .collection('analytics_events')
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const hourlyAgg = await dbInstance.collection('analytics_events').aggregate([
        { $match: { createdAt: { $gte: twelveHoursAgo } } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            views: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]).toArray();

      const hoursMap = new Map(hourlyAgg.map(h => [h._id, h.views]));
      const hourlyTraffic = [];
      const currentHour = new Date().getHours();
      for (let i = 11; i >= 0; i--) {
        const h = (currentHour - i + 24) % 24;
        hourlyTraffic.push({
          hour: `${h.toString().padStart(2, '0')}:00`,
          views: hoursMap.get(h) || 0
        });
      }

      // Active visitor sessions list
      const activeSessionsList = await dbInstance
        .collection('active_visitors')
        .find({ lastSeen: { $gte: fiveMinutesAgo } })
        .sort({ lastSeen: -1 })
        .limit(10)
        .toArray();

      return {
        activeVisitors,
        totalPageViews,
        todayPageViews,
        uniqueVisitors,
        topPages,
        deviceBreakdown,
        browserBreakdown,
        osBreakdown,
        conversionRate,
        hourlyTraffic,
        recentActivity: recentActivity.map(({ _id, ...r }) => r),
        activeSessionsList: activeSessionsList.map(({ _id, ...s }) => s)
      };
    } catch (err: any) {
      console.warn('[Analytics] Fallback to in-memory store:', err.message);
    }
  }

  // Pure Real-Time In-Memory Engine (Accurate calculations from actual incoming telemetry)
  const now = Date.now();
  const fiveMin = 5 * 60 * 1000;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Active visitors
  let activeVisitors = 0;
  const activeSessionsList: any[] = [];
  inMemoryVisitors.forEach(v => {
    const elapsed = now - new Date(v.lastSeen).getTime();
    if (elapsed < fiveMin) {
      activeVisitors++;
      activeSessionsList.push(v);
    }
  });

  // 2. Total and Today page views
  const totalPageViews = inMemoryEvents.length;
  const todayPageViews = inMemoryEvents.filter(e => e.timestamp.startsWith(todayStr)).length;

  // 3. Unique sessions
  const uniqueSessions = new Set(inMemoryEvents.map(e => e.sessionId));
  const uniqueVisitors = uniqueSessions.size;

  // 4. Top pages
  const pageMap: Record<string, number> = {};
  inMemoryEvents.forEach(e => {
    const p = e.path || '/';
    pageMap[p] = (pageMap[p] || 0) + 1;
  });
  const topPages = Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([page, views]) => ({
      page,
      views,
      percentage: totalPageViews > 0 ? Math.round((views / totalPageViews) * 100) : 0
    }));

  // 5. Devices
  const deviceMap: Record<string, number> = {};
  inMemoryEvents.forEach(e => {
    const d = e.device || 'Desktop';
    deviceMap[d] = (deviceMap[d] || 0) + 1;
  });
  const deviceBreakdown = Object.entries(deviceMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalPageViews > 0 ? Math.round((count / totalPageViews) * 100) : 0
    }));

  // 6. Browsers
  const browserMap: Record<string, number> = {};
  inMemoryEvents.forEach(e => {
    const b = e.browser || 'Chrome';
    browserMap[b] = (browserMap[b] || 0) + 1;
  });
  const browserBreakdown = Object.entries(browserMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalPageViews > 0 ? Math.round((count / totalPageViews) * 100) : 0
    }));

  // 7. Operating Systems
  const osMap: Record<string, number> = {};
  inMemoryEvents.forEach(e => {
    const o = e.os || 'Other';
    osMap[o] = (osMap[o] || 0) + 1;
  });
  const osBreakdown = Object.entries(osMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalPageViews > 0 ? Math.round((count / totalPageViews) * 100) : 0
    }));

  // 8. Conversion
  const conversionRate = uniqueVisitors > 0
    ? Number(((totalApplicationsCount / uniqueVisitors) * 100).toFixed(1))
    : 0;

  // 9. Hourly traffic
  const currentHour = new Date().getHours();
  const hourlyCounts: Record<number, number> = {};
  inMemoryEvents.forEach(e => {
    const d = new Date(e.timestamp);
    if (now - d.getTime() <= 12 * 60 * 60 * 1000) {
      const h = d.getHours();
      hourlyCounts[h] = (hourlyCounts[h] || 0) + 1;
    }
  });

  const hourlyTraffic = [];
  for (let i = 11; i >= 0; i--) {
    const h = (currentHour - i + 24) % 24;
    hourlyTraffic.push({
      hour: `${h.toString().padStart(2, '0')}:00`,
      views: hourlyCounts[h] || 0
    });
  }

  return {
    activeVisitors,
    totalPageViews,
    todayPageViews,
    uniqueVisitors,
    topPages,
    deviceBreakdown,
    browserBreakdown,
    osBreakdown,
    conversionRate,
    hourlyTraffic,
    recentActivity: inMemoryEvents.slice(0, 20),
    activeSessionsList: activeSessionsList.slice(0, 10)
  };
}

export async function testMongoConnection(uri: string): Promise<{ success: boolean; message: string; pingMs?: number }> {
  let testClient: MongoClient | null = null;
  try {
    const start = Date.now();
    testClient = new MongoClient(uri, {
      connectTimeoutMS: 4000,
      serverSelectionTimeoutMS: 4000
    });
    await testClient.connect();
    await testClient.db().command({ ping: 1 });
    const pingMs = Date.now() - start;
    await testClient.close();
    return { success: true, message: 'Connected successfully to MongoDB server!', pingMs };
  } catch (err: any) {
    if (testClient) {
      try { await testClient.close(); } catch {}
    }
    return { success: false, message: err.message || 'Could not connect to MongoDB server.' };
  }
}
