/* =========================================================
   RESCUE BAND — 목업 데이터
   구조팔찌를 착용한 '대원' 본인의 안전 상태를 관제하는 모델입니다.
   실제 배포 시 백엔드 API로 교체하는 것을 전제로 합니다.
   ========================================================= */
window.DB = (function () {
  'use strict';

  // 관제 요원(로그인 사용자)
  const operator = { name: '김대현', role: '관제요원', center: '중부소방서 종합상황실' };

  // 출동 파트 편성 기준
  const DISPATCH = {
    ems:    { key: 'ems',    label: '구급 출동', crew: '3명',  basis: '환자 이송·응급처치' },
    fire:   { key: 'fire',   label: '화재 출동', crew: '10명', basis: '화재 진압·인명 대피' },
    rescue: { key: 'rescue', label: '구조 출동', crew: '6명',  basis: '인명 구조·수색' }
  };

  // 대원 상태 정의
  const STATUS = {
    danger:   { key: 'danger',   label: '위험' },
    active:   { key: 'active',   label: '출동중' },
    standby:  { key: 'standby',  label: '대기' },
    returned: { key: 'returned', label: '복귀' }
  };

  // 대원 목록
  const crew = [
    {
      id: 'RB-대원-014', name: '이강토', rank: '소방교', agency: 'fire',
      org: '중부소방서', team: '119구조대 1팀', status: 'danger',
      bpm: 128, activity: '낙상 감지', battery: 47,
      band: { model: 'RB-Pro 3', signal: '강함', firmware: 'v2.4.1', lastSync: '방금' },
      med:  { bloodType: 'A+', conditions: ['없음'], allergies: ['조영제'], meds: ['없음'],
              note: '현장 낙상 감지 · 심박 128 BPM 급상승. 즉시 상태 확인 요망.' },
      guardians: [{ name: '이수진', relation: '배우자', phone: '010-2211-8845' }],
      loc: { addr: '서울 중구 세종대로 110 · 화재 현장', updated: '방금', lat: 37.566295, lng: 126.977945, pulse: true }
    },
    {
      id: 'RB-대원-009', name: '박서준', rank: '소방장', agency: 'fire',
      org: '중부소방서', team: '119구조대 1팀', status: 'active',
      bpm: 112, activity: '활동중', battery: 63,
      band: { model: 'RB-Pro 3', signal: '강함', firmware: 'v2.4.1', lastSync: '1분 전' },
      med:  { bloodType: 'O+', conditions: ['없음'], allergies: ['없음'], meds: ['없음'],
              note: '정상 활동 중. 특이사항 없음.' },
      guardians: [{ name: '박민호', relation: '형제', phone: '010-6620-3391' }],
      loc: { addr: '서울 중구 세종대로 110 · 화재 현장', updated: '1분 전', lat: 37.566620, lng: 126.978430, pulse: false }
    },
    {
      id: 'RB-대원-021', name: '정민혁', rank: '소방사', agency: 'fire',
      org: '중부소방서', team: '산악구조대', status: 'active',
      bpm: 96, activity: '활동중', battery: 15,
      band: { model: 'RB-Lite 2', signal: '보통', firmware: 'v2.3.8', lastSync: '3분 전' },
      med:  { bloodType: 'B+', conditions: ['없음'], allergies: ['없음'], meds: ['없음'],
              note: '팔찌 배터리 15% · 교체 필요.' },
      guardians: [{ name: '정유라', relation: '배우자', phone: '010-3312-7788' }],
      loc: { addr: '북한산 국립공원 · 백운대 인근', updated: '3분 전', lat: 37.658800, lng: 126.981400, pulse: false }
    },
    {
      id: 'RB-대원-006', name: '김도현', rank: '경위', agency: 'police',
      org: '남부경찰서', team: '강력범죄수사팀', status: 'standby',
      bpm: null, activity: '서 대기 (출동 대기)', battery: 90,
      band: { model: 'RB-Pro 3', signal: '강함', firmware: 'v2.4.1', lastSync: '방금' },
      med:  { bloodType: 'AB+', conditions: ['없음'], allergies: ['없음'], meds: ['없음'],
              note: '경찰서 내 출동 대기 상태.' },
      guardians: [{ name: '김소영', relation: '배우자', phone: '010-9080-1123' }],
      loc: { addr: '서울 남부경찰서', updated: '방금', lat: 37.516900, lng: 126.903600, pulse: false }
    },
    {
      id: 'RB-대원-018', name: '최우희', rank: '소방교', agency: 'fire',
      org: '중부소방서', team: '119구조대 2팀', status: 'returned',
      bpm: null, activity: '복귀 완료', battery: 78,
      band: { model: 'RB-Pro 3', signal: '강함', firmware: 'v2.4.1', lastSync: '12분 전' },
      med:  { bloodType: 'A-', conditions: ['천식'], allergies: ['없음'], meds: ['흡입기'],
              note: '출동 종료 후 안전 복귀.' },
      guardians: [{ name: '최성재', relation: '부모', phone: '010-4471-2205' }],
      loc: { addr: '중부소방서 · 안전센터', updated: '12분 전', lat: 37.564000, lng: 126.976000, pulse: false }
    }
  ];

  // 신고 · 출동 이력 (dispatch: null = 미편성/자동접수)
  const history = [
    { id: 'DP-3401', time: '2시간 전', dispatch: null, status: 'active',
      title: 'SOS 자동 신고 접수',
      desc: '구조팔찌 SOS 버튼 작동. 낙상 추정. 현장 출동 지령.', meta: '이강토 대원 · 미편성' },
    { id: 'DP-3388', time: '오늘 07:48', dispatch: 'fire', status: 'done', result: '진화 완료',
      title: '상가 건물 화재 진화',
      desc: '소방차 2대 출동, 초기 진화 완료 후 잔불 정리.', meta: '편성 8명 · 1시간 12분' },
    { id: 'DP-3385', time: '어제 22:31', dispatch: 'rescue', status: 'done', result: '구조 완료',
      title: '산악 조난자 구조',
      desc: '백운대 인근 조난자 1명 구조·이송 완료.', meta: '편성 5명 · 38분' },
    { id: 'DP-3382', time: '어제 18:05', dispatch: 'ems', status: 'done', result: '이송 완료',
      title: '심정지 환자 응급처치',
      desc: '현장 CPR 시행 후 인근 병원 이송.', meta: '편성 3명 · 24분' },
    { id: 'DP-3379', time: '어제 14:22', dispatch: 'ems', status: 'done', result: '이송 완료',
      title: '교통사고 부상자 이송',
      desc: '부상자 2명 응급처치 후 이송.', meta: '편성 2명 · 19분' }
  ];

  // 알림
  const alerts = [
    { id: 'A-1', level: 'danger', icon: 'fall', read: false, time: '방금',
      title: '낙상 감지 — 이강토(RB-대원-014)',
      desc: '현장에서 낙상이 감지되었습니다. 심박 128 BPM. 즉시 확인 요망.' },
    { id: 'A-2', level: 'danger', icon: 'sos', read: false, time: '2분 전',
      title: 'SOS 발신 — 이강토(RB-대원-014)',
      desc: '구조팔찌 SOS 버튼이 작동했습니다. 현장 출동이 지령되었습니다.' },
    { id: 'A-3', level: 'warning', icon: 'batt', read: false, time: '10분 전',
      title: '배터리 부족 — 정민혁(RB-대원-021)',
      desc: '팔찌 배터리 15%. 충전 또는 교체가 필요합니다.' },
    { id: 'A-4', level: 'info', icon: 'return', read: true, time: '1시간 전',
      title: '복귀 완료 — 최우희(RB-대원-018)',
      desc: '최우희 대원이 안전하게 복귀했습니다.' },
    { id: 'A-5', level: 'success', icon: 'ok', read: true, time: '2시간 전',
      title: '출동 완료 — 상가 건물 화재',
      desc: '화재 진화가 완료되어 대원 전원이 복귀했습니다.' }
  ];

  return { operator, DISPATCH, STATUS, crew, history, alerts };
})();
