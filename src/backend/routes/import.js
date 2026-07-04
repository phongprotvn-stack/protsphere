import { Router } from 'express';
import { getDb } from '../firebase-admin.js';
import { requireRole, ROLES } from '../middleware/auth.js';
import { runImport, listConnectors } from '../data-hub/index.js';
import '../data-hub/connectors/google-sheets.js';
import '../data-hub/connectors/json.js';

const router = Router();
const db = getDb();

// List available connectors
router.get('/connectors', (req, res) => {
  res.json({ connectors: listConnectors() });
});

// Import from Google Sheets (URL)
router.post('/sheets', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing sheet URL' });
    const result = await runImport('google-sheets', { url }, req.user.uid, db);
    res.json({ message: `Import: ${result.created} created, ${result.updated} updated, ${result.failed} failed`, ...result });
  } catch (err) { next(err); }
});

// Import from JSON body
router.post('/json', requireRole(ROLES.EDITOR), async (req, res, next) => {
  try {
    const data = req.body.data || req.body;
    const result = await runImport('json', { data }, req.user.uid, db);
    res.json({ message: `Import: ${result.created} created, ${result.updated} updated`, ...result });
  } catch (err) { next(err); }
});

// Upload file → import (JSON, CSV, Excel)
router.post('/upload', requireRole(ROLES.EDITOR), async (req, res, next) => {
  // Basic file upload handling via raw body or multipart
  // For now, accepts JSON body array
  try {
    const { items, format } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Missing items array' });
    const result = await runImport('json', { data: items }, req.user.uid, db);
    res.json({ message: `Import: ${result.created} created, ${result.updated} updated`, ...result });
  } catch (err) { next(err); }
});

export default router;
