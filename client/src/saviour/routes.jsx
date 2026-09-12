/**
 * Saviour routes
 *
 * Dropped into the host app's protected route tree as one array, so the module
 * owns its URL space and App.jsx gains a single line: {saviourRoutes}
 *
 * /saviour/approvals and /saviour/custodians are authorised server-side; they
 * are reachable here so a custodian can bookmark them without being an admin.
 */

import { Route } from 'react-router-dom';
import CourseSearch from './pages/CourseSearch';
import CourseDetail from './pages/CourseDetail';
import AddMaterial from './pages/AddMaterial';
import RequestCourse from './pages/RequestCourse';
import ApprovalPanel from './pages/ApprovalPanel';
import Custodians from './pages/Custodians';

const saviourRoutes = [
  <Route key="sv-home" path="/saviour" element={<CourseSearch />} />,
  // Any code the course has ever used resolves here; the page says so when the
  // one you typed is retired.
  <Route key="sv-course" path="/saviour/course/:code" element={<CourseDetail />} />,
  <Route key="sv-add" path="/saviour/add" element={<AddMaterial />} />,
  <Route key="sv-request" path="/saviour/request-course" element={<RequestCourse />} />,
  <Route key="sv-approvals" path="/saviour/approvals" element={<ApprovalPanel />} />,
  <Route key="sv-custodians" path="/saviour/custodians" element={<Custodians />} />,
];

export default saviourRoutes;
