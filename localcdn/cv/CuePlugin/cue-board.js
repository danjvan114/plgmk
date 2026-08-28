(function(){
  const BOARD_URL = 'https://code.pgrm.run/localcdn/cv/main.html';

  function install(){
    document.querySelectorAll('.ActorUpLoadPanel_libraryText__TC80w, .CommonUpLoadPanel_libraryText__bufIR').forEach(function(tNode){
      const txt = (tNode.textContent || '').trim();
      if (txt !== '画板') return;
      const wrapper = tNode.closest('.ActorUpLoadPanel_libraryWrapper') ||
                      tNode.closest('.CommonUpLoadPanel_libraryWrapper') ||
                      tNode.parentElement;
      if (!wrapper || wrapper.__cueInstalled) return;
      wrapper.__cueInstalled = true;
      wrapper.addEventListener('click', function(){
        window.open(BOARD_URL, '_blank');
      });
    });
  }

  function initCue(){
    install();
    const obs = new MutationObserver(function(){ install(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (typeof exports !== 'undefined' && exports && typeof exports === 'object') {
    exports.extension = {
      type: 'cueboard',
      title: '画板',
      icon: '',
      color: '#ff9900',
      methods: [],
      events: [],
      toolbox: []
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCue);
  else initCue();
})();
