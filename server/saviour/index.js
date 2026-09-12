/**
 * Saviour - academic materials (past papers, notes, slides) by course.
 *
 * Self-contained: models, services, controllers and routes all live under this
 * folder. The only thing the host app does is mount it:
 *
 *     const saviourRoutes = require('./saviour');
 *     app.use('/api/saviour', saviourRoutes);
 *
 * It reuses the platform's auth middleware and Mongo connection, and touches
 * no existing model.
 */

module.exports = require('./routes');
