import { Router } from 'express';
import { getDb } from '../firebase-admin.js';

const router = Router();
const db = getDb();

// Export all user data as JSON
router.get('/json', async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const collections = ['people', 'events', 'memories', 'places'];
    const result = {};

    for (const coll of collections) {
      const snap = await db.collection('users').doc(uid).collection(coll).get();
      result[coll] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Also export tags from settings
    const tagsSnap = await db.collection('users').doc(uid).collection('settings').doc('tags').get();
    result.tags = tagsSnap.exists ? tagsSnap.data().list || [] : [];

    result.exportedAt = new Date().toISOString();
    result.version = '2.0.0';

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=protsphere_export_${new Date().toISOString().split('T')[0]}.json`);
    res.json(result);
  } catch (err) { next(err); }
});

// Export filtered collection
router.get('/:collection', async (req, res, next) => {
  try {
    const { collection } = req.params;
    const valid = ['people', 'events', 'memories', 'places'];
    if (!valid.includes(collection)) return res.status(400).json({ error: 'Invalid collection' });

    const snap = await db.collection('users').doc(req.user.uid).collection(collection).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ data: items, count: items.length, collection });
  } catch (err) { next(err); }
});

export default router;
