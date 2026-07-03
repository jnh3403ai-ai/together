/* =========================================================
   RESCUE BAND — 애플리케이션 로직 (PC 버전)
   순수 JavaScript · 해시 라우팅 · 사이드바 셸
   데이터·컴포넌트는 모바일 버전과 공유(../js/data.js)
   ========================================================= */
(function () {
  'use strict';

  const DB = window.DB;
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const state = {
    crewFilter: 'all',
    crewSearch: '',
    alerts: DB.alerts.map(a => ({ ...a }))
  };

  const ROUTES = {
    dashboard: { tab: 'dashboard', title: '대시보드',   render: viewDashboard },
    crew:      { tab: 'crew',      title: '구조대원',    render: viewCrew },
    history:   { tab: 'history',   title: '출동 이력',   render: viewHistory },
    alerts:    { tab: 'alerts',    title: '알림',        render: viewAlerts },
    settings:  { tab: 'settings',  title: '설정',        render: viewSettings }
  };

  /* ---------- 유틸 ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const crewById = (id) => DB.crew.find(c => c.id === id);
  const avatarText = (name) => (name || '?').slice(0, 2);

  function statusMeta(key) {
    return { danger: '위험', active: '출동중', standby: '대기', returned: '복귀' }[key] || key;
  }
  function statusEl(key) {
    return `<span class="status status--${key}">${esc(statusMeta(key))}</span>`;
  }
  function needsAttention(c) {
    return c.status === 'danger' || (c.battery > 0 && c.battery <= 20) || (c.bpm && c.bpm >= 120);
  }

  function battClass(b) { return b <= 20 ? 'batt--low' : b <= 50 ? 'batt--mid' : ''; }
  function battEl(b) {
    const pct = Math.max(0, Math.min(100, b));
    return `<span class="batt ${battClass(b)}">` +
      `<span class="batt__icon"><span class="batt__fill" style="width:${pct}%"></span></span>${b}%` +
      `</span>`;
  }
  const HEART = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2 6 4-14 2 8h6"/></svg>';

  function vitalsHtml(c) {
    const chips = [];
    if (c.bpm) {
      const danger = c.bpm >= 120;
      chips.push(`<span class="chip chip--bpm ${danger ? 'chip--danger' : ''}">${HEART}${c.bpm} BPM</span>`);
    }
    if (c.activity) {
      const tone = c.activity.includes('낙상') ? 'chip--danger' : '';
      chips.push(`<span class="chip ${tone}">${esc(c.activity)}</span>`);
    }
    chips.push(battEl(c.battery));
    return chips.join('');
  }

  function toast(msg, tone = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast--${tone}`;
    el.innerHTML = `<span class="toast__dot"></span><span>${esc(msg)}</span>`;
    $('#toastWrap').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(() => el.remove(), 3000);
  }

  /* ---------- 모달 ---------- */
  function openModal(title, html) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (crewMap) { crewMap.remove(); crewMap = null; }
    $('#modal').hidden = true;
    $('#modalBody').innerHTML = '';
    document.body.style.overflow = '';
  }
  $('#modal').addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  /* =========================================================
     뷰: 홈(대시보드)
     ========================================================= */
  function viewDashboard() {
    const danger = DB.crew.filter(c => c.status === 'danger').length;
    const field  = DB.crew.filter(c => c.status === 'danger' || c.status === 'active').length;
    const standby = DB.crew.filter(c => c.status === 'standby').length;
    const total  = DB.crew.length;

    const stats = `
      <div class="stat-grid">
        <div class="stat-card stat-card--danger">
          <div class="stat-card__head">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
            위험 경보
          </div>
          <div class="stat-card__num">${danger}<small>명</small></div>
        </div>
        <div class="stat-card stat-card--warn">
          <div class="stat-card__head">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></svg>
            출동 중 대원
          </div>
          <div class="stat-card__num">${field}<small>명</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__head">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            대기 대원
          </div>
          <div class="stat-card__num">${standby}<small>명</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__head">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            전체 대원
          </div>
          <div class="stat-card__num">${total}<small>명</small></div>
        </div>
      </div>`;

    const parts = Object.values(DB.DISPATCH).map(d => {
      const active = DB.history.filter(h => h.dispatch === d.key && h.status === 'active').length;
      return `
        <div class="part-card part-card--${d.key}">
          <span class="badge badge--${d.key === 'ems' ? 'success' : d.key === 'fire' ? 'danger' : 'info'} badge--plain">${esc(d.label)}</span>
          <div class="part-card__crew">${esc(d.crew)}</div>
          <div class="part-card__basis">${esc(d.basis)}</div>
          <div class="part-card__foot">진행 <b>${active}건</b></div>
        </div>`;
    }).join('');

    const active = DB.history.filter(h => h.status === 'active');
    const activeHtml = active.length ? `<div class="dispatch-grid">${active.map(h => `
      <div class="dispatch-item">
        <div class="dispatch-item__top">
          <div class="dispatch-item__title">${esc(h.title)}</div>
          <span class="dispatch-item__badge"><span class="status status--active">출동중</span></span>
        </div>
        <div class="dispatch-item__desc">${esc(h.desc)}</div>
        <div class="dispatch-item__meta">·· ${esc(h.time)}</div>
      </div>`).join('')}</div>` : `<div class="card empty"><h3>진행 중인 출동 없음</h3><p>새 출동 지령이 여기에 표시됩니다.</p></div>`;

    const attention = DB.crew.filter(needsAttention);
    const attentionHtml = attention.length
      ? `<div class="crew-grid">${attention.map(c => crewCardHtml(c, true)).join('')}</div>`
      : `<div class="card empty"><h3>주의 대상 없음</h3><p>모든 대원이 정상 상태입니다.</p></div>`;

    return `
      <div class="page-head">
        <div class="page-head__eyebrow">${esc(DB.operator.center)} · ${esc(DB.operator.name)} ${esc(DB.operator.role)}</div>
        <h1>대원 안전 대시보드</h1>
      </div>
      ${stats}
      <div class="section">
        <div class="section__head"><h2>출동 유형별 편성 인원</h2></div>
        <div class="part-grid">${parts}</div>
      </div>
      <div class="section">
        <div class="section__head"><h2>진행 중 출동</h2><a class="section__link" href="#/history">전체 이력</a></div>
        ${activeHtml}
      </div>
      <div class="section">
        <div class="section__head"><h2>주의 필요 대원</h2><a class="section__link" href="#/crew">전체 보기</a></div>
        ${attentionHtml}
      </div>`;
  }

  /* =========================================================
     뷰: 대원
     ========================================================= */
  function crewCardHtml(c, compact) {
    return `
      <button class="crew-card ${compact ? 'crew-card--compact' : ''} ${c.status === 'danger' ? 'crew-card--danger' : ''}" data-crew="${esc(c.id)}">
        <span class="avatar ${compact ? 'avatar--sm' : ''}">${esc(avatarText(c.name))}</span>
        <span class="crew-card__body">
          <span class="crew-card__line1">
            <span class="crew-card__name">${esc(c.name)}</span>
            <span class="crew-card__rank">${esc(c.rank)}</span>
            ${statusEl(c.status)}
          </span>
          <span class="crew-card__org">${esc(c.org)} ${esc(c.team)} · <span class="mono">${esc(c.id)}</span></span>
          <span class="crew-card__vitals">${vitalsHtml(c)}</span>
        </span>
      </button>`;
  }

  function viewCrew() {
    const counts = {
      all: DB.crew.length,
      danger: DB.crew.filter(c => c.status === 'danger').length,
      active: DB.crew.filter(c => c.status === 'active').length,
      standby: DB.crew.filter(c => c.status === 'standby').length,
      returned: DB.crew.filter(c => c.status === 'returned').length
    };
    const chips = [
      ['all', '전체'], ['danger', '위험'], ['active', '출동중'], ['standby', '대기'], ['returned', '복귀']
    ].map(([k, label]) => `
      <button class="filter-chip ${state.crewFilter === k ? 'is-active' : ''}" data-filter="${k}">
        ${esc(label)} <b>${counts[k]}</b>
      </button>`).join('');

    const q = state.crewSearch.trim().toLowerCase();
    let list = DB.crew.filter(c => state.crewFilter === 'all' ? true : c.status === state.crewFilter);
    if (q) list = list.filter(c =>
      c.name.toLowerCase().includes(q) || c.org.toLowerCase().includes(q) ||
      c.team.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));

    const cards = list.length
      ? `<div class="crew-grid">${list.map(c => crewCardHtml(c, false)).join('')}</div>`
      : `<div class="card empty"><h3>표시할 대원이 없습니다</h3><p>다른 필터 또는 검색어를 시도하세요.</p></div>`;

    return `
      <div class="page-head">
        <div class="page-head__eyebrow">대원 · 팔찌 관리</div>
        <h1>구조대원</h1>
      </div>
      <div class="toolbar">
        <div class="search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input type="search" id="crewSearch" placeholder="이름 · 소속 · 팔찌번호 검색" value="${esc(state.crewSearch)}" />
        </div>
        <div class="chips-row">${chips}</div>
      </div>
      <div class="list-count">${list.length}명 표시</div>
      ${cards}`;
  }

  function crewDetailHtml(c) {
    const med = c.med;
    return `
      <div class="detail-hero">
        <span class="avatar">${esc(avatarText(c.name))}</span>
        <div>
          <div class="detail-hero__name">${esc(c.name)} <span class="crew-card__rank">${esc(c.rank)}</span></div>
          <div class="detail-hero__sub">${esc(c.org)} ${esc(c.team)}</div>
        </div>
        <div style="margin-left:auto;">${statusEl(c.status)}</div>
      </div>

      <div class="crew-card__vitals" style="margin-bottom:4px;">${vitalsHtml(c)}</div>

      <div class="detail-block">
        <div class="detail-block__title">팔찌 · 기기 상태</div>
        <dl class="dl">
          <dt>팔찌 번호</dt><dd class="mono">${esc(c.id)}</dd>
          <dt>모델</dt><dd>${esc(c.band.model)} · ${esc(c.band.firmware)}</dd>
          <dt>신호</dt><dd>${esc(c.band.signal)}</dd>
          <dt>배터리</dt><dd>${battEl(c.battery)}</dd>
          <dt>마지막 동기화</dt><dd data-lastsync>${esc(c.band.lastSync)}</dd>
        </dl>
      </div>

      <div class="detail-block">
        <div class="detail-block__title">응급 의료 정보</div>
        <dl class="dl">
          <dt>혈액형</dt><dd>${esc(med.bloodType)}</dd>
          <dt>기저질환</dt><dd>${esc(med.conditions.join(', '))}</dd>
          <dt>알레르기</dt><dd>${esc(med.allergies.join(', '))}</dd>
          <dt>복용 약물</dt><dd>${esc(med.meds.join(', '))}</dd>
          <dt>현장 지침</dt><dd>${esc(med.note)}</dd>
        </dl>
      </div>

      <div class="detail-block">
        <div class="detail-block__title">보호자 · 비상 연락</div>
        ${c.guardians.map(g => `
          <div class="contact-row">
            <span class="avatar avatar--sm">${esc(avatarText(g.name))}</span>
            <div class="contact-row__main">
              <div class="contact-row__name">${esc(g.name)} <span class="crew-card__rank">${esc(g.relation)}</span></div>
              <div class="contact-row__meta mono">${esc(g.phone)}</div>
            </div>
            <button class="btn btn--sm" data-call="${esc(g.phone)}">연락</button>
          </div>`).join('')}
      </div>

      <div class="detail-block">
        <div class="detail-block__title">실시간 위치</div>
        <div class="crew-map" id="crewMap"></div>
        <div class="contact-row__meta" style="margin-top:8px;">${esc(c.loc.addr)} · ${esc(c.loc.updated)}</div>
      </div>

      <div class="modal__foot">
        <button class="btn btn--block" data-locate="${esc(c.id)}">위치 추적</button>
        ${c.status === 'returned'
          ? `<button class="btn btn--block" disabled>복귀 완료</button>`
          : `<button class="btn btn--block btn--primary" data-return="${esc(c.id)}">복귀 처리</button>`}
      </div>`;
  }

  // 상세 모달의 실시간 위치 지도(Leaflet) 초기화
  let crewMap = null;
  function initCrewMap(c) {
    if (crewMap) { crewMap.remove(); crewMap = null; }
    const el = document.getElementById('crewMap');
    if (!el || !window.L || !c.loc || c.loc.lat == null) return;
    const { lat, lng } = c.loc;
    const map = L.map(el, {
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      boxZoom: false, keyboard: false, touchZoom: false, tap: false
    }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd'
    }).addTo(map);
    const icon = L.divIcon({
      className: 'crew-map__marker',
      html: `<div class="map-pin ${c.loc.pulse ? 'map-pin--pulse' : ''}"><span class="map-pin__dot"></span></div>`,
      iconSize: [22, 22], iconAnchor: [11, 11]
    });
    L.marker([lat, lng], { icon, interactive: false }).addTo(map);
    crewMap = map;
    setTimeout(() => map.invalidateSize(), 100);
  }

  /* =========================================================
     뷰: 이력
     ========================================================= */
  function viewHistory() {
    const items = DB.history.map(h => {
      const barClass = h.dispatch ? `timeline-item__bar--${h.dispatch}` : '';
      const partBadge = h.dispatch
        ? `<span class="badge badge--${h.dispatch === 'ems' ? 'success' : h.dispatch === 'fire' ? 'danger' : 'info'} badge--plain">${esc(DB.DISPATCH[h.dispatch].label)}</span>`
        : `<span class="badge badge--muted badge--plain">자동 접수</span>`;
      const statusBadge = h.status === 'active'
        ? `<span class="status status--active">출동중</span>`
        : `<span class="badge badge--muted">${esc(h.result || '완료')}</span>`;
      return `
        <div class="timeline-item">
          <div class="timeline-item__bar ${barClass}"></div>
          <div class="timeline-item__body">
            <div class="timeline-item__top">
              <span class="timeline-item__title">${esc(h.title)}</span>
              <span class="timeline-item__time">${esc(h.time)}</span>
            </div>
            <div class="timeline-item__desc">${esc(h.desc)}</div>
            <div class="timeline-item__meta">${partBadge} &nbsp; ${statusBadge} &nbsp; ${esc(h.meta)}</div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="page-head">
        <div class="page-head__eyebrow">신고 · 구조 이력</div>
        <h1>출동 이력</h1>
        <p>총 ${DB.history.length}건 기록</p>
      </div>
      ${items}`;
  }

  /* =========================================================
     뷰: 알림
     ========================================================= */
  const ALERT_ICONS = {
    fall:   '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    sos:    '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    batt:   '<rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/>',
    return: '<path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 010 8h-1"/>',
    ok:     '<path d="M20 6L9 17l-5-5"/>'
  };
  function alertItemHtml(a) {
    const path = ALERT_ICONS[a.icon] || ALERT_ICONS.ok;
    return `
      <div class="alert-item ${a.read ? '' : 'is-unread'}">
        <div class="alert-item__icon alert-item__icon--${a.level}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>
        </div>
        <div class="alert-item__body">
          <div class="alert-item__title">${esc(a.title)}</div>
          <div class="alert-item__desc">${esc(a.desc)}</div>
          <div class="alert-item__time">${esc(a.time)}</div>
        </div>
        ${a.read ? '' : `<button class="btn btn--sm" data-read="${esc(a.id)}">확인</button>`}
      </div>`;
  }
  function viewAlerts() {
    const unread = state.alerts.filter(a => !a.read);
    const read = state.alerts.filter(a => a.read);
    return `
      <div class="page-head">
        <div class="page-head__eyebrow">알림 센터</div>
        <h1>알림</h1>
        <p>미확인 ${unread.length}건 · 전체 ${state.alerts.length}건</p>
      </div>
      ${unread.length ? `<div style="text-align:right;margin-bottom:8px;"><button class="btn btn--sm" data-readall>모두 확인</button></div>` : ''}
      ${unread.length ? unread.map(alertItemHtml).join('')
        : `<div class="card empty"><h3>미확인 알림 없음</h3><p>실시간 이벤트가 여기에 표시됩니다.</p></div>`}
      ${read.length ? `<div class="section-label">확인됨</div>${read.map(alertItemHtml).join('')}` : ''}`;
  }

  /* =========================================================
     뷰: 설정
     ========================================================= */
  function viewSettings() {
    const op = DB.operator;
    const rows = [
      { title: '위험·SOS 경보 알림', desc: '낙상·SOS 발신 시 즉시 알림', on: true },
      { title: '배터리 부족 알림', desc: '대원 팔찌 배터리 20% 이하 시 알림', on: true },
      { title: '심박 이상 알림', desc: '심박 120 BPM 이상 지속 시 알림', on: true },
      { title: '복귀 완료 알림', desc: '대원 복귀 시 알림', on: false }
    ];
    const settingRows = rows.map((r, i) => `
      <div class="setting-row">
        <div class="setting-row__text">
          <div class="setting-row__title">${esc(r.title)}</div>
          <div class="setting-row__desc">${esc(r.desc)}</div>
        </div>
        <label class="toggle"><input type="checkbox" ${r.on ? 'checked' : ''} data-setting="${i}"><span class="toggle__track"></span></label>
      </div>`).join('');

    const isDark = document.documentElement.dataset.theme === 'dark';

    return `
      <div class="page-head">
        <div class="page-head__eyebrow">개인 설정</div>
        <h1>설정</h1>
      </div>

      <div class="settings-grid">
        <div>
          <div class="card card--pad" style="margin-bottom:20px;">
            <div class="detail-hero" style="margin-bottom:14px;">
              <span class="avatar">${esc(avatarText(op.name))}</span>
              <div>
                <div class="detail-hero__name">${esc(op.name)} ${esc(op.role)}</div>
                <div class="detail-hero__sub">${esc(op.center)}</div>
              </div>
            </div>
            <div class="field"><label>소속 상황실</label><input value="${esc(op.center)}" /></div>
            <div class="field"><label>기본 출동 유형</label>
              <select>
                <option value="ems">구급 출동 (3명)</option>
                <option value="fire">화재 출동 (10명)</option>
                <option value="rescue">구조 출동 (6명)</option>
              </select>
            </div>
            <button class="btn btn--primary btn--block" data-save-profile>저장</button>
          </div>

          <div class="section__head"><h2>화면</h2></div>
          <div class="card">
            <div class="setting-row">
              <div class="setting-row__text">
                <div class="setting-row__title">다크 모드</div>
                <div class="setting-row__desc">저조도·야간 관제 환경에 적합한 어두운 화면</div>
              </div>
              <label class="toggle"><input type="checkbox" id="darkToggle" ${isDark ? 'checked' : ''}><span class="toggle__track"></span></label>
            </div>
          </div>
        </div>

        <div>
          <div class="section__head"><h2>알림</h2></div>
          <div class="card">${settingRows}</div>
        </div>
      </div>`;
  }

  /* =========================================================
     이벤트 위임 (본문)
     ========================================================= */
  $('#view').addEventListener('click', (e) => {
    const t = e.target;

    const crewBtn = t.closest('[data-crew]');
    if (crewBtn) { const c = crewById(crewBtn.getAttribute('data-crew')); if (c) { openModal(`${c.name} 대원`, crewDetailHtml(c)); initCrewMap(c); } return; }

    const fc = t.closest('[data-filter]');
    if (fc) { state.crewFilter = fc.getAttribute('data-filter'); render(); return; }

    const readBtn = t.closest('[data-read]');
    if (readBtn) { const a = state.alerts.find(x => x.id === readBtn.getAttribute('data-read')); if (a) { a.read = true; updateBadges(); render(); } return; }

    if (t.closest('[data-readall]')) { state.alerts.forEach(a => a.read = true); updateBadges(); render(); toast('모든 알림을 확인했습니다.', 'success'); return; }

    if (t.closest('[data-save-profile]')) { toast('프로필이 저장되었습니다.', 'success'); return; }
  });

  // 검색 입력 (렌더 유지 위해 포커스 보존)
  $('#view').addEventListener('input', (e) => {
    if (e.target.id === 'crewSearch') {
      state.crewSearch = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const inp = $('#crewSearch');
      if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (_) {} }
    }
  });

  $('#view').addEventListener('change', (e) => {
    if (e.target.matches('[data-setting]')) { toast('설정이 저장되었습니다.', 'success'); return; }
    if (e.target.id === 'darkToggle') { setTheme(e.target.checked ? 'dark' : 'light'); return; }
  });

  // 복귀 처리 — 대원을 복귀(returned) 상태로 전환
  function markReturned(btn) {
    const c = crewById(btn.getAttribute('data-return'));
    if (!c) return;
    if (c.status === 'returned') { toast(`${c.name} 대원은 이미 복귀 상태입니다.`, 'info'); return; }
    c.status = 'returned';
    c.activity = '복귀 완료';
    c.bpm = null;
    if (c.loc) c.loc.pulse = false;
    c.band.lastSync = '방금';
    toast(`${c.name} 대원을 복귀 처리했습니다.`, 'success');
    render();
  }

  // 모달 내부 (연락/위치/핑)
  $('#modalBody').addEventListener('click', (e) => {
    const call = e.target.closest('[data-call]');
    if (call) { toast(`${call.getAttribute('data-call')} 로 연결합니다.`, 'info'); return; }
    const locate = e.target.closest('[data-locate]');
    if (locate) { toast('지도에서 위치를 추적합니다.', 'info'); return; }
    const ret = e.target.closest('[data-return]');
    if (ret) { markReturned(ret); return; }
  });

  /* =========================================================
     테마
     ========================================================= */
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('rb-theme', theme); } catch (_) {}
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('rb-theme'); } catch (_) {}
    if (saved) setTheme(saved);
  }
  $('#themeToggle').addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    const inp = $('#darkToggle'); if (inp) inp.checked = document.documentElement.dataset.theme === 'dark';
  });

  /* =========================================================
     라우팅
     ========================================================= */
  function currentRoute() {
    const h = location.hash.replace(/^#\//, '');
    return ROUTES[h] ? h : 'dashboard';
  }
  function render() {
    const key = currentRoute();
    const route = ROUTES[key];
    $('#view').innerHTML = route.render();
    $('#topbarTitle').textContent = route.title;
    $$('.sidebar__item').forEach(n => n.classList.toggle('is-active', n.getAttribute('data-route') === route.tab));
    $('#view').scrollTop = 0;
    window.scrollTo(0, 0);
    closeModal();
  }

  function updateBadges() {
    const n = state.alerts.filter(a => !a.read).length;
    ['#bellBadge', '#navAlertBadge'].forEach(sel => {
      const b = $(sel);
      if (b) { b.textContent = n; b.setAttribute('data-empty', n === 0 ? 'true' : 'false'); }
    });
  }

  function initOperator() {
    const op = DB.operator;
    $('#opAvatar').textContent = avatarText(op.name);
    $('#opName').textContent = `${op.name} ${op.role}`;
    $('#opCenter').textContent = op.center;
  }

  /* ---------- 초기화 ---------- */
  initTheme();
  initOperator();
  window.addEventListener('hashchange', render);
  updateBadges();
  render();
})();
