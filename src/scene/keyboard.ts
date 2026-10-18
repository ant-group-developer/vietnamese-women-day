import { useEffect } from "react";
import { useJourney } from "../store/useJourney";
import { stationNear } from "./route";
import { isMobile } from "./utils";

/** Điều khiển bằng bàn phím (chỉ trên máy tính): giữ ← → hoặc A D để đi tới/lùi dọc đường (không phụ thuộc góc camera). */
export const keyboardEnabled =
    !isMobile &&
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches;

/** Hướng đi do bàn phím: -1 lùi, 1 tiến, 0 đứng yên. Character đọc mỗi frame. */
export const keyboard = { dir: 0 };

/** Khoảng cách để coi là đứng đúng tại trạm (cập nhật currentIndex). */
const AT = 0.35;

export function stationAt(u: number): number {
    return stationNear(u, AT);
}

/** Có đang được phép điều khiển nhân vật không (không mở popup, tour, cài đặt...). */
export function canControl(): boolean {
    const s = useJourney.getState();
    return (
        (s.phase === "journey" || s.phase === "gift") &&
        s.openedIndex === null &&
        !s.tourOpen &&
        !s.settingsOpen
    );
}

const LEFT = new Set(["ArrowLeft", "KeyA"]);
const RIGHT = new Set(["ArrowRight", "KeyD"]);
/** Ký tự bộ gõ tiếng Việt (Telex/VNI) chèn ra khi giữ A/D, vd. "aa" → "â", "dd" → "đ"; sự kiện đó thường không có code. */
const LEFT_CHARS = new Set(["a", "â", "ă", "á", "à", "ả", "ã", "ạ"]);
const RIGHT_CHARS = new Set(["d", "đ"]);
/**
 * Chờ một chút sau khi nhả phím mới dừng, phòng khi bộ gõ tiếng Việt chen cặp nhả/nhấn giả
 * vào giữa lúc đang giữ phím (dừng ngay thì nhân vật bị khựng).
 */
const RELEASE_DELAY = 120;

/** Quy về KeyA/KeyD/ArrowLeft/ArrowRight, kể cả sự kiện do bộ gõ chèn (code rỗng, key là ký tự đã ghép). */
function moveCode(e: KeyboardEvent): string | null {
    if (LEFT.has(e.code) || RIGHT.has(e.code)) return e.code;
    const k = e.key?.toLowerCase();
    if (!e.code || e.code === "Unidentified" || e.key === "Process") {
        if (LEFT_CHARS.has(k)) return "KeyA";
        if (RIGHT_CHARS.has(k)) return "KeyD";
    }
    return null;
}

export function useKeyboardControls() {
    useEffect(() => {
        if (!keyboardEnabled) return;
        const held = new Set<string>();
        const releases = new Map<string, number>();
        let shiftHeld = false;
        const update = () => {
            const any = (keys: Set<string>) => ([...held].some((k) => keys.has(k)) ? 1 : 0);
            keyboard.dir = any(RIGHT) - any(LEFT);
        };
        const typing = (e: KeyboardEvent) => {
            const el = e.target;
            return (
                el instanceof HTMLElement &&
                (el.tagName === "INPUT" ||
                    el.tagName === "TEXTAREA" ||
                    el.tagName === "SELECT" ||
                    el.isContentEditable)
            );
        };
        const cancelRelease = (code: string) => {
            const id = releases.get(code);
            if (id !== undefined) {
                clearTimeout(id);
                releases.delete(code);
            }
        };
        const onDown = (e: KeyboardEvent) => {
            if (e.key === "Shift") shiftHeld = true;
            if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
            const code = moveCode(e);
            if (!code) return;
            // Bộ gõ tiếng Việt (EVKey, Unikey...) khi ghép chữ tự gửi Shift + ← để chọn ký tự cũ rồi
            // Backspace và gõ lại: phím ← giả đó không phải người chơi bấm, bỏ qua kẻo triệt tiêu phím D.
            if (code.startsWith("Arrow") && (e.shiftKey || shiftHeld)) return;
            if (!canControl()) return;
            e.preventDefault();
            cancelRelease(code);
            held.add(code);
            update();
        };
        const onUp = (e: KeyboardEvent) => {
            if (e.key === "Shift") shiftHeld = false;
            const code = moveCode(e);
            if (!code || !held.has(code)) return;
            cancelRelease(code);
            releases.set(
                code,
                window.setTimeout(() => {
                    releases.delete(code);
                    held.delete(code);
                    update();
                }, RELEASE_DELAY),
            );
        };
        const clear = () => {
            shiftHeld = false;
            releases.forEach((id) => clearTimeout(id));
            releases.clear();
            held.clear();
            update();
        };
        window.addEventListener("keydown", onDown);
        window.addEventListener("keyup", onUp);
        window.addEventListener("blur", clear);
        return () => {
            window.removeEventListener("keydown", onDown);
            window.removeEventListener("keyup", onUp);
            window.removeEventListener("blur", clear);
            clear();
        };
    }, []);
}
