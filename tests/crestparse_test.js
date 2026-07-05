// Verifies parseConfigRecords() handles: plain numeric IDs, "_club"-suffixed IDs (the real
// bug report — a pack from "FM XML for Mac"), routes "_competition"-suffixed IDs into the
// separate competition map (added for Task #125, league/competition logo lookup), and
// correctly EXCLUDES other suffixed resource types (_person/_nation) from both maps to avoid
// numeric-ID collisions.
//
// NOTE: parseConfigRecords()'s signature grew a second (competitionMap) parameter as part of
// Task #125 — this test was updated accordingly; see leaguelogo_test.js for dedicated
// competition-routing coverage.

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const sampleXml = `
<record>
  <boolean id="preload" value="false"/>
  <boolean id="amap" value="false"/>
  <list id="maps">
    <record from="13172353_club" to="graphics/pictures/club/13172353/logo"/>
    <record from="52063863_club" to="graphics/pictures/club/52063863/logo"/>
    <record from="2000081451_club" to="graphics/pictures/club/2000081451/logo"/>
    <record from="93038923_club" to="graphics/pictures/club/93038923/logo"/>
    <record from="777" to="graphics/pictures/club/777/logo"/>
    <record from="999_competition" to="graphics/pictures/competition/999/logo"/>
    <record from="888_person" to="graphics/pictures/person/888/face"/>
  </list>
</record>
`;

const map = new Map();
const competitionMap = new Map();
parseConfigRecords(sampleXml, map, competitionMap);

assert(map.size === 5, `map has exactly 5 entries (4 _club-suffixed + 1 plain), got ${map.size}`);
assert(map.get('13172353') === 'graphics/pictures/club/13172353/logo', '_club-suffixed ID 13172353 resolves, stripped of suffix');
assert(map.get('52063863') === 'graphics/pictures/club/52063863/logo', '_club-suffixed ID 52063863 resolves');
assert(map.get('2000081451') === 'graphics/pictures/club/2000081451/logo', '_club-suffixed ID 2000081451 resolves');
assert(map.get('93038923') === 'graphics/pictures/club/93038923/logo', '_club-suffixed ID 93038923 resolves');
assert(map.get('777') === 'graphics/pictures/club/777/logo', 'plain unsuffixed ID 777 still resolves (backward compatible)');
assert(!map.has('999'), 'a _competition-suffixed ID is NOT picked up by the club map (avoids collision with club IDs)');
assert(!map.has('888'), 'a _person-suffixed ID is NOT picked up by the club map');
assert(competitionMap.size === 1 && competitionMap.get('999') === 'graphics/pictures/competition/999/logo', '_competition-suffixed ID 999 is routed into the competition map');
assert(!competitionMap.has('888'), 'a _person-suffixed ID is NOT picked up by the competition map either');
assert(!map.has('999_competition') && !map.has('888_person'), 'suffixed keys are not stored raw either');

if (process.exitCode === 1) console.error('SOME TESTS FAILED');
else console.log('ALL TESTS PASSED');
