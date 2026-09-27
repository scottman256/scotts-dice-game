import '@testing-library/jest-dom'

// JSDOM does not implement native dialog methods. Browser checks cover modal
// focus containment and background inertness; this shim models open/close.
const dialogReturnFocus = new WeakMap()
HTMLDialogElement.prototype.showModal = function showModal() {
  dialogReturnFocus.set(this, document.activeElement)
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function close() {
  if (!this.open) return
  this.removeAttribute('open')
  if (this.isConnected) dialogReturnFocus.get(this)?.focus()
  dialogReturnFocus.delete(this)
}
