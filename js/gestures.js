/**
 * LuminaBook - Touch Gestures & Mobile Experience Engine
 * Touch swipe, pinch-to-zoom, edge taps, HUD auto-hide & full mobile/tablet compatibility.
 */

class GestureController {
  constructor(targetEl, handlers = {}) {
    this.target = targetEl;
    this.handlers = Object.assign({
      onSwipeLeft: null,    // Next page
      onSwipeRight: null,   // Prev page
      onTapLeft: null,      // Prev page tap
      onTapRight: null,     // Next page tap
      onTapCenter: null,    // Toggle controls / HUD
      onPinchZoom: null,    // Multi-touch pinch zoom
      onDoubleTap: null     // Double tap zoom reset
    }, handlers);

    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.initialPinchDistance = 0;
    this.isPinching = false;
    this.lastTapTime = 0;
    this.tapThreshold = 250; // ms for tap
    this.minSwipeDistance = 45; // px

    this.initTouchListeners();
  }

  initTouchListeners() {
    this.target.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: false });
    this.target.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: false });
    this.target.addEventListener('touchend', (e) => this._handleTouchEnd(e), { passive: false });
  }

  _getTouchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }

  _handleTouchStart(e) {
    if (e.touches.length === 2) {
      // Two finger pinch start
      this.isPinching = true;
      this.initialPinchDistance = this._getTouchDistance(e.touches[0], e.touches[1]);
      return;
    }

    if (e.touches.length === 1) {
      this.isPinching = false;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.touchStartTime = Date.now();
    }
  }

  _handleTouchMove(e) {
    if (this.isPinching && e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = this._getTouchDistance(e.touches[0], e.touches[1]);
      if (this.initialPinchDistance > 0 && this.handlers.onPinchZoom) {
        const factor = currentDistance / this.initialPinchDistance;
        this.handlers.onPinchZoom(factor);
      }
      return;
    }

    // Single touch move: if horizontal swipe is prominent, prevent vertical scroll
    if (e.touches.length === 1) {
      const dx = Math.abs(e.touches[0].clientX - this.touchStartX);
      const dy = Math.abs(e.touches[0].clientY - this.touchStartY);
      if (dx > dy && dx > 15) {
        // Horizontal gesture intended
        e.preventDefault();
      }
    }
  }

  _handleTouchEnd(e) {
    if (this.isPinching) {
      this.isPinching = false;
      this.initialPinchDistance = 0;
      return;
    }

    if (!e.changedTouches || e.changedTouches.length === 0) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Double Tap detection
    const now = Date.now();
    if (now - this.lastTapTime < 320 && absX < 20 && absY < 20) {
      if (this.handlers.onDoubleTap) {
        this.handlers.onDoubleTap(touch.clientX, touch.clientY);
      }
      this.lastTapTime = 0;
      return;
    }
    this.lastTapTime = now;

    // Fast flick or standard swipe
    const velocity = absX / Math.max(1, deltaTime);
    const isHorizontalSwipe = absX > absY * 1.5;

    if (isHorizontalSwipe && (absX > this.minSwipeDistance || (absX > 25 && velocity > 0.4))) {
      if (deltaX < 0) {
        // Swiped Left -> Next page
        if (this.handlers.onSwipeLeft) this.handlers.onSwipeLeft();
      } else {
        // Swiped Right -> Previous page
        if (this.handlers.onSwipeRight) this.handlers.onSwipeRight();
      }
      return;
    }

    // Single tap on screen zones (only if finger barely moved)
    if (absX < 15 && absY < 15 && deltaTime < this.tapThreshold) {
      const rect = this.target.getBoundingClientRect();
      const relativeX = (touch.clientX - rect.left) / rect.width;

      if (relativeX < 0.20) {
        // Left 20% zone -> Previous
        if (this.handlers.onTapLeft) this.handlers.onTapLeft();
      } else if (relativeX > 0.80) {
        // Right 20% zone -> Next
        if (this.handlers.onTapRight) this.handlers.onTapRight();
      } else {
        // Center 60% zone -> Toggle HUD Controls
        if (this.handlers.onTapCenter) this.handlers.onTapCenter();
      }
    }
  }
}

window.GestureController = GestureController;
