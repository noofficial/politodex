(function () {
  const redirectDelay = 180;

  function safePlay(audio) {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch (error) {
      console.warn("Audio playback unavailable", error);
    }
  }

  window.playSoundAndRedirect = function playSoundAndRedirect(audioId, href) {
    const audio = document.getElementById(audioId);
    safePlay(audio);
    if (href) {
      window.setTimeout(() => {
        window.location.href = href;
      }, redirectDelay);
    }
  };

  window.topFunction = function topFunction() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
})();
