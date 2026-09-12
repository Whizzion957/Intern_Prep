/**
 * Saviour - academic materials by course (past papers, notes, slides).
 *
 * Self-contained: pages, components, styles and API client all live under this
 * folder. The host app mounts it with one line inside its protected routes:
 *
 *     import saviourRoutes from './saviour';
 *     ...
 *     {saviourRoutes}
 *
 * Server side lives in server/saviour/ and answers under /api/saviour.
 */

export { default } from './routes';
export { courseAPI, materialAPI, approvalAPI, custodianAPI, professorAPI, gapAPI } from './api';
