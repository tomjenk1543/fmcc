
let failures = 0;
function check(label, fn) {
  try { fn(); console.log('OK:', label); }
  catch (e) { failures++; console.log('FAIL:', label, '-', e.message); }
}

check('buildFullBackup falls back to live snapshot when nothing imported (captures squad/tactics/achievements)', () => {
  // Make sure there's no imported save sitting in storage — simulates the bundled demo state.
  localStorage.removeItem('fmCommandCentre.importedSaveData');

  // Boot no longer auto-loads the bundled Metalul Buzau example (true landing screen now
  // gates everything behind an explicit import), so FM_TACTIC_SUMMARY starts out blank
  // ({formation:'', ...}) unless something populates it. Load the bundled example explicitly
  // here to give buildFullBackup()'s live-snapshot fallback real tactic data to capture —
  // the DOM overrides below still take precedence for everything else in this test.
  loadSaveData_MetaluBuzau();

  // Populate the DOM fields buildCurrentSaveDataSnapshot() reads.
  document.getElementById('hero-club-name').textContent = 'Metalul Buzău';
  document.getElementById('hero-crest-initials').textContent = 'MB';
  document.getElementById('hotbar-team-name').textContent = 'Metalul Buzău';
  document.getElementById('hero-manager').textContent = 'Tom Jenkins';
  document.getElementById('hero-division').textContent = 'SuperLiga (ROU)';
  document.getElementById('hero-season-year').textContent = '2036/37';
  document.getElementById('hero-position').textContent = '1st';
  document.getElementById('hero-stadium').textContent = 'Metalul Buzău Stadium (9,012)';
  document.getElementById('hero-stadium-built').textContent = 'Built 2031';
  document.getElementById('stat-p').textContent = '26';
  document.getElementById('stat-w').textContent = '23';
  document.getElementById('save-years-managed').textContent = '11 yrs 8 mo';
  document.getElementById('save-trophies-won').textContent = '15';
  document.getElementById('save-win-pct').textContent = '64%';

  // Populate the cached-on-render variables via the real render functions.
  renderAchievements([{ label: 'SuperLiga', season: '6x · 2031–2036' }]);
  renderRecords([{ icon: '&#9917;', label: 'Top Goalscorer (League)', value: 'Gastón Zelarayán · 103' }]);
  setLeagueStatus(null);

  // Populate currentSquad via the real squad-rendering path.
  renderSquad([
    { name: 'Pol', position: 'GK', bestPosition: 'GK', bestRole: 'BGK', age: 26, nation: 'ESP', ability: '3.5★', potential: '3.5★', appearances: '34', goals: 0, assists: 0, wage: '£12.75K p/w', contract: '30/6/2039' },
  ]);

  const backup = buildFullBackup();
  const snap = backup.importedSaveData;

  if (snap.club.name !== 'Metalul Buzău') throw new Error('club.name not captured, got: ' + snap.club.name);
  if (snap.club.manager !== 'Tom Jenkins') throw new Error('club.manager not captured');
  if (snap.club.stadiumName !== 'Metalul Buzău Stadium') throw new Error('stadiumName not parsed correctly, got: ' + snap.club.stadiumName);
  if (snap.club.stadiumCapacity !== '9,012') throw new Error('stadiumCapacity not parsed correctly, got: ' + snap.club.stadiumCapacity);
  if (snap.seasonStats.p !== '26') throw new Error('seasonStats.p not captured');
  if (!Array.isArray(snap.achievements) || snap.achievements[0].label !== 'SuperLiga') throw new Error('achievements not captured');
  if (!Array.isArray(snap.records) || snap.records[0].value !== 'Gastón Zelarayán · 103') throw new Error('records not captured');
  if (snap.careerStats.yearsManaged !== '11 yrs 8 mo') throw new Error('careerStats not captured');
  if (!Array.isArray(snap.squad) || snap.squad.length !== 1 || snap.squad[0].name !== 'Pol') throw new Error('squad not captured, got: ' + JSON.stringify(snap.squad));
  if (!Array.isArray(snap.tacticIP)) throw new Error('tacticIP (TACTIC_ROLES) not captured');
  if (!snap.fmTacticSummary || !snap.fmTacticSummary.formation) throw new Error('fmTacticSummary not captured');
});

check('buildFullBackup prefers a real import over the live snapshot when one exists', () => {
  localStorage.setItem('fmCommandCentre.importedSaveData', JSON.stringify({ club: { name: 'Imported FC' }, squad: [{ name: 'Imported Player' }] }));
  const backup = buildFullBackup();
  if (backup.importedSaveData.club.name !== 'Imported FC') throw new Error('expected the real import to win over the live snapshot, got: ' + backup.importedSaveData.club.name);
});

console.log('\n' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'));
process.exitCode = failures === 0 ? 0 : 1;
