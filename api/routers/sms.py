"""Solapi SMS 발송 라우터 — 복지 결과 문자 전송."""

import os, time, uuid, hmac, hashlib
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/welfare", tags=["SMS"])

SOLAPI_API_URL = "https://api.solapi.com/messages/v4/send"


# ── 스키마 ────────────────────────────────────────────────────

class SmsItem(BaseModel):
    name:      str
    url:       str
    level:     str = ""   # "✅ 신청 요건 충족" | "🔶 해당 가능성 있음" | ...

class SmsStatusRequest(BaseModel):
    phone:  str  = Field(..., description="수신자 휴대폰 번호")
    name:   str  = Field(..., description="복지 서비스명")
    url:    str  = Field("", description="신청 URL")
    status: str  = Field(..., description="pending | done")

class SmsRequest(BaseModel):
    phone:    str = Field(..., description="수신자 휴대폰 번호 (01012345678)")
    age:      int = Field(..., description="사용자 나이")
    region:   str = Field(..., description="지역 (서울특별시 | 경기도)")
    items:    list[SmsItem] = Field(..., description="발송할 복지 항목 (최대 5건)")


# ── Solapi HMAC 인증 헤더 생성 ────────────────────────────────

def _make_auth_header(api_key: str, api_secret: str) -> str:
    date   = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    salt   = uuid.uuid4().hex
    msg    = date + salt
    sig    = hmac.new(api_secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return f"HMAC apiKey={api_key}, date={date}, salt={salt}, signature={sig}"


# ── SMS 본문 생성 ─────────────────────────────────────────────

def _build_sms_text(age: int, region: str, items: list[SmsItem]) -> str:
    lines = [f"[아테나] {age}세 {region} 맞춤 복지혜택\n"]

    definite = [it for it in items if "신청 요건" in it.level or "DEFINITE" in it.level or "✅" in it.level]
    possible = [it for it in items if "가능성" in it.level or "POSSIBLE" in it.level or "🔶" in it.level]
    other    = [it for it in items if it not in definite and it not in possible]

    if definite:
        lines.append("✅ 즉시 신청 가능")
        for it in definite[:3]:
            lines.append(f"• {it.name}")
            lines.append(f"  {it.url}")

    if possible:
        lines.append("\n🔶 확인 후 신청")
        for it in possible[:2]:
            lines.append(f"• {it.name}")
            lines.append(f"  {it.url}")

    if not definite and not possible:
        for it in (other or items)[:3]:
            lines.append(f"• {it.name}")
            lines.append(f"  {it.url}")

    lines.append("\n📱 아테나 앱: lingostaredu.app")
    return "\n".join(lines)


# ── 엔드포인트 ────────────────────────────────────────────────

@router.post("/send-sms", summary="복지 결과 문자 발송")
async def send_sms(req: SmsRequest):
    api_key    = os.environ.get("SOLAPI_API_KEY", "")
    api_secret = os.environ.get("SOLAPI_API_SECRET", "")
    sender     = os.environ.get("SOLAPI_SENDER", "")

    if not all([api_key, api_secret, sender]):
        raise HTTPException(
            status_code=503,
            detail="SMS 서비스가 설정되지 않았습니다. (SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_SENDER 환경변수 필요)",
        )

    # 전화번호 정규화 (숫자만)
    phone_clean = "".join(c for c in req.phone if c.isdigit())
    if not (10 <= len(phone_clean) <= 11):
        raise HTTPException(status_code=400, detail="올바른 휴대폰 번호를 입력하세요.")

    text = _build_sms_text(req.age, req.region, req.items[:5])

    payload = {
        "message": {
            "to":   phone_clean,
            "from": sender,
            "text": text,
            "type": "LMS" if len(text) > 90 else "SMS",
        }
    }

    headers = {
        "Authorization": _make_auth_header(api_key, api_secret),
        "Content-Type":  "application/json",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(SOLAPI_API_URL, json=payload, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Solapi 오류: {resp.status_code} — {resp.text[:200]}",
        )

    data = resp.json()
    # Solapi는 성공 시 errorCount=0
    if data.get("errorCount", 1) > 0:
        raise HTTPException(
            status_code=502,
            detail=f"문자 발송 실패: {data}",
        )

    return {"success": True, "message": f"{phone_clean}로 문자를 발송했습니다."}


# ── 신청 상태 알림 엔드포인트 ─────────────────────────────────

@router.post("/notify-status", summary="신청 상태 변경 알림 문자")
async def notify_status(req: SmsStatusRequest):
    api_key    = os.environ.get("SOLAPI_API_KEY", "")
    api_secret = os.environ.get("SOLAPI_API_SECRET", "")
    sender     = os.environ.get("SOLAPI_SENDER", "")

    if not all([api_key, api_secret, sender]):
        raise HTTPException(
            status_code=503,
            detail="SMS 서비스가 설정되지 않았습니다.",
        )

    phone_clean = "".join(c for c in req.phone if c.isdigit())
    if not (10 <= len(phone_clean) <= 11):
        raise HTTPException(status_code=400, detail="올바른 휴대폰 번호를 입력하세요.")

    if req.status == "pending":
        text = (
            f"[아테나] 신청 예정 알림\n"
            f"▶ {req.name}\n"
            f"신청을 예정하셨습니다.\n"
            f"잊지 말고 신청해보세요!\n"
            f"{'신청하기: ' + req.url + chr(10) if req.url else ''}"
            f"📱 lingostaredu.app"
        )
    else:  # done
        text = (
            f"[아테나] 신청 완료 확인\n"
            f"✅ {req.name}\n"
            f"신청 완료로 기록했습니다.\n"
            f"결과가 나오면 담당 기관에서 연락드립니다.\n"
            f"📱 lingostaredu.app"
        )

    payload = {
        "message": {
            "to":   phone_clean,
            "from": sender,
            "text": text,
            "type": "LMS" if len(text) > 90 else "SMS",
        }
    }
    headers = {
        "Authorization": _make_auth_header(api_key, api_secret),
        "Content-Type":  "application/json",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(SOLAPI_API_URL, json=payload, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Solapi 오류: {resp.status_code}")

    data = resp.json()
    if data.get("errorCount", 1) > 0:
        raise HTTPException(status_code=502, detail=f"문자 발송 실패: {data}")

    return {"success": True}
