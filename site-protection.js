(() => {
  'use strict';

  const editableSelector = 'input, textarea, select, [contenteditable="true"]';
  const isEditable = target => target instanceof Element && Boolean(target.closest(editableSelector));
  const stop = event => {
    if (isEditable(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  document.documentElement.classList.add('site-protected');

  ['contextmenu', 'copy', 'cut', 'selectstart'].forEach(type => {
    document.addEventListener(type, stop, true);
  });

  document.addEventListener('dragstart', event => {
    if (event.target instanceof Element && event.target.closest('img, picture, video, canvas, svg')) {
      stop(event);
    }
  }, true);

  document.addEventListener('keydown', event => {
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const blockedCommand = command && ['a', 'c', 'p', 's', 'u', 'x'].includes(key);
    const blockedTools = command && event.shiftKey && ['c', 'i', 'j', 'k'].includes(key);

    if (event.key === 'F12' || blockedTools || (blockedCommand && !isEditable(event.target))) {
      stop(event);
    }
  }, true);

  const style = document.createElement('style');
  style.textContent = `
    html.site-protected body,
    html.site-protected body *:not(input):not(textarea):not(select):not(option) {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    html.site-protected img,
    html.site-protected picture,
    html.site-protected video,
    html.site-protected canvas,
    html.site-protected svg {
      -webkit-user-drag: none !important;
      user-drag: none !important;
    }
    @media print {
      html.site-protected body { visibility: hidden !important; }
    }
  `;
  document.head.appendChild(style);
})();
