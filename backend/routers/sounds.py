from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user

router = APIRouter(prefix="/sounds", tags=["sounds"])

# Synth parameters for each sound — frontend uses these to drive Web Audio API
SOUNDS: dict[str, dict] = {
    "kick":  {"type": "sine",     "frequency": 60,   "duration": 0.4, "pitch_drop": True},
    "snare": {"type": "triangle", "frequency": 180,  "duration": 0.2, "noise": True},
    "hihat": {"type": "square",   "frequency": 8000, "duration": 0.08},
    "clap":  {"type": "triangle", "frequency": 1200, "duration": 0.15, "noise": True},
}


@router.get("/{sound_id}")
async def get_sound(sound_id: str, user=Depends(get_current_user)):
    if sound_id not in SOUNDS:
        raise HTTPException(status_code=404, detail=f"Unknown sound: {sound_id}")
    return {
        "sound_id": sound_id,
        "synth": SOUNDS[sound_id],
        "requested_by": user["email"],
    }
