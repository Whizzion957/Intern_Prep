# Saviour

Academic materials — past papers, notes, slides — organised by course instead of
by Drive folder. A second vertical alongside the placements side of the platform,
kept entirely in `server/saviour/` and `client/src/saviour/`.

## We store links, never files

Every material is a **public Google Drive link**. There is no upload endpoint in
this module and no file ever reaches the server, so the whole thing runs inside a
free Mongo tier — a material is a few hundred bytes of metadata.

The link must be a Drive/Docs *file* link. Folder links are refused: they
recreate the digging problem one level down. Other hosts are refused too, because
they can't be previewed and a custodian can't re-upload them into the saviour
Drive.

## Custodians: one student per branch per batch

`Custodian` records that, say, `pradyumn_k@cs.iitr.ac.in` looks after **CSE,
batch of 2027** — in practice whoever already owns that batch's saviour Drive
folder. Appointment is by email, so someone can be made custodian before they
have ever signed in.

Every submission carries a cohort (`department` + `graduatingBatch`) and is
routed to that pair's custodian **and** to the superadmins. Nobody else sees it.
If no custodian is appointed for a pair, it falls to the superadmins alone.

The custodian has these moves in the approval panel:

| Action | What it does |
| --- | --- |
| **Approve as-is** | The student's link stands. Fast, but it dies when they lose the file. |
| **Move to my Saviour Drive** (one click) | The server reads the student's public file and uploads a copy into the custodian's own folder, then approves — no manual download/re-upload. See below. |
| **Move manually** | The old path: download, re-upload into the batch folder, paste the new link. Kept as the fallback for oversized files or any failure. |
| **Reject** | With a note the submitter sees. |

Both move paths re-point the record: the old link is kept in
`source.replacedFrom` and `source.origin` flips to `saviour_drive` so readers can
see which copy is the durable one.

The panel embeds a Drive preview of every pending item, which doubles as the
sharing check: Drive only renders it for files shared "anyone with the link", so
a blank preview *is* the evidence that the file is still private.

### One-click move (how it works)

There is still no central Saviour Drive — the durable copy lands in the
**custodian's own** batch folder. Two credentials make that possible without a
service account (`services/driveApi.js`):

- **Reading** the student's file uses the app **API key** (`GOOGLE_API_KEY`) on
  the v3 `files.get?alt=media` path — the file is public, and this avoids the
  large-file "confirm download" interstitial.
- **Writing** into the custodian's folder uses the **custodian's** short-lived
  OAuth **`drive.file`** access token, obtained in the browser only when they act
  (`client/src/saviour/lib/googleDrive.js`) and never stored.

`drive.file` is per-file: the custodian first **connects their folder through
the Picker** (Approvals → "Connect folder"), which is what grants the app write
access to it; the folder id is saved on the `Custodian` (`driveFolderId`).
Thereafter the move is one click. `drive.file` can't read an arbitrary file the
app never opened, so the move is download-public-then-upload, not a server-side
`files.copy`. Files above ~30 MB fall back to the manual path.

Setup: enable the **Drive API** and **Picker API** in Google Cloud, create a
browser **API key**, add the non-sensitive `drive.file` scope to the consent
screen, and set `GOOGLE_API_KEY` / `VITE_GOOGLE_API_KEY`. All of it is optional —
the one-click UI hides itself when unset and the manual flow still works.

## Course codes

The curriculum revision renamed courses (`CSN-102` → `CSC-201`). A material
references its course by `_id`, never by a code string, so a rename is a one-line
catalog edit and nothing else moves.

```js
codes: [
  { code: 'CSN-102', until: 2023, current: false },
  { code: 'CSC-201', from: 2024,  current: true  },
]
```

Both URLs open the same page, papers from both eras sit in one grid each showing
the code printed on it (`Material.codeAtTime`), and the typeahead matches either.

## A course belongs to one branch, several, or all of them

```js
allDepartments: true,  defaultSemester: 1          // MAN-001, every branch
allDepartments: false, offeredTo: [                 // shared by two branches,
  { department: 'cs',  semester: 3 },               // in different semesters
  { department: 'mfs', semester: 4 },
]
```

The semester lives per branch because the same course genuinely falls in
different semesters for different branches. `Course.isOfferedTo()` is what stops
a material being filed against a branch that never took the course.

## Professors, and how the course page is laid out

A course has several professors in one year (one per branch cohort) and different
ones across years. `Professor` is a real collection — a free-text field would
split one person's material across "Dr Sharma", "A. Sharma" and "sharma sir".
Students may propose a name while submitting; it lands `verified: false` and a
custodian tidies or merges it (`POST /professors/:id/merge` re-points every
material).

The page then answers two different questions in two different shapes, which is
the whole design:

**Exam papers → a year × exam grid.** Everyone who sat a given exam wrote the
same paper, so a paper belongs to the *sitting*, not to a lecturer. Rows are
years (plus the last five, so a missing recent paper shows as a gap rather than
as nothing), columns are mid and end. A cell can hold several chips — separate
branch cohorts sit separate papers for one course — each labelled by branch. An
empty cell is a button that records a request.

**Everything else → grouped by (year, branch, professor), newest first.** Notes
and slides are worthless detached from whoever gave them, so this is the only
grouping that makes them findable.

One filter bar (batch / branch / professor) narrows both at once, because "show
me what's relevant to me" is a cohort question, not a section question.

## The viewer

`components/DriveViewer.jsx` previews a file in place in a modal — Drive's
`/preview` endpoint is built to be iframed and renders PDFs, images, Docs and
Slides, so there is no PDF library and nothing is proxied through our server.
Download is a plain link to Drive's export URL, so a large PDF never touches us.

## Layout

```
server/saviour/
  index.js                     mounted at /api/saviour
  models/      Course, Material, Professor, Custodian,
               MaterialRequest, CourseRequest
  services/    courseCodes   normalise, code-for-year
               courseLookup  resolve any code/alias/id -> course
               drive         validate a Drive link, derive view/preview/download
               custodians    who approves what, and what a panel may show
               courseView    assembles the two-shaped course page
  controllers/ course, material, custodian, professor
  routes/      index.js
  scripts/     importCatalog.js + catalog.sample.csv

client/src/saviour/
  index.js       exports the route array
  routes.jsx     /saviour, /course/:code, /add, /request-course,
                 /approvals, /custodians
  api.js         axios client for /api/saviour
  saviour.css    all styles, scoped .sv-*
  components/    CourseTypeahead, ProfessorPicker, DriveViewer
  pages/         CourseSearch, CourseDetail, AddMaterial,
                 RequestCourse, ApprovalPanel, Custodians
```

## Seeding the catalog

The one genuinely manual step, done once per department from the official
curriculum:

```bash
node saviour/scripts/importCatalog.js saviour/scripts/catalog.sample.csv --dry-run
node saviour/scripts/importCatalog.js path/to/cs-catalog.csv
```

Columns: `name,codes,departments,credits,owningDepartment,aliases`

- `codes` — `CODE[:from[:until]]`, semicolon separated, last entry is current.
  `CSN-102:2018:2023;CSC-201:2024` records the rename.
- `departments` — `all:1`, or `cs:3;mfs:4` for a shared course, or `me:5` for one
  branch. The number is the semester for that branch.

Re-running updates rather than duplicates, so recording a rename later is a CSV
edit.

## What this touches outside the module

Three lines, nothing else:

- `server/index.js` — `require('./saviour')` and `app.use('/api/saviour', …)`
- `server/middleware/rateLimiter.js` — a `materials` bucket in `RATE_LIMITS`
- `client/src/App.jsx` — `import saviourRoutes` and `{saviourRoutes}`

No existing model, controller or component is modified. `ActivityLog`'s action
enum is deliberately left alone; a material's history lives on the material
(`routedTo`, `decidedBy`, `decidedAt`, `source.replacedFrom`).

## Not done yet

- **Notification.** A submission is routed and appears in the custodian's panel,
  but nothing emails them. There is no mail transport in the project yet.
- A Navbar entry for `/saviour` (and `/saviour/approvals` for custodians) — left
  out so you can decide where they sit.
- `/saviour/approvals` and `/saviour/custodians` are authorised server-side but
  not hidden client-side; a non-custodian sees an empty panel, not a 404.
- Link-rot sweeping. Reports flip `source.reachable`, but nothing crawls.
- The post-exam nudge that mails the gap board to people who asked.
