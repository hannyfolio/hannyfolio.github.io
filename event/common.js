/* ============================================================
   ▼ 설정 — 구글 시트 연결 주소(SHEET_URL)만 한 번 넣으면 됩니다.
   hannyfolio@gmail.com 계정에서 apps-script.gs 를 배포하고 받은
   웹 앱 주소를 넣으세요. (event/설정방법.md 참고)
   ============================================================ */
window.EVENT_CONFIG = {
  SHEET_URL: "https://script.google.com/macros/s/AKfycbwm9j-veIMj7hOJcSHy0J3Ob_ZPskC3i4dFejFU3LyMRAFT-Q0sq3FXAyaiJxPH03A9/exec",  // 구글 Apps Script 웹 앱 주소
  HOST: "aelleloah",                // 이벤트 진행자 (개인정보 수집자)
  KEEP: "경품 발송 완료 후 1개월"     // 개인정보 보유 기간
};

/* ---------- 공통 도우미 ---------- */
window.EV = {
  connected: () => /^https:\/\/script\.google\.com\//.test(window.EVENT_CONFIG.SHEET_URL),

  // 이벤트 정보 ↔ 링크용 문자열 (UTF-8 → base64url)
  encode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode(str) {
    try {
      const b64 = String(str).replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
      return EV.clean(JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))));
    } catch (e) { return null; }
  },
  clean(obj) {
    try {
      if (!obj || typeof obj !== "object" || !obj.b || !obj.e || !/^[a-z0-9]{4,12}$/.test(obj.i || "")) return null;
      const s = (v, n) => String(v == null ? "" : v).slice(0, n);
      return {
        i: obj.i, b: s(obj.b, 40), e: s(obj.e, 60), g: s(obj.g, 80), m: s(obj.m, 300),
        n: Math.max(0, Math.min(9999, parseInt(obj.n, 10) || 0)),
        u: /^\d{4}-\d{2}-\d{2}$/.test(obj.u || "") ? obj.u : ""
      };
    } catch (e) { return null; }
  },
  // 짧은 링크: https://hannyfolio.github.io/gift?이벤트ID
  shortLink: id => location.origin + "/gift?" + id,

  // 이벤트 정보를 구글 시트에 저장 (짧은 링크용)
  async register(ev) {
    if (!EV.connected()) throw new Error("not connected");
    const res = await fetch(window.EVENT_CONFIG.SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "create", eventId: ev.i, brand: ev.b, event: ev.e, count: ev.n, gift: ev.g, until: ev.u, message: ev.m })
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "등록 실패");
  },

  // 짧은 링크로 들어왔을 때 시트에서 이벤트 정보 읽기
  async fetchEvent(id) {
    const res = await fetch(window.EVENT_CONFIG.SHEET_URL + "?id=" + encodeURIComponent(id));
    const j = await res.json();
    if (!j.ok || !j.ev) return null;
    return EV.clean(j.ev);
  },

  newId() {
    const a = "abcdefghijkmnpqrstuvwxyz23456789";
    let s = "";
    crypto.getRandomValues(new Uint8Array(7)).forEach(x => s += a[x % a.length]);
    return s;
  },
  dateLabel(u) {
    if (!u) return "";
    const [, m, d] = u.split("-").map(Number);
    return m + "월 " + d + "일";
  },
  isClosed(u) {
    if (!u) return false;
    const [y, m, d] = u.split("-").map(Number);
    return Date.now() > new Date(y, m - 1, d, 23, 59, 59).getTime();
  }
};
