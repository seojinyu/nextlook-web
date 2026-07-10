/**
 * react-image-crop v11 최소 CSS (인앱 브라우저용 인라인).
 * 네이버·카톡 등 인앱 브라우저가 외부 CDN CSS를 차단해도 crop UI가 동작하도록
 * 스타일을 코드에 내장한다.
 *
 * touch-action: none 이 핵심 — 모바일 드래그 조작에 필수.
 */
export const REACT_CROP_INLINE_CSS = `
.ReactCrop {
  position: relative;
  display: inline-block;
  cursor: crosshair;
  overflow: hidden;
  max-width: 100%;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.ReactCrop *,
.ReactCrop *::before,
.ReactCrop *::after {
  box-sizing: border-box;
}
.ReactCrop--disabled,
.ReactCrop--locked { cursor: inherit; }
.ReactCrop__child-wrapper {
  overflow: hidden;
  max-height: inherit;
  touch-action: none;
}
.ReactCrop__child-wrapper > img,
.ReactCrop__child-wrapper > video {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  touch-action: none;
  -webkit-user-drag: none;
}
.ReactCrop:not(.ReactCrop--disabled) .ReactCrop__crop-selection { cursor: move; }
.ReactCrop--disabled .ReactCrop__crop-selection { cursor: inherit; }
.ReactCrop__crop-mask {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  width: 100%; height: 100%;
}
.ReactCrop__crop-selection {
  position: absolute;
  top: 0; left: 0;
  transform: translate3d(0, 0, 0);
  box-sizing: border-box;
  cursor: move;
  box-shadow: 0 0 0 9999em rgba(0,0,0,0.5);
  touch-action: none;
  border: 1px dashed #fff;
}
.ReactCrop--invisible-crop .ReactCrop__crop-mask,
.ReactCrop--invisible-crop .ReactCrop__crop-selection { display: none; }
.ReactCrop__rule-of-thirds-vt::before,
.ReactCrop__rule-of-thirds-vt::after,
.ReactCrop__rule-of-thirds-hz::before,
.ReactCrop__rule-of-thirds-hz::after {
  content: '';
  display: block;
  position: absolute;
  background-color: rgba(255,255,255,0.4);
}
.ReactCrop__rule-of-thirds-vt::before,
.ReactCrop__rule-of-thirds-vt::after { width: 1px; height: 100%; }
.ReactCrop__rule-of-thirds-vt::before { left: 33.3333%; }
.ReactCrop__rule-of-thirds-vt::after  { left: 66.6666%; }
.ReactCrop__rule-of-thirds-hz::before,
.ReactCrop__rule-of-thirds-hz::after { width: 100%; height: 1px; }
.ReactCrop__rule-of-thirds-hz::before { top: 33.3333%; }
.ReactCrop__rule-of-thirds-hz::after  { top: 66.6666%; }
.ReactCrop__drag-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: rgba(0,0,0,0.2);
  border: 2px solid #fff;
  box-sizing: border-box;
  outline: 1px solid transparent;
  touch-action: none;
}
.ReactCrop .ord-nw { top: 0;   left: 0;   margin-top: -10px; margin-left: -10px; cursor: nw-resize; }
.ReactCrop .ord-n  { top: 0;   left: 50%; margin-top: -10px; margin-left: -10px; cursor: n-resize; }
.ReactCrop .ord-ne { top: 0;   right: 0;  margin-top: -10px; margin-right: -10px; cursor: ne-resize; }
.ReactCrop .ord-e  { top: 50%; right: 0;  margin-top: -10px; margin-right: -10px; cursor: e-resize; }
.ReactCrop .ord-se { bottom: 0; right: 0; margin-bottom: -10px; margin-right: -10px; cursor: se-resize; }
.ReactCrop .ord-s  { bottom: 0; left: 50%; margin-bottom: -10px; margin-left: -10px; cursor: s-resize; }
.ReactCrop .ord-sw { bottom: 0; left: 0;  margin-bottom: -10px; margin-left: -10px; cursor: sw-resize; }
.ReactCrop .ord-w  { top: 50%; left: 0;   margin-top: -10px; margin-left: -10px; cursor: w-resize; }
.ReactCrop__disabled .ReactCrop__drag-handle { cursor: inherit; }
.ReactCrop__drag-bar {
  position: absolute;
  touch-action: none;
}
.ReactCrop__drag-bar.ord-n { top: 0;    left: 0;   width: 100%; height: 6px; margin-top: -3px; }
.ReactCrop__drag-bar.ord-e { right: 0;  top: 0;    height: 100%; width: 6px; margin-right: -3px; }
.ReactCrop__drag-bar.ord-s { bottom: 0; left: 0;   width: 100%; height: 6px; margin-bottom: -3px; }
.ReactCrop__drag-bar.ord-w { top: 0;    left: 0;   height: 100%; width: 6px; margin-left: -3px; }
@media (pointer: coarse) {
  .ReactCrop .ord-n, .ReactCrop .ord-e, .ReactCrop .ord-s, .ReactCrop .ord-w,
  .ReactCrop .ord-nw, .ReactCrop .ord-ne, .ReactCrop .ord-se, .ReactCrop .ord-sw {
    width: 28px;
    height: 28px;
    margin-top: -14px;
    margin-left: -14px;
    margin-right: -14px;
    margin-bottom: -14px;
  }
}
`;

/** 인라인 CSS를 <head>에 주입 (한 번만) */
export function injectCropCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('style[data-react-image-crop-inline]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-react-image-crop-inline', 'true');
  style.textContent = REACT_CROP_INLINE_CSS;
  document.head.appendChild(style);
}
